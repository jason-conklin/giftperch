import { normalizeAwinProduct } from "./feed";
import {
  assertAwinImportContext,
  type AwinAdvertiserConfig,
} from "./advertisers";
import {
  type AffiliateProduct,
  type AffiliateProductImportRepository,
  type AwinImportContext,
  type FeedInspection,
  type ImportStats,
} from "./types";

export type AwinProductNormalizer = (
  record: unknown,
  options: {
    advertiserId: string;
    locale: string;
    importedAt: string;
    expectedLegacyFeedId?: string;
  },
) => ReturnType<typeof normalizeAwinProduct>;

const DEFAULT_BATCH_SIZE = 100;

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown import error";
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[redacted-token]",
    )
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 500);
}

export async function runAwinProductImport(options: {
  context: AwinImportContext;
  advertiserRegistry?: readonly AwinAdvertiserConfig[];
  records: AsyncIterable<unknown>;
  repository: AffiliateProductImportRepository;
  importedAt?: string;
  batchSize?: number;
  minimumValidProducts?: number;
  normalizeProduct?: AwinProductNormalizer;
}): Promise<{ importId: string; activatedProducts: number; stats: ImportStats }> {
  const advertiser = assertAwinImportContext(
    options.context,
    options.advertiserRegistry,
  );
  const importedAt = options.importedAt ?? new Date().toISOString();
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const configuredMinimum =
    advertiser.importSafeguards?.minimumValidProducts ?? 1;
  if (
    options.minimumValidProducts !== undefined &&
    (!Number.isInteger(options.minimumValidProducts) ||
      options.minimumValidProducts < 1)
  ) {
    throw new Error("minimumValidProducts must be a positive integer");
  }
  if (
    options.minimumValidProducts !== undefined &&
    options.minimumValidProducts < configuredMinimum
  ) {
    throw new Error(
      `minimumValidProducts must be at least ${configuredMinimum} for ${advertiser.displayName}`,
    );
  }
  const minimumValidProducts =
    options.minimumValidProducts ?? configuredMinimum;
  const normalizeProduct = options.normalizeProduct ?? normalizeAwinProduct;
  const stats: ImportStats = {
    recordsRead: 0,
    validProducts: 0,
    skippedProducts: 0,
  };
  const importId = await options.repository.beginImport(
    options.context,
    minimumValidProducts,
  );
  let batch: AffiliateProduct[] = [];

  try {
    for await (const record of options.records) {
      stats.recordsRead += 1;
      const normalized = normalizeProduct(record, {
        advertiserId: options.context.advertiserId,
        locale: options.context.locale,
        importedAt,
        expectedLegacyFeedId:
          advertiser.feed?.format === "legacy-csv-gzip"
            ? advertiser.feed.feedId
            : undefined,
      });
      if (!normalized.ok) {
        stats.skippedProducts += 1;
        continue;
      }

      batch.push(normalized.product);
      stats.validProducts += 1;
      if (batch.length >= batchSize) {
        await options.repository.stageProducts(importId, batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await options.repository.stageProducts(importId, batch);
    }
    if (stats.validProducts < minimumValidProducts) {
      throw new Error(
        `Awin feed contained ${stats.validProducts} valid products; at least ${minimumValidProducts} are required.`,
      );
    }

    const activatedProducts = await options.repository.finalizeImport(
      importId,
      stats,
    );
    return { importId, activatedProducts, stats };
  } catch (error) {
    await options.repository.failImport(
      importId,
      stats,
      safeErrorMessage(error),
    );
    throw error;
  }
}

export async function inspectAwinProductFeed(options: {
  advertiserId: string;
  locale: string;
  records: AsyncIterable<unknown>;
  importedAt?: string;
  normalizeProduct?: AwinProductNormalizer;
  expectedLegacyFeedId?: string;
}): Promise<FeedInspection> {
  const importedAt = options.importedAt ?? new Date().toISOString();
  const normalizeProduct = options.normalizeProduct ?? normalizeAwinProduct;
  const stats: FeedInspection = {
    recordsRead: 0,
    validProducts: 0,
    skippedProducts: 0,
    uniqueProducts: 0,
    duplicateProductIds: 0,
    duplicateRecords: 0,
    usableAffiliateLinks: 0,
    currencies: {},
    availability: {},
    skippedReasons: {},
  };
  const productIdCounts = new Map<string, number>();

  for await (const record of options.records) {
    stats.recordsRead += 1;
    const normalized = normalizeProduct(record, {
      advertiserId: options.advertiserId,
      locale: options.locale,
      importedAt,
      expectedLegacyFeedId: options.expectedLegacyFeedId,
    });
    if (normalized.ok) {
      stats.validProducts += 1;
      stats.usableAffiliateLinks += 1;
      stats.currencies[normalized.product.currency] =
        (stats.currencies[normalized.product.currency] ?? 0) + 1;
      stats.availability[normalized.product.availability] =
        (stats.availability[normalized.product.availability] ?? 0) + 1;
      productIdCounts.set(
        normalized.product.externalProductId,
        (productIdCounts.get(normalized.product.externalProductId) ?? 0) + 1,
      );
    } else {
      stats.skippedProducts += 1;
      stats.skippedReasons[normalized.reason] =
        (stats.skippedReasons[normalized.reason] ?? 0) + 1;
    }
  }

  stats.uniqueProducts = productIdCounts.size;
  for (const count of productIdCounts.values()) {
    if (count > 1) {
      stats.duplicateProductIds += 1;
      stats.duplicateRecords += count - 1;
    }
  }

  if (stats.validProducts === 0) {
    throw new Error("Awin feed contained no valid affiliate products.");
  }
  return stats;
}
