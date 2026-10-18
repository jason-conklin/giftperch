import {
  getSavedGiftProductKey,
  normalizeSavedGiftTitle,
} from "@/lib/savedGiftIdentity";

export type SavedGiftIdentity = {
  title: string;
  product_match?: unknown;
};

export function findMatchingSavedGift<T extends SavedGiftIdentity>(
  savedGifts: readonly T[],
  title: string,
  productMatch?: unknown,
): T | null {
  const requestedTitle = normalizeSavedGiftTitle(title);
  const requestedProduct = getSavedGiftProductKey(productMatch);
  if (!requestedTitle && !requestedProduct) return null;

  return (
    savedGifts.find((savedGift) => {
      const savedProduct = getSavedGiftProductKey(savedGift.product_match);
      if (requestedProduct && savedProduct) {
        return requestedProduct === savedProduct;
      }
      return normalizeSavedGiftTitle(savedGift.title) === requestedTitle;
    }) ?? null
  );
}
