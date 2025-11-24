import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/database.types";

type RecipientSavedGiftIdea =
  Database["public"]["Tables"]["recipient_saved_gift_ideas"]["Row"];

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

  if (error || !data) {
    return false;
  }
  return true;
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

  const { data, error } = await supabase
    .from("recipient_saved_gift_ideas")
    .select("*")
    .eq("recipient_id", trimmedRecipientId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load saved gift ideas" },
      { status: 500 },
    );
  }

  return NextResponse.json({ savedGifts: (data ?? []) as RecipientSavedGiftIdea[] });
}

export async function POST(
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : null;
  if (!title) return badRequest("title is required");

  const suggestionIdRaw =
    typeof body.suggestionId === "string" && body.suggestionId.trim().length > 0
      ? body.suggestionId.trim()
      : null;
  const suggestionId =
    suggestionIdRaw && /^[0-9a-fA-F-]{32,36}$/.test(suggestionIdRaw)
      ? suggestionIdRaw
      : null;

  const tier =
    typeof body.tier === "string" && body.tier.trim().length > 0
      ? body.tier.trim()
      : null;

  const rationale =
    typeof body.rationale === "string" && body.rationale.trim().length > 0
      ? body.rationale.trim()
      : null;

  const estimated_price_min =
    typeof body.estimated_price_min === "number" && !Number.isNaN(body.estimated_price_min)
      ? body.estimated_price_min
      : null;

  const estimated_price_max =
    typeof body.estimated_price_max === "number" && !Number.isNaN(body.estimated_price_max)
      ? body.estimated_price_max
      : null;

  const product_url =
    typeof body.product_url === "string" && body.product_url.trim().length > 0
      ? body.product_url.trim()
      : null;

  const image_url =
    typeof body.image_url === "string" && body.image_url.trim().length > 0
      ? body.image_url.trim()
      : null;

  const { data, error } = await supabase
    .from("recipient_saved_gift_ideas")
    .insert({
      user_id: user.id,
      recipient_id: trimmedRecipientId,
      suggestion_id: suggestionId,
      title,
      tier,
      rationale,
      estimated_price_min,
      estimated_price_max,
      product_url,
      image_url,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to save gift idea" },
      { status: 500 },
    );
  }

  return NextResponse.json({ savedGift: data as RecipientSavedGiftIdea });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recipientId: string }> },
) {
  const { recipientId } = await params;
  const supabase = getSupabaseServerClient() as SupabaseTypedClient;
  const user = await getUser(request, supabase);
  if (!user) return unauthorized();

  const trimmedRecipientId = recipientId?.trim();
  if (!trimmedRecipientId) return badRequest("recipientId is required");

  const savedIdeaId = request.nextUrl.searchParams.get("id");
  const suggestionId = request.nextUrl.searchParams.get("suggestionId");
  if (!savedIdeaId && !suggestionId) {
    return badRequest("id or suggestionId query param is required");
  }

  // Ownership of the recipient is still enforced to prevent cross-account deletes.
  const ownsRecipient = await ensureRecipientOwnership(
    supabase,
    trimmedRecipientId,
    user.id,
  );
  if (!ownsRecipient) return forbidden();

  const deleteQuery = supabase
    .from("recipient_saved_gift_ideas")
    .delete()
    .eq("user_id", user.id)
    .eq("recipient_id", trimmedRecipientId);

  if (savedIdeaId) {
    deleteQuery.eq("id", savedIdeaId);
  }
  if (suggestionId) {
    deleteQuery.eq("suggestion_id", suggestionId);
  }

  const { error } = await deleteQuery;

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete saved gift idea" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
