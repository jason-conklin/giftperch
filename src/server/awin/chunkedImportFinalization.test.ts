import assert from "node:assert/strict";
import test from "node:test";
import { finalizeChunkedAwinImport } from "./chunkedImportFinalization";

test("prepares every chunk before the atomic activation and cleans up afterward", async () => {
  const calls: string[] = [];
  const prepared = [500, 500, 0];
  const cleaned = [1_000, 0];

  const activated = await finalizeChunkedAwinImport({
    async prepareChunk() {
      calls.push("prepare");
      return prepared.shift() ?? 0;
    },
    async activate() {
      calls.push("activate");
      return 1_000;
    },
    async cleanupPreparedChunk() {
      calls.push("cleanup-staging");
      return cleaned.shift() ?? 0;
    },
    async cleanupInactiveSnapshots() {
      calls.push("cleanup-inactive");
    },
  });

  assert.equal(activated, 1_000);
  assert.deepEqual(calls, [
    "prepare",
    "prepare",
    "prepare",
    "activate",
    "cleanup-staging",
    "cleanup-staging",
    "cleanup-inactive",
  ]);
});

test("does not activate when a preparation chunk fails", async () => {
  let activationAttempts = 0;

  await assert.rejects(
    finalizeChunkedAwinImport({
      async prepareChunk() {
        throw new Error("database timeout");
      },
      async activate() {
        activationAttempts += 1;
        return 1;
      },
      async cleanupPreparedChunk() {
        return 0;
      },
      async cleanupInactiveSnapshots() {},
    }),
    /database timeout/,
  );

  assert.equal(activationAttempts, 0);
});

test("rejects malformed database row counts before activation or cleanup", async () => {
  let activationAttempts = 0;

  await assert.rejects(
    finalizeChunkedAwinImport({
      async prepareChunk() {
        return -1;
      },
      async activate() {
        activationAttempts += 1;
        return 1;
      },
      async cleanupPreparedChunk() {
        return 0;
      },
      async cleanupInactiveSnapshots() {},
    }),
    /preparation returned an invalid product count/,
  );

  assert.equal(activationAttempts, 0);
});
