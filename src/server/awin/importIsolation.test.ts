import assert from "node:assert/strict";
import test from "node:test";
import { runAwinProductImport } from "./importer";
import {
  AWIN_PROVIDER,
  type AffiliateProduct,
  type AffiliateProductImportRepository,
  type AwinImportContext,
} from "./types";
import type { AwinAdvertiserConfig } from "./advertisers";

function advertiser(
  key: string,
  advertiserId: string,
): AwinAdvertiserConfig {
  return {
    key,
    advertiserId,
    displayName: `Merchant ${advertiserId}`,
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "standard",
  };
}

function context(config: AwinAdvertiserConfig): AwinImportContext {
  return {
    provider: AWIN_PROVIDER,
    publisherId: "publisher-1",
    advertiserId: config.advertiserId,
    locale: config.locale,
  };
}

function record(config: AwinAdvertiserConfig, id: string) {
  return {
    id,
    title: `Product ${id}`,
    description: "Synthetic product",
    price: "31.99 USD",
    availability: "in_stock",
    image_link: `https://images.example.test/${config.advertiserId}/${id}.jpg`,
    link: `https://merchant.example.test/${config.advertiserId}/${id}`,
    aw_deep_link: `https://www.awin1.com/cread.php?awinmid=${config.advertiserId}&product=${id}`,
    meta: {
      advertiser_id: config.advertiserId,
      advertiser_name: config.displayName,
    },
  };
}

class IsolatedRepository implements AffiliateProductImportRepository {
  private sequence = 0;
  readonly contexts = new Map<string, AwinImportContext>();
  readonly staged = new Map<string, AffiliateProduct[]>();
  readonly active = new Map<string, AffiliateProduct[]>();

  async beginImport(importContext: AwinImportContext): Promise<string> {
    const importId = `import-${++this.sequence}`;
    this.contexts.set(importId, importContext);
    this.staged.set(importId, []);
    return importId;
  }

  async stageProducts(importId: string, products: AffiliateProduct[]) {
    this.staged.get(importId)?.push(...products);
  }

  async finalizeImport(importId: string): Promise<number> {
    const importContext = this.contexts.get(importId);
    const products = this.staged.get(importId) ?? [];
    assert.ok(importContext);
    const scope = `${importContext.advertiserId}:${importContext.locale}`;
    this.active.set(scope, [...products]);
    return products.length;
  }

  async failImport(importId: string) {
    this.staged.delete(importId);
  }
}

async function* records(...items: unknown[]) {
  yield* items;
}

test("imports preserve advertiser isolation when external product IDs collide", async () => {
  const merchantA = advertiser("merchant-a", "100833");
  const merchantB = advertiser("merchant-b", "126623");
  const repository = new IsolatedRepository();

  await runAwinProductImport({
    context: context(merchantA),
    advertiserRegistry: [merchantA, merchantB],
    records: records(record(merchantA, "shared-product")),
    repository,
  });
  await runAwinProductImport({
    context: context(merchantB),
    advertiserRegistry: [merchantA, merchantB],
    records: records(record(merchantB, "shared-product")),
    repository,
  });

  assert.equal(repository.active.get("100833:en_US")?.length, 1);
  assert.equal(repository.active.get("126623:en_US")?.length, 1);
  assert.equal(
    repository.active.get("100833:en_US")?.[0].advertiserId,
    "100833",
  );
  assert.equal(
    repository.active.get("126623:en_US")?.[0].advertiserId,
    "126623",
  );
});

test("a failed import cannot finalize or replace another advertiser scope", async () => {
  const merchantA = advertiser("merchant-a", "100833");
  const merchantB = advertiser("merchant-b", "126623");
  const repository = new IsolatedRepository();

  await runAwinProductImport({
    context: context(merchantB),
    advertiserRegistry: [merchantA, merchantB],
    records: records(record(merchantB, "existing")),
    repository,
  });
  await assert.rejects(
    runAwinProductImport({
      context: context(merchantA),
      advertiserRegistry: [merchantA, merchantB],
      records: records(record(merchantB, "wrong-advertiser")),
      repository,
      minimumValidProducts: 1,
    }),
    /at least 1 are required/,
  );

  assert.equal(repository.active.has("100833:en_US"), false);
  assert.equal(repository.active.get("126623:en_US")?.[0].externalProductId, "existing");
});

test("advertiser minimum-product safeguards cannot be lowered by a caller", async () => {
  const guardedAdvertiser = {
    ...advertiser("guarded", "117209"),
    importSafeguards: { minimumValidProducts: 300 },
  };
  const repository = new IsolatedRepository();

  await assert.rejects(
    runAwinProductImport({
      context: context(guardedAdvertiser),
      advertiserRegistry: [guardedAdvertiser],
      records: records(record(guardedAdvertiser, "one-product")),
      repository,
      minimumValidProducts: 1,
    }),
    /must be at least 300/,
  );
  assert.equal(repository.contexts.size, 0);
});
