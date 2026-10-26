import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isExpectedAwinTrackingUrl } from "@/lib/affiliateProduct";

export const DESTINATION_HEALTH_STATUSES = [
  "unchecked",
  "valid",
  "invalid",
  "uncertain",
] as const;

export type DestinationHealthStatus =
  (typeof DESTINATION_HEALTH_STATUSES)[number];

export function normalizeDestinationHealthStatus(
  value: unknown,
): DestinationHealthStatus | null {
  return typeof value === "string" &&
    (DESTINATION_HEALTH_STATUSES as readonly string[]).includes(value)
    ? (value as DestinationHealthStatus)
    : null;
}

export type DestinationHealthReason =
  | "matching_product"
  | "merchant_homepage"
  | "category_page"
  | "unrelated_product"
  | "merchant_not_found"
  | "malformed_url"
  | "unexpected_host"
  | "redirect_loop"
  | "too_many_redirects"
  | "temporary_http_error"
  | "timeout"
  | "bot_protection"
  | "network_error";

export type DestinationHealthResult = {
  status: Exclude<DestinationHealthStatus, "unchecked">;
  reason: DestinationHealthReason;
  finalUrl: string | null;
  httpStatus: number | null;
  redirectCount: number;
};

type FetchLike = typeof fetch;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const CATEGORY_SEGMENTS = new Set([
  "category",
  "categories",
  "collection",
  "collections",
  "search",
  "shop",
]);

class UnsafeDestinationAddressError extends Error {}

function normalizedIpAddress(value: string): string {
  return value.toLowerCase().replace(/^\[|\]$/g, "");
}

export function isPublicDestinationAddress(value: string): boolean {
  const address = normalizedIpAddress(value);
  const family = isIP(address);
  if (family === 4) {
    const octets = address.split(".").map(Number);
    const [a, b, c] = octets;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (family === 6) {
    return !(
      address.startsWith("::") ||
      /^f[cd]/.test(address) ||
      /^fe[89ab]/.test(address) ||
      /^ff/.test(address) ||
      /^2001:db8(?::|$)/.test(address)
    );
  }
  return false;
}

async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => !isPublicDestinationAddress(address))
  ) {
    throw new UnsafeDestinationAddressError(
      "Destination hostname resolved to a non-public address.",
    );
  }
  return addresses.map(({ address }) => address);
}

function safeHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

function normalizedPath(url: URL): string {
  const path = decodeURIComponent(url.pathname)
    .replace(/\/+$/, "")
    .toLowerCase();
  return path || "/";
}

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function hostIsAllowed(url: URL, allowedHosts: readonly string[]): boolean {
  const hostname = normalizedHostname(url);
  return allowedHosts.some((allowedHost) => {
    const normalizedAllowed = allowedHost.trim().toLowerCase().replace(/^www\./, "");
    return hostname === normalizedAllowed || hostname.endsWith(`.${normalizedAllowed}`);
  });
}

function isCategoryPath(url: URL): boolean {
  const firstSegment = normalizedPath(url).split("/").filter(Boolean)[0];
  return Boolean(firstSegment && CATEGORY_SEGMENTS.has(firstSegment));
}

function looksLikeBotProtection(body: string): boolean {
  return /captcha|cloudflare|challenge-platform|verify you are human|access denied/i.test(
    body,
  );
}

