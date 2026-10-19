import { normalizeProductMatch } from "@/lib/affiliateProduct";

export type SavedGiftIdentityInput = {
  title: string;
  productMatch?: unknown;
};

export function normalizeSavedGiftTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getSavedGiftProductKey(productMatch: unknown): string | null {
  const normalized = normalizeProductMatch(productMatch);
  if (!normalized) return null;
  const productId = normalized.productId.trim().toLowerCase();
  if (normalized.provider === "awin" && normalized.advertiserId) {
    const locale = normalized.locale?.trim().toLowerCase() ?? "unknown-locale";
    return `awin:${normalized.advertiserId}:${locale}:${productId}`;
  }
  return `${normalized.provider}:${productId}`;
}

export function areSavedGiftProductsEquivalent(
  left: unknown,
  right: unknown,
): boolean {
  const leftMatch = normalizeProductMatch(left);
  const rightMatch = normalizeProductMatch(right);
  if (!leftMatch || !rightMatch) return false;
  if (
    leftMatch.provider !== rightMatch.provider ||
    leftMatch.productId.trim().toLowerCase() !==
      rightMatch.productId.trim().toLowerCase()
  ) {
    return false;
  }
  if (leftMatch.provider !== "awin" || rightMatch.provider !== "awin") {
    return true;
  }

  if (leftMatch.advertiserId && rightMatch.advertiserId) {
    if (leftMatch.advertiserId !== rightMatch.advertiserId) return false;
    if (leftMatch.locale && rightMatch.locale) {
      return leftMatch.locale === rightMatch.locale;
    }
  }

  return (
    leftMatch.affiliateUrl === rightMatch.affiliateUrl &&
    leftMatch.merchant.trim().toLowerCase() ===
      rightMatch.merchant.trim().toLowerCase()
  );
}
