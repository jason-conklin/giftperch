const AFFILIATE_FALLBACK_TAG = "giftperch-20";
let warnedMissingTag = false;

export type AmazonAffiliateUrlOptions = {
  productUrl?: string | null;
  title?: string | null;
};

function getAffiliateTag(): string {
  const tag =
    process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG ||
    process.env.AMAZON_PAAPI_PARTNER_TAG ||
    process.env.AMAZON_PA_PARTNER_TAG ||
    AFFILIATE_FALLBACK_TAG;

  if (
    tag === AFFILIATE_FALLBACK_TAG &&
    process.env.NODE_ENV !== "production" &&
    !warnedMissingTag
  ) {
    console.warn(
      "[amazon] Amazon partner tag env not configured; falling back to 'giftperch-20'.",
    );
    warnedMissingTag = true;
  }

  return tag;
}

export function buildAmazonAffiliateUrl({
  productUrl,
  title,
}: AmazonAffiliateUrlOptions): string {
  const partnerTag = getAffiliateTag();
  const safeTitle = title?.trim() || "gift ideas";

  const looksLikeAmazon =
    typeof productUrl === "string" && productUrl.includes("amazon.");

  if (looksLikeAmazon) {
    try {
      const url = new URL(productUrl as string);
      url.searchParams.set("tag", partnerTag);
      return url.toString();
    } catch {
      // fall through to search URL
    }
  }

  const query = encodeURIComponent(safeTitle);
  return `https://www.amazon.com/s?k=${query}&tag=${partnerTag}`;
}
