import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { isExpectedAwinTrackingUrl } from "@/lib/affiliateProduct";
import { AwinFeedError, normalizeAwinPrice } from "./feed";
import { AWIN_PROVIDER, type NormalizeResult } from "./types";

export const LEGACY_AWIN_REQUIRED_COLUMNS = [
  "aw_deep_link",
  "product_name",
  "aw_product_id",
  "merchant_image_url",
  "description",
  "search_price",
  "merchant_name",
  "merchant_id",
  "aw_image_url",
  "currency",
  "merchant_deep_link",
  "in_stock",
  "is_for_sale",
] as const;

export type AwinLegacyCsvRecord = Record<string, string>;

type CsvParserState = "unquoted" | "quoted" | "after-quote";

function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function normalizeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeLegacyAvailability(record: AwinLegacyCsvRecord): string | null {
  const inStock = record.in_stock.trim().toLowerCase();
  const forSale = record.is_for_sale.trim().toLowerCase();
  const status = (record.stock_status ?? "").trim().toLowerCase();
  if (inStock === "1" && forSale === "1") return "in_stock";
  if (
    inStock === "0" ||
    forSale === "0" ||
    /out[ -]?of[ -]?stock|unavailable|sold[ -]?out/.test(status)
  ) {
    return "out_of_stock";
  }
  if (
    inStock === "" &&
    forSale === "1" &&
    /^(?:in[ -]?stock|instock|available)$/.test(status)
  ) {
    return "in_stock";
  }
  return null;
}

function legacyDescription(record: AwinLegacyCsvRecord): string | null {
  const category = normalizeRequiredText(record.merchant_category);
  const description = normalizeRequiredText(record.description);
  if (!category) return description;

  // Legacy feeds frequently have blank or repeated descriptions. Retaining the
  // merchant category gives the matcher one trustworthy contextual signal.
  return description ? `Category: ${category}. ${description}` : `Category: ${category}.`;
}

async function* parseCsvRows(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let state: CsvParserState = "unquoted";
  let field = "";
  let row: string[] = [];
  let skipLineFeed = false;

  const finishField = () => {
    row.push(field);
    field = "";
    state = "unquoted";
  };
  const finishRow = (): string[] => {
    finishField();
    const complete = row;
    row = [];
    return complete;
  };

  const consume = function* (text: string): Generator<string[]> {
    for (const character of text) {
      if (skipLineFeed) {
        skipLineFeed = false;
        if (character === "\n") continue;
      }

      if (state === "quoted") {
        if (character === '"') state = "after-quote";
        else field += character;
        continue;
      }

      if (state === "after-quote") {
        if (character === '"') {
          field += '"';
          state = "quoted";
        } else if (character === ",") {
          finishField();
        } else if (character === "\n") {
          yield finishRow();
        } else if (character === "\r") {
          yield finishRow();
          skipLineFeed = true;
        } else {
          throw new AwinFeedError("Awin Legacy CSV has unexpected content after a quoted field.");
        }
        continue;
      }

      if (character === '"') {
        if (field.length > 0) {
          throw new AwinFeedError("Awin Legacy CSV has an unescaped quote in an unquoted field.");
        }
        state = "quoted";
      } else if (character === ",") {
        finishField();
      } else if (character === "\n") {
        yield finishRow();
      } else if (character === "\r") {
        yield finishRow();
        skipLineFeed = true;
      } else {
        field += character;
      }
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        const finalText = decoder.decode();
        for (const parsedRow of consume(finalText)) yield parsedRow;
        break;
      }
      const text = decoder.decode(value, { stream: true });
      for (const parsedRow of consume(text)) yield parsedRow;
    }
  } catch (error) {
    if (error instanceof AwinFeedError) throw error;
    throw new AwinFeedError("Awin Legacy CSV is not valid UTF-8.");
  } finally {
    await reader.cancel("Awin Legacy CSV parsing completed");
    reader.releaseLock();
  }

  const finalState = state as CsvParserState;
  if (finalState === "quoted") {
    throw new AwinFeedError("Awin Legacy CSV ended inside a quoted field.");
  }
  if (field.length > 0 || row.length > 0 || finalState === "after-quote") {
    yield finishRow();
  }
}

export async function* parseAwinLegacyCsvStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<AwinLegacyCsvRecord> {
  let headers: string[] | null = null;
  let rowNumber = 0;

  for await (const row of parseCsvRows(stream)) {
    rowNumber += 1;
    if (row.length === 1 && row[0] === "") continue;
    if (!headers) {
      headers = row.map((value, index) =>
        index === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim(),
      );
      const available = new Set(headers);
      const missing = LEGACY_AWIN_REQUIRED_COLUMNS.filter(
        (column) => !available.has(column),
      );
      if (missing.length > 0) {
        throw new AwinFeedError(
          `Awin Legacy CSV is missing required columns: ${missing.join(", ")}.`,
        );
      }
      continue;
    }
    if (row.length !== headers.length) {
      throw new AwinFeedError(
        `Awin Legacy CSV row ${rowNumber} has ${row.length} fields; expected ${headers.length}.`,
      );
    }
    yield Object.fromEntries(headers.map((header, index) => [header, row[index]]));
  }

  if (!headers) throw new AwinFeedError("Awin Legacy CSV is empty.");
}

export async function* parseAwinLegacyCsvGzipStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<AwinLegacyCsvRecord> {
  const source = Readable.fromWeb(stream as never);
  const gunzip = createGunzip();
  const decompressed = source.pipe(gunzip);
  try {
    yield* parseAwinLegacyCsvStream(Readable.toWeb(decompressed) as ReadableStream<Uint8Array>);
  } catch (error) {
    if (error instanceof AwinFeedError) throw error;
    throw new AwinFeedError("Awin Legacy CSV gzip decompression failed.");
  } finally {
    source.destroy();
    gunzip.destroy();
  }
}

export function normalizeAwinLegacyProduct(
  record: unknown,
  options: { advertiserId: string; locale: string; importedAt: string },
): NormalizeResult {
  if (
    typeof record !== "object" ||
    record === null ||
    Array.isArray(record) ||
    !Object.values(record).every((value) => typeof value === "string")
  ) {
    return { ok: false, reason: "record_not_object" };
  }
  const legacyRecord = record as AwinLegacyCsvRecord;
  const merchantId = normalizeRequiredText(legacyRecord.merchant_id);
  if (merchantId !== options.advertiserId) {
    return { ok: false, reason: "advertiser_mismatch" };
  }
  const externalProductId = normalizeRequiredText(legacyRecord.aw_product_id);
  const title = normalizeRequiredText(legacyRecord.product_name);
  const merchantName = normalizeRequiredText(legacyRecord.merchant_name);
  const currency = normalizeRequiredText(legacyRecord.currency)?.toUpperCase();
  const price = currency
    ? normalizeAwinPrice(`${legacyRecord.search_price.trim()} ${currency}`)
    : null;
  const imageUrl =
    normalizeHttpsUrl(legacyRecord.aw_image_url) ??
    normalizeHttpsUrl(legacyRecord.merchant_image_url) ??
    normalizeHttpsUrl(legacyRecord.large_image);
  const destinationUrl = normalizeHttpsUrl(legacyRecord.merchant_deep_link);
  const availability = normalizeLegacyAvailability(legacyRecord);

  if (!externalProductId) return { ok: false, reason: "missing_product_id" };
  if (!title) return { ok: false, reason: "missing_title" };
  if (!merchantName) return { ok: false, reason: "missing_merchant_name" };
  if (!price) return { ok: false, reason: "invalid_price" };
  if (!imageUrl) return { ok: false, reason: "invalid_image_url" };
  if (!destinationUrl) return { ok: false, reason: "invalid_destination_url" };
  if (!availability) return { ok: false, reason: "invalid_availability" };
  if (!isExpectedAwinTrackingUrl(legacyRecord.aw_deep_link)) {
    return { ok: false, reason: "invalid_affiliate_url" };
  }

  return {
    ok: true,
    product: {
      provider: AWIN_PROVIDER,
      advertiserId: options.advertiserId,
      merchantName,
      externalProductId,
      locale: options.locale,
      title,
      description: legacyDescription(legacyRecord),
      imageUrl,
      destinationUrl,
      affiliateUrl: legacyRecord.aw_deep_link.trim(),
      price: price.amount,
      currency: price.currency,
      availability,
      importedAt: options.importedAt,
    },
  };
}
