import assert from "node:assert/strict";
import test from "node:test";
import {
  AwinTerminalFeedError,
  isExpectedAwinTrackingUrl,
  normalizeAwinPrice,
  normalizeAwinProduct,
  parseAwinJsonlStream,
} from "./feed";
import { inspectAwinProductFeed, runAwinProductImport } from "./importer";
import {
  AWIN_PROVIDER,
  type AffiliateProduct,
  type AffiliateProductImportRepository,
} from "./types";

function streamFrom(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, Math.ceil(bytes.length / 2)));
      controller.enqueue(bytes.slice(Math.ceil(bytes.length / 2)));
      controller.close();
    },
  });
}

function validRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "product-1",
    title: "Fishing Line Spooler",
    description: "Portable line winding tool",
    price: "31.99 USD",
    availability: "in_stock",
    image_link: "https://cdn.example.com/spooler.jpg",
    link: "https://merchant.example.com/products/spooler",
    aw_deep_link: "https://www.awin1.com/cread.php?awinmid=89509",
    meta: { advertiser_id: 89509, advertiser_name: "Piscifun" },
    ...overrides,
  };
}

test("streams JSONL records across chunk boundaries", async () => {
  const source = `${JSON.stringify({ id: 1 })}\n${JSON.stringify({ id: 2 })}\n`;
  const records = [];
  for await (const record of parseAwinJsonlStream(streamFrom(source))) {
    records.push(record);
  }
  assert.deepEqual(records, [{ id: 1 }, { id: 2 }]);
});

test("rejects a terminal error record after yielding prior products", async () => {
  const source = `${JSON.stringify(validRecord())}\n${JSON.stringify({
    error: 500,
    message: "Feed generation failed",
  })}\n`;
  const seen = [];
  await assert.rejects(async () => {
    for await (const record of parseAwinJsonlStream(streamFrom(source))) {
      seen.push(record);
    }
  }, AwinTerminalFeedError);
  assert.equal(seen.length, 1);
});

test("empty feeds report response and stream diagnostics", async () => {
  await assert.rejects(
    async () => {
      for await (const record of parseAwinJsonlStream(streamFrom(""), {
        status: 200,
        headers: {
          "content-length": "0",
          "retry-after": null,
        },
      })) {
        void record;
      }
    },
    /HTTP 200; bytes=0; parsedRecords=0; content-length=0, retry-after=missing/,
  );
});

test("normalizes documented Awin prices", () => {
  assert.deepEqual(normalizeAwinPrice("31.99 USD"), {
    amount: "31.99",
    currency: "USD",
  });
  assert.deepEqual(normalizeAwinPrice("20 GBP"), {
    amount: "20.00",
    currency: "GBP",
  });
  assert.equal(normalizeAwinPrice("USD 31.99"), null);
  assert.equal(normalizeAwinPrice("31.999 USD"), null);
  assert.equal(normalizeAwinPrice("10000000000.00 USD"), null);
});

test("normalizes a valid product and rejects malformed affiliate URLs", () => {
  const normalized = normalizeAwinProduct(validRecord(), {
    advertiserId: "89509",
    locale: "en_US",
    importedAt: "2026-10-16T12:00:00.000Z",
  });
  assert.equal(normalized.ok, true);
  if (normalized.ok) {
    assert.equal(normalized.product.price, "31.99");
    assert.equal(normalized.product.currency, "USD");
    assert.equal(normalized.product.provider, AWIN_PROVIDER);
  }

  const malformed = normalizeAwinProduct(
    validRecord({ aw_deep_link: "https://example.com/not-awin" }),
    {
      advertiserId: "89509",
      locale: "en_US",
      importedAt: "2026-10-16T12:00:00.000Z",
    },
  );
  assert.deepEqual(malformed, { ok: false, reason: "invalid_affiliate_url" });
  assert.equal(isExpectedAwinTrackingUrl("https://evilawin1.com/click"), false);
  assert.equal(
    isExpectedAwinTrackingUrl("https://user@www.awin1.com/cread.php"),
    false,
  );
  assert.equal(
    isExpectedAwinTrackingUrl("https://www.awin1.com:444/cread.php"),
    false,
  );
});

