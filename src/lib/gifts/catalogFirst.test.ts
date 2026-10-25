import assert from "node:assert/strict";
import test from "node:test";
import {
  CATALOG_NO_RESULTS_MESSAGE,
  getCatalogRecommendationResponseMetadata,
  getGiftRunEmptyMessage,
} from "./catalogFirst";

test("uses the catalog empty state only for catalog-first runs", () => {
  assert.equal(
    getGiftRunEmptyMessage("catalog_first"),
    CATALOG_NO_RESULTS_MESSAGE,
  );
  assert.equal(
    getGiftRunEmptyMessage(undefined),
    "No suggestions were found in this run.",
  );
});

test("returns a structured catalog no-results response", () => {
  assert.deepEqual(getCatalogRecommendationResponseMetadata(0), {
    recommendationStatus: "no_results",
    message: CATALOG_NO_RESULTS_MESSAGE,
  });
  assert.deepEqual(getCatalogRecommendationResponseMetadata(2), {
    recommendationStatus: "success",
  });
});
