export const AWIN_PROVIDER = "awin";

export type AffiliateProduct = {
  provider: typeof AWIN_PROVIDER;
  advertiserId: string;
  merchantName: string;
  externalProductId: string;
  locale: string;
  title: string;
  description: string | null;
  imageUrl: string;
  destinationUrl: string;
  affiliateUrl: string;
  price: string;
  currency: string;
  availability: string;
  importedAt: string;
};

export type NormalizeResult =
  | { ok: true; product: AffiliateProduct }
  | { ok: false; reason: string };

export type ImportStats = {
  recordsRead: number;
  validProducts: number;
  skippedProducts: number;
};

export type FeedInspection = ImportStats & {
  uniqueProducts: number;
  duplicateProductIds: number;
  duplicateRecords: number;
  usableAffiliateLinks: number;
  currencies: Record<string, number>;
  availability: Record<string, number>;
  skippedReasons: Record<string, number>;
};

export type AwinImportContext = {
  provider: typeof AWIN_PROVIDER;
  publisherId: string;
  advertiserId: string;
  locale: string;
};

export interface AffiliateProductImportRepository {
  beginImport(
    context: AwinImportContext,
    minimumValidProducts: number,
  ): Promise<string>;
  stageProducts(importId: string, products: AffiliateProduct[]): Promise<void>;
  finalizeImport(importId: string, stats: ImportStats): Promise<number>;
  failImport(
    importId: string,
    stats: ImportStats,
    errorMessage: string,
  ): Promise<void>;
}
