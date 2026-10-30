import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { Readable } from "node:stream";
import test from "node:test";
import { inspectAwinProductFeed } from "./importer";
import {
  normalizeAwinLegacyProduct,
  parseAwinLegacyCsvGzipStream,
} from "./legacyFeed";

const headers = [
  "aw_deep_link",
  "product_name",
  "aw_product_id",
  "merchant_product_id",
  "merchant_image_url",
  "description",
  "merchant_category",
  "search_price",
  "merchant_name",
  "merchant_id",
  "aw_image_url",
  "currency",
  "merchant_deep_link",
  "in_stock",
  "is_for_sale",
  "stock_status",
  "data_feed_id",
];

function csvRow(values: Record<string, string>): string {
  return headers
    .map((header) => `"${(values[header] ?? "").replaceAll('"', '""')}"`)
    .join(",");
}

function record(overrides: Record<string, string> = {}) {
  return {
    aw_deep_link: "https://www.awin1.com/cread.php?awinmid=95201&awinaffid=2673864",
    product_name: "Custom Name Necklace",
    aw_product_id: "95201-1",
    merchant_product_id: "merchant-1",
    merchant_image_url: "https://images.example.test/necklace.jpg",
    description: "A custom, engraved necklace\nfor an anniversary.",
    merchant_category: "Jewelry",
    search_price: "29.95",
    merchant_name: "Giftlab",
    merchant_id: "95201",
    aw_image_url: "https://images.example.test/necklace.jpg",
    currency: "USD",
    merchant_deep_link: "https://giftlab.example.test/products/necklace",
    in_stock: "1",
    is_for_sale: "1",
    stock_status: "instock",
    data_feed_id: "105668",
    ...overrides,
  };
}

function gzipStream(text: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from([gzipSync(Buffer.from(text))])) as ReadableStream<Uint8Array>;
}

test("streams gzip Legacy CSV records with BOM, commas, and embedded newlines", async () => {
  const source = `\uFEFF${headers.join(",")}\n${csvRow(record())}\n`;
  const rows = [];
  for await (const row of parseAwinLegacyCsvGzipStream(gzipStream(source), {
    expectedFeedId: "105668",
  })) {
    rows.push(row);
  }
  assert.equal(rows.length, 1);
  assert.equal(rows[0].aw_product_id, "95201-1");
  assert.equal(rows[0].description, "A custom, engraved necklace\nfor an anniversary.");
});

test("validates Legacy required columns and malformed gzip input", async () => {
  await assert.rejects(
    async () => {
      for await (const _row of parseAwinLegacyCsvGzipStream(
        gzipStream("aw_product_id,product_name\n1,Necklace\n"),
        { expectedFeedId: "105668" },
      )) {
        void _row;
      }
    },
    /missing required columns/,
  );
  await assert.rejects(
    async () => {
      for await (const _row of parseAwinLegacyCsvGzipStream(
        Readable.toWeb(Readable.from([Buffer.from("not gzip")])) as ReadableStream<Uint8Array>,
      )) {
        void _row;
      }
    },
    /gzip decompression failed/,
  );
});

test("enforces the configured Legacy feed identity for every row", async () => {
  const source = [
    headers.join(","),
    csvRow(record()),
    csvRow(record({ aw_product_id: "95201-2", data_feed_id: "999999" })),
  ].join("\n");

  await assert.rejects(
    async () => {
      for await (const _row of parseAwinLegacyCsvGzipStream(gzipStream(source), {
        expectedFeedId: "105668",
      })) {
        void _row;
      }
    },
    /legacy feed mismatch/,
  );

  for (const [feedId, expectedMessage] of [
    ["", /missing legacy feed id/],
    ["not-a-feed", /invalid legacy feed id/],
  ] as const) {
    await assert.rejects(
      async () => {
        for await (const _row of parseAwinLegacyCsvGzipStream(
          gzipStream(`${headers.join(",")}\n${csvRow(record({ data_feed_id: feedId }))}\n`),
          { expectedFeedId: "105668" },
        )) {
          void _row;
        }
      },
      expectedMessage,
    );
  }

  const headersWithoutFeedId = headers.filter(
    (header) => header !== "data_feed_id",
  );
  await assert.rejects(
    async () => {
      for await (const _row of parseAwinLegacyCsvGzipStream(
        gzipStream(`${headersWithoutFeedId.join(",")}\n`),
        { expectedFeedId: "105668" },
      )) {
        void _row;
      }
    },
    /missing required columns: data_feed_id/,
  );
});

