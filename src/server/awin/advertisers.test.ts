import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAwinImportContext,
  createAwinImportContext,
  resolveAwinAdvertiser,
  type AwinAdvertiserConfig,
} from "./advertisers";
import { AWIN_PROVIDER } from "./types";

const disabledAdvertiser: AwinAdvertiserConfig = {
  key: "disabled-test",
  advertiserId: "99901",
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

test("Fosi Audio is import-ready and enabled for runtime recommendations", () => {
  const fosi = resolveAwinAdvertiser("fosi-audio");

  assert.equal(fosi.advertiserId, "119395");
  assert.equal(fosi.displayName, "Fosi Audio");
  assert.equal(fosi.locale, "en_US");
  assert.equal(fosi.importEnabled, true);
  assert.equal(fosi.recommendationEnabled, true);
  assert.equal(fosi.matchingPolicy, "fosi-audio");
  assert.equal(fosi.importSafeguards?.minimumValidProducts, 300);
});

test("the validated batch advertisers are enabled with scoped safeguards", () => {
  const expected = [
    ["mosaic-weighted-blankets", "87403", "mosaic-comfort", 600],
    ["imarku", "78080", "imarku-kitchen", 180],
    ["baby-shusher", "118079", "baby-shusher", 20],
    ["mojo-fun", "122958", "mojo-fun", 300],
    ["loomy-home", "90515", "loomy-home", 1800],
    ["bonheur-jewelry", "90759", "bonheur-jewelry", 220],
    ["fan-ink", "103359", "fan-ink", 650],
    ["beyond-memories", "87175", "beyond-memories", 700],
  ] as const;

  for (const [key, advertiserId, matchingPolicy, minimumValidProducts] of expected) {
    const advertiser = resolveAwinAdvertiser(key);
    assert.equal(advertiser.advertiserId, advertiserId);
    assert.equal(advertiser.locale, "en_US");
    assert.equal(advertiser.importEnabled, true);
    assert.equal(advertiser.recommendationEnabled, true);
    assert.equal(advertiser.matchingPolicy, matchingPolicy);
    assert.equal(
      advertiser.importSafeguards?.minimumValidProducts,
      minimumValidProducts,
    );
  }
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
