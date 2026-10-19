import assert from "node:assert/strict";
import test from "node:test";
import { resolveAwinProductScope } from "./productIdentity";

const baseMatch = {
  provider: "awin",
  productId: "shared-1",
  merchant: "Piscifun",
  productTitle: "Fishing Reel",
  imageUrl: "https://images.example.test/reel.jpg",
  price: 49.99,
  currency: "USD",
  affiliateUrl:
    "https://www.awin1.com/cread.php?awinmid=89509&product=shared-1",
};

test("new Awin matches resolve through registered advertiser identity", () => {
  assert.deepEqual(
    resolveAwinProductScope({
      ...baseMatch,
      advertiserId: "89509",
      locale: "en_US",
    }),
    { advertiserId: "89509", locale: "en_US" },
  );
});

test("legacy Piscifun matches are inferred only from consistent canonical metadata", () => {
  assert.deepEqual(resolveAwinProductScope(baseMatch), {
    advertiserId: "89509",
    locale: "en_US",
  });
  assert.equal(
    resolveAwinProductScope({
      ...baseMatch,
      merchant: "Another Merchant",
    }),
    null,
  );
  assert.equal(
    resolveAwinProductScope({
      ...baseMatch,
      affiliateUrl:
        "https://www.awin1.com/cread.php?awinmid=99999&product=shared-1",
    }),
    null,
  );
});

test("unknown or mismatched advertiser identity fails closed", () => {
  assert.equal(
    resolveAwinProductScope({ ...baseMatch, advertiserId: "99999" }),
    null,
  );
  assert.equal(
    resolveAwinProductScope({
      ...baseMatch,
      advertiserId: "89509",
      locale: "en_GB",
    }),
    null,
  );
});
