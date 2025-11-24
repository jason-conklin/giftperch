import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/database.types";

type SupabaseTypedClient = SupabaseClient<Database>;

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipientId: string }> },
) {
  const { recipientId } = await params;
  const supabase = getSupabaseServerClient() as SupabaseTypedClient;
  const user = await getUser(request, supabase);
  if (!user) return unauthorized();

  const trimmedRecipientId = recipientId?.trim();
  if (!trimmedRecipientId) return badRequest("recipientId is required");

  const ownsRecipient = await ensureRecipientOwnership(
    supabase,
    trimmedRecipientId,
    user.id,
  );
  if (!ownsRecipient) return forbidden();

  const { data: feedbackRowsRaw, error } = await supabase
    .from("recipient_gift_feedback")
    .select("id, preference, suggestion_id, suggestion_index, created_at")
    .eq("recipient_id", trimmedRecipientId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load feedback" },
      { status: 500 },
    );
  }

  type FeedbackRow = {
    id: string;
    preference: "liked" | "disliked";
    suggestion_id: string | null;
    suggestion_index: number | null;
    created_at: string;
  };

  const feedbackRows = Array.isArray(feedbackRowsRaw)
    ? (feedbackRowsRaw as unknown[]).filter(
        (row): row is FeedbackRow => !(row as { error?: boolean }).error,
      )
    : [];

  const suggestionIds = feedbackRows
    .map((row) => row.suggestion_id)
    .filter((id): id is string => !!id);

  type FeedbackIdea = {
    id: string;
    suggestion_id: string;
    title: string;
    tier: string | null;
    rationale: string | null;
    estimated_price_min: number | null;
    estimated_price_max: number | null;
    product_url: string | null;
    image_url: string | null;
    preference: "liked" | "disliked";
    created_at: string;
  };
  type SuggestionPayload = {
    title?: string | null;
    tier?: string | null;
    why_it_fits?: string | null;
    price_min?: number | null;
    price_max?: number | null;
    suggested_url?: string | null;
    image_url?: string | null;
  };
  type SuggestionRow = { id: string; suggestions: unknown };
  let suggestionMap: Record<string, SuggestionPayload[] | null> = {};
  if (suggestionIds.length) {
    const { data: runs } = await supabase
      .from("gift_suggestions")
      .select("id, suggestions")
      .in("id", suggestionIds);
    const typedRuns = (runs as SuggestionRow[] | null) ?? [];
    suggestionMap = typedRuns.reduce<Record<string, SuggestionPayload[] | null>>(
      (acc, run) => {
        const suggestionsArray = Array.isArray(run.suggestions)
          ? run.suggestions
          : [];
        const normalized = suggestionsArray.map(
          (s) => s as SuggestionPayload,
        );
        acc[run.id] = normalized.length ? normalized : null;
        return acc;
      },
      {},
    );
  }

  const liked: FeedbackIdea[] = [];
  const disliked: FeedbackIdea[] = [];

  (feedbackRows ?? []).forEach((row) => {
    const suggestionsArr = row.suggestion_id
      ? suggestionMap[row.suggestion_id] ?? null
      : null;
    const suggestion =
      suggestionsArr?.[
        typeof row.suggestion_index === "number" ? row.suggestion_index : 0
      ] ??
      suggestionsArr?.[0] ??
      {};
    const idea = {
      id: row.id,
      suggestion_id: row.suggestion_id ?? "",
      title: suggestion.title ?? "Gift idea",
      tier: suggestion.tier ?? null,
      rationale: suggestion.why_it_fits ?? null,
      estimated_price_min:
        typeof suggestion.price_min === "number" ? suggestion.price_min : null,
      estimated_price_max:
        typeof suggestion.price_max === "number" ? suggestion.price_max : null,
      product_url: suggestion.suggested_url ?? null,
      image_url: suggestion.image_url ?? null,
      preference: row.preference,
      created_at: row.created_at,
    };
    if (row.preference === "liked") liked.push(idea);
    if (row.preference === "disliked") disliked.push(idea);
  });

  return NextResponse.json({ liked, disliked });
}
