export type ChunkedImportFinalizationActions = {
  prepareChunk(): Promise<number>;
  activate(): Promise<number>;
  cleanupPreparedChunk(): Promise<number>;
  cleanupInactiveSnapshots(): Promise<void>;
};

function assertCount(value: number, operation: string, { allowZero }: { allowZero: boolean }) {
  if (!Number.isInteger(value) || value < 0 || (!allowZero && value === 0)) {
    throw new Error(`${operation} returned an invalid product count.`);
  }
}

/**
 * Prepares a replacement snapshot in independently committed chunks, then
 * performs the catalog-pointer swap only after every row is durable.
 */
export async function finalizeChunkedAwinImport(
  actions: ChunkedImportFinalizationActions,
): Promise<number> {
  while (true) {
    const prepared = await actions.prepareChunk();
    assertCount(prepared, "Import preparation", { allowZero: true });
    if (prepared === 0) break;
  }

  const activatedProducts = await actions.activate();
  assertCount(activatedProducts, "Import activation", { allowZero: false });

  while (true) {
    const cleaned = await actions.cleanupPreparedChunk();
    assertCount(cleaned, "Import staging cleanup", { allowZero: true });
    if (cleaned === 0) break;
  }

  await actions.cleanupInactiveSnapshots();
  return activatedProducts;
}
