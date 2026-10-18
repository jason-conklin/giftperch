import {
  getMatchedProductPresentation,
  getSafeImageUrl,
} from "@/lib/affiliateProduct";

export const GIFT_HISTORY_IMAGE_FALLBACK = "/gift-thumbnails/default-gift.svg";

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

export type HistoryRecipientVisualInput = {
  name: string;
  avatar_url?: string | null;
  avatar_icon?: string | null;
};

export type GiftHistorySort =
  | "recent"
  | "oldest"
  | "price-high"
  | "price-low";

export type SavedIdeaSort = "recent" | "oldest" | "price-high" | "price-low";

export type SavedIdeaPresentationInput = {
  created_at: string;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  product_match: unknown;
};

export type SortableGiftHistoryEntry = {
  purchased_at: string | null;
  created_at: string;
  price: number | null;
};

export function getGiftHistoryInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "GP";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`
    .toUpperCase()
    .slice(0, 2);
}

export function resolveHistoryRecipientAvatar(
  recipient: HistoryRecipientVisualInput | undefined,
) {
  if (!recipient) return { kind: "initials" as const, initials: "GP" };
  const custom = getSafeImageUrl(recipient.avatar_url);
  const preset = recipient.avatar_icon
    ? RECIPIENT_AVATARS[recipient.avatar_icon]
    : null;
  const src = custom ?? preset;
  return src
    ? {
        kind: "image" as const,
        src,
        fallbackInitials: getGiftHistoryInitials(recipient.name),
      }
    : {
        kind: "initials" as const,
        initials: getGiftHistoryInitials(recipient.name),
      };
}

export function resolveGiftHistoryImage(imageUrl: string | null) {
  return getSafeImageUrl(imageUrl) ?? GIFT_HISTORY_IMAGE_FALLBACK;
}

export function formatGiftHistoryPrice(price: number | null) {
  if (price === null || !Number.isFinite(price)) return "Price not recorded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatSavedIdeaPrice(idea: SavedIdeaPresentationInput) {
  const matched = getMatchedProductPresentation(idea.product_match);
  if (matched?.priceDisplay) return matched.priceDisplay;
  const min = idea.estimated_price_min;
  const max = idea.estimated_price_max;
  if (min === null && max === null) return "Price not available";
  if (min !== null && max !== null) {
    return min === max
      ? `$${min.toFixed(2)}`
      : `$${min.toFixed(2)}–$${max.toFixed(2)}`;
  }
  return min !== null ? `From $${min.toFixed(2)}` : `Up to $${max?.toFixed(2)}`;
}

function savedIdeaSortPrice(idea: SavedIdeaPresentationInput) {
  return (
    getMatchedProductPresentation(idea.product_match)?.match.price ??
    idea.estimated_price_min ??
    idea.estimated_price_max
  );
}

export function sortSavedIdeas<T extends SavedIdeaPresentationInput>(
  ideas: T[],
  sort: SavedIdeaSort,
) {
  return [...ideas].sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sort === "price-high" || sort === "price-low") {
      const aPrice = savedIdeaSortPrice(a);
      const bPrice = savedIdeaSortPrice(b);
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return sort === "price-high" ? bPrice - aPrice : aPrice - bPrice;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function giftTimestamp(gift: SortableGiftHistoryEntry) {
  const timestamp = new Date(gift.purchased_at ?? gift.created_at).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortGiftHistoryEntries<T extends SortableGiftHistoryEntry>(
  gifts: T[],
  sort: GiftHistorySort,
) {
  return [...gifts].sort((a, b) => {
    if (sort === "oldest") return giftTimestamp(a) - giftTimestamp(b);
    if (sort === "price-high") {
      return (b.price ?? Number.NEGATIVE_INFINITY) -
        (a.price ?? Number.NEGATIVE_INFINITY);
    }
    if (sort === "price-low") {
      return (a.price ?? Number.POSITIVE_INFINITY) -
        (b.price ?? Number.POSITIVE_INFINITY);
    }
    return giftTimestamp(b) - giftTimestamp(a);
  });
}
