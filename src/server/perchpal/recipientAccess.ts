import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  PerchPalRecipientIndexEntry,
  PerchPalRecipientProfile,
} from "./recipientContext";

export type RecipientRow = {
  id: string;
  name: string;
  relationship: string | null;
  pet_type: string | null;
  gender: string | null;
  birthday: string | null;
  annual_budget: number | null;
  gift_budget_min: number | null;
  gift_budget_max: number | null;
  notes: string | null;
};

type InterestRow = { label: string; category: string | null };

const RECIPIENT_COLUMNS =
  "id, name, relationship, pet_type, gender, birthday, annual_budget, gift_budget_min, gift_budget_max, notes";
const EXCLUDE_SELF_PROFILES = "is_self.eq.false,is_self.is.null";

export async function getAuthenticatedPerchPalUser(
  supabase: SupabaseClient,
  authorizationHeader: string | null,
): Promise<User | null> {
  const token = authorizationHeader?.split(" ")[1];
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  return error || !user ? null : user;
}

export async function loadPerchPalRecipientIndex(
  supabase: SupabaseClient,
  userId: string,
): Promise<PerchPalRecipientIndexEntry[]> {
  const { data, error } = await supabase
    .from("recipient_profiles")
    .select(RECIPIENT_COLUMNS)
    .eq("user_id", userId)
    .or(EXCLUDE_SELF_PROFILES)
    .order("name", { ascending: true })
    .limit(50);
  if (error) throw error;

  return ((data ?? []) as RecipientRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    relationship: row.relationship,
  }));
}

export async function loadAuthorizedPerchPalRecipient(
  supabase: SupabaseClient,
  userId: string,
  recipientId: string,
): Promise<PerchPalRecipientProfile | null> {
  const { data: recipient, error: recipientError } = await supabase
    .from("recipient_profiles")
    .select(RECIPIENT_COLUMNS)
    .eq("id", recipientId)
    .eq("user_id", userId)
    .or(EXCLUDE_SELF_PROFILES)
    .maybeSingle();
  if (recipientError) throw recipientError;
  if (!recipient) return null;

  const { data: interests, error: interestError } = await supabase
    .from("recipient_interests")
    .select("label, category")
    .eq("recipient_id", recipient.id)
    .order("created_at", { ascending: true });
  if (interestError) throw interestError;

  const row = recipient as RecipientRow;
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    petType: row.pet_type,
    gender: row.gender,
    birthday: row.birthday,
    annualBudget: row.annual_budget,
    budgetMin: row.gift_budget_min,
    budgetMax: row.gift_budget_max,
    notes: row.notes,
    interests: (interests ?? []) as InterestRow[],
  };
}
