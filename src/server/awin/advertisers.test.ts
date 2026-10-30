import assert from "node:assert/strict";
import test from "node:test";
import {
  AWIN_APPROVED_ADVERTISERS,
  assertAwinImportContext,
  createAwinImportContext,
  findAwinAdvertiserById,
  findRecommendationEnabledAwinAdvertiserById,
  getConfiguredLegacyAwinFeedId,
  getImportEnabledAwinAdvertisers,
  isAwinProductDestinationCurrent,
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
  assert.equal(AWIN_APPROVED_ADVERTISERS.length, 19);
  for (const advertiser of AWIN_APPROVED_ADVERTISERS) {
    assert.equal(isApprovedAwinAdvertiserId(advertiser.advertiserId), true);
  }

  assert.equal(isApprovedAwinAdvertiserId("119395"), false);
  assert.equal(isApprovedAwinAdvertiserId("unknown"), false);
});

test("LoveIsARose is approved for legacy-feed imports and catalog recommendations", () => {
  const loveIsARose = resolveAwinAdvertiser("love-is-a-rose");

  assert.equal(isApprovedAwinAdvertiserId("96879"), true);
  assert.equal(loveIsARose.advertiserId, "96879");
  assert.equal(loveIsARose.displayName, "LoveIsARose.com");
  assert.equal(loveIsARose.locale, "en_US");
  assert.equal(loveIsARose.importEnabled, true);
  assert.equal(loveIsARose.recommendationEnabled, true);
  assert.equal(loveIsARose.matchingPolicy, "love-is-a-rose");
  assert.equal(loveIsARose.importSafeguards?.minimumValidProducts, 400);
  assert.deepEqual(loveIsARose.feed, {
    format: "legacy-csv-gzip",
    feedId: "113072",
  });
  assert.equal(
    getConfiguredLegacyAwinFeedId({
      advertiserId: loveIsARose.advertiserId,
      locale: loveIsARose.locale,
    }),
    "113072",
  );
  assert.equal(
    getImportEnabledAwinAdvertisers().some(
      (advertiser) => advertiser.advertiserId === "96879",
    ),
    true,
  );
  assert.equal(
    findRecommendationEnabledAwinAdvertiserById("96879")?.key,
    "love-is-a-rose",
  );
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

test("Giftlab is enabled for imports and catalog recommendations", () => {
  const giftlab = resolveAwinAdvertiser("giftlab");
  assert.equal(giftlab.advertiserId, "95201");
  assert.equal(giftlab.locale, "en_US");
  assert.equal(giftlab.importEnabled, true);
  assert.equal(giftlab.recommendationEnabled, true);
  assert.equal(giftlab.requireVerifiedProductDestination, true);
  assert.equal(giftlab.destinationValidationMaxAgeHours, 72);
  assert.deepEqual(giftlab.destinationValidationHosts, ["giftlab.com"]);
  assert.equal(
    findRecommendationEnabledAwinAdvertiserById("95201")?.key,
    "giftlab",
  );
  assert.equal(giftlab.matchingPolicy, "giftlab-personalized");
  assert.equal(giftlab.importSafeguards?.minimumValidProducts, 2000);
  assert.deepEqual(giftlab.feed, {
    format: "legacy-csv-gzip",
    feedId: "105668",
  });
});

test("Giftlab destination eligibility requires a recent valid catalog verdict", () => {
  const now = Date.parse("2026-10-26T20:00:00.000Z");
  const fresh = new Date(now - 71 * 60 * 60 * 1_000).toISOString();
  const stale = new Date(now - 73 * 60 * 60 * 1_000).toISOString();

  assert.equal(
    isAwinProductDestinationCurrent({
      advertiserId: "95201",
      status: "valid",
      checkedAt: fresh,
      now,
    }),
    true,
  );
  for (const [status, checkedAt] of [
    ["valid", stale],
    ["valid", null],
    ["invalid", fresh],
    ["uncertain", fresh],
    ["unchecked", fresh],
  ] as const) {
    assert.equal(
      isAwinProductDestinationCurrent({
        advertiserId: "95201",
        status,
        checkedAt,
        now,
      }),
      false,
    );
  }

  assert.equal(
    isAwinProductDestinationCurrent({
      advertiserId: "89509",
      status: "unchecked",
      checkedAt: null,
      now,
    }),
    true,
  );
  assert.equal(
    isAwinProductDestinationCurrent({
      advertiserId: "90759",
      status: "unchecked",
      checkedAt: null,
      now,
    }),
    true,
  );
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
