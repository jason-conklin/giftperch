import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  link,
  lstat,
  mkdir,
  open,
  readFile,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { isDeepStrictEqual } from "node:util";
import {
  type AwinProductNormalizer,
  inspectAwinProductFeed,
} from "./importer";
import {
  openAwinEnhancedFeed,
  parseAwinJsonlStream,
} from "./feed";
import {
  normalizeAwinLegacyProduct,
  parseAwinLegacyCsvGzipStream,
} from "./legacyFeed";
import {
  AWIN_PROVIDER,
  type AwinImportContext,
  type FeedInspection,
} from "./types";

const SNAPSHOT_SCHEMA_VERSION = 1;
export const DEFAULT_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type AwinSnapshotFormat = "enhanced-jsonl" | "legacy-csv-gzip";

export type AwinSnapshotMetadata = {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  complete: true;
  format?: AwinSnapshotFormat;
  provider: typeof AWIN_PROVIDER;
  publisherId: string;
  advertiserId: string;
  locale: string;
  downloadedAt: string;
  validatedAt: string;
  sha256: string;
  byteLength: number;
  httpStatus: number;
  contentType: string | null;
  snapshotFile: string;
  inspection: FeedInspection;
};

function snapshotFormat(metadata: AwinSnapshotMetadata): AwinSnapshotFormat {
  return metadata.format ?? "enhanced-jsonl";
}

function normalizerForSnapshotFormat(
  format: AwinSnapshotFormat,
): AwinProductNormalizer | undefined {
  return format === "legacy-csv-gzip" ? normalizeAwinLegacyProduct : undefined;
}

export function getAwinSnapshotNormalizer(
  metadata: AwinSnapshotMetadata,
): AwinProductNormalizer | undefined {
  return normalizerForSnapshotFormat(snapshotFormat(metadata));
}

function parseSnapshotRecords(
  stream: ReadableStream<Uint8Array>,
  format: AwinSnapshotFormat,
): AsyncGenerator<unknown> {
  return format === "legacy-csv-gzip"
    ? parseAwinLegacyCsvGzipStream(stream)
    : parseAwinJsonlStream(stream);
}

export function snapshotMetadataPath(snapshotPath: string): string {
  return `${snapshotPath}.metadata.json`;
}
export function assertSnapshotOutsideWorkspace(
  snapshotPath: string,
  workspace = process.cwd(),
): string {
  const resolved = path.resolve(snapshotPath);
  const relative = path.relative(path.resolve(workspace), resolved);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("Awin snapshots must be stored outside the project workspace.");
  }
  return resolved;
}

async function writeStreamWithChecksum(
  stream: ReadableStream<Uint8Array>,
  outputPath: string,
): Promise<{ sha256: string; byteLength: number }> {
  const handle = await open(outputPath, "wx", 0o600);
  const reader = stream.getReader();
  const hash = createHash("sha256");
  let byteLength = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      hash.update(value);
      byteLength += value.byteLength;
      await handle.write(value);
    }
    await handle.sync();
    return { sha256: hash.digest("hex"), byteLength };
  } finally {
    reader.releaseLock();
    await handle.close();
  }
}

