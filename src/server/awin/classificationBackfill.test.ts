import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyBackfillProduct,
  runProductClassificationBackfill,
  type ClassificationBackfillProduct,
  type ClassificationBackfillRepository,
} from "./classificationBackfill";

function product(id: string, title = "Custom Photo Mug"): ClassificationBackfillProduct {
  return {
    id,
    advertiserId: "95201",
    merchantName: "Giftlab",
    title,
    description: "Category: Personalized. A durable keepsake.",
  };
}

test("backfill recovers legacy source categories and produces persistence-safe classifications", () => {
  const result = classifyBackfillProduct(product("00000000-0000-0000-0000-000000000001"));
  assert.equal(result.sourceCategory, "Personalized");
  assert.equal(result.classification.primaryCategory, "personalized_gifts");
  assert.ok(result.classification.facets.includes("personalized"));
});

test("dry-run classification is paginated and performs no writes", async () => {
  const pages = [
    [product("00000000-0000-0000-0000-000000000001"), product("00000000-0000-0000-0000-000000000002")],
    [product("00000000-0000-0000-0000-000000000003")],
  ];
  let page = 0;
  let writes = 0;
  const repository: ClassificationBackfillRepository = {
    async fetchPage() {
      return pages[page++] ?? [];
    },
    async replaceClassification() {
      writes += 1;
    },
  };

  const result = await runProductClassificationBackfill({
    advertiserId: "95201",
    batchSize: 2,
    maxBatches: 2,
    write: false,
    repository,
  });
  assert.deepEqual(result, {
    evaluated: 3,
    written: 0,
    batches: 2,
    nextCursor: "00000000-0000-0000-0000-000000000003",
  });
  assert.equal(writes, 0);
});

test("write mode resumes at the returned cursor and stops on a partial failure", async () => {
  const first = product("00000000-0000-0000-0000-000000000001");
  const second = product("00000000-0000-0000-0000-000000000002");
  const writes: string[] = [];
  const repository: ClassificationBackfillRepository = {
    async fetchPage({ afterId }) {
      assert.equal(afterId, null);
      return [first, second];
    },
    async replaceClassification(value) {
      writes.push(value.productId);
      if (value.productId === second.id) throw new Error("simulated write failure");
    },
  };

  await assert.rejects(
    runProductClassificationBackfill({
      advertiserId: "95201",
      batchSize: 2,
      maxBatches: 1,
      write: true,
      repository,
    }),
    /simulated write failure/,
  );
  assert.deepEqual(writes, [first.id, second.id]);
});

test("reclassification replaces facets idempotently without touching product fields", async () => {
  const item = product(
    "00000000-0000-0000-0000-000000000009",
    "Gold Initial Necklace",
  );
  const stored = {
    title: item.title,
    price: "49.95",
    affiliateUrl: "https://www.awin1.com/cread.php?awinmid=95201",
    facets: new Set<string>(["obsolete_facet"]),
    version: 0,
  };
  const repository: ClassificationBackfillRepository = {
    async fetchPage() {
      return [item];
    },
    async replaceClassification(value) {
      stored.facets = new Set(value.classification.facets);
      stored.version = value.classification.classificationVersion;
    },
  };

  for (let run = 0; run < 2; run += 1) {
    await runProductClassificationBackfill({
      advertiserId: "95201",
      batchSize: 1,
      maxBatches: 1,
      write: true,
      repository,
    });
  }

  assert.deepEqual([...stored.facets], ["engraved", "necklace", "personalized"]);
  assert.equal(stored.version, 1);
  assert.equal(stored.title, item.title);
  assert.equal(stored.price, "49.95");
  assert.equal(stored.affiliateUrl, "https://www.awin1.com/cread.php?awinmid=95201");
});
