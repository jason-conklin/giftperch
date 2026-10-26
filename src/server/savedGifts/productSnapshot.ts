import {
  getSafeExternalUrl,
  getSafeImageUrl,
  normalizeProductMatch,
  productMatchFromAmazonProduct,
  type ProductMatch,
} from "@/lib/affiliateProduct";
import { isAwinProductDestinationCurrent } from "@/server/awin/advertisers";

export const SAVED_GIFT_DESTINATION_UNAVAILABLE_MESSAGE =
  "This product listing is no longer available. Refresh gift ideas and choose another product.";

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

function uniqueSuggestion(
  candidates: AuthoritativeGiftSuggestion[],
): AuthoritativeGiftSuggestion | null {
  return candidates.length === 1 ? candidates[0] : null;
}

function normalizedSuggestionTitle(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function findAuthoritativeSuggestion(
  suggestions: unknown,
  itemId: string | null,
  title: string | null,
  productUrl?: string | null,
): AuthoritativeGiftSuggestion | null {
  if (!Array.isArray(suggestions)) return null;
  const candidates = suggestions.filter(
    (item): item is AuthoritativeGiftSuggestion =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );
  if (itemId) {
    return uniqueSuggestion(
      candidates.filter(
        (item) => typeof item.id === "string" && item.id === itemId,
      ),
    );
  }

  const safeProductUrl = getSafeExternalUrl(productUrl);
  if (safeProductUrl) {
    return uniqueSuggestion(
      candidates.filter((item) => {
        const match = getSuggestionProductMatch(item);
        return (
          match?.affiliateUrl === safeProductUrl ||
          getSafeExternalUrl(item.suggested_url) === safeProductUrl
        );
      }),
    );
  }

  if (title) {
    const normalizedTitle = normalizedSuggestionTitle(title);
    return uniqueSuggestion(
      candidates.filter(
        (item) =>
          typeof item.title === "string" &&
          normalizedSuggestionTitle(item.title) === normalizedTitle,
      ),
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

export function getSavedGiftDestinationError(
  productMatch: ProductMatch | null,
  now = Date.now(),
): string | null {
  if (productMatch?.provider !== "awin") return null;
  return isAwinProductDestinationCurrent({
    advertiserId: productMatch.advertiserId,
    status: productMatch.destinationHealthStatus,
    checkedAt: productMatch.destinationCheckedAt,
    now,
  })
    ? null
    : SAVED_GIFT_DESTINATION_UNAVAILABLE_MESSAGE;
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