async function writePrivateJson(outputPath: string, value: unknown) {
  const handle = await open(outputPath, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function downloadAndValidateAwinSnapshot(options: {
  context: AwinImportContext;
  apiToken: string;
  outputPath: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  workspace?: string;
  now?: Date;
}): Promise<AwinSnapshotMetadata> {
  const outputPath = assertSnapshotOutsideWorkspace(
    options.outputPath,
    options.workspace,
  );
  if (!outputPath.endsWith(".jsonl")) {
    throw new Error("Awin snapshot output must use a .jsonl extension.");
  }

  const metadataPath = snapshotMetadataPath(outputPath);
  const unique = randomUUID();
  const partialSnapshot = `${outputPath}.${unique}.partial`;
  const partialMetadata = `${metadataPath}.${unique}.partial`;
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });

  for (const candidate of [outputPath, metadataPath]) {
    try {
      await lstat(candidate);
      throw new Error(`Snapshot output already exists: ${candidate}`);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }

  let snapshotPublished = false;
  let metadataPublished = false;
  try {
    const response = await openAwinEnhancedFeed({
      publisherId: options.context.publisherId,
      advertiserId: options.context.advertiserId,
      locale: options.context.locale,
      apiToken: options.apiToken,
      signal: options.signal,
      fetchImpl: options.fetchImpl,
    });
    const [fileStream, validationStream] = response.body.tee();
    const [fileResult, inspectionResult] = await Promise.allSettled([
      writeStreamWithChecksum(fileStream, partialSnapshot),
      inspectAwinProductFeed({
        advertiserId: options.context.advertiserId,
        locale: options.context.locale,
        records: parseAwinJsonlStream(validationStream, response.diagnostics),
      }),
    ]);
    if (fileResult.status === "rejected") throw fileResult.reason;
    if (inspectionResult.status === "rejected") throw inspectionResult.reason;
    const file = fileResult.value;
    const inspection = inspectionResult.value;
    const now = options.now ?? new Date();
    const metadata: AwinSnapshotMetadata = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      complete: true,
      format: "enhanced-jsonl",
      provider: AWIN_PROVIDER,
      publisherId: options.context.publisherId,
      advertiserId: options.context.advertiserId,
      locale: options.context.locale,
      downloadedAt: now.toISOString(),
      validatedAt: now.toISOString(),
      sha256: file.sha256,
      byteLength: file.byteLength,
      httpStatus: response.status,
      contentType: response.contentType,
      snapshotFile: path.basename(outputPath),
      inspection,
    };

    await writePrivateJson(partialMetadata, metadata);
    await link(partialSnapshot, outputPath);
    snapshotPublished = true;
    await rm(partialSnapshot);
    await link(partialMetadata, metadataPath);
    metadataPublished = true;
    await rm(partialMetadata);
    await Promise.all([chmod(outputPath, 0o600), chmod(metadataPath, 0o600)]);
    return metadata;
  } catch (error) {
    await Promise.all([
      rm(partialSnapshot, { force: true }),
      rm(partialMetadata, { force: true }),
      snapshotPublished ? rm(outputPath, { force: true }) : Promise.resolve(),
      metadataPublished ? rm(metadataPath, { force: true }) : Promise.resolve(),
    ]);
    throw error;
  }
}

