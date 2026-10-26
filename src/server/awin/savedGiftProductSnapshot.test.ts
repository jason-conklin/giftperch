import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProductMatch } from "@/lib/affiliateProduct";
import {
  buildSavedGiftSnapshot,
  findAuthoritativeSuggestion,
  getSavedGiftDestinationError,
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

function suggestionFixture(options: {
  id?: string;
  title: string;
  productId: string;
  affiliateUrl: string;
}) {
  return {
    ...(options.id ? { id: options.id } : {}),
    title: options.title,
    suggested_url: options.affiliateUrl,
    productMatch: {
      ...awinProduct,
      productId: options.productId,
      productTitle: options.title,
      affiliateUrl: options.affiliateUrl,
    },
  };
}

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

test("legacy catalog suggestions can be resolved after authoritative title hydration", () => {
  const original = {
    title: "Custom Star Map Print",
    suggested_url: awinProduct.affiliateUrl,
    productMatch: awinProduct,
  };
  const selected = findAuthoritativeSuggestion(
    [original],
    null,
    "Car Seat Cover Custom Car Seat Print Cute Pets",
    awinProduct.affiliateUrl,
  );
  assert.equal(selected, original);
});

test("item ID resolves the correct suggestion when titles collide", () => {
  const first = suggestionFixture({
    id: "idea-1",
    title: "Personalized Mug",
    productId: "mug-1",
    affiliateUrl: "https://www.awin1.com/cread.php?product=mug-1",
  });
  const second = suggestionFixture({
    id: "idea-2",
    title: "Personalized Mug",
    productId: "mug-2",
    affiliateUrl: "https://www.awin1.com/cread.php?product=mug-2",
  });

  assert.equal(
    findAuthoritativeSuggestion(
      [first, second],
      "idea-2",
      first.title,
      first.suggested_url,
    ),
    second,
  );
});

test("a unique URL resolves the correct legacy suggestion before a colliding title", () => {
  const first = suggestionFixture({
    title: "Personalized Mug",
    productId: "mug-1",
    affiliateUrl: "https://www.awin1.com/cread.php?product=mug-1",
  });
  const second = suggestionFixture({
    title: "Personalized Mug",
    productId: "mug-2",
    affiliateUrl: "https://www.awin1.com/cread.php?product=mug-2",
  });

  assert.equal(
    findAuthoritativeSuggestion(
      [first, second],
      null,
      first.title,
      second.suggested_url,
    ),
    second,
  );
});

test("duplicate URL matches fail closed without falling back to title", () => {
  const sharedUrl = "https://www.awin1.com/cread.php?product=shared";
  const first = suggestionFixture({
    title: "First Unique Title",
    productId: "shared-1",
    affiliateUrl: sharedUrl,
  });
  const second = suggestionFixture({
    title: "Second Unique Title",
    productId: "shared-2",
    affiliateUrl: sharedUrl,
  });

  assert.equal(
    findAuthoritativeSuggestion(
      [first, second],
      null,
      first.title,
      sharedUrl,
    ),
    null,
  );
});

test("duplicate normalized titles fail closed when no URL identity is available", () => {
  const first = suggestionFixture({
    title: "Personalized   Mug",
    productId: "mug-1",
    affiliateUrl: "https://www.awin1.com/cread.php?product=mug-1",
  });
  const second = suggestionFixture({
    title: " personalized mug ",
    productId: "mug-2",
    affiliateUrl: "https://www.awin1.com/cread.php?product=mug-2",
  });

  assert.equal(
    findAuthoritativeSuggestion(
      [first, second],
      null,
      "Personalized Mug",
      null,
    ),
    null,
  );
});

test("ordinary unique title fallback remains available without a usable URL", () => {
  const suggestion = suggestionFixture({
    title: "Personalized Mug",
    productId: "mug-1",
    affiliateUrl: "https://www.awin1.com/cread.php?product=mug-1",
  });
  assert.equal(
    findAuthoritativeSuggestion(
      [suggestion],
      null,
      "  PERSONALIZED   MUG ",
      "not-a-url",
    ),
    suggestion,
  );
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
    advertiser_id: "89509",
    locale: "en_US",
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
  assert.equal(canonical?.advertiserId, "89509");
  assert.equal(canonical?.locale, "en_US");
});

test("canonical catalog health replaces client-provided destination claims", () => {
  const clientMatch = normalizeProductMatch({
    ...awinProduct,
    advertiserId: "95201",
    locale: "en_US",
    destinationHealthStatus: "valid",
    destinationCheckedAt: new Date().toISOString(),
  });
  const canonical = productMatchFromCatalogRow({
    advertiser_id: "95201",
    locale: "en_US",
    external_product_id: "giftlab-1",
    merchant_name: "Giftlab",
    title: "Canonical Giftlab Product",
    image_url: "https://images.example.test/canonical.jpg",
    affiliate_url: "https://www.awin1.com/cread.php?canonical=1",
    price: "29.99",
    currency: "USD",
    destination_health_status: "invalid",
    destination_checked_at: "2026-10-20T00:00:00.000Z",
  });

  assert.equal(clientMatch?.destinationHealthStatus, "valid");
  assert.equal(canonical?.destinationHealthStatus, "invalid");
  assert.equal(canonical?.destinationCheckedAt, "2026-10-20T00:00:00.000Z");
});

test("save eligibility rejects stale and non-valid Giftlab catalog health", () => {
  const now = Date.parse("2026-10-26T20:00:00.000Z");
  const base = normalizeProductMatch({
    ...awinProduct,
    advertiserId: "95201",
    locale: "en_US",
  });
  assert.ok(base);
  const fresh = {
    ...base,
    destinationHealthStatus: "valid" as const,
    destinationCheckedAt: new Date(now - 60 * 60 * 1_000).toISOString(),
  };
  assert.equal(getSavedGiftDestinationError(fresh, now), null);

  for (const candidate of [
    base,
    {
      ...fresh,
      destinationCheckedAt: new Date(
        now - 73 * 60 * 60 * 1_000,
      ).toISOString(),
    },
    { ...fresh, destinationCheckedAt: undefined },
    { ...fresh, destinationHealthStatus: "invalid" as const },
    { ...fresh, destinationHealthStatus: "uncertain" as const },
    { ...fresh, destinationHealthStatus: "unchecked" as const },
  ]) {
    assert.match(
      getSavedGiftDestinationError(candidate, now) ?? "",
      /no longer available/i,
    );
  }
});

test("save eligibility leaves Piscifun and BONHEUR behavior unchanged", () => {
  for (const [advertiserId, merchant] of [
    ["89509", "Piscifun"],
    ["90759", "BONHEUR JEWELRY"],
  ]) {
    const product = normalizeProductMatch({
      ...awinProduct,
      advertiserId,
      locale: "en_US",
      merchant,
      destinationHealthStatus: "unchecked",
    });
    assert.ok(product);
    assert.equal(getSavedGiftDestinationError(product), null);
  }
});
