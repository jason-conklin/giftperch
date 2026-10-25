import assert from "node:assert/strict";
import test from "node:test";
import {
  isPlaceholderProductUrl,
  resolveGiftProductDestination,
} from "./resolveGiftProductDestination";

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

test("preserves verified Awin destinations", () => {
  const awin = resolveGiftProductDestination({
    title: "Fishing reel",
    productUrl: "https://example.com/placeholder",
    productMatch: awinMatch,
  });
  assert.equal(awin?.href, awinMatch.affiliateUrl);
  assert.equal(awin?.label, "View at Piscifun");
});

test("preserves verified historical Amazon product snapshots", () => {
  const destination = resolveGiftProductDestination({
    title: "Travel watch case",
    productUrl: "https://www.amazon.com/dp/B000TEST?tag=older-tag",
    amazonProduct: {
      asin: "B000TEST",
      title: "Travel Watch Case",
      detailPageUrl: "https://www.amazon.com/dp/B000TEST?tag=giftperch-20",
      imageUrl: "https://images.example.test/watch-case.jpg",
      priceDisplay: "$29.99",
      currency: "USD",
      primeEligible: null,
    },
  });

  assert.equal(new URL(destination?.href ?? "").hostname, "www.amazon.com");
  assert.equal(new URL(destination?.href ?? "").pathname, "/dp/B000TEST");
  assert.equal(destination?.label, "View on Amazon");
});

test("disables historical placeholder and unsupported merchant URLs", () => {
  const destination = resolveGiftProductDestination({
    title: "NY Giants BBQ Set & Tools",
    productUrl: "https://example.com/gardening-tool-organizer",
  });

  assert.equal(isPlaceholderProductUrl("https://example.com/item"), true);
  const unsupported = resolveGiftProductDestination({
    title: "Unavailable course",
    productUrl: "https://courses.example-store.com/unavailable",
  });
  assert.equal(destination, null);
  assert.equal(unsupported, null);
});

test("does not fabricate shopping destinations for unmatched ideas", () => {
  const missing = resolveGiftProductDestination({
    title: "Personalized recipe book",
    productUrl: null,
  });
  const unavailable = resolveGiftProductDestination({
    title: "   ",
    productUrl: "https://example.org/not-real",
  });

  assert.equal(missing, null);
  assert.equal(unavailable, null);
});