export async function createAndValidateAwinLegacySnapshot(options: {
  context: AwinImportContext;
  sourcePath: string;
  outputPath: string;
  workspace?: string;
  now?: Date;
}): Promise<AwinSnapshotMetadata> {
  const sourcePath = assertSnapshotOutsideWorkspace(
    options.sourcePath,
    options.workspace,
  );
  const outputPath = assertSnapshotOutsideWorkspace(
    options.outputPath,
    options.workspace,
  );
  if (!sourcePath.endsWith(".csv.gz") || !outputPath.endsWith(".csv.gz")) {
    throw new Error("Awin Legacy snapshots must use a .csv.gz extension.");
  }
  if (sourcePath === outputPath) {
    throw new Error("Awin Legacy snapshot output must differ from its source file.");
  }

  const sourceInfo = await lstat(sourcePath);
  if (!sourceInfo.isFile() || sourceInfo.isSymbolicLink()) {
    throw new Error(`Awin Legacy feed source must be a regular file: ${sourcePath}`);
  }

  const metadataPath = snapshotMetadataPath(outputPath);
  const unique = randomUUID();
  const partialSnapshot = `${outputPath}.${unique}.partial`;
  const partialMetadata = `${metadataPath}.${unique}.partial`;
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  for (const candidate of [outputPath, metadataPath]) {
    try {
      await lstat(candidate);
      throw new Error(`Snapshot output already exists: ${candidate}`);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }

  let snapshotPublished = false;
  let metadataPublished = false;
  try {
    const [fileResult, inspectionResult] = await Promise.allSettled([
      writeStreamWithChecksum(fileWebStream(sourcePath), partialSnapshot),
      inspectAwinProductFeed({
        advertiserId: options.context.advertiserId,
        locale: options.context.locale,
        records: parseAwinLegacyCsvGzipStream(fileWebStream(sourcePath)),
        normalizeProduct: normalizeAwinLegacyProduct,
      }),
    ]);
    if (fileResult.status === "rejected") throw fileResult.reason;
    if (inspectionResult.status === "rejected") throw inspectionResult.reason;

    const now = options.now ?? new Date();
    const metadata: AwinSnapshotMetadata = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      complete: true,
      format: "legacy-csv-gzip",
      provider: AWIN_PROVIDER,
      publisherId: options.context.publisherId,
      advertiserId: options.context.advertiserId,
      locale: options.context.locale,
      downloadedAt: now.toISOString(),
      validatedAt: now.toISOString(),
      sha256: fileResult.value.sha256,
      byteLength: fileResult.value.byteLength,
      httpStatus: 200,
      contentType: "application/gzip",
      snapshotFile: path.basename(outputPath),
      inspection: inspectionResult.value,
    };

    await writePrivateJson(partialMetadata, metadata);
    await link(partialSnapshot, outputPath);
    snapshotPublished = true;
    await rm(partialSnapshot);
    await link(partialMetadata, metadataPath);
    metadataPublished = true;
    await rm(partialMetadata);
    await Promise.all([chmod(outputPath, 0o600), chmod(metadataPath, 0o600)]);
    return metadata;
  } catch (error) {
    await Promise.all([
      rm(partialSnapshot, { force: true }),
      rm(partialMetadata, { force: true }),
      snapshotPublished ? rm(outputPath, { force: true }) : Promise.resolve(),
      metadataPublished ? rm(metadataPath, { force: true }) : Promise.resolve(),
    ]);
    throw error;
  }
}

function isFeedInspection(value: unknown): value is FeedInspection {
  if (typeof value !== "object" || value === null) return false;
  const inspection = value as Partial<FeedInspection>;
  return (
    Number.isInteger(inspection.recordsRead) &&
    Number.isInteger(inspection.validProducts) &&
    Number.isInteger(inspection.skippedProducts) &&
    Number.isInteger(inspection.uniqueProducts) &&
    Number.isInteger(inspection.duplicateProductIds) &&
    Number.isInteger(inspection.duplicateRecords) &&
    Number.isInteger(inspection.usableAffiliateLinks) &&
    typeof inspection.currencies === "object" &&
    inspection.currencies !== null &&
    typeof inspection.availability === "object" &&
    inspection.availability !== null &&
    typeof inspection.skippedReasons === "object" &&
    inspection.skippedReasons !== null
  );
}

function parseMetadata(value: string): AwinSnapshotMetadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error("Awin snapshot metadata is not valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Awin snapshot metadata is invalid.");
  }
  const metadata = parsed as Partial<AwinSnapshotMetadata>;
  if (
    metadata.schemaVersion !== SNAPSHOT_SCHEMA_VERSION ||
    metadata.complete !== true ||
    (metadata.format !== undefined &&
      metadata.format !== "enhanced-jsonl" &&
      metadata.format !== "legacy-csv-gzip") ||
    metadata.provider !== AWIN_PROVIDER ||
    typeof metadata.publisherId !== "string" ||
    !/^\d+$/.test(metadata.publisherId) ||
    typeof metadata.advertiserId !== "string" ||
    !/^\d+$/.test(metadata.advertiserId) ||
    typeof metadata.locale !== "string" ||
    typeof metadata.downloadedAt !== "string" ||
    typeof metadata.validatedAt !== "string" ||
    typeof metadata.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(metadata.sha256) ||
    !Number.isInteger(metadata.byteLength) ||
    (metadata.byteLength ?? 0) < 1 ||
    metadata.httpStatus !== 200 ||
    typeof metadata.snapshotFile !== "string" ||
    !isFeedInspection(metadata.inspection)
  ) {
    throw new Error("Awin snapshot metadata is incomplete or unsupported.");
  }
  return metadata as AwinSnapshotMetadata;
}

