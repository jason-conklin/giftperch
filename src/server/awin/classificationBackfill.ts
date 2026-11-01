import {
  classifyAffiliateProduct,
  extractStoredSourceCategory,
  type ProductClassification,
} from "./productClassification";

export type ClassificationBackfillProduct = {
  id: string;
  advertiserId: string;
  merchantName: string;
  title: string;
  description: string | null;
  sourceCategory?: string | null;
};

export type PersistedProductClassification = {
  productId: string;
  sourceCategory: string | null;
  classification: ProductClassification;
};

export type ClassificationBackfillRepository = {
  fetchPage(options: {
    advertiserId: string;
    afterId: string | null;
    limit: number;
  }): Promise<ClassificationBackfillProduct[]>;
  replaceClassification(
    classification: PersistedProductClassification,
  ): Promise<void>;
};

export type ClassificationBackfillResult = {
  evaluated: number;
  written: number;
  batches: number;
  nextCursor: string | null;
};

export function classifyBackfillProduct(
  product: ClassificationBackfillProduct,
): PersistedProductClassification {
  const sourceCategory =
    product.sourceCategory?.trim() ||
    extractStoredSourceCategory(product.description);
  return {
    productId: product.id,
    sourceCategory,
    classification: classifyAffiliateProduct({
      title: product.title,
      description: product.description,
      rawMerchantCategory: sourceCategory,
      advertiserId: product.advertiserId,
      merchantName: product.merchantName,
    }),
  };
}

export async function runProductClassificationBackfill(options: {
  advertiserId: string;
  batchSize: number;
  maxBatches: number;
  afterId?: string | null;
  write: boolean;
  repository: ClassificationBackfillRepository;
  onProgress?: (result: ClassificationBackfillResult) => void;
}): Promise<ClassificationBackfillResult> {
  let afterId = options.afterId ?? null;
  let evaluated = 0;
  let written = 0;
  let batches = 0;

  while (batches < options.maxBatches) {
    const page = await options.repository.fetchPage({
      advertiserId: options.advertiserId,
      afterId,
      limit: options.batchSize,
    });
    if (page.length === 0) break;

    for (const product of page) {
      const classification = classifyBackfillProduct(product);
      evaluated += 1;
      if (options.write) {
        await options.repository.replaceClassification(classification);
        written += 1;
      }
      afterId = product.id;
    }

    batches += 1;
    options.onProgress?.({ evaluated, written, batches, nextCursor: afterId });
    if (page.length < options.batchSize) break;
  }

  return { evaluated, written, batches, nextCursor: afterId };
}
