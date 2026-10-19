import {
  normalizeProductMatch,
  type ProductMatch,
} from "@/lib/affiliateProduct";
import {
  findAwinAdvertiserById,
  getImportEnabledAwinAdvertisers,
  type AwinAdvertiserConfig,
} from "./advertisers";

export type AwinProductScope = {
  advertiserId: string;
  locale: string;
};

function trackingAdvertiserId(affiliateUrl: string): string | null {
  try {
    return new URL(affiliateUrl).searchParams.get("awinmid")?.trim() || null;
  } catch {
    return null;
  }
}

function isLegacyMatchForAdvertiser(
  match: ProductMatch,
  advertiser: AwinAdvertiserConfig,
): boolean {
  const merchantMatches =
    match.merchant.trim().toLowerCase() ===
    advertiser.displayName.trim().toLowerCase();
  const trackingId = trackingAdvertiserId(match.affiliateUrl);
  return (
    merchantMatches && (!trackingId || trackingId === advertiser.advertiserId)
  );
}

export function resolveAwinProductScope(
  value: unknown,
): AwinProductScope | null {
  const match = normalizeProductMatch(value);
  if (!match || match.provider !== "awin") return null;

  if (match.advertiserId) {
    const advertiser = findAwinAdvertiserById(match.advertiserId);
    if (!advertiser || (match.locale && match.locale !== advertiser.locale)) {
      return null;
    }
    return {
      advertiserId: advertiser.advertiserId,
      locale: advertiser.locale,
    };
  }

  const candidates = getImportEnabledAwinAdvertisers().filter((candidate) =>
    isLegacyMatchForAdvertiser(match, candidate),
  );

  return candidates.length === 1
    ? {
        advertiserId: candidates[0].advertiserId,
        locale: candidates[0].locale,
      }
    : null;
}