async function boundedResponseText(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) return "";
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  try {
    while (body.length < 200_000) {
      const { done, value } = await reader.read();
      if (done) break;
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return body.slice(0, 200_000);
}

export async function validateAwinProductDestination(options: {
  affiliateUrl: string;
  destinationUrl: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maximumRedirects?: number;
  verifyTrackingRedirect?: boolean;
  allowedMerchantHosts?: readonly string[];
  resolveAddresses?: (hostname: string) => Promise<readonly string[]>;
}): Promise<DestinationHealthResult> {
  const expected = safeHttpsUrl(options.destinationUrl);
  const allowedMerchantHosts = options.allowedMerchantHosts ?? [
    expected?.hostname ?? "",
  ];
  if (
    !expected ||
    !isExpectedAwinTrackingUrl(options.affiliateUrl) ||
    !hostIsAllowed(expected, allowedMerchantHosts)
  ) {
    return {
      status: "invalid",
      reason: "malformed_url",
      finalUrl: null,
      httpStatus: null,
      redirectCount: 0,
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const resolveAddresses = options.resolveAddresses ?? resolvePublicAddresses;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maximumRedirects = options.maximumRedirects ?? 8;
  const visited = new Set<string>();
  let current = options.verifyTrackingRedirect
    ? options.affiliateUrl
    : expected.toString();

  try {
    for (let redirects = 0; redirects <= maximumRedirects; redirects += 1) {
      if (visited.has(current)) {
        return {
          status: "invalid",
          reason: "redirect_loop",
          finalUrl: current,
          httpStatus: null,
          redirectCount: redirects,
        };
      }
      visited.add(current);
      const currentUrl = safeHttpsUrl(current);
      const isTrackingHop =
        options.verifyTrackingRedirect &&
        isExpectedAwinTrackingUrl(current);
      if (
        !currentUrl ||
        (!isTrackingHop && !hostIsAllowed(currentUrl, allowedMerchantHosts))
      ) {
        return {
          status: "invalid",
          reason: "unexpected_host",
          finalUrl: currentUrl?.toString() ?? null,
          httpStatus: null,
          redirectCount: redirects,
        };
      }
      if (!options.fetchImpl || options.resolveAddresses) {
        const addresses = await resolveAddresses(currentUrl.hostname);
        if (
          addresses.length === 0 ||
          addresses.some((address) => !isPublicDestinationAddress(address))
        ) {
          throw new UnsafeDestinationAddressError(
            "Destination hostname resolved to a non-public address.",
          );
        }
      }

      const response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; GiftPerchLinkValidator/1.0; +https://giftperch.com)",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return {
            status: "uncertain",
            reason: "network_error",
            finalUrl: current,
            httpStatus: response.status,
            redirectCount: redirects,
          };
        }
        const next = safeHttpsUrl(new URL(location, current).toString());
        if (!next) {
          return {
            status: "invalid",
            reason: "malformed_url",
            finalUrl: null,
            httpStatus: response.status,
            redirectCount: redirects,
          };
        }
        if (
          !hostIsAllowed(next, allowedMerchantHosts) &&
          !(options.verifyTrackingRedirect && isExpectedAwinTrackingUrl(next.toString()))
        ) {
          return {
            status: "invalid",
            reason: "unexpected_host",
            finalUrl: next.toString(),
            httpStatus: response.status,
            redirectCount: redirects,
          };
        }
        current = next.toString();
        continue;
      }

      const finalUrl = safeHttpsUrl(response.url || current);
      if (!finalUrl) {
        return {
          status: "invalid",
          reason: "malformed_url",
          finalUrl: null,
          httpStatus: response.status,
          redirectCount: redirects,
        };
      }
      if (response.status === 404 || response.status === 410) {
        return {
          status: "invalid",
          reason: "merchant_not_found",
          finalUrl: finalUrl.toString(),
          httpStatus: response.status,
          redirectCount: redirects,
        };
      }
      if (response.status === 403 || response.status === 429 || response.status >= 500) {
        return {
          status: "uncertain",
          reason: response.status === 403 ? "bot_protection" : "temporary_http_error",
          finalUrl: finalUrl.toString(),
          httpStatus: response.status,
          redirectCount: redirects,
        };
      }
      if (response.status < 200 || response.status >= 300) {
        return {
          status: "uncertain",
          reason: "temporary_http_error",
          finalUrl: finalUrl.toString(),
          httpStatus: response.status,
          redirectCount: redirects,
        };
      }

      const body = await boundedResponseText(response);
      if (looksLikeBotProtection(body)) {
        return {
          status: "uncertain",
          reason: "bot_protection",
          finalUrl: finalUrl.toString(),
          httpStatus: response.status,
          redirectCount: redirects,
        };
      }

      const sameMerchant = normalizedHostname(finalUrl) === normalizedHostname(expected);
      const finalPath = normalizedPath(finalUrl);
      if (sameMerchant && finalPath === normalizedPath(expected)) {
        return {
          status: "valid",
          reason: "matching_product",
          finalUrl: finalUrl.toString(),
          httpStatus: response.status,
          redirectCount: redirects,
        };
      }
      return {
        status: "invalid",
        reason:
          finalPath === "/"
            ? "merchant_homepage"
            : isCategoryPath(finalUrl)
              ? "category_page"
              : "unrelated_product",
        finalUrl: finalUrl.toString(),
        httpStatus: response.status,
        redirectCount: redirects,
      };
    }
  } catch (error) {
    if (error instanceof UnsafeDestinationAddressError) {
      return {
        status: "invalid",
        reason: "unexpected_host",
        finalUrl: null,
        httpStatus: null,
        redirectCount: Math.max(0, visited.size - 1),
      };
    }
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      status: "uncertain",
      reason: isTimeout ? "timeout" : "network_error",
      finalUrl: null,
      httpStatus: null,
      redirectCount: Math.max(0, visited.size - 1),
    };
  }

  return {
    status: "uncertain",
    reason: "too_many_redirects",
    finalUrl: current,
    httpStatus: null,
    redirectCount: maximumRedirects,
  };
}
