import assert from "node:assert/strict";
import test from "node:test";
import { classifyAffiliateProduct } from "./productClassification";
import { classificationStagingFields } from "./classificationPersistence";
import { AWIN_PROVIDER, type AffiliateProduct } from "./types";

function product(overrides: Partial<AffiliateProduct> = {}): AffiliateProduct {
  return {
    provider: AWIN_PROVIDER,
    advertiserId: "95201",
    merchantName: "Giftlab",
    externalProductId: "example",
    locale: "en_US",
    title: "Personalized Photo Mug",
    description: "A custom mug.",
    imageUrl: "https://images.example.test/mug.jpg",
    destinationUrl: "https://merchant.example.test/mug",
    affiliateUrl: "https://www.awin1.com/cread.php?awinmid=95201",
    price: "19.95",
    currency: "USD",
    availability: "in_stock",
    importedAt: "2026-11-01T00:00:00.000Z",
    sourceCategory: "Personalized",
    classification: classifyAffiliateProduct({
      advertiserId: "95201",
      title: "Personalized Photo Mug",
      rawMerchantCategory: "Personalized",
    }),
    ...overrides,
  };
}

test("maps source categories and deterministic classifications into staging fields", () => {
  const fields = classificationStagingFields(product());
  assert.equal(fields.source_category, "Personalized");
  assert.equal(fields.classification_primary_category, "personalized_gifts");
  assert.equal(fields.classification_version, 1);
  assert.equal(fields.classification_confidence, "high");
  assert.deepEqual(fields.classification_facets, ["drinkware", "personalized", "photo_gift"]);
  assert.ok(Array.isArray(fields.classification_evidence));
});

test("fails closed instead of staging incomplete classification data", () => {
  assert.throws(
    () => classificationStagingFields(product({ classification: undefined })),
    /did not produce classification metadata/,
  );
});
