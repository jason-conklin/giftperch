import { isApprovedAwinAdvertiserId } from "./advertisers";
import { AWIN_PROVIDER } from "./types";

export type AwinCatalogCleanupRow = {
  provider: string;
  advertiserId: string;
  locale: string;
  active: boolean;
  availability: string;
};

export type AwinCatalogCleanupPartition = {
  advertiserId: string;
  locale: string;
  totalProducts: number;
  activeProducts: number;
  activeInStockProducts: number;
};

export type AwinCatalogCleanupPreview = {
  approvedProducts: number;
  unapprovedProducts: number;
  unapprovedPartitions: AwinCatalogCleanupPartition[];
};

/**
 * Produces a deletion preview without retaining product content or user data.
 * Only unapproved rows from the Awin catalog are deletion candidates.
 */
export function previewUnapprovedAwinCatalogCleanup(
  rows: readonly AwinCatalogCleanupRow[],
): AwinCatalogCleanupPreview {
  let approvedProducts = 0;
  const partitions = new Map<string, AwinCatalogCleanupPartition>();

  for (const row of rows) {
    if (row.provider !== AWIN_PROVIDER) continue;
    if (isApprovedAwinAdvertiserId(row.advertiserId)) {
      approvedProducts += 1;
      continue;
    }

    const key = `${row.advertiserId}:${row.locale}`;
    const partition = partitions.get(key) ?? {
      advertiserId: row.advertiserId,
      locale: row.locale,
      totalProducts: 0,
      activeProducts: 0,
      activeInStockProducts: 0,
    };
    partition.totalProducts += 1;
    if (row.active) {
      partition.activeProducts += 1;
      if (row.availability === "in_stock") {
        partition.activeInStockProducts += 1;
      }
    }
    partitions.set(key, partition);
  }

  const unapprovedPartitions = [...partitions.values()].sort((left, right) =>
    left.advertiserId.localeCompare(right.advertiserId),
  );
  return {
    approvedProducts,
    unapprovedProducts: unapprovedPartitions.reduce(
      (total, partition) => total + partition.totalProducts,
      0,
    ),
    unapprovedPartitions,
  };
}
