export type RecipientInitialAvatarStyle = Readonly<{
  backgroundColor: string;
  color: string;
}>;

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
