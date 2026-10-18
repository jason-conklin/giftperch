import {
  getMatchedProductPresentation,
  getSafeImageUrl,
} from "@/lib/affiliateProduct";

export const DASHBOARD_PREVIEW_LIMIT = 10;
export const DASHBOARD_GIFT_PLACEHOLDER = "/gift-thumbnails/default-gift.svg";

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

export type DashboardRecipientPreview = {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_icon: string | null;
};

export type DashboardSavedGiftPreview = {
  id: string;
  recipient_id: string;
  title: string;
  image_url: string | null;
  product_match: unknown;
};

export type DashboardSuggestionRunPreview = {
  id: string;
  recipient_id: string;
  suggestions: unknown;
};

export type DashboardPreviewImage = {
  src: string;
  alt: string;
  kind: "recipient" | "gift";
  fallbackSrc?: string;
};

export type DashboardPreviewGroup = {
  id: string;
  images: DashboardPreviewImage[];
};

type SuggestionRecord = {
  title?: unknown;
  image_url?: unknown;
  productMatch?: unknown;
  amazonProduct?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecipientAvatar(
  recipient: DashboardRecipientPreview,
): DashboardPreviewImage | null {
  const preset = recipient.avatar_icon
    ? RECIPIENT_AVATARS[recipient.avatar_icon]
    : undefined;
  const custom = getSafeImageUrl(recipient.avatar_url);
  const src = custom ?? preset;
  if (!src) return null;

  return {
    src,
    alt: `${recipient.name} avatar`,
    kind: "recipient",
    fallbackSrc: custom ? preset : undefined,
  };
}

function getSuggestionImage(suggestion: SuggestionRecord) {
  return (
    getMatchedProductPresentation(
      suggestion.productMatch,
      suggestion.amazonProduct,
    )?.match.imageUrl ?? getSafeImageUrl(suggestion.image_url)
  );
}

export function buildRecipientPreviewGroups(
  recipients: DashboardRecipientPreview[],
  limit = DASHBOARD_PREVIEW_LIMIT,
): DashboardPreviewGroup[] {
  const images = recipients
    .slice(0, limit)
    .map(getRecipientAvatar)
    .filter((image): image is DashboardPreviewImage => image !== null);

  if (!images.length) return [];
  if (images.length <= 3) return [{ id: "recipients", images }];

  return images.map((_, start) => ({
    id: `recipients-${start}`,
    images: Array.from(
      { length: 3 },
      (__, offset) => images[(start + offset) % images.length],
    ),
  }));
}

export function buildSavedGiftPreviewGroups(
  gifts: DashboardSavedGiftPreview[],
  recipients: Map<string, DashboardRecipientPreview>,
  limit = DASHBOARD_PREVIEW_LIMIT,
): DashboardPreviewGroup[] {
  return gifts.slice(0, limit).flatMap((gift) => {
    const recipient = recipients.get(gift.recipient_id);
    const avatar = recipient ? getRecipientAvatar(recipient) : null;
    if (!avatar) return [];

    const productImage =
      getMatchedProductPresentation(gift.product_match)?.match.imageUrl ??
      getSafeImageUrl(gift.image_url) ??
      DASHBOARD_GIFT_PLACEHOLDER;

    return [
      {
        id: `saved-${gift.id}`,
        images: [
          avatar,
          {
            src: productImage,
            alt: gift.title,
            kind: "gift" as const,
            fallbackSrc: DASHBOARD_GIFT_PLACEHOLDER,
          },
        ],
      },
    ];
  });
}

export function buildSuggestionRunPreviewGroups(
  runs: DashboardSuggestionRunPreview[],
  recipients: Map<string, DashboardRecipientPreview>,
  limit = DASHBOARD_PREVIEW_LIMIT,
): DashboardPreviewGroup[] {
  return runs.slice(0, limit).flatMap((run) => {
    const recipient = recipients.get(run.recipient_id);
    const avatar = recipient ? getRecipientAvatar(recipient) : null;
    if (!avatar || !Array.isArray(run.suggestions)) return [];

    const suggestions = run.suggestions.filter(isRecord) as SuggestionRecord[];
    const suggestion =
      suggestions.find((item) => Boolean(getSuggestionImage(item))) ??
      suggestions.find((item) => typeof item.title === "string");
    if (!suggestion) return [];

    const title =
      typeof suggestion.title === "string" && suggestion.title.trim()
        ? suggestion.title.trim()
        : "Gift suggestion";

    return [
      {
        id: `run-${run.id}`,
        images: [
          avatar,
          {
            src: getSuggestionImage(suggestion) ?? DASHBOARD_GIFT_PLACEHOLDER,
            alt: title,
            kind: "gift" as const,
            fallbackSrc: DASHBOARD_GIFT_PLACEHOLDER,
          },
        ],
      },
    ];
  });
}
