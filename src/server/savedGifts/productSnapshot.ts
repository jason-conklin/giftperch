import {
  getSafeExternalUrl,
  getSafeImageUrl,
  normalizeProductMatch,
  productMatchFromAmazonProduct,
  type ProductMatch,
} from "@/lib/affiliateProduct";

export type AuthoritativeGiftSuggestion = {
  id?: string | null;
  title?: string | null;
  short_description?: string | null;
  tier?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  why_it_fits?: string | null;
  suggested_url?: string | null;
  image_url?: string | null;
  productMatch?: unknown;
  amazonProduct?: unknown;
};

export type SavedGiftSnapshot = {
  title: string;
  tier: string | null;
  rationale: string | null;
  estimatedPriceMin: number | null;
  estimatedPriceMax: number | null;
  productUrl: string | null;
  imageUrl: string | null;
  productMatch: ProductMatch | null;
};

function optionalText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maximumLength ? text : null;
}

function optionalPrice(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 9_999_999_999.99
    ? value
    : null;
}

export function findAuthoritativeSuggestion(
  suggestions: unknown,
  itemId: string | null,
  title: string | null,
): AuthoritativeGiftSuggestion | null {
  if (!Array.isArray(suggestions)) return null;
  const candidates = suggestions.filter(
    (item): item is AuthoritativeGiftSuggestion =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );
  if (itemId) {
    const byId = candidates.find(
      (item) => typeof item.id === "string" && item.id === itemId,
    );
    if (byId) return byId;
  }
  if (title) {
    const normalizedTitle = title.trim().toLowerCase();
    return (
      candidates.find(
        (item) =>
          typeof item.title === "string" &&
          item.title.trim().toLowerCase() === normalizedTitle,
      ) ?? null
    );
  }
  return null;
}

export function getSuggestionProductMatch(
  suggestion: AuthoritativeGiftSuggestion,
): ProductMatch | null {
  return (
    normalizeProductMatch(suggestion.productMatch) ??
    productMatchFromAmazonProduct(suggestion.amazonProduct)
  );
}

export function buildSavedGiftSnapshot(
  suggestion: AuthoritativeGiftSuggestion,
  canonicalProductMatch?: ProductMatch | null,
): SavedGiftSnapshot | null {
  const title = optionalText(suggestion.title, 1_000);
  if (!title) return null;
  const productMatch =
    canonicalProductMatch === undefined
      ? getSuggestionProductMatch(suggestion)
      : normalizeProductMatch(canonicalProductMatch);

  return {
    title,
    tier: optionalText(suggestion.tier, 100),
    rationale: optionalText(suggestion.why_it_fits, 10_000),
    estimatedPriceMin: optionalPrice(suggestion.price_min),
    estimatedPriceMax: optionalPrice(suggestion.price_max),
    productUrl:
      productMatch?.affiliateUrl ?? getSafeExternalUrl(suggestion.suggested_url),
    imageUrl:
      productMatch?.imageUrl ?? getSafeImageUrl(suggestion.image_url),
    productMatch,
  };
}

export function productMatchFromCatalogRow(value: unknown): ProductMatch | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const price = typeof row.price === "number" ? row.price : Number(row.price);
  return normalizeProductMatch({
    provider: "awin",
    advertiserId: row.advertiser_id,
    locale: row.locale,
    productId: row.external_product_id,
    merchant: row.merchant_name,
    productTitle: row.title,
    imageUrl: row.image_url,
    price,
    currency: row.currency,
    affiliateUrl: row.affiliate_url,
    destinationHealthStatus: row.destination_health_status,
    destinationCheckedAt: row.destination_checked_at,
  });
}