test("failed streams never finalize staged products", async () => {
  const calls = { staged: 0, finalized: 0, failed: 0 };
  const repository: AffiliateProductImportRepository = {
    async beginImport() {
      return "import-1";
    },
    async stageProducts(_importId: string, products: AffiliateProduct[]) {
      calls.staged += products.length;
    },
    async finalizeImport() {
      calls.finalized += 1;
      return 0;
    },
    async failImport() {
      calls.failed += 1;
    },
  };
  const source = `${JSON.stringify(validRecord())}\n${JSON.stringify({
    error: 500,
    message: "Terminal failure",
  })}\n`;

  await assert.rejects(
    runAwinProductImport({
      context: {
        provider: AWIN_PROVIDER,
        publisherId: "2673864",
        advertiserId: "89509",
        locale: "en_US",
      },
      records: parseAwinJsonlStream(streamFrom(source)),
      repository,
      batchSize: 1,
    }),
    AwinTerminalFeedError,
  );

  assert.equal(calls.staged, 1);
  assert.equal(calls.finalized, 0);
  assert.equal(calls.failed, 1);
});

test("a valid but unexpectedly small import is not finalized", async () => {
  const calls = { finalized: 0, failed: 0, minimumValidProducts: 0 };
  const repository: AffiliateProductImportRepository = {
    async beginImport(_context, minimumValidProducts) {
      calls.minimumValidProducts = minimumValidProducts;
      return "import-2";
    },
    async stageProducts() {},
    async finalizeImport() {
      calls.finalized += 1;
      return 0;
    },
    async failImport() {
      calls.failed += 1;
    },
  };
  async function* records() {
    yield validRecord();
  }

  await assert.rejects(
    runAwinProductImport({
      context: {
        provider: AWIN_PROVIDER,
        publisherId: "2673864",
        advertiserId: "89509",
        locale: "en_US",
      },
      records: records(),
      repository,
      minimumValidProducts: 2,
    }),
    /at least 2 are required/,
  );
  assert.equal(calls.finalized, 0);
  assert.equal(calls.failed, 1);
  assert.equal(calls.minimumValidProducts, 2);
});

test("an invalid safety threshold is rejected before an import begins", async () => {
  let began = false;
  const repository: AffiliateProductImportRepository = {
    async beginImport() {
      began = true;
      return "import-3";
    },
    async stageProducts() {},
    async finalizeImport() {
      return 0;
    },
    async failImport() {},
  };

  await assert.rejects(
    runAwinProductImport({
      context: {
        provider: AWIN_PROVIDER,
        publisherId: "2673864",
        advertiserId: "89509",
        locale: "en_US",
      },
      records: (async function* () {
        yield validRecord();
      })(),
      repository,
      minimumValidProducts: 0,
    }),
    /positive integer/,
  );
  assert.equal(began, false);
});

test("feed inspection reports uniqueness, links, and catalog breakdowns", async () => {
  async function* records() {
    yield validRecord();
    yield validRecord({ availability: "out_of_stock" });
    yield validRecord({
      id: "product-2",
      price: "24.00 GBP",
      availability: "out_of_stock",
    });
    yield validRecord({ id: "product-3", aw_deep_link: "not-a-url" });
  }

  const result = await inspectAwinProductFeed({
    advertiserId: "89509",
    locale: "en_US",
    records: records(),
    importedAt: "2026-10-16T12:00:00.000Z",
  });

  assert.deepEqual(result, {
    recordsRead: 4,
    validProducts: 3,
    skippedProducts: 1,
    uniqueProducts: 2,
    duplicateProductIds: 1,
    duplicateRecords: 1,
    usableAffiliateLinks: 3,
    currencies: { USD: 2, GBP: 1 },
    availability: { in_stock: 1, out_of_stock: 2 },
    skippedReasons: { invalid_affiliate_url: 1 },
  });
});
