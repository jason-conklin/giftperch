import {
  normalizePreferenceLabel,
  preferenceKey,
  splitRecipientRecommendationPreferences,
  type RecipientPreferenceEntry,
} from "@/lib/recipientRecommendationContext";

export type SharedSelfProfile = Readonly<{
  name: string;
  notes: string | null;
  birthday: string | null;
  avatar_url: string | null;
  avatar_icon: string | null;
  interests: ReadonlyArray<RecipientPreferenceEntry>;
}>;

export type SharedProfileImportOptions = Readonly<{
  relationship: string | null;
  petType: string | null;
  annualBudget: number | null;
  giftBudgetMin: number | null;
  giftBudgetMax: number | null;
}>;

/**
 * Only profile-owner preferences travel through a shared profile. The importer
 * owns relationship and spending preferences for the resulting recipient.
 */
export function buildSharedProfileImportPayload(
  profile: SharedSelfProfile,
  options: SharedProfileImportOptions,
) {
  return {
    name: normalizePreferenceLabel(profile.name),
    relationship: options.relationship?.trim() || null,
    pet_type: options.petType?.trim() || null,
    notes: profile.notes?.trim() || null,
    birthday: profile.birthday || null,
    avatar_url: profile.avatar_url?.trim() || null,
    avatar_icon: profile.avatar_icon?.trim() || null,
    annual_budget: options.annualBudget,
    gift_budget_min: options.giftBudgetMin,
    gift_budget_max: options.giftBudgetMax,
    is_self: false,
  };
}

export function splitSharedProfilePreferences(
  entries: ReadonlyArray<RecipientPreferenceEntry>,
) {
  const { positive, avoidances } = splitRecipientRecommendationPreferences(entries);
  return {
    interests: positive.map((entry) => entry.label),
    avoidances,
  };
}

export function buildSharedProfilePreferenceInserts(
  recipientId: string,
  entries: ReadonlyArray<RecipientPreferenceEntry>,
) {
  const { interests, avoidances } = splitSharedProfilePreferences(entries);
  const seen = new Set<string>();
  const toRows = (labels: ReadonlyArray<string>, category: "interest" | "avoid") =>
    labels.flatMap((label) => {
      const normalized = normalizePreferenceLabel(label);
      const key = `${category}:${preferenceKey(normalized)}`;
      if (!normalized || seen.has(key)) return [];
      seen.add(key);
      return [{ recipient_id: recipientId, label: normalized, category }];
    });

  return [
    ...toRows(interests, "interest"),
    ...toRows(avoidances, "avoid"),
  ];
}

export function excludeExistingSharedProfilePreferences(
  rows: ReadonlyArray<{ recipient_id: string; label: string; category: "interest" | "avoid" }>,
  existing: ReadonlyArray<RecipientPreferenceEntry>,
) {
  const existingKeys = new Set(
    existing.map(
      (entry) => `${entry.category?.toLowerCase() === "avoid" ? "avoid" : "interest"}:${preferenceKey(entry.label)}`,
    ),
  );
  return rows.filter(
    (row) => !existingKeys.has(`${row.category}:${preferenceKey(row.label)}`),
  );
}
