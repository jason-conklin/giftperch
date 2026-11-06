import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchAwinEnhancedFeed } from "../src/server/awin/feed";
import {
  inspectAwinProductFeed,
  runAwinProductImport,
} from "../src/server/awin/importer";
import {
  getAwinSnapshotNormalizer,
  readValidatedSnapshotRecords,
  validateAwinSnapshot,
} from "../src/server/awin/snapshot";
import {
  type AffiliateProduct,
  type AffiliateProductImportRepository,
  type AwinImportContext,
  type ImportStats,
} from "../src/server/awin/types";
import {
  createAwinImportContext,
  resolveAwinAdvertiser,
} from "../src/server/awin/advertisers";
import { classificationStagingFields } from "../src/server/awin/classificationPersistence";
import { finalizeChunkedAwinImport } from "../src/server/awin/chunkedImportFinalization";

const REQUEST_TIMEOUT_MS = 120_000;
const PREPARE_BATCH_SIZE = 500;
const CLEANUP_BATCH_SIZE = 1_000;

type ResumableImportRepository = AffiliateProductImportRepository & {
  resumeImport(importId: string, context: AwinImportContext): Promise<ImportStats>;
};

loadEnvConfig(process.cwd());

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

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function sanitizedMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : "Unknown import error";
  const secrets = [
    process.env.AWIN_API_TOKEN,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ];
  for (const secret of secrets) {
    if (secret) message = message.replaceAll(secret, "[redacted]");
  }
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[redacted-token]",
    )
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 500);
}

class SupabaseImportRepository implements AffiliateProductImportRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async beginImport(
    context: AwinImportContext,
    minimumValidProducts: number,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("affiliate_product_imports")
      .insert({
        provider: context.provider,
        publisher_id: context.publisherId,
        advertiser_id: context.advertiserId,
        locale: context.locale,
        minimum_valid_count: minimumValidProducts,
        status: "staging",
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(error?.message || "Could not start the staged import.");
    }
    return String(data.id);
  }

  async stageProducts(importId: string, products: AffiliateProduct[]) {
    const rows = products.map((product) => ({
      import_id: importId,
      provider: product.provider,
      advertiser_id: product.advertiserId,
      merchant_name: product.merchantName,
      external_product_id: product.externalProductId,
      locale: product.locale,
      title: product.title,
      description: product.description,
      image_url: product.imageUrl,
      destination_url: product.destinationUrl,
      affiliate_url: product.affiliateUrl,
      price: product.price,
      currency: product.currency,
      availability: product.availability,
      imported_at: product.importedAt,
      ...classificationStagingFields(product),
    }));
    const { error } = await this.supabase
      .from("affiliate_product_staging")
      .upsert(rows, { onConflict: "import_id,external_product_id" });
    if (error) throw new Error(error.message);
  }

  async finalizeImport(importId: string, stats: ImportStats): Promise<number> {
    const { error: statsError } = await this.supabase
      .from("affiliate_product_imports")
      .update({
        record_count: stats.recordsRead,
        valid_count: stats.validProducts,
        skipped_count: stats.skippedProducts,
      })
      .eq("id", importId)
      .in("status", ["staging", "preparing"]);
    if (statsError) throw new Error(statsError.message);

    return finalizeChunkedAwinImport({
      prepareChunk: async () => {
        const { data, error } = await this.supabase.rpc(
          "prepare_affiliate_product_import_chunk",
          { p_import_id: importId, p_batch_size: PREPARE_BATCH_SIZE },
        );
        if (error) throw new Error(error.message);
        return Number(data ?? 0);
      },
      activate: async () => {
        const { data, error } = await this.supabase.rpc(
          "activate_prepared_affiliate_product_import",
          { p_import_id: importId },
        );
        if (error) throw new Error(error.message);
        return Number(data ?? 0);
      },
      cleanupPreparedChunk: async () => {
        const { data, error } = await this.supabase.rpc(
          "cleanup_prepared_affiliate_product_import_chunk",
          { p_import_id: importId, p_batch_size: CLEANUP_BATCH_SIZE },
        );
        if (error) throw new Error(error.message);
        return Number(data ?? 0);
      },
      cleanupInactiveSnapshots: () => this.cleanupInactiveSnapshots(importId),
    });
  }

  async resumeImport(importId: string, context: AwinImportContext): Promise<ImportStats> {
    const { data, error } = await this.supabase.rpc(
      "resume_affiliate_product_import",
      { p_import_id: importId },
    );
    if (error || !Array.isArray(data) || data.length !== 1) {
      throw new Error(error?.message || "Could not resume the staged import.");
    }
    const resumed = data[0] as Record<string, unknown>;
    if (
      resumed.provider !== context.provider ||
      resumed.advertiser_id !== context.advertiserId ||
      resumed.locale !== context.locale
    ) {
      throw new Error("The requested import does not match the selected advertiser scope.");
    }
    const recordsRead = Number(resumed.record_count);
    const validProducts = Number(resumed.valid_count);
    const skippedProducts = Number(resumed.skipped_count);
    if (
      ![recordsRead, validProducts, skippedProducts].every(
        (value) => Number.isInteger(value) && value >= 0,
      )
    ) {
      throw new Error("The resumed import has invalid recorded statistics.");
    }
    return { recordsRead, validProducts, skippedProducts };
  }

  private async cleanupInactiveSnapshots(importId: string): Promise<void> {
    const { data: current, error: currentError } = await this.supabase
      .from("affiliate_product_imports")
      .select("provider, advertiser_id, locale")
      .eq("id", importId)
      .single();
    if (currentError || !current) throw new Error("Could not read the activated import scope.");

    const { data: inactiveImports, error: inactiveError } = await this.supabase
      .from("affiliate_product_imports")
      .select("id")
      .eq("provider", current.provider)
      .eq("advertiser_id", current.advertiser_id)
      .eq("locale", current.locale)
      .eq("status", "completed")
      .eq("catalog_active", false);
    if (inactiveError) throw new Error(inactiveError.message);

    for (const inactiveImport of inactiveImports ?? []) {
      const inactiveImportId = String(inactiveImport.id);
      while (true) {
        const { data, error } = await this.supabase.rpc(
          "cleanup_inactive_affiliate_catalog_chunk",
          { p_import_id: inactiveImportId, p_batch_size: PREPARE_BATCH_SIZE },
        );
        if (error) throw new Error(error.message);
        if (Number(data ?? 0) === 0) break;
      }
    }
  }

  async failImport(
    importId: string,
    stats: ImportStats,
    errorMessage: string,
  ) {
    const { error } = await this.supabase
      .from("affiliate_product_imports")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        record_count: stats.recordsRead,
        valid_count: stats.validProducts,
        skipped_count: stats.skippedProducts,
        error_message: errorMessage,
      })
      .eq("id", importId)
      .in("status", ["staging", "preparing"]);
    if (error) {
      console.error("Could not record the failed import status.");
    }
  }
}

