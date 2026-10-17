import {
  AWIN_PROVIDER,
  type AffiliateProduct,
  type NormalizeResult,
} from "./types";
import { isExpectedAwinTrackingUrl } from "@/lib/affiliateProduct";

export { isExpectedAwinTrackingUrl } from "@/lib/affiliateProduct";

const AWIN_API_ORIGIN = "https://api.awin.com";
const LOCALE_PATTERN = /^[a-z]{2}_[A-Z]{2}$/;
const MONEY_PATTERN = /^(\d+(?:\.\d{1,2})?)\s+([A-Z]{3})$/;
const MAX_DATABASE_PRICE = 9_999_999_999.99;

export class AwinFeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AwinFeedError";
  }
}

export class AwinTerminalFeedError extends AwinFeedError {
  constructor(message: string) {
    super(message);
    this.name = "AwinTerminalFeedError";
  }
}

export type AwinStreamDiagnostics = {
  status?: number;
  headers?: Record<string, string | null>;
};

export type AwinFeedRequest = {
  publisherId: string;
  advertiserId: string;
  locale: string;
  apiToken: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
};

export type AwinRawFeedResponse = {
  status: number;
  contentType: string | null;
  body: ReadableStream<Uint8Array>;
  diagnostics: AwinStreamDiagnostics;
};

export type AwinFeedResponse = {
  status: number;
  contentType: string | null;
  records: AsyncGenerator<unknown>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTerminalError(value: unknown): value is Record<string, unknown> {
  return isObject(value) && Object.hasOwn(value, "error");
}

function terminalErrorMessage(value: Record<string, unknown>): string {
  const detail = [value.message, value.description]
    .find((item) => typeof item === "string" && item.trim().length > 0);
  return typeof detail === "string"
    ? detail.slice(0, 300)
    : "Awin ended the feed with an error record.";
}

function parseJsonLine(line: string): unknown {
  try {
    return JSON.parse(line) as unknown;
  } catch {
    throw new AwinFeedError("Awin returned malformed JSONL.");
  }
}

export async function* parseAwinJsonlStream(
  stream: ReadableStream<Uint8Array>,
  diagnostics: AwinStreamDiagnostics = {},
): AsyncGenerator<unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let pending: unknown;
  let hasPending = false;
  let streamFinished = false;
  let bytesReceived = 0;
  let parsedRecords = 0;

  const acceptRecord = (record: unknown) => {
    const previous = hasPending ? pending : undefined;
    pending = record;
    hasPending = true;
    parsedRecords += 1;
    return previous;
  };

  try {
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch (error) {
        const errorName = error instanceof Error ? error.name : "UnknownError";
        throw new AwinFeedError(
          `Awin feed transport failed after ${bytesReceived} bytes and ${parsedRecords} parsed records (${errorName}).`,
        );
      }
      const { value, done } = result;
      if (done) {
        streamFinished = true;
        buffer += decoder.decode();
        break;
      }

      bytesReceived += value.byteLength;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) {
          const previous = acceptRecord(parseJsonLine(line));
          if (previous !== undefined) {
            if (isTerminalError(previous)) {
              throw new AwinTerminalFeedError(terminalErrorMessage(previous));
            }
            yield previous;
          }
        }
        newlineIndex = buffer.indexOf("\n");
      }
    }

    const finalLine = buffer.trim();
    if (finalLine) {
      const previous = acceptRecord(parseJsonLine(finalLine));
      if (previous !== undefined) {
        if (isTerminalError(previous)) {
          throw new AwinTerminalFeedError(terminalErrorMessage(previous));
        }
        yield previous;
      }
    }

    if (!hasPending) {
      const status = diagnostics.status ?? "unknown";
      const headers = Object.entries(diagnostics.headers ?? {})
        .map(([name, value]) => `${name}=${value ?? "missing"}`)
        .join(", ");
      throw new AwinFeedError(
        `Awin returned an empty feed (HTTP ${status}; bytes=${bytesReceived}; parsedRecords=${parsedRecords}; ${headers || "headers=unavailable"}).`,
      );
    }
    if (isTerminalError(pending)) {
      throw new AwinTerminalFeedError(terminalErrorMessage(pending));
    }
    yield pending;
  } finally {
    if (!streamFinished) {
      await reader.cancel("Awin JSONL parsing stopped before the stream ended");
    }
    reader.releaseLock();
  }
}

function sanitizeDiagnostic(value: string, secrets: string[] = []): string {
  let sanitized = value;
  for (const secret of secrets) {
    if (secret) sanitized = sanitized.replaceAll(secret, "[redacted]");
  }
  return sanitized
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[redacted-token]",
    )
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 500);
}

