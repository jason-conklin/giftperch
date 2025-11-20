import { serverEnv, isProd } from "@/lib/env";

const AFFILIATE_FALLBACK_TAG = "giftperch-20";
let warnedMissingTag = false;

export type AmazonAffiliateUrlOptions = {
  productUrl?: string | null;
  title?: string | null;
};

export function buildAmazonAffiliateUrl({
  productUrl,
  title,
}: AmazonAffiliateUrlOptions): string {
  const partnerTag = serverEnv.amazonPaPartnerTag || AFFILIATE_FALLBACK_TAG;

  if (!serverEnv.amazonPaPartnerTag && !isProd && !warnedMissingTag) {
    console.warn(
      "[amazon] AMAZON_PA_PARTNER_TAG not configured; falling back to 'giftperch-20'."
    );
    warnedMissingTag = true;
  }

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
