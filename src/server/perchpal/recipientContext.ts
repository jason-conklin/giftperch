import { splitRecipientRecommendationPreferences } from "@/lib/recipientRecommendationContext";

const MAX_RECIPIENT_LIST = 30;
const MAX_INTERESTS = 20;
const MAX_AVOIDANCES = 20;
const MAX_NOTES_LENGTH = 1_000;

export type PerchPalRecipientIndexEntry = {
  id: string;
  name: string;
  relationship: string | null;
};

export type PerchPalRecipientProfile = PerchPalRecipientIndexEntry & {
  petType: string | null;
  gender: string | null;
  birthday: string | null;
  annualBudget: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  notes: string | null;
  interests: Array<{ label: string; category: string | null }>;
};

export type RecipientResolution =
  | { kind: "none" }
  | { kind: "resolved"; recipientId: string; source: "name" | "relationship" | "active" }
  | { kind: "ambiguous"; candidates: PerchPalRecipientIndexEntry[] };

function normalized(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function includesPhrase(text: string, phrase: string): boolean {
  if (!phrase) return false;
  return new RegExp(
    `(?:^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`,
    "i",
  ).test(text);
}

function uniqueCandidates(
  candidates: readonly PerchPalRecipientIndexEntry[],
): PerchPalRecipientIndexEntry[] {
  return [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
}

function firstName(recipientName: string): string {
  const [firstName] = recipientName.split(/\s+/);
  return firstName ?? "";
}

export function resolvePerchPalRecipientReference(args: {
  message: string;
  recipients: readonly PerchPalRecipientIndexEntry[];
  activeRecipientId?: string | null;
}): RecipientResolution {
  const text = normalized(args.message);
  const exactNames = uniqueCandidates(
    args.recipients.filter((recipient) =>
      includesPhrase(text, normalized(recipient.name)),
    ),
  );
  if (exactNames.length === 1) {
    return { kind: "resolved", recipientId: exactNames[0].id, source: "name" };
  }
  if (exactNames.length > 1) return { kind: "ambiguous", candidates: exactNames };

  const byName = uniqueCandidates(
    args.recipients.filter((recipient) =>
      includesPhrase(text, firstName(normalized(recipient.name))),
    ),
  );
  if (byName.length === 1) {
    return { kind: "resolved", recipientId: byName[0].id, source: "name" };
  }
  if (byName.length > 1) return { kind: "ambiguous", candidates: byName };

  const byRelationship = uniqueCandidates(
    args.recipients.filter((recipient) => {
      const relationship = normalized(recipient.relationship);
      return relationship.length >= 3 && includesPhrase(text, relationship);
    }),
  );
  if (byRelationship.length === 1) {
    return {
      kind: "resolved",
      recipientId: byRelationship[0].id,
      source: "relationship",
    };
  }
  if (byRelationship.length > 1) {
    return { kind: "ambiguous", candidates: byRelationship };
  }

  const activeRecipient = args.recipients.find(
    (recipient) => recipient.id === args.activeRecipientId,
  );
  return activeRecipient
    ? { kind: "resolved", recipientId: activeRecipient.id, source: "active" }
    : { kind: "none" };
}

export function isRecipientListRequest(message: string): boolean {
  return /\b(?:which|what)\s+(?:recipients|people|profiles)\b|\b(?:list|show|tell me about)\s+(?:my\s+)?(?:recipients|people|profiles)\b/i.test(
    message,
  );
}

export function isRecipientProfileQuestion(message: string): boolean {
  return /\b(?:can you see|do you (?:have|know)|tell me about|what does .+ like|profile for|recipient profile)\b/i.test(message);
}

export function mentionsRecipientLookup(message: string): boolean {
  return /\b(?:recipient|profile|what does .+ like|suggest(?:ion)?s?\s+(?:for|about)|gift\s+(?:for|ideas?\s+for))\b/i.test(message);
}

function money(value: number | null): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value)
    : null;
}

export function formatRecipientList(
  recipients: readonly PerchPalRecipientIndexEntry[],
): string {
  if (recipients.length === 0) {
    return "You do not have any saved recipient profiles yet.";
  }
  const visible = recipients.slice(0, MAX_RECIPIENT_LIST);
  const names = visible.map((recipient) =>
    recipient.relationship
      ? `${recipient.name} (${recipient.relationship})`
      : recipient.name,
  );
  const suffix = recipients.length > visible.length ? " and more" : "";
  return `Your saved recipients are: ${names.join(", ")}${suffix}.`;
}

export function formatRecipientProfileSummary(
  profile: PerchPalRecipientProfile,
): string {
  const preferences = splitRecipientRecommendationPreferences(profile.interests);
  const details: string[] = [];
  if (profile.relationship) details.push(`relationship: ${profile.relationship}`);
  if (preferences.positive.length) {
    details.push(`interests: ${preferences.positive.map((item) => item.label).join(", ")}`);
  }
  if (preferences.avoidances.length) {
    details.push(`things to avoid: ${preferences.avoidances.join(", ")}`);
  }
  const min = money(profile.budgetMin);
  const max = money(profile.budgetMax);
  if (min || max) {
    details.push(`gift budget: ${min && max ? `${min}–${max}` : min ? `${min}+` : `up to ${max}`}`);
  }
  if (profile.notes?.trim()) {
    details.push(`additional details: ${profile.notes.trim().slice(0, MAX_NOTES_LENGTH)}`);
  }
  return details.length
    ? `Yes, I can see your saved profile for ${profile.name}. ${details.join("; ")}.`
    : `Yes, I can see your saved profile for ${profile.name}, but it does not include additional preferences yet.`;
}

export function buildRecipientPromptContext(profile: PerchPalRecipientProfile) {
  const preferences = splitRecipientRecommendationPreferences(profile.interests);
  return {
    name: profile.name,
    relationship: profile.relationship,
    petType: profile.petType,
    gender: profile.gender,
    birthday: profile.birthday,
    budget: {
      minimum: profile.budgetMin,
      maximum: profile.budgetMax,
      annual: profile.annualBudget,
    },
    interests: preferences.positive.slice(0, MAX_INTERESTS),
    thingsToAvoid: preferences.avoidances.slice(0, MAX_AVOIDANCES),
    additionalDetails: profile.notes?.trim().slice(0, MAX_NOTES_LENGTH) || null,
  };
}
