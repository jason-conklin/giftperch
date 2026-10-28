export type RecipientPreferenceEntry = {
  label: string;
  category?: string | null;
};

export type PersistedRecipientPreference = RecipientPreferenceEntry & {
  id: string;
};

export function normalizePreferenceLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function preferenceKey(value: string): string {
  return normalizePreferenceLabel(value).toLocaleLowerCase();
}

export function splitRecipientRecommendationPreferences(
  entries: ReadonlyArray<RecipientPreferenceEntry>,
) {
  const positive: RecipientPreferenceEntry[] = [];
  const avoidances: string[] = [];
  const positiveKeys = new Set<string>();
  const avoidanceKeys = new Set<string>();

  for (const entry of entries) {
    const label = normalizePreferenceLabel(entry.label);
    if (!label) continue;
    const key = preferenceKey(label);
    if (entry.category?.toLowerCase() === "avoid") {
      if (!avoidanceKeys.has(key)) {
        avoidanceKeys.add(key);
        avoidances.push(label);
      }
      continue;
    }
    if (!positiveKeys.has(key)) {
      positiveKeys.add(key);
      positive.push({ label, category: entry.category ?? null });
    }
  }

  return { positive, avoidances };
}

export function parseRecipientPreferenceList(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,\n]/)
    .map(normalizePreferenceLabel)
    .filter((label) => {
      const key = preferenceKey(label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildRecipientPreferenceChanges(
  existing: ReadonlyArray<PersistedRecipientPreference>,
  positiveLabels: ReadonlyArray<string>,
  avoidanceLabels: ReadonlyArray<string>,
) {
  const toUniqueMap = (labels: ReadonlyArray<string>) => {
    const result = new Map<string, string>();
    for (const value of labels) {
      const label = normalizePreferenceLabel(value);
      const key = preferenceKey(label);
      if (key && !result.has(key)) result.set(key, label);
    }
    return result;
  };
  const desiredPositive = toUniqueMap(positiveLabels);
  const desiredAvoid = toUniqueMap(avoidanceLabels);
  const retainedPositive = new Set<string>();
  const retainedAvoid = new Set<string>();
  const deleteIds: string[] = [];

  for (const entry of existing) {
    const isAvoidance = entry.category?.toLowerCase() === "avoid";
    const desired = isAvoidance ? desiredAvoid : desiredPositive;
    const retained = isAvoidance ? retainedAvoid : retainedPositive;
    const key = preferenceKey(entry.label);
    if (!desired.has(key) || retained.has(key)) {
      deleteIds.push(entry.id);
      continue;
    }
    retained.add(key);
  }

  return {
    deleteIds,
    inserts: [
      ...[...desiredPositive]
        .filter(([key]) => !retainedPositive.has(key))
        .map(([, label]) => ({ label, category: "interest" as const })),
      ...[...desiredAvoid]
        .filter(([key]) => !retainedAvoid.has(key))
        .map(([, label]) => ({ label, category: "avoid" as const })),
    ],
  };
}

export function validateRecipientBudgets(values: {
  minimum: string;
  maximum: string;
  annual: string;
}) {
  const parse = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
  };
  const minimum = parse(values.minimum);
  const maximum = parse(values.maximum);
  const annual = parse(values.annual);
  if ([minimum, maximum, annual].some(Number.isNaN)) {
    return { error: "Budgets must be zero or positive numbers." } as const;
  }
  if (minimum !== null && maximum !== null && minimum > maximum) {
    return {
      error: "Per-gift minimum cannot be greater than the maximum.",
    } as const;
  }
  return { minimum, maximum, annual, error: null } as const;
}
