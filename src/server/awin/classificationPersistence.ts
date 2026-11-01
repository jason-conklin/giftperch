import type { AffiliateProduct } from "./types";

export type ClassificationStagingFields = {
  source_category: string | null;
  classification_primary_category: string;
  classification_version: number;
  classification_confidence: "high" | "medium" | "low";
  classification_evidence: unknown;
  classification_facets: string[];
};

export function classificationStagingFields(
  product: AffiliateProduct,
): ClassificationStagingFields {
  if (!product.classification) {
    throw new Error(
      "Awin product normalization did not produce classification metadata.",
    );
  }
  return {
    source_category: product.sourceCategory ?? null,
    classification_primary_category: product.classification.primaryCategory,
    classification_version: product.classification.classificationVersion,
    classification_confidence: product.classification.confidence,
    classification_evidence: product.classification.evidence,
    classification_facets: product.classification.facets,
  };
}
