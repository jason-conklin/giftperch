import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardStats = {
  recipientCount: number;
  savedGiftCount: number;
  suggestionRunCount: number;
};

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

const requireCount = (label: string, result: CountResult): number => {
  if (result.error) {
    throw new Error(`Unable to load ${label}: ${result.error.message}`);
  }
  if (result.count === null) {
    throw new Error(`Unable to load ${label}: count was not returned.`);
  }
  return result.count;
};

export async function fetchDashboardStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardStats> {
  if (!userId) {
    throw new Error("Unable to load dashboard statistics without a user.");
  }

  const [recipientResult, savedGiftResult, suggestionRunResult] =
    await Promise.all([
      supabase
        .from("recipient_profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_self", false),
      supabase
        .from("recipient_saved_gift_ideas")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("gift_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  return {
    recipientCount: requireCount("recipient count", recipientResult),
    savedGiftCount: requireCount("saved gift count", savedGiftResult),
    suggestionRunCount: requireCount(
      "gift idea run count",
      suggestionRunResult,
    ),
  };
}
