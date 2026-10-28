export type RecipientInitialAvatarStyle = Readonly<{
  backgroundColor: string;
  color: string;
}>;

export type RecipientAvatarIcon =
  | "babyboy"
  | "babygirl"
  | "boy"
  | "girl"
  | "man"
  | "woman"
  | "dog"
  | "cat";

export const RECIPIENT_AVATAR_OPTIONS: ReadonlyArray<{
  key: RecipientAvatarIcon;
  label: string;
  src: string;
}> = [
  { key: "babyboy", label: "Baby boy", src: "/babyboy_icon.png" },
  { key: "babygirl", label: "Baby girl", src: "/babygirl_icon.png" },
  { key: "boy", label: "Boy", src: "/boy_icon.png" },
  { key: "girl", label: "Girl", src: "/girl_icon.png" },
  { key: "man", label: "Man", src: "/man_icon.png" },
  { key: "woman", label: "Woman", src: "/woman_icon.png" },
  { key: "dog", label: "Dog", src: "/dog_icon.png" },
  { key: "cat", label: "Cat", src: "/cat_icon.png" },
];

type RecipientAvatarInput = Readonly<{
  name: string;
  avatar_url?: string | null;
  avatar_icon?: string | null;
}>;

export type RecipientAvatarVisual =
  | { kind: "image"; src: string; alt: string }
  | { kind: "preset"; src: string; alt: string }
  | { kind: "initials"; text: string };

const GENDER_AVATAR_STYLES: Readonly<Record<"male" | "female", RecipientInitialAvatarStyle>> = {
  male: {
    backgroundColor: "#D9E9F5",
    color: "#365A72",
  },
  female: {
    backgroundColor: "#F5DFE7",
    color: "#87566A",
  },
};

export function getRecipientInitialAvatarStyle(
  gender: string | null | undefined,
): RecipientInitialAvatarStyle | undefined {
  const normalized = gender?.trim().toLowerCase();
  return normalized === "male" || normalized === "female"
    ? GENDER_AVATAR_STYLES[normalized]
    : undefined;
}

export function getRecipientInitials(name: string | null | undefined): string {
  const safe = name?.trim() ?? "";
  if (!safe) return "GP";

  return safe
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getRecipientAvatarVisual(
  recipient: RecipientAvatarInput,
): RecipientAvatarVisual {
  const avatarUrl = recipient.avatar_url?.trim();
  if (avatarUrl) {
    return {
      kind: "image",
      src: avatarUrl,
      alt: `${recipient.name || "Recipient"} avatar`,
    };
  }

  const preset = RECIPIENT_AVATAR_OPTIONS.find(
    (option) => option.key === recipient.avatar_icon,
  );
  if (preset) {
    return { kind: "preset", src: preset.src, alt: preset.label };
  }

  return { kind: "initials", text: getRecipientInitials(recipient.name) };
}