async function readSanitizedError(
  response: Response,
  secrets: string[],
): Promise<string> {
  const text = (await response.text()).trim();
  if (!text) return "No response details were provided.";
  return sanitizeDiagnostic(text, secrets);
}

export async function openAwinEnhancedFeed({
  publisherId,
  advertiserId,
  locale,
  apiToken,
  signal,
  fetchImpl = fetch,
}: AwinFeedRequest): Promise<AwinRawFeedResponse> {
  if (!/^\d+$/.test(publisherId) || !/^\d+$/.test(advertiserId)) {
    throw new AwinFeedError("Awin publisher and advertiser IDs must be numeric.");
  }
  if (!LOCALE_PATTERN.test(locale)) {
    throw new AwinFeedError("Awin locale must use language_COUNTRY format.");
  }
  if (!apiToken.trim()) {
    throw new AwinFeedError("AWIN_API_TOKEN is not configured.");
  }

  const endpoint = `${AWIN_API_ORIGIN}/publishers/${publisherId}/awinfeeds/download/${advertiserId}-retail-${locale}.jsonl`;
  const response = await fetchImpl(endpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiToken}` },
    redirect: "error",
    signal,
  });

  if (!response.ok) {
    const detail = await readSanitizedError(response, [apiToken]);
    throw new AwinFeedError(
      `Awin feed request failed with HTTP ${response.status}: ${detail}`,
    );
  }
  if (!response.body) {
    throw new AwinFeedError("Awin returned a successful response without a body.");
  }

  const diagnostics: AwinStreamDiagnostics = {
    status: response.status,
    headers: {
      "content-length": response.headers.get("content-length"),
      "transfer-encoding": response.headers.get("transfer-encoding"),
      "retry-after": response.headers.get("retry-after"),
      "x-request-id": response.headers.get("x-request-id"),
      "x-amzn-requestid": response.headers.get("x-amzn-requestid"),
      "cf-ray": response.headers.get("cf-ray"),
    },
  };

  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    body: response.body,
    diagnostics,
  };
}

export async function fetchAwinEnhancedFeed(
  request: AwinFeedRequest,
): Promise<AwinFeedResponse> {
  const response = await openAwinEnhancedFeed(request);
  return {
    status: response.status,
    contentType: response.contentType,
    records: parseAwinJsonlStream(response.body, response.diagnostics),
  };
}

export function normalizeAwinPrice(
  value: unknown,
): { amount: string; currency: string } | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(MONEY_PATTERN);
  if (!match) return null;
  const amount = Number(match[1]);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > MAX_DATABASE_PRICE
  ) {
    return null;
  }
  return { amount: amount.toFixed(2), currency: match[2] };
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

export function normalizeAwinProduct(
  record: unknown,
  options: {
    advertiserId: string;
    locale: string;
    importedAt: string;
  },
): NormalizeResult {
  if (!isObject(record)) return { ok: false, reason: "record_not_object" };

  const meta = isObject(record.meta) ? record.meta : null;
  const recordAdvertiserId = meta?.advertiser_id;
  if (
    recordAdvertiserId !== undefined &&
    String(recordAdvertiserId) !== options.advertiserId
  ) {
    return { ok: false, reason: "advertiser_mismatch" };
  }

  const externalProductId = normalizeRequiredText(
    typeof record.id === "number" ? String(record.id) : record.id,
  );
  const title = normalizeRequiredText(record.title);
  const merchantName = normalizeRequiredText(meta?.advertiser_name);
  const price = normalizeAwinPrice(record.price);
  const imageUrl = normalizeHttpUrl(record.image_link);
  const destinationUrl = normalizeHttpUrl(record.link);
  const availability = normalizeRequiredText(record.availability);

  if (!externalProductId) return { ok: false, reason: "missing_product_id" };
  if (!title) return { ok: false, reason: "missing_title" };
  if (!merchantName) return { ok: false, reason: "missing_merchant_name" };
  if (!price) return { ok: false, reason: "invalid_price" };
  if (!imageUrl) return { ok: false, reason: "invalid_image_url" };
  if (!destinationUrl) return { ok: false, reason: "invalid_destination_url" };
  if (!availability) return { ok: false, reason: "missing_availability" };
  if (!isExpectedAwinTrackingUrl(record.aw_deep_link)) {
    return { ok: false, reason: "invalid_affiliate_url" };
  }

  const description = normalizeRequiredText(record.description);
  const product: AffiliateProduct = {
    provider: AWIN_PROVIDER,
    advertiserId: options.advertiserId,
    merchantName,
    externalProductId,
    locale: options.locale,
    title,
    description,
    imageUrl,
    destinationUrl,
    affiliateUrl: record.aw_deep_link,
    price: price.amount,
    currency: price.currency,
    availability,
    importedAt: options.importedAt,
  };

  return { ok: true, product };
}
