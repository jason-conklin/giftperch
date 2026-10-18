import { getSafeImageUrl } from "@/lib/affiliateProduct";

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
