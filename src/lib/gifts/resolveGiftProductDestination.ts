import { buildAmazonAffiliateUrl } from "@/lib/amazonAffiliate";
import {
  getMatchedProductPresentation,
  getSafeExternalUrl,
  isExpectedAmazonAffiliateUrl,
} from "@/lib/affiliateProduct";

export type GiftProductDestination = {
  href: string;
  label: string;
  isAffiliate: boolean;
};

const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

export function isPlaceholderProductUrl(value: unknown): boolean {
  const safeUrl = getSafeExternalUrl(value);
  if (!safeUrl) return false;
  const hostname = new URL(safeUrl).hostname.toLowerCase();
  return (
    PLACEHOLDER_HOSTS.has(hostname) ||
    [...PLACEHOLDER_HOSTS].some((host) => hostname.endsWith(`.${host}`)) ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".example")
  );
}

export function resolveGiftProductDestination({
  title,
  productUrl,
  productMatch,
  amazonProduct,
}: {
  title?: string | null;
  productUrl?: unknown;
  productMatch?: unknown;
  amazonProduct?: unknown;
}): GiftProductDestination | null {
  const matchedProduct = getMatchedProductPresentation(
    productMatch,
    amazonProduct,
  );
  if (matchedProduct) {
    return {
      href: matchedProduct.match.affiliateUrl,
      label: matchedProduct.shoppingLabel,
      isAffiliate: true,
    };
  }

  const safeProductUrl = getSafeExternalUrl(productUrl);
  if (safeProductUrl && !isPlaceholderProductUrl(safeProductUrl)) {
    if (isExpectedAmazonAffiliateUrl(safeProductUrl)) {
      return {
        href: buildAmazonAffiliateUrl({ productUrl: safeProductUrl, title }),
        label: "View on Amazon",
        isAffiliate: true,
      };
    }
    return { href: safeProductUrl, label: "View product", isAffiliate: false };
  }

  const normalizedTitle = title?.trim();
  if (!normalizedTitle) return null;
  return {
    href: buildAmazonAffiliateUrl({ title: normalizedTitle }),
    label: "View on Amazon",
    isAffiliate: true,
  };
}
