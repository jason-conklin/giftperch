import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runAwinProductImport } from "./importer";
import {
  downloadAndValidateAwinSnapshot,
  readValidatedSnapshotRecords,
  snapshotMetadataPath,
  validateAwinSnapshot,
} from "./snapshot";
import {
  AWIN_PROVIDER,
  type AffiliateProduct,
  type AffiliateProductImportRepository,
  type AwinImportContext,
} from "./types";

const context: AwinImportContext = {
  provider: AWIN_PROVIDER,
  publisherId: "2673864",
  advertiserId: "89509",
  locale: "en_US",
};

function validRecord(id: string) {
  return {
    id,
    title: `Product ${id}`,
    description: "Synthetic product",
    price: "31.99 USD",
    availability: "in_stock",
    image_link: `https://images.example.test/${id}.jpg`,
    link: `https://merchant.example.test/${id}`,
    aw_deep_link: `https://www.awin1.com/cread.php?product=${id}`,
    meta: { advertiser_id: 89509, advertiser_name: "Piscifun" },
  };
}

function responseFor(records: unknown[], suffix = "\n") {
  const body = records.map((record) => JSON.stringify(record)).join("\n") + suffix;
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });
}

async function withTempDirectory(
  callback: (directory: string) => Promise<void>,
) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "giftperch-awin-test-"));
  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function createSnapshot(directory: string, records = [validRecord("1")]) {
  const snapshotPath = path.join(directory, "feed.jsonl");
  const metadata = await downloadAndValidateAwinSnapshot({
    context,
    apiToken: "test-token",
    outputPath: snapshotPath,
    fetchImpl: async () => responseFor(records),
    now: new Date("2026-10-16T12:00:00.000Z"),
  });
  return { snapshotPath, metadata };
}

test("validated snapshots import through the existing staged importer", async () => {
  await withTempDirectory(async (directory) => {
    const { snapshotPath } = await createSnapshot(directory, [
      validRecord("1"),
      validRecord("2"),
    ]);
    const metadata = await validateAwinSnapshot({
      snapshotPath,
      expectedContext: context,
      now: new Date("2026-10-16T13:00:00.000Z"),
    });
    const staged: AffiliateProduct[] = [];
    let finalized = false;
    const repository: AffiliateProductImportRepository = {
      async beginImport(_context, minimumValidProducts) {
        assert.equal(minimumValidProducts, 2);
        return "snapshot-import";
      },
      async stageProducts(_importId, products) {
        staged.push(...products);
      },
      async finalizeImport() {
        finalized = true;
        return staged.length;
      },
      async failImport() {
        assert.fail("successful snapshot import must not fail");
      },
    };

    const result = await runAwinProductImport({
      context,
      records: readValidatedSnapshotRecords(snapshotPath, metadata),
      repository,
      minimumValidProducts: 2,
    });
    assert.equal(result.activatedProducts, 2);
    assert.equal(staged.length, 2);
    assert.equal(finalized, true);
  });
});
test("snapshot validation rejects checksum mismatches", async () => {
  await withTempDirectory(async (directory) => {
    const { snapshotPath } = await createSnapshot(directory);
    await appendFile(snapshotPath, " ", { encoding: "utf8" });
    await assert.rejects(
      validateAwinSnapshot({
        snapshotPath,
        expectedContext: context,
        now: new Date("2026-10-16T13:00:00.000Z"),
      }),
      /checksum or byte length/,
    );
  });
});

test("snapshot validation rejects advertiser and locale mismatches", async () => {
  await withTempDirectory(async (directory) => {
    const { snapshotPath } = await createSnapshot(directory);
    await assert.rejects(
      validateAwinSnapshot({
        snapshotPath,
        expectedContext: { ...context, advertiserId: "90002" },
        now: new Date("2026-10-16T13:00:00.000Z"),
      }),
      /does not match the requested feed/,
    );
    await assert.rejects(
      validateAwinSnapshot({
        snapshotPath,
        expectedContext: { ...context, locale: "en_GB" },
        now: new Date("2026-10-16T13:00:00.000Z"),
      }),
      /does not match the requested feed/,
    );
  });
});

test("snapshot download rejects truncated JSONL without publishing artifacts", async () => {
  await withTempDirectory(async (directory) => {
    const snapshotPath = path.join(directory, "truncated.jsonl");
    await assert.rejects(
      downloadAndValidateAwinSnapshot({
        context,
        apiToken: "test-token",
        outputPath: snapshotPath,
        fetchImpl: async () =>
          new Response(`${JSON.stringify(validRecord("1"))}\n{"id":`, {
            status: 200,
          }),
      }),
      /malformed JSONL/,
    );
    await assert.rejects(readFile(snapshotPath), /ENOENT/);
    await assert.rejects(readFile(snapshotMetadataPath(snapshotPath)), /ENOENT/);
  });
});

test("snapshot download rejects terminal feed errors", async () => {
  await withTempDirectory(async (directory) => {
    const snapshotPath = path.join(directory, "terminal.jsonl");
    await assert.rejects(
      downloadAndValidateAwinSnapshot({
        context,
        apiToken: "test-token",
        outputPath: snapshotPath,
        fetchImpl: async () =>
          responseFor([
            validRecord("1"),
            { error: 500, message: "Feed generation failed" },
          ]),
      }),
      /Feed generation failed/,
    );
    await assert.rejects(readFile(snapshotPath), /ENOENT/);
  });
});

test("snapshot imports fail safely when staging fails", async () => {
  await withTempDirectory(async (directory) => {
    const { snapshotPath } = await createSnapshot(directory);
    const metadata = await validateAwinSnapshot({
      snapshotPath,
      expectedContext: context,
      now: new Date("2026-10-16T13:00:00.000Z"),
    });
    let failed = false;
    let finalized = false;
    const repository: AffiliateProductImportRepository = {
      async beginImport() {
        return "failed-snapshot-import";
      },
      async stageProducts() {
        throw new Error("synthetic staging failure");
      },
      async finalizeImport() {
        finalized = true;
        return 0;
      },
      async failImport() {
        failed = true;
      },
    };

    await assert.rejects(
      runAwinProductImport({
        context,
        records: readValidatedSnapshotRecords(snapshotPath, metadata),
        repository,
        batchSize: 1,
      }),
      /synthetic staging failure/,
    );
    assert.equal(failed, true);
    assert.equal(finalized, false);
  });
});

test("stale and metadata-tampered snapshots are rejected", async () => {
  await withTempDirectory(async (directory) => {
    const { snapshotPath } = await createSnapshot(directory);
    await assert.rejects(
      validateAwinSnapshot({
        snapshotPath,
        expectedContext: context,
        now: new Date("2026-10-18T13:00:00.000Z"),
      }),
      /stale/,
    );

    const metadataPath = snapshotMetadataPath(snapshotPath);
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as {
      inspection: { validProducts: number };
    };
    metadata.inspection.validProducts += 1;
    await writeFile(metadataPath, `${JSON.stringify(metadata)}\n`, { mode: 0o600 });
    await assert.rejects(
      validateAwinSnapshot({
        snapshotPath,
        expectedContext: context,
        now: new Date("2026-10-16T13:00:00.000Z"),
      }),
      /validation results do not match/,
    );
  });
});
