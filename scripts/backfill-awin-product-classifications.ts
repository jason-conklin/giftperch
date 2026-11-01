import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  findAwinAdvertiserById,
  resolveAwinAdvertiser,
} from "../src/server/awin/advertisers";
import {
  runProductClassificationBackfill,
  type ClassificationBackfillRepository,
} from "../src/server/awin/classificationBackfill";

loadEnvConfig(process.cwd());

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function projectRefFromUrl(value: string): string | null {
  try {
    const hostname = new URL(value).hostname;
    return hostname.endsWith(".supabase.co") ? hostname.split(".")[0] : null;
  } catch {
    return null;
  }
}

function positiveInteger(value: string | null, fallback: number, name: string): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function resolveAdvertiserId(value: string | null): string {
  if (!value) throw new Error("--advertiser=<registry-key-or-id> is required.");
  if (/^\d+$/.test(value)) {
    const advertiser = findAwinAdvertiserById(value);
    if (!advertiser) throw new Error(`No configured advertiser uses ID ${value}.`);
    return advertiser.advertiserId;
  }
  return resolveAwinAdvertiser(value).advertiserId;
}

class SupabaseClassificationBackfillRepository
  implements ClassificationBackfillRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async fetchPage(options: {
    advertiserId: string;
    afterId: string | null;
    limit: number;
  }) {
    const baseQuery = (includeSourceCategory: boolean) => {
      let query = this.supabase
      .from("affiliate_products")
      .select(
        includeSourceCategory
          ? "id,advertiser_id,merchant_name,title,description,source_category"
          : "id,advertiser_id,merchant_name,title,description",
      )
      .eq("provider", "awin")
      .eq("advertiser_id", options.advertiserId)
      .order("id", { ascending: true })
      .limit(options.limit);
      if (options.afterId) query = query.gt("id", options.afterId);
      return query;
    };
    let { data, error } = await baseQuery(true);
    // Dry-runs remain useful before this migration is applied. In that case,
    // legacy categories are recovered from the existing description prefix.
    if (error?.code === "42703") {
      ({ data, error } = await baseQuery(false));
    }
    if (error) throw new Error(`Could not read product page: ${error.message}`);
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      advertiserId: String(row.advertiser_id),
      merchantName: String(row.merchant_name),
      title: String(row.title),
      description: typeof row.description === "string" ? row.description : null,
      sourceCategory:
        typeof row.source_category === "string" ? row.source_category : null,
    }));
  }

  async replaceClassification(classification: Parameters<ClassificationBackfillRepository["replaceClassification"]>[0]) {
    const { error } = await this.supabase.rpc(
      "replace_affiliate_product_classification",
      {
        p_product_id: classification.productId,
        p_source_category: classification.sourceCategory,
        p_primary_category: classification.classification.primaryCategory,
        p_classification_version:
          classification.classification.classificationVersion,
        p_confidence: classification.classification.confidence,
        p_evidence: classification.classification.evidence,
        p_facets: classification.classification.facets,
      },
    );
    if (error) throw new Error(`Could not write classification: ${error.message}`);
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const advertiserId = resolveAdvertiserId(argumentValue("advertiser"));
  const batchSize = positiveInteger(argumentValue("batch-size"), 100, "--batch-size");
  const maxBatches = positiveInteger(argumentValue("max-batches"), 1, "--max-batches");
  if (batchSize > 500) throw new Error("--batch-size cannot exceed 500.");

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const projectRef = projectRefFromUrl(supabaseUrl);
  if (!projectRef) throw new Error("Could not determine the Supabase project reference.");
  if (write && argumentValue("confirm-project-ref") !== projectRef) {
    throw new Error(
      `Write mode requires --confirm-project-ref=${projectRef}. No writes were attempted.`,
    );
  }

  const client = createClient(
    supabaseUrl,
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const result = await runProductClassificationBackfill({
    advertiserId,
    batchSize,
    maxBatches,
    afterId: argumentValue("after-id"),
    write,
    repository: new SupabaseClassificationBackfillRepository(client),
    onProgress: (progress) => {
      console.log(JSON.stringify({ mode: write ? "write" : "dry-run", ...progress }));
    },
  });
  console.log(
    JSON.stringify(
      {
        mode: write ? "write" : "dry-run",
        projectRef,
        advertiserId,
        ...result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Classification backfill failed.");
  process.exitCode = 1;
});
