import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProductMatch } from "@/lib/affiliateProduct";
import {
  buildSavedGiftSnapshot,
  findAuthoritativeSuggestion,
  productMatchFromCatalogRow,
} from "@/server/savedGifts/productSnapshot";

const awinProduct = {
  provider: "awin",
  productId: "piscifun-1",
  merchant: "Piscifun",
  productTitle: "Carbon X3 Spinning Reel",
  imageUrl: "https://images.example.test/reel.jpg",
  price: 104.99,
  currency: "USD",
  affiliateUrl: "https://www.awin1.com/cread.php?product=piscifun-1",
};

test("saved product metadata survives a JSON round trip", () => {
  const suggestion = {
    id: "idea-1",
    title: "Lightweight fishing reel",
    short_description: "Original AI description",
    tier: "thoughtful",
    price_min: 80,
    price_max: 130,
    why_it_fits: "Original personalized reasoning",
    productMatch: awinProduct,
  };
  const selected = findAuthoritativeSuggestion(
    JSON.parse(JSON.stringify([suggestion])),
    "idea-1",
    suggestion.title,
  );
  assert.ok(selected);
  const snapshot = buildSavedGiftSnapshot(selected);
  const restored = normalizeProductMatch(
    JSON.parse(JSON.stringify(snapshot?.productMatch)),
  );

  assert.equal(snapshot?.title, suggestion.title);
  assert.equal(snapshot?.rationale, suggestion.why_it_fits);
  assert.equal(snapshot?.productUrl, awinProduct.affiliateUrl);
  assert.deepEqual(restored, awinProduct);
});

test("legacy suggestions without product metadata remain valid", () => {
  const snapshot = buildSavedGiftSnapshot({
    title: "Handmade ceramic mug",
    tier: "safe",
    why_it_fits: "They enjoy coffee.",
    suggested_url: "https://merchant.example.test/mug",
    image_url: "https://images.example.test/mug.jpg",
  });

  assert.equal(snapshot?.productMatch, null);
  assert.equal(snapshot?.productUrl, "https://merchant.example.test/mug");
  assert.equal(snapshot?.imageUrl, "https://images.example.test/mug.jpg");
});

test("legacy Amazon suggestion metadata is upgraded to a product snapshot", () => {
  const snapshot = buildSavedGiftSnapshot({
    title: "Travel watch case",
    amazonProduct: {
      asin: "B000TEST",
      title: "Leather Travel Watch Case",
      imageUrl: "https://images.example.test/watch.jpg",
      detailPageUrl: "https://www.amazon.com/dp/B000TEST?tag=giftperch-20",
      priceDisplay: "$39.99",
      currency: "USD",
    },
  });

  assert.equal(snapshot?.productMatch?.provider, "amazon");
  assert.equal(snapshot?.productMatch?.price, 39.99);
  assert.equal(snapshot?.productUrl, snapshot?.productMatch?.affiliateUrl);
});

test("canonical Awin catalog rows replace browser-provided metadata", () => {
  const canonical = productMatchFromCatalogRow({
    external_product_id: "piscifun-1",
    merchant_name: "Piscifun",
    title: "Canonical Carbon X3 Reel",
    image_url: "https://images.example.test/canonical.jpg",
    affiliate_url: "https://www.awin1.com/cread.php?canonical=1",
    price: "109.99",
    currency: "USD",
  });
  assert.equal(canonical?.productTitle, "Canonical Carbon X3 Reel");
  assert.equal(canonical?.price, 109.99);
});
