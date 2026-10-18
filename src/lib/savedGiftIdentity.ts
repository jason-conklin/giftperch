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
  return `${normalized.provider}:${normalized.productId.trim().toLowerCase()}`;
}
