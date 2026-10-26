import {
  getMatchedProductPresentation,
  getSafeExternalUrl,
} from "@/lib/affiliateProduct";
import {
  getAwinDestinationValidationMaxAgeHours,
  isAwinProductDestinationCurrent,
} from "@/server/awin/advertisers";

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

export function resolveGiftProductDestination(args: {
  title?: string | null;
  productUrl?: unknown;
  productMatch?: unknown;
  amazonProduct?: unknown;
}): GiftProductDestination | null {
  const matchedProduct = getMatchedProductPresentation(
    args.productMatch,
    args.amazonProduct,
  );
  if (matchedProduct) {
    const validationMaxAgeHours =
      matchedProduct.match.provider === "awin"
        ? getAwinDestinationValidationMaxAgeHours(
            matchedProduct.match.advertiserId,
          )
        : null;
    if (
      matchedProduct.match.destinationHealthStatus === "invalid" ||
      (validationMaxAgeHours !== null &&
        !isAwinProductDestinationCurrent({
          advertiserId: matchedProduct.match.advertiserId,
          status: matchedProduct.match.destinationHealthStatus,
          checkedAt: matchedProduct.match.destinationCheckedAt,
        }))
    ) {
      return null;
    }
    return {
      href: matchedProduct.match.affiliateUrl,
      label: matchedProduct.shoppingLabel,
      isAffiliate: true,
    };
  }

  return null;
}
