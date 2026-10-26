export type ProductProvider = "awin" | "amazon";

export type ProductMatch = {
  provider: ProductProvider;
  advertiserId?: string;
  locale?: string;
  productId: string;
  merchant: string;
  productTitle: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  affiliateUrl: string;
  destinationHealthStatus?: "valid" | "invalid" | "uncertain" | "unchecked";
  destinationCheckedAt?: string;
};

export type LegacyAmazonProduct = {
  asin: string;
  title: string;
  imageUrl: string | null;
  detailPageUrl: string | null;
  priceDisplay: string | null;
  currency?: string | null;
  primeEligible?: boolean | null;
};

export type MatchedProductPresentation = {
  match: ProductMatch;
  shoppingLabel: string;
  merchantLabel: string;
  priceDisplay: string | null;
};

export const AFFILIATE_LINK_REL = "sponsored noopener noreferrer";
export const AFFILIATE_SHOPPING_BUTTON_CLASS =
  "gp-btn gp-btn--gold gp-btn--md text-sm";
export const AFFILIATE_DISCLOSURE =
  "Affiliate link. GiftPerch may earn a commission.";

const AWIN_TRACKING_DOMAIN = "awin1.com";
const AMAZON_DOMAIN = "amazon.com";
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const MAX_PRICE = 9_999_999_999.99;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, maximumLength = 500): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maximumLength ? text : null;
}

function safeHttpsUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function isExpectedAwinTrackingUrl(value: unknown): value is string {
  const url = safeHttpsUrl(value);
  if (!url) return false;
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === AWIN_TRACKING_DOMAIN ||
    hostname.endsWith(`.${AWIN_TRACKING_DOMAIN}`)
  );
}

export function isExpectedAmazonAffiliateUrl(value: unknown): value is string {
  const url = safeHttpsUrl(value);
  if (!url) return false;
  const hostname = url.hostname.toLowerCase();
  return hostname === AMAZON_DOMAIN || hostname.endsWith(`.${AMAZON_DOMAIN}`);
}

export function getSafeExternalUrl(value: unknown): string | null {
  return safeHttpsUrl(value)?.toString() ?? null;
}

export function getSafeImageUrl(value: unknown): string | null {
  return safeHttpsUrl(value)?.toString() ?? null;
}

function normalizedPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_PRICE
    ? value
    : null;
}

function normalizedCurrency(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const currency = value.trim().toUpperCase();
  return CURRENCY_PATTERN.test(currency) ? currency : null;
}

export function normalizeProductMatch(value: unknown): ProductMatch | null {
  if (!isObject(value)) return null;
  const provider =
    value.provider === "awin" || value.provider === "amazon"
      ? value.provider
      : null;
  const productId = requiredText(value.productId, 300);
  const merchant = requiredText(value.merchant, 200);
  const productTitle = requiredText(value.productTitle, 1_000);
  const affiliateUrl =
    provider === "awin" && isExpectedAwinTrackingUrl(value.affiliateUrl)
      ? new URL(value.affiliateUrl).toString()
      : provider === "amazon" &&
        isExpectedAmazonAffiliateUrl(value.affiliateUrl)
      ? new URL(value.affiliateUrl).toString()
      : null;
  const price = normalizedPrice(value.price);
  const currency = normalizedCurrency(value.currency);
  const imageUrl =
    value.imageUrl === null || value.imageUrl === undefined
      ? null
      : getSafeImageUrl(value.imageUrl);
  const advertiserId =
    value.advertiserId === undefined || value.advertiserId === null
      ? null
      : requiredText(value.advertiserId, 100);
  const locale =
    value.locale === undefined || value.locale === null
      ? null
      : requiredText(value.locale, 20);
  const destinationHealthStatus =
    value.destinationHealthStatus === "valid" ||
    value.destinationHealthStatus === "invalid" ||
    value.destinationHealthStatus === "uncertain" ||
    value.destinationHealthStatus === "unchecked"
      ? value.destinationHealthStatus
      : null;
  const destinationCheckedAt =
    typeof value.destinationCheckedAt === "string" &&
    Number.isFinite(Date.parse(value.destinationCheckedAt))
      ? value.destinationCheckedAt
      : null;

  if (!provider || !productId || !merchant || !productTitle || !affiliateUrl) {
    return null;
  }
  if (value.price !== null && value.price !== undefined && price === null) {
    return null;
  }
  if (
    value.currency !== null &&
    value.currency !== undefined &&
    currency === null
  ) {
    return null;
  }
  if (value.imageUrl && !imageUrl) return null;
  if (
    (value.advertiserId !== undefined &&
      value.advertiserId !== null &&
      !advertiserId) ||
    (value.locale !== undefined && value.locale !== null && !locale)
  ) {
    return null;
  }
  if (provider === "awin" && (price === null || currency === null || !imageUrl)) {
    return null;
  }

  return {
    provider,
    ...(provider === "awin" && advertiserId ? { advertiserId } : {}),
    ...(provider === "awin" && locale ? { locale } : {}),
    productId,
    merchant,
    productTitle,
    imageUrl,
    price,
    currency,
    affiliateUrl,
    ...(provider === "awin" && destinationHealthStatus
      ? { destinationHealthStatus }
      : {}),
    ...(provider === "awin" && destinationCheckedAt
      ? { destinationCheckedAt }
      : {}),
  };
}

function parsePriceDisplay(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/(?:^|[^0-9])(\d+(?:\.\d{1,2})?)/);
  return match ? normalizedPrice(Number(match[1])) : null;
}

export function productMatchFromAmazonProduct(
  value: unknown,
): ProductMatch | null {
  if (!isObject(value)) return null;
  return normalizeProductMatch({
    provider: "amazon",
    productId: value.asin,
    merchant: "Amazon",
    productTitle: value.title,
    imageUrl: value.imageUrl ?? null,
    price: parsePriceDisplay(value.priceDisplay),
    currency: value.currency ?? null,
    affiliateUrl: value.detailPageUrl,
  });
}

export function resolveProductMatch(
  productMatch: unknown,
  amazonProduct?: unknown,
): ProductMatch | null {
  return (
    normalizeProductMatch(productMatch) ??
    productMatchFromAmazonProduct(amazonProduct)
  );
}

export function formatMatchedProductPrice(
  price: number | null,
  currency: string | null,
): string | null {
  if (price === null || !currency) return null;
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
    return `${formatted} ${currency}`;
  } catch {
    return `${price.toFixed(2)} ${currency}`;
  }
}

export function getMatchedProductPresentation(
  productMatch: unknown,
  amazonProduct?: unknown,
): MatchedProductPresentation | null {
  const match = resolveProductMatch(productMatch, amazonProduct);
  if (!match) return null;
  return {
    match,
    shoppingLabel:
      match.provider === "awin"
        ? `View at ${match.merchant}`
        : "View on Amazon",
    merchantLabel: `Sold by ${match.merchant}`,
    priceDisplay: formatMatchedProductPrice(match.price, match.currency),
  };
}