async function main() {
  const writeMode = process.argv.includes("--write");
  const snapshotPath = argumentValue("snapshot");
  const resumeImportId = argumentValue("resume-import");
  const minimumProductsArgument = argumentValue("minimum-products");
  const minimumValidProducts = minimumProductsArgument
    ? Number(minimumProductsArgument)
    : null;
  const publisherId = requiredEnv("AWIN_PUBLISHER_ID");
  const advertiser = resolveAwinAdvertiser(
    argumentValue("advertiser") ?? undefined,
  );
  const context = createAwinImportContext(publisherId, advertiser);

  let repository: ResumableImportRepository | null = null;
  let validatedSnapshot:
    | Awaited<ReturnType<typeof validateAwinSnapshot>>
    | null = null;
  if (writeMode) {
    if (!snapshotPath && !resumeImportId) {
      throw new Error(
        "Write mode requires --snapshot=<validated-snapshot-path> or --resume-import=<import-id>. No database writes were attempted.",
      );
    }
    if (snapshotPath && resumeImportId) {
      throw new Error("--snapshot and --resume-import cannot be used together.");
    }
    if (
      minimumValidProducts === null ||
      !Number.isInteger(minimumValidProducts) ||
      minimumValidProducts < 1
    ) {
      throw new Error(
        "Write mode requires a positive integer --minimum-products value. No database writes were attempted.",
      );
    }
    const supabaseUrl =
      process.env.SUPABASE_URL?.trim() ||
      requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const projectRef = projectRefFromUrl(supabaseUrl);
    const confirmedProjectRef = argumentValue("confirm-project-ref");
    if (!projectRef) {
      throw new Error("Could not determine the Supabase project reference.");
    }
    if (confirmedProjectRef !== projectRef) {
      throw new Error(
        `Write mode requires --confirm-project-ref=${projectRef}. No database writes were attempted.`,
      );
    }

    if (snapshotPath) {
      validatedSnapshot = await validateAwinSnapshot({
        snapshotPath,
        expectedContext: context,
      });
      if (validatedSnapshot.inspection.uniqueProducts < minimumValidProducts) {
        throw new Error(
          `Validated snapshot contains ${validatedSnapshot.inspection.uniqueProducts} unique products; at least ${minimumValidProducts} are required. No database writes were attempted.`,
        );
      }
    }

    console.log(`Target Supabase project: ${projectRef}`);
    if (validatedSnapshot) {
      console.log(`Validated snapshot SHA-256: ${validatedSnapshot.sha256}`);
    }
    console.log("Mode: staged database import");
    const supabase = createClient(
      supabaseUrl,
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    repository = new SupabaseImportRepository(supabase);
  } else {
    if (snapshotPath) {
      throw new Error("--snapshot is only accepted with --write.");
    }
    console.log("Mode: feed validation only; no database writes");
  }

  if (repository && validatedSnapshot && snapshotPath) {
    const result = await runAwinProductImport({
      context,
      records: readValidatedSnapshotRecords(snapshotPath, validatedSnapshot),
      repository,
      minimumValidProducts: minimumValidProducts as number,
      normalizeProduct: getAwinSnapshotNormalizer(validatedSnapshot),
    });
    console.log(
      JSON.stringify(
        {
          importId: result.importId,
          activatedProducts: result.activatedProducts,
          snapshotSha256: validatedSnapshot.sha256,
          ...result.stats,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (repository && resumeImportId) {
    const stats = await repository.resumeImport(resumeImportId, context);
    const activatedProducts = await repository.finalizeImport(resumeImportId, stats);
    console.log(
      JSON.stringify(
        { importId: resumeImportId, activatedProducts, resumed: true, ...stats },
        null,
        2,
      ),
    );
    return;
  }

  const response = await fetchAwinEnhancedFeed({
    publisherId,
    advertiserId: advertiser.advertiserId,
    locale: advertiser.locale,
    apiToken: requiredEnv("AWIN_API_TOKEN"),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!repository) {
    const stats = await inspectAwinProductFeed({
      advertiserId: advertiser.advertiserId,
      locale: advertiser.locale,
      records: response.records,
    });
    console.log(JSON.stringify({ httpStatus: response.status, ...stats }, null, 2));
    return;
  }

  throw new Error("Snapshot import initialization failed before any write.");
}

main().catch((error) => {
  console.error(`Awin import failed: ${sanitizedMessage(error)}`);
  process.exitCode = 1;
});
