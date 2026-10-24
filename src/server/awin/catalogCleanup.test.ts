import assert from "node:assert/strict";
import test from "node:test";
import { previewUnapprovedAwinCatalogCleanup } from "./catalogCleanup";

test("cleanup preview targets only unapproved Awin catalog partitions", () => {
  const preview = previewUnapprovedAwinCatalogCleanup([
    {
      provider: "awin",
      advertiserId: "89509",
      locale: "en_US",
      active: true,
      availability: "in_stock",
    },
    {
      provider: "awin",
      advertiserId: "119395",
      locale: "en_US",
      active: true,
      availability: "in_stock",
    },
    {
      provider: "awin",
      advertiserId: "119395",
      locale: "en_US",
      active: false,
      availability: "out_of_stock",
    },
    {
      provider: "amazon",
      advertiserId: "119395",
      locale: "en_US",
      active: true,
      availability: "in_stock",
    },
  ]);

  assert.equal(preview.approvedProducts, 1);
  assert.equal(preview.unapprovedProducts, 2);
  assert.deepEqual(preview.unapprovedPartitions, [
    {
      advertiserId: "119395",
      locale: "en_US",
      totalProducts: 2,
      activeProducts: 1,
      activeInStockProducts: 1,
    },
  ]);
});
