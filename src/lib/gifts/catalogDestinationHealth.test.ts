import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCurrentAwinDestinationHealth,
  collectAwinDestinationIdentities,
  resolveGiftCatalogPresentation,
} from "./catalogDestinationHealth";

const giftlabMatch = {
  provider: "awin",
  advertiserId: "95201",
  locale: "en_US",
  productId: "giftlab-1",
  merchant: "Giftlab",
  productTitle: "Personalized Mug",
  imageUrl: "https://images.example.test/mug.jpg",
  price: 25,
  currency: "USD",
  affiliateUrl: "https://www.awin1.com/pclick.php?p=1&m=95201",
};

test("current invalid catalog health overrides a previously valid snapshot", () => {
  const [suggestion] = applyCurrentAwinDestinationHealth(
    [
      {
        productMatch: {
          ...giftlabMatch,
          destinationHealthStatus: "valid",
          destinationCheckedAt: new Date().toISOString(),
        },
        suggested_url: giftlabMatch.affiliateUrl,
      },
    ],
    [
      {
        advertiserId: "95201",
        locale: "en_US",
        productId: "giftlab-1",
        status: "invalid",
        checkedAt: new Date().toISOString(),
      },
    ],
  );
  assert.equal(suggestion.suggested_url, null);
  assert.equal(
    (suggestion.productMatch as { destinationHealthStatus?: string })
      .destinationHealthStatus,
    "invalid",
  );
});

test("hydration replaces a conflicting Giftlab identity while preserving it as historical context", () => {
  const [suggestion] = applyCurrentAwinDestinationHealth(
    [
      {
        title: "Custom Star Map Print",
        short_description: "A framed print of the night sky.",
        productMatch: {
          ...giftlabMatch,
          productTitle: "Car Seat Cover Custom Car Seat Print Cute Pets",
        },
        suggested_url: giftlabMatch.affiliateUrl,
      },
    ],
    [
      {
        advertiserId: "95201",
        locale: "en_US",
        productId: "giftlab-1",
        status: "valid",
        checkedAt: new Date().toISOString(),
      },
    ],
  );
  assert.equal(suggestion.title, "Car Seat Cover Custom Car Seat Print Cute Pets");
  assert.equal(
    suggestion.short_description,
    "Original recommendation: Custom Star Map Print",
  );
  assert.equal(suggestion.suggested_url, giftlabMatch.affiliateUrl);
});

test("missing catalog rows fail closed only for advertisers requiring verification", () => {
  const [giftlab, piscifun] = applyCurrentAwinDestinationHealth(
    [
      { productMatch: giftlabMatch, suggested_url: giftlabMatch.affiliateUrl },
      {
        productMatch: {
          ...giftlabMatch,
          advertiserId: "89509",
          productId: "reel-1",
          merchant: "Piscifun",
        },
        suggested_url: giftlabMatch.affiliateUrl,
      },
    ],
    [],
  );
  assert.equal(giftlab.suggested_url, null);
  assert.equal(piscifun.suggested_url, giftlabMatch.affiliateUrl);
});

test("collects bounded catalog identities without duplicates", () => {
  assert.deepEqual(
    collectAwinDestinationIdentities([
      { productMatch: giftlabMatch },
      { productMatch: giftlabMatch },
      { productMatch: null },
    ]),
    [{ advertiserId: "95201", locale: "en_US", productId: "giftlab-1" }],
  );
});

test("historical Giftlab presentation uses catalog identity without hiding the original idea", () => {
  const presentation = resolveGiftCatalogPresentation({
    title: "Custom Star Map Print",
    supportingText: "A framed print of the night sky.",
    productMatch: {
      ...giftlabMatch,
      productTitle: "Car Seat Cover Custom Car Seat Print Cute Pets",
    },
  });
  assert.deepEqual(presentation, {
    title: "Car Seat Cover Custom Car Seat Print Cute Pets",
    supportingText: "Original recommendation: Custom Star Map Print",
    usesCatalogIdentity: true,
  });
});

test("equivalent Giftlab titles retain their supporting copy", () => {
  const presentation = resolveGiftCatalogPresentation({
    title: "Personalized Mug!",
    supportingText: "Chosen for a coffee lover.",
    productMatch: giftlabMatch,
  });
  assert.deepEqual(presentation, {
    title: "Personalized Mug",
    supportingText: "Chosen for a coffee lover.",
    usesCatalogIdentity: true,
  });
});

test("legitimate Giftlab naming variants remain shoppable with catalog identity", () => {
  const [suggestion] = applyCurrentAwinDestinationHealth(
    [
      {
        title: "Personalized Coffee Mug, 12 oz",
        short_description: "Chosen for a coffee lover.",
        productMatch: {
          ...giftlabMatch,
          productTitle: "Personalized Coffee Mug - 12 Ounce",
        },
        suggested_url: giftlabMatch.affiliateUrl,
      },
    ],
    [
      {
        advertiserId: "95201",
        locale: "en_US",
        productId: "giftlab-1",
        status: "valid",
        checkedAt: new Date().toISOString(),
      },
    ],
  );
  assert.equal(suggestion.title, "Personalized Coffee Mug - 12 Ounce");
  assert.equal(suggestion.suggested_url, giftlabMatch.affiliateUrl);
});

test("non-Giftlab presentation remains unchanged", () => {
  const presentation = resolveGiftCatalogPresentation({
    title: "Lightweight fishing reel",
    supportingText: "A practical fishing upgrade.",
    productMatch: {
      ...giftlabMatch,
      advertiserId: "89509",
      merchant: "Piscifun",
      productTitle: "Carbon X3 Spinning Reel",
    },
  });
  assert.deepEqual(presentation, {
    title: "Lightweight fishing reel",
    supportingText: "A practical fishing upgrade.",
    usesCatalogIdentity: false,
  });
});