function fileWebStream(filePath: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
}

async function checksumFile(filePath: string) {
  const hash = createHash("sha256");
  let byteLength = 0;
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
    byteLength += chunk.byteLength;
  }
  return { sha256: hash.digest("hex"), byteLength };
}

async function assertPrivateRegularFile(filePath: string) {
  const info = await lstat(filePath);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`Snapshot artifact must be a regular file: ${filePath}`);
  }
  if (process.platform !== "win32" && (info.mode & 0o077) !== 0) {
    throw new Error(`Snapshot artifact permissions are too broad: ${filePath}`);
  }
}

export async function validateAwinSnapshot(options: {
  snapshotPath: string;
  expectedContext: AwinImportContext;
  workspace?: string;
  now?: Date;
  maxAgeMs?: number;
}): Promise<AwinSnapshotMetadata> {
  const snapshotPath = assertSnapshotOutsideWorkspace(
    options.snapshotPath,
    options.workspace,
  );
  const metadataPath = snapshotMetadataPath(snapshotPath);
  await Promise.all([
    assertPrivateRegularFile(snapshotPath),
    assertPrivateRegularFile(metadataPath),
  ]);
  const metadata = parseMetadata(await readFile(metadataPath, "utf8"));

  if (
    metadata.snapshotFile !== path.basename(snapshotPath) ||
    metadata.provider !== options.expectedContext.provider ||
    metadata.publisherId !== options.expectedContext.publisherId ||
    metadata.advertiserId !== options.expectedContext.advertiserId ||
    metadata.locale !== options.expectedContext.locale
  ) {
    throw new Error("Awin snapshot metadata does not match the requested feed.");
  }

  const validatedAt = Date.parse(metadata.validatedAt);
  const now = (options.now ?? new Date()).getTime();
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_SNAPSHOT_MAX_AGE_MS;
  if (!Number.isFinite(validatedAt) || validatedAt > now + 5 * 60 * 1000) {
    throw new Error("Awin snapshot validation timestamp is invalid.");
  }
  if (now - validatedAt > maxAgeMs) {
    throw new Error("Awin snapshot is stale and must not be imported.");
  }

  const file = await checksumFile(snapshotPath);
  if (
    file.sha256 !== metadata.sha256 ||
    file.byteLength !== metadata.byteLength
  ) {
    throw new Error("Awin snapshot checksum or byte length does not match metadata.");
  }

  const format = snapshotFormat(metadata as AwinSnapshotMetadata);
  const inspection = await inspectAwinProductFeed({
    advertiserId: metadata.advertiserId,
    locale: metadata.locale,
    records: parseSnapshotRecords(fileWebStream(snapshotPath), format),
    normalizeProduct: normalizerForSnapshotFormat(format),
  });
  if (!isDeepStrictEqual(inspection, metadata.inspection)) {
    throw new Error("Awin snapshot validation results do not match metadata.");
  }
  if (
    inspection.duplicateProductIds !== 0 ||
    inspection.uniqueProducts !== inspection.validProducts ||
    inspection.usableAffiliateLinks !== inspection.validProducts
  ) {
    throw new Error("Awin snapshot contains duplicate IDs or unusable affiliate links.");
  }
  return metadata;
}

export async function* readValidatedSnapshotRecords(
  snapshotPath: string,
  metadata: AwinSnapshotMetadata,
): AsyncGenerator<unknown> {
  const hash = createHash("sha256");
  let byteLength = 0;
  const checkedStream = fileWebStream(snapshotPath).pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        hash.update(chunk);
        byteLength += chunk.byteLength;
        controller.enqueue(chunk);
      },
    }),
  );

  for await (const record of parseSnapshotRecords(
    checkedStream,
    snapshotFormat(metadata),
  )) {
    yield record;
  }
  if (
    hash.digest("hex") !== metadata.sha256 ||
    byteLength !== metadata.byteLength
  ) {
    throw new Error("Awin snapshot changed while it was being imported.");
  }
}
