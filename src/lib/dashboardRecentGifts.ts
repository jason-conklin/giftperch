import {
  getMatchedProductPresentation,
  getSafeImageUrl,
} from "@/lib/affiliateProduct";
import {
  resolveGiftPreviewSource,
  type GiftPreviewSource,
} from "@/lib/gifts/getGiftPreviewIcon";
import {
  getSavedGiftProductKey,
  normalizeSavedGiftTitle,
} from "@/lib/savedGiftIdentity";

export const RECENT_GIFT_LIMIT = 16;

const RECIPIENT_AVATARS: Record<string, string> = {
  babyboy: "/babyboy_icon.png",
  babygirl: "/babygirl_icon.png",
  boy: "/boy_icon.png",
  girl: "/girl_icon.png",
  man: "/man_icon.png",
  woman: "/woman_icon.png",
  dog: "/dog_icon.png",
  cat: "/cat_icon.png",
};

export type RecentGiftRecipient = {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_icon: string | null;
};

export type RecentSavedGift = {
  id: string;
  recipient_id: string;
  title: string;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  image_url: string | null;
  product_match: unknown;
  rationale: string | null;
  tier: string | null;
  created_at: string;
};

export type RecentGiftCardModel = {
  id: string;
  title: string;
  imageSource: GiftPreviewSource;
  price: string;
  merchant: string | null;
  recipientName: string | null;
  recipientAvatar:
    | { kind: "image"; src: string; fallbackInitials: string }
    | { kind: "initials"; initials: string };
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "GP";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`
    .toUpperCase()
    .slice(0, 2);
}

function getRecipientAvatar(recipient: RecentGiftRecipient | undefined) {
  if (!recipient) {
    return { kind: "initials" as const, initials: "GP" };
  }
  const customAvatar = getSafeImageUrl(recipient.avatar_url);
  const presetAvatar = recipient.avatar_icon
    ? RECIPIENT_AVATARS[recipient.avatar_icon]
    : null;
  const src = customAvatar ?? presetAvatar;
  return src
    ? {
        kind: "image" as const,
        src,
        fallbackInitials: getInitials(recipient.name),
      }
    : { kind: "initials" as const, initials: getInitials(recipient.name) };
}

function formatEstimatedPrice(gift: RecentSavedGift) {
  const min = gift.estimated_price_min;
  const max = gift.estimated_price_max;
  if (min === null && max === null) return "Saved idea";
  if (min !== null && max !== null && min !== max) {
    return `$${min.toFixed(0)}–$${max.toFixed(0)}`;
  }
  return `$${(min ?? max ?? 0).toFixed(2)}`;
}

export function prepareRecentGiftCards(
  gifts: RecentSavedGift[],
  recipients: Map<string, RecentGiftRecipient>,
  limit = RECENT_GIFT_LIMIT,
): RecentGiftCardModel[] {
  const seen = new Set<string>();
  const cards: RecentGiftCardModel[] = [];

  for (const gift of gifts) {
    const identity =
      getSavedGiftProductKey(gift.product_match) ??
      `title:${normalizeSavedGiftTitle(gift.title)}`;
    const scopedIdentity = `${gift.recipient_id}:${identity}`;
    if (seen.has(scopedIdentity)) continue;
    seen.add(scopedIdentity);

    const recipient = recipients.get(gift.recipient_id);
    const product = getMatchedProductPresentation(gift.product_match);
    cards.push({
      id: gift.id,
      title: gift.title,
      imageSource: resolveGiftPreviewSource({
        metadata: {
          title: gift.title,
          rationale: gift.rationale,
          tier: gift.tier,
        },
        imageUrl: gift.image_url,
        productMatch: gift.product_match,
      }),
      price: product?.priceDisplay ?? formatEstimatedPrice(gift),
      merchant: product?.match.merchant ?? null,
      recipientName: recipient?.name ?? null,
      recipientAvatar: getRecipientAvatar(recipient),
    });

    if (cards.length >= limit) break;
  }

  return cards;
}
