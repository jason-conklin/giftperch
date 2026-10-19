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

test("preserves genuine Awin and merchant destinations", () => {
  const awin = resolveGiftProductDestination({
    title: "Fishing reel",
    productUrl: "https://example.com/placeholder",
    productMatch: awinMatch,
  });
  const merchant = resolveGiftProductDestination({
    title: "Garden organizer",
    productUrl: "https://shop.example-store.com/products/garden-organizer?ref=gp",
  });

  assert.equal(awin?.href, awinMatch.affiliateUrl);
  assert.equal(awin?.label, "View at Piscifun");
  assert.equal(
    merchant?.href,
    "https://shop.example-store.com/products/garden-organizer?ref=gp",
  );
  assert.equal(merchant?.isAffiliate, false);
});

test("preserves valid Amazon destinations through the existing tag builder", () => {
  const destination = resolveGiftProductDestination({
    title: "Travel watch case",
    productUrl: "https://www.amazon.com/dp/B000TEST?tag=older-tag",
  });

  assert.equal(new URL(destination?.href ?? "").hostname, "www.amazon.com");
  assert.equal(new URL(destination?.href ?? "").pathname, "/dp/B000TEST");
  assert.equal(destination?.label, "View on Amazon");
});

test("replaces historical placeholder URLs with an encoded Amazon search", () => {
  const destination = resolveGiftProductDestination({
    title: "NY Giants BBQ Set & Tools",
    productUrl: "https://example.com/gardening-tool-organizer",
  });

  assert.equal(isPlaceholderProductUrl("https://example.com/item"), true);
  assert.equal(new URL(destination?.href ?? "").hostname, "www.amazon.com");
  assert.equal(
    new URL(destination?.href ?? "").searchParams.get("k"),
    "NY Giants BBQ Set & Tools",
  );
});

test("builds a search for missing URLs and disables empty records", () => {
  const search = resolveGiftProductDestination({
    title: "Personalized recipe book",
    productUrl: null,
  });
  const unavailable = resolveGiftProductDestination({
    title: "   ",
    productUrl: "https://example.org/not-real",
  });

  assert.match(search?.href ?? "", /^https:\/\/www\.amazon\.com\/s\?/);
  assert.equal(unavailable, null);
});
