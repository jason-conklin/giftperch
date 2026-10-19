import assert from "node:assert/strict";
import test from "node:test";
import { findMatchingSavedGift } from "./deduplication";

test("findMatchingSavedGift prevents normalized title duplicates", () => {
  const existing = [{ id: "saved-1", title: "Fishing Gift Set" }];

  assert.deepEqual(
    findMatchingSavedGift(existing, "  FISHING gift set!!!  "),
    existing[0],
  );
});

test("findMatchingSavedGift allows a distinct gift concept", () => {
  const existing = [{ id: "saved-1", title: "Fishing Gift Set" }];

  assert.equal(findMatchingSavedGift(existing, "Kayak Storage Rack"), null);
});

test("findMatchingSavedGift rejects an empty requested title", () => {
  assert.equal(findMatchingSavedGift([{ title: "Fishing Gift Set" }], "  "), null);
});

test("stable product identity allows distinct products with the same title", () => {
  const existing = [
    {
      id: "saved-1",
      title: "Premium Fishing Reel",
      product_match: {
        provider: "awin",
        productId: "reel-1",
        merchant: "Piscifun",
        productTitle: "Reel One",
        imageUrl: "https://images.example.test/one.jpg",
        price: 99,
        currency: "USD",
        affiliateUrl: "https://www.awin1.com/cread.php?id=1",
      },
    },
  ];
  const secondProduct = {
    provider: "awin",
    productId: "reel-2",
    merchant: "Piscifun",
    productTitle: "Reel Two",
    imageUrl: "https://images.example.test/two.jpg",
    price: 109,
    currency: "USD",
    affiliateUrl: "https://www.awin1.com/cread.php?id=2",
  };

  assert.equal(
    findMatchingSavedGift(existing, "Premium Fishing Reel", secondProduct),
    null,
  );
});

test("the same external product ID remains distinct across Awin advertisers", () => {
  const existing = [
    {
      title: "Shared product title",
      product_match: {
        provider: "awin",
        advertiserId: "90001",
        locale: "en_US",
        productId: "shared-1",
        merchant: "Merchant A",
        productTitle: "Shared product title",
        imageUrl: "https://images.example.test/a.jpg",
        price: 49,
        currency: "USD",
        affiliateUrl: "https://www.awin1.com/cread.php?awinmid=90001",
      },
    },
  ];
  const otherAdvertiser = {
    ...existing[0].product_match,
    advertiserId: "90002",
    merchant: "Merchant B",
    imageUrl: "https://images.example.test/b.jpg",
    affiliateUrl: "https://www.awin1.com/cread.php?awinmid=90002",
  };

  assert.equal(
    findMatchingSavedGift(existing, "Shared product title", otherAdvertiser),
    null,
  );
});

test("legacy Piscifun metadata matches a canonical scoped record only when its URL agrees", () => {
  const legacy = {
    provider: "awin",
    productId: "reel-1",
    merchant: "Piscifun",
    productTitle: "Reel One",
    imageUrl: "https://images.example.test/reel.jpg",
    price: 99,
    currency: "USD",
    affiliateUrl: "https://www.awin1.com/cread.php?awinmid=89509&id=1",
  };
  const canonical = {
    ...legacy,
    advertiserId: "89509",
    locale: "en_US",
  };

  assert.ok(
    findMatchingSavedGift(
      [{ title: "Old title", product_match: legacy }],
      "New title",
      canonical,
    ),
  );
  assert.equal(
    findMatchingSavedGift(
      [{ title: "Old title", product_match: legacy }],
      "New title",
      { ...canonical, affiliateUrl: "https://www.awin1.com/cread.php?id=2" },
    ),
    null,
  );
});
