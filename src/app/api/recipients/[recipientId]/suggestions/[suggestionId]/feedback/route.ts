import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/database.types";

type SupabaseTypedClient = SupabaseClient<Database>;
type FeedbackPreference = "liked" | "disliked" | "clear";

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const forbidden = () =>
  NextResponse.json({ error: "Forbidden" }, { status: 403 });
const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

async function getUser(request: NextRequest, supabase: SupabaseTypedClient) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user ?? null;
}

async function ensureRecipientOwnership(
  supabase: SupabaseTypedClient,
  recipientId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("recipient_profiles")
    .select("id")
    .eq("id", recipientId)
    .eq("user_id", userId)
    .single();
  return !error && !!data;
}

async function ensureSuggestionOwnership(
  supabase: SupabaseTypedClient,
  suggestionId: string,
  recipientId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("gift_suggestions")
    .select("id")
    .eq("id", suggestionId)
    .eq("recipient_id", recipientId)
    .eq("user_id", userId)
    .single();
  return !error && !!data;
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ recipientId: string; suggestionId: string }> },
) {
  const { recipientId, suggestionId } = await params;
  const supabase = getSupabaseServerClient() as SupabaseTypedClient;
  const user = await getUser(request, supabase);
  if (!user) return unauthorized();

  const trimmedRecipientId = recipientId?.trim();
  const trimmedSuggestionId = suggestionId?.trim();
  if (!trimmedRecipientId || !trimmedSuggestionId) {
    return badRequest("recipientId and suggestionId are required");
  }

  const ownsRecipient = await ensureRecipientOwnership(
    supabase,
    trimmedRecipientId,
    user.id,
  );
  if (!ownsRecipient) return forbidden();

  const ownsSuggestion = await ensureSuggestionOwnership(
    supabase,
    trimmedSuggestionId,
    trimmedRecipientId,
    user.id,
  );
  if (!ownsSuggestion) return forbidden();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const preference =
    typeof body.preference === "string" ? (body.preference as FeedbackPreference) : null;
  if (!preference || !["liked", "disliked", "clear"].includes(preference)) {
    return badRequest("preference must be liked, disliked, or clear");
  }

  if (preference === "clear") {
    const { error } = await supabase
      .from("recipient_gift_feedback")
      .delete()
      .eq("user_id", user.id)
      .eq("recipient_id", trimmedRecipientId)
      .eq("suggestion_id", trimmedSuggestionId);
    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to clear feedback" },
        { status: 500 },
      );
    }
    return NextResponse.json({ feedback: null });
  }

  const { data, error } = await supabase
    .from("recipient_gift_feedback")
    .upsert(
      {
        user_id: user.id,
        recipient_id: trimmedRecipientId,
        suggestion_id: trimmedSuggestionId,
        preference,
      },
      {
        onConflict: "user_id,recipient_id,suggestion_id",
      },
    )
    .select("id, preference")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to save feedback" },
      { status: 500 },
    );
  }

  return NextResponse.json({ feedback: data });
}
