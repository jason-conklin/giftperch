import assert from "node:assert/strict";
import test from "node:test";
import {
  AFFILIATE_LINK_REL,
  AFFILIATE_SHOPPING_BUTTON_CLASS,
  getMatchedProductPresentation,
  getSafeExternalUrl,
  normalizeProductMatch,
} from "@/lib/affiliateProduct";
import { buildAmazonAffiliateUrl } from "@/lib/amazonAffiliate";

const awinMatch = {
  provider: "awin",
  productId: "piscifun-1",
  merchant: "Piscifun",
  productTitle: "Carbon X3 Spinning Reel",
  imageUrl: "https://images.example.test/reel.jpg",
  price: 104.99,
  currency: "USD",
  affiliateUrl: "https://www.awin1.com/cread.php?product=piscifun-1",
};

test("builds an Awin presentation with its validated tracking URL", () => {
  const presentation = getMatchedProductPresentation(awinMatch);
  assert.equal(presentation?.shoppingLabel, "View at Piscifun");
  assert.equal(presentation?.merchantLabel, "Sold by Piscifun");
  assert.equal(presentation?.priceDisplay, "$104.99 USD");
  assert.equal(presentation?.match.affiliateUrl, awinMatch.affiliateUrl);
  assert.equal(AFFILIATE_LINK_REL, "sponsored noopener noreferrer");
  assert.match(AFFILIATE_SHOPPING_BUTTON_CLASS, /gp-btn--gold/);
});

test("supports provider-neutral Amazon and legacy Amazon products", () => {
  const providerNeutral = getMatchedProductPresentation({
    provider: "amazon",
    productId: "B000TEST",
    merchant: "Amazon",
    productTitle: "Travel Watch Case",
    imageUrl: "https://images.example.test/watch.jpg",
    price: 39.99,
    currency: "USD",
    affiliateUrl: "https://www.amazon.com/dp/B000TEST?tag=giftperch-20",
  });
  const legacy = getMatchedProductPresentation(null, {
    asin: "B000LEGACY",
    title: "Legacy Watch Case",
    imageUrl: "https://images.example.test/legacy.jpg",
    detailPageUrl:
      "https://www.amazon.com/dp/B000LEGACY?tag=giftperch-20",
    priceDisplay: "$29.95",
    currency: "USD",
  });

  assert.equal(providerNeutral?.shoppingLabel, "View on Amazon");
  assert.equal(legacy?.match.productId, "B000LEGACY");
  assert.equal(legacy?.priceDisplay, "$29.95 USD");
});

test("returns no matched presentation when product metadata is absent", () => {
  assert.equal(getMatchedProductPresentation(null, null), null);
});

test("rejects unsafe and misleading affiliate URLs", () => {
  assert.equal(getSafeExternalUrl("javascript:alert(1)"), null);
  assert.equal(getSafeExternalUrl("http://example.com/product"), null);
  assert.equal(
    normalizeProductMatch({
      ...awinMatch,
      affiliateUrl: "http://www.awin1.com/cread.php?product=1",
    }),
    null,
  );
  assert.equal(
    normalizeProductMatch({
      ...awinMatch,
      affiliateUrl: "https://evilawin1.com/cread.php?product=1",
    }),
    null,
  );
  assert.equal(
    normalizeProductMatch({
      ...awinMatch,
      provider: "amazon",
      affiliateUrl: "https://example.com/not-amazon",
    }),
    null,
  );
  const fallback = buildAmazonAffiliateUrl({
    productUrl: "https://example.com/?redirect=amazon.com",
    title: "Safe fallback",
  });
  assert.equal(new URL(fallback).hostname, "www.amazon.com");
  assert.match(fallback, /s\?k=Safe%20fallback/);
});

test("rejects malformed product field types and invalid price metadata", () => {
  assert.equal(
    normalizeProductMatch({
      ...awinMatch,
      productId: { value: "piscifun-1" },
    }),
    null,
  );
  assert.equal(
    normalizeProductMatch({
      ...awinMatch,
      price: "104.99",
    }),
    null,
  );
  assert.equal(
    normalizeProductMatch({
      ...awinMatch,
      currency: "US dollars",
    }),
    null,
  );
});
