import assert from "node:assert/strict";
import test from "node:test";
import {
  AWIN_APPROVED_ADVERTISERS,
  assertAwinImportContext,
  createAwinImportContext,
  findAwinAdvertiserById,
  findRecommendationEnabledAwinAdvertiserById,
  getImportEnabledAwinAdvertisers,
  isApprovedAwinAdvertiserId,
  resolveAwinAdvertiser,
  type AwinAdvertiserConfig,
} from "./advertisers";
import { AWIN_PROVIDER } from "./types";

const disabledAdvertiser: AwinAdvertiserConfig = {
  key: "disabled-test",
  advertiserId: "100833",
  displayName: "Disabled Test Advertiser",
  locale: "en_US",
  importEnabled: false,
  recommendationEnabled: false,
  matchingPolicy: "standard",
};

test("Piscifun remains the default enabled Awin advertiser", () => {
  const defaultAdvertiser = resolveAwinAdvertiser();
  const explicitAdvertiser = resolveAwinAdvertiser("89509");

  assert.equal(defaultAdvertiser.key, "piscifun");
  assert.equal(defaultAdvertiser.advertiserId, "89509");
  assert.equal(defaultAdvertiser.locale, "en_US");
  assert.equal(defaultAdvertiser.importEnabled, true);
  assert.equal(defaultAdvertiser.recommendationEnabled, true);
  assert.equal(defaultAdvertiser.matchingPolicy, "piscifun-fishing");
  assert.equal(explicitAdvertiser.key, defaultAdvertiser.key);
});

test("the Joined-program allowlist permits only the authoritative advertiser IDs", () => {
  assert.equal(AWIN_APPROVED_ADVERTISERS.length, 18);
  for (const advertiser of AWIN_APPROVED_ADVERTISERS) {
    assert.equal(isApprovedAwinAdvertiserId(advertiser.advertiserId), true);
  }

  assert.equal(isApprovedAwinAdvertiserId("119395"), false);
  assert.equal(isApprovedAwinAdvertiserId("unknown"), false);
});

test("unjoined advertisers are unavailable to imports and runtime recommendations", () => {
  assert.throws(
    () => resolveAwinAdvertiser("fosi-audio"),
    /not approved/,
  );
  assert.equal(findAwinAdvertiserById("119395"), null);
  assert.equal(findRecommendationEnabledAwinAdvertiserById("119395"), null);
  assert.equal(
    getImportEnabledAwinAdvertisers().some(
      (advertiser) => advertiser.advertiserId === "119395",
    ),
    false,
  );

  const bonheur = resolveAwinAdvertiser("bonheur-jewelry");
  assert.equal(bonheur.advertiserId, "90759");
  assert.equal(bonheur.importEnabled, true);
  assert.equal(bonheur.recommendationEnabled, true);
});

test("Giftlab is enabled for approved Legacy feed imports and recommendations", () => {
  const giftlab = resolveAwinAdvertiser("giftlab");
  assert.equal(giftlab.advertiserId, "95201");
  assert.equal(giftlab.locale, "en_US");
  assert.equal(giftlab.importEnabled, true);
  assert.equal(giftlab.recommendationEnabled, true);
  assert.equal(giftlab.matchingPolicy, "giftlab-personalized");
  assert.equal(giftlab.importSafeguards?.minimumValidProducts, 2000);
  assert.deepEqual(giftlab.feed, {
    format: "legacy-csv-gzip",
    feedId: "105668",
  });
});

test("unknown and disabled advertiser selections fail closed", () => {
  assert.throws(() => resolveAwinAdvertiser("unknown"), /Unknown Awin advertiser/);
  assert.throws(
    () => resolveAwinAdvertiser("disabled-test", [disabledAdvertiser]),
    /imports are disabled/,
  );
});

test("import contexts must match the selected advertiser and locale", () => {
  const advertiser = resolveAwinAdvertiser();
  const context = createAwinImportContext("publisher-1", advertiser);

  assert.deepEqual(context, {
    provider: AWIN_PROVIDER,
    publisherId: "publisher-1",
    advertiserId: "89509",
    locale: "en_US",
  });
  assert.throws(
    () =>
      assertAwinImportContext(
        { ...context, advertiserId: "99902" },
        [advertiser],
      ),
    /Unknown Awin advertiser/,
  );
  assert.throws(
    () =>
      assertAwinImportContext(
        { ...context, advertiserId: disabledAdvertiser.advertiserId },
        [disabledAdvertiser],
      ),
    /imports are disabled/,
  );
});
