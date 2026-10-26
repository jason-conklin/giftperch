import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCurrentAwinDestinationHealth,
  collectAwinDestinationIdentities,
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
