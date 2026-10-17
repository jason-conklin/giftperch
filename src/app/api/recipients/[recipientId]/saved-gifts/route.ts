import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database, Json } from "@/lib/database.types";
import type { ProductMatch } from "@/lib/affiliateProduct";
import {
  buildSavedGiftSnapshot,
  findAuthoritativeSuggestion,
  getSuggestionProductMatch,
  productMatchFromCatalogRow,
  type AuthoritativeGiftSuggestion,
} from "@/server/savedGifts/productSnapshot";

type RecipientSavedGiftIdea =
  Database["public"]["Tables"]["recipient_saved_gift_ideas"]["Row"];

type SupabaseTypedClient = SupabaseClient<Database>;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const mapped =
    (data ?? []).map((row) => {
      const typed = row as RecipientSavedGiftIdea;
      return {
        ...typed,
        suggestionId: typed.suggestion_id,
      };
    }) || [];

  return NextResponse.json({ savedGifts: mapped });
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

  const requestedTitle =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : null;
  if (!requestedTitle) return badRequest("title is required");

  const suggestionItemId =
    typeof body.suggestionId === "string" && body.suggestionId.trim().length > 0
      ? body.suggestionId.trim()
      : null;
  const suggestionRunId =
    typeof body.suggestionRunId === "string" &&
    body.suggestionRunId.trim().length > 0
      ? body.suggestionRunId.trim()
      : null;
  if (suggestionRunId && !UUID_PATTERN.test(suggestionRunId)) {
    return badRequest("suggestionRunId is invalid");
  }

  let suggestionId =
    !suggestionRunId && suggestionItemId && UUID_PATTERN.test(suggestionItemId)
      ? suggestionItemId
      : null;
  let sourceSuggestion: AuthoritativeGiftSuggestion = {
    title: requestedTitle,
    tier: typeof body.tier === "string" ? body.tier : null,
    why_it_fits: typeof body.rationale === "string" ? body.rationale : null,
    price_min:
      typeof body.estimated_price_min === "number"
        ? body.estimated_price_min
        : null,
    price_max:
      typeof body.estimated_price_max === "number"
        ? body.estimated_price_max
        : null,
    suggested_url:
      typeof body.product_url === "string" ? body.product_url : null,
    image_url: typeof body.image_url === "string" ? body.image_url : null,
  };
  let canonicalProductMatch: ProductMatch | null = null;

  if (suggestionRunId) {
    const { data: run, error: runError } = await (supabase as SupabaseClient)
      .from("gift_suggestions")
      .select("id, suggestions")
      .eq("id", suggestionRunId)
      .eq("recipient_id", trimmedRecipientId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (runError || !run) {
      return badRequest("Suggestion run was not found");
    }

    const authoritativeSuggestion = findAuthoritativeSuggestion(
      (run as { suggestions?: unknown }).suggestions,
      suggestionItemId,
      requestedTitle,
    );
    if (!authoritativeSuggestion) {
      return badRequest("Gift suggestion was not found in the selected run");
    }
    sourceSuggestion = authoritativeSuggestion;
    suggestionId = suggestionRunId;
    canonicalProductMatch = getSuggestionProductMatch(authoritativeSuggestion);

    if (canonicalProductMatch?.provider === "awin") {
      const { data: catalogRows, error: catalogError } = await (
        supabase as SupabaseClient
      )
        .from("affiliate_products")
        .select(
          "external_product_id, merchant_name, title, image_url, affiliate_url, price, currency",
        )
        .eq("provider", "awin")
        .eq("external_product_id", canonicalProductMatch.productId)
        .eq("affiliate_url", canonicalProductMatch.affiliateUrl)
        .eq("active", true)
        .eq("availability", "in_stock")
        .limit(2);
      if (catalogError || !catalogRows || catalogRows.length !== 1) {
        return badRequest("Matched product is no longer available");
      }
      canonicalProductMatch = productMatchFromCatalogRow(catalogRows[0]);
      if (!canonicalProductMatch) {
        return badRequest("Matched product data is invalid");
      }
    }
  }

  const snapshot = buildSavedGiftSnapshot(
    sourceSuggestion,
    canonicalProductMatch,
  );
  if (!snapshot) return badRequest("title is required");

  const { data, error } = await supabase
    .from("recipient_saved_gift_ideas")
    .insert({
      user_id: user.id,
      recipient_id: trimmedRecipientId,
      suggestion_id: suggestionId,
      title: snapshot.title,
      tier: snapshot.tier,
      rationale: snapshot.rationale,
      estimated_price_min: snapshot.estimatedPriceMin,
      estimated_price_max: snapshot.estimatedPriceMax,
      product_url: snapshot.productUrl,
      image_url: snapshot.imageUrl,
      product_match: snapshot.productMatch as Json | null,
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
  const suggestionIdRaw = request.nextUrl.searchParams.get("suggestionId");
  const titleParam = request.nextUrl.searchParams.get("title");
  const suggestionId =
    suggestionIdRaw && /^[0-9a-fA-F-]{32,36}$/.test(suggestionIdRaw)
      ? suggestionIdRaw
      : null;
  if (!savedIdeaId && !suggestionId && !titleParam) {
    return badRequest("id, suggestionId, or title query param is required");
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
  if (titleParam) {
    deleteQuery.eq("title", titleParam);
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
