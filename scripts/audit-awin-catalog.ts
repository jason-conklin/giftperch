import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AWIN_APPROVED_ADVERTISERS,
  isApprovedAwinAdvertiserId,
} from "../src/server/awin/advertisers";
import {
  previewUnapprovedAwinCatalogCleanup,
  type AwinCatalogCleanupRow,
} from "../src/server/awin/catalogCleanup";

const PAGE_SIZE = 1_000;

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

function sanitizedMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : "Awin catalog audit failed";
  for (const secret of [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ]) {
    if (secret) message = message.replaceAll(secret, "[redacted]");
  }
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 500);
}

function countUnapprovedAwinReferences(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce(
      (count, item) => count + countUnapprovedAwinReferences(item),
      0,
    );
  }
  if (!value || typeof value !== "object") return 0;

  const record = value as Record<string, unknown>;
  const directMatch =
    record.provider === "awin" &&
    typeof record.advertiserId === "string" &&
    !isApprovedAwinAdvertiserId(record.advertiserId)
      ? 1
      : 0;
  return (
    directMatch +
    Object.values(record).reduce<number>(
      (count, child) => count + countUnapprovedAwinReferences(child),
      0,
    )
  );
}

async function readAllRows(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not read ${table}: ${error.message}`);

    const page = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function groupedRowsByAdvertiser(
  rows: readonly Record<string, unknown>[],
): Array<{ advertiserId: string; locale: string; rows: number }> {
  const counts = new Map<string, { advertiserId: string; locale: string; rows: number }>();
  for (const row of rows) {
    if (row.provider !== "awin") continue;
    const advertiserId = String(row.advertiser_id ?? "");
    const locale = String(row.locale ?? "");
    const key = `${advertiserId}:${locale}`;
    const group = counts.get(key) ?? { advertiserId, locale, rows: 0 };
    group.rows += 1;
    counts.set(key, group);
  }
  return [...counts.values()].sort((left, right) =>
    left.advertiserId.localeCompare(right.advertiserId),
  );
}

function catalogPartitions(rows: readonly Record<string, unknown>[]) {
  const partitions = new Map<
    string,
    {
      advertiserId: string;
      locale: string;
      rows: number;
      approved: boolean;
    }
  >();
  for (const row of rows) {
    if (row.provider !== "awin") continue;
    const advertiserId = String(row.advertiser_id ?? "");
    const locale = String(row.locale ?? "");
    const key = `${advertiserId}:${locale}`;
    const partition = partitions.get(key) ?? {
      advertiserId,
      locale,
      rows: 0,
      approved: isApprovedAwinAdvertiserId(advertiserId),
    };
    partition.rows += 1;
    partitions.set(key, partition);
  }
  return [...partitions.values()].sort((left, right) =>
    left.advertiserId.localeCompare(right.advertiserId),
  );
}

function importHistory(rows: readonly Record<string, unknown>[]) {
  const imports = new Map<
    string,
    {
      advertiserId: string;
      locale: string;
      rows: number;
      approved: boolean;
      statuses: Record<string, number>;
    }
  >();
  for (const row of rows) {
    if (row.provider !== "awin") continue;
    const advertiserId = String(row.advertiser_id ?? "");
    const locale = String(row.locale ?? "");
    const key = `${advertiserId}:${locale}`;
    const entry = imports.get(key) ?? {
      advertiserId,
      locale,
      rows: 0,
      approved: isApprovedAwinAdvertiserId(advertiserId),
      statuses: {},
    };
    const status = String(row.status ?? "unknown");
    entry.rows += 1;
    entry.statuses[status] = (entry.statuses[status] ?? 0) + 1;
    imports.set(key, entry);
  }
  return [...imports.values()].sort((left, right) =>
    left.advertiserId.localeCompare(right.advertiserId),
  );
}

async function main() {
  const publisherId = requiredEnv("AWIN_PUBLISHER_ID");
  if (publisherId !== "2673864") {
    throw new Error("Configured Awin publisher ID does not match the expected publisher.");
  }
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const projectRef = projectRefFromUrl(supabaseUrl);
  if (!projectRef) throw new Error("Could not determine the Supabase project reference.");

  const supabase = createClient(
    supabaseUrl,
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [catalogRows, importRows, stagingRows, savedGiftRows, suggestionRows] =
    await Promise.all([
      readAllRows(
        supabase,
        "affiliate_products",
        "provider,advertiser_id,locale,active,availability",
      ),
      readAllRows(
        supabase,
        "affiliate_product_imports",
        "provider,advertiser_id,locale,status,record_count,valid_count,skipped_count,started_at,completed_at",
      ),
      readAllRows(
        supabase,
        "affiliate_product_staging",
        "provider,advertiser_id,locale",
      ),
      readAllRows(supabase, "recipient_saved_gift_ideas", "product_match"),
      readAllRows(supabase, "gift_suggestions", "suggestions"),
    ]);

  const catalogPreview = previewUnapprovedAwinCatalogCleanup(
    catalogRows.map((row) => ({
      provider: String(row.provider ?? ""),
      advertiserId: String(row.advertiser_id ?? ""),
      locale: String(row.locale ?? ""),
      active: row.active === true,
      availability: String(row.availability ?? ""),
    })) satisfies AwinCatalogCleanupRow[],
  );
  const imports = importHistory(importRows);
  const staging = groupedRowsByAdvertiser(stagingRows).map((group) => ({
    ...group,
    approved: isApprovedAwinAdvertiserId(group.advertiserId),
  }));

  console.log(
    JSON.stringify(
      {
        mode: "read-only",
        projectRef,
        publisherIdMatchesExpected: publisherId === "2673864",
        approvedAdvertisers: AWIN_APPROVED_ADVERTISERS,
        catalog: {
          ...catalogPreview,
          partitions: catalogPartitions(catalogRows),
        },
        imports,
        staging,
        dependentReferences: {
          savedGiftProductMatches: savedGiftRows.reduce(
            (count, row) => count + countUnapprovedAwinReferences(row.product_match),
            0,
          ),
          giftSuggestionProductMatches: suggestionRows.reduce(
            (count, row) => count + countUnapprovedAwinReferences(row.suggestions),
            0,
          ),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(sanitizedMessage(error));
  process.exitCode = 1;
});
