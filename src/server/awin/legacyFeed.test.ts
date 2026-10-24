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
    ...overrides,
  };
}

function gzipStream(text: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from([gzipSync(Buffer.from(text))])) as ReadableStream<Uint8Array>;
}

test("streams gzip Legacy CSV records with BOM, commas, and embedded newlines", async () => {
  const source = `\uFEFF${headers.join(",")}\n${csvRow(record())}\n`;
  const rows = [];
  for await (const row of parseAwinLegacyCsvGzipStream(gzipStream(source))) {
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

test("normalizes Legacy identity, price, availability, and optional descriptions", () => {
  const normalized = normalizeAwinLegacyProduct(record(), {
    advertiserId: "95201",
    locale: "en_US",
    importedAt: "2026-10-24T00:00:00.000Z",
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
    }),
    { ok: false, reason: "advertiser_mismatch" },
  );
  assert.deepEqual(
    normalizeAwinLegacyProduct(record({ in_stock: "maybe" }), {
      advertiserId: "95201",
      locale: "en_US",
      importedAt: "2026-10-24T00:00:00.000Z",
    }),
    { ok: false, reason: "invalid_availability" },
  );
  assert.deepEqual(
    normalizeAwinLegacyProduct(record({ aw_deep_link: "https://example.test" }), {
      advertiserId: "95201",
      locale: "en_US",
      importedAt: "2026-10-24T00:00:00.000Z",
    }),
    { ok: false, reason: "invalid_affiliate_url" },
  );
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