test("normalizes Legacy identity, price, availability, and optional descriptions", () => {
  const normalized = normalizeAwinLegacyProduct(record(), {
    advertiserId: "95201",
    locale: "en_US",
    importedAt: "2026-10-24T00:00:00.000Z",
    expectedLegacyFeedId: "105668",
  });
  assert.equal(normalized.ok, true);
  if (normalized.ok) {
    assert.equal(normalized.product.externalProductId, "95201-1");
    assert.equal(normalized.product.price, "29.95");
    assert.equal(normalized.product.currency, "USD");
    assert.equal(normalized.product.availability, "in_stock");
    assert.match(normalized.product.description ?? "", /^Category: Jewelry\./);
  }

  assert.deepEqual(
    normalizeAwinLegacyProduct(record({ merchant_id: "other" }), {
      advertiserId: "95201",
      locale: "en_US",
      importedAt: "2026-10-24T00:00:00.000Z",
      expectedLegacyFeedId: "105668",
    }),
    { ok: false, reason: "advertiser_mismatch" },
  );
  assert.deepEqual(
    normalizeAwinLegacyProduct(record({ in_stock: "maybe" }), {
      advertiserId: "95201",
      locale: "en_US",
      importedAt: "2026-10-24T00:00:00.000Z",
      expectedLegacyFeedId: "105668",
    }),
    { ok: false, reason: "invalid_availability" },
  );
  assert.deepEqual(
    normalizeAwinLegacyProduct(record({ aw_deep_link: "https://example.test" }), {
      advertiserId: "95201",
      locale: "en_US",
      importedAt: "2026-10-24T00:00:00.000Z",
      expectedLegacyFeedId: "105668",
    }),
    { ok: false, reason: "invalid_affiliate_url" },
  );
  assert.deepEqual(
    normalizeAwinLegacyProduct(record({ data_feed_id: "wrong" }), {
      advertiserId: "95201",
      locale: "en_US",
      importedAt: "2026-10-24T00:00:00.000Z",
      expectedLegacyFeedId: "105668",
    }),
    { ok: false, reason: "invalid_legacy_feed_id" },
  );
});

test("uses merchant image preference only when configured", () => {
  const imageFields = record({
    merchant_id: "96879",
    merchant_image_url: "https://merchant.example.test/product.jpg",
    aw_image_url: "https://awin-images.example.test/product.jpg",
  });

  const loveIsARose = normalizeAwinLegacyProduct(imageFields, {
    advertiserId: "96879",
    locale: "en_US",
    importedAt: "2026-10-24T00:00:00.000Z",
    imagePreference: "merchant-first",
  });
  assert.equal(loveIsARose.ok, true);
  if (loveIsARose.ok) {
    assert.equal(
      loveIsARose.product.imageUrl,
      "https://merchant.example.test/product.jpg",
    );
  }

  const giftlab = normalizeAwinLegacyProduct(
    record({
      merchant_image_url: "https://merchant.example.test/product.jpg",
      aw_image_url: "https://awin-images.example.test/product.jpg",
    }),
    {
      advertiserId: "95201",
      locale: "en_US",
      importedAt: "2026-10-24T00:00:00.000Z",
    },
  );
  assert.equal(giftlab.ok, true);
  if (giftlab.ok) {
    assert.equal(
      giftlab.product.imageUrl,
      "https://awin-images.example.test/product.jpg",
    );
  }

  const fallback = normalizeAwinLegacyProduct(
    record({
      merchant_id: "96879",
      merchant_image_url: "not-a-url",
      aw_image_url: "https://awin-images.example.test/product.jpg",
    }),
    {
      advertiserId: "96879",
      locale: "en_US",
      importedAt: "2026-10-24T00:00:00.000Z",
      imagePreference: "merchant-first",
    },
  );
  assert.equal(fallback.ok, true);
  if (fallback.ok) {
    assert.equal(
      fallback.product.imageUrl,
      "https://awin-images.example.test/product.jpg",
    );
  }
});

test("Legacy inspection reports duplicate product IDs and rejected records", async () => {
  const source = [
    headers.join(","),
    csvRow(record()),
    csvRow(record()),
    csvRow(record({ aw_product_id: "95201-2", search_price: "invalid" })),
  ].join("\n");
  const inspection = await inspectAwinProductFeed({
    advertiserId: "95201",
    locale: "en_US",
    records: parseAwinLegacyCsvGzipStream(gzipStream(source)),
    normalizeProduct: normalizeAwinLegacyProduct,
    importedAt: "2026-10-24T00:00:00.000Z",
  });
  assert.deepEqual(inspection, {
    recordsRead: 3,
    validProducts: 2,
    skippedProducts: 1,
    uniqueProducts: 1,
    duplicateProductIds: 1,
    duplicateRecords: 1,
    usableAffiliateLinks: 2,
    currencies: { USD: 2 },
    availability: { in_stock: 2 },
    skippedReasons: { invalid_price: 1 },
  });
});
