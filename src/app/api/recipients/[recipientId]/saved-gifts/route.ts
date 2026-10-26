import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database, Json } from "@/lib/database.types";
import type { ProductMatch } from "@/lib/affiliateProduct";
import {
  buildSavedGiftSnapshot,
  findAuthoritativeSuggestion,
  getSavedGiftDestinationError,
  getSuggestionProductMatch,
  productMatchFromCatalogRow,
  type AuthoritativeGiftSuggestion,
} from "@/server/savedGifts/productSnapshot";
import { findMatchingSavedGift } from "@/server/savedGifts/deduplication";
import { resolveAwinProductScope } from "@/server/awin/productIdentity";
import {
  isAwinProductDestinationCurrent,
} from "@/server/awin/advertisers";
import { normalizeDestinationHealthStatus } from "@/server/awin/destinationHealth";
import { resolveGiftCatalogPresentation } from "@/lib/gifts/catalogDestinationHealth";

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

  const awinMatches = mapped.flatMap((row) => {
    const match = getSuggestionProductMatch({
      title: row.title,
      productMatch: row.product_match,
    });
    const scope = match?.provider === "awin" ? resolveAwinProductScope(match) : null;
    return match && scope ? [{ match, scope }] : [];
  });
  const healthByProduct = new Map<
    string,
    {
      status: NonNullable<ProductMatch["destinationHealthStatus"]>;
      checkedAt: string | null;
    }
  >();
  const scopes = new Map<string, typeof awinMatches>();
  for (const entry of awinMatches) {
    const key = `${entry.scope.advertiserId}:${entry.scope.locale}`;
    scopes.set(key, [...(scopes.get(key) ?? []), entry]);
  }
  for (const entries of scopes.values()) {
    const { advertiserId, locale } = entries[0].scope;
    const ids = [...new Set(entries.map(({ match }) => match.productId))];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { data: healthRows } = await (supabase as SupabaseClient)
        .from("affiliate_products")
        .select("external_product_id, destination_health_status, destination_checked_at")
        .eq("provider", "awin")
        .eq("advertiser_id", advertiserId)
        .eq("locale", locale)
        .eq("active", true)
        .eq("availability", "in_stock")
        .in("external_product_id", ids.slice(offset, offset + 100));
      for (const healthRow of healthRows ?? []) {
        const status = normalizeDestinationHealthStatus(
          healthRow.destination_health_status,
        );
        if (status) {
          healthByProduct.set(
            `${advertiserId}:${String(healthRow.external_product_id)}`,
            {
              status,
              checkedAt:
                typeof healthRow.destination_checked_at === "string"
                  ? healthRow.destination_checked_at
                  : null,
            },
          );
        }
      }
    }
  }

  const safeMapped = mapped.map((row) => {
    const match = getSuggestionProductMatch({
      title: row.title,
      productMatch: row.product_match,
    });
    const scope = match?.provider === "awin" ? resolveAwinProductScope(match) : null;
    if (!match || !scope) return row;
    const presentation = resolveGiftCatalogPresentation({
      title: row.title,
      supportingText: row.rationale,
      productMatch: match,
    });
    const presentedRow = presentation?.usesCatalogIdentity
      ? {
          ...row,
          title: presentation.title,
          rationale: presentation.supportingText,
        }
      : row;
    const health = healthByProduct.get(`${scope.advertiserId}:${match.productId}`);
    if (!health) {
      return !isAwinProductDestinationCurrent({
        advertiserId: scope.advertiserId,
        status: "unchecked",
        checkedAt: null,
      })
        ? {
            ...presentedRow,
            product_url: null,
            product_match: {
              ...match,
              destinationHealthStatus: "unchecked",
            },
          }
        : presentedRow;
    }
    const productMatch = {
      ...match,
      destinationHealthStatus: health.status,
      ...(health.checkedAt ? { destinationCheckedAt: health.checkedAt } : {}),
    };
    const destinationUnavailable = !isAwinProductDestinationCurrent({
      advertiserId: scope.advertiserId,
      status: health.status,
      checkedAt: health.checkedAt,
    });
    return destinationUnavailable
      ? { ...presentedRow, product_url: null, product_match: productMatch }
      : { ...presentedRow, product_match: productMatch };
  });

  return NextResponse.json({ savedGifts: safeMapped });
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
      typeof body.product_url === "string" ? body.product_url : null,
    );
    if (!authoritativeSuggestion) {
      return badRequest(
        "Gift suggestion could not be identified unambiguously in the selected run",
      );
    }
    sourceSuggestion = authoritativeSuggestion;
    suggestionId = suggestionRunId;
    canonicalProductMatch = getSuggestionProductMatch(authoritativeSuggestion);

    if (canonicalProductMatch?.provider === "awin") {
      const productScope = resolveAwinProductScope(canonicalProductMatch);
      if (!productScope) {
        return badRequest("Matched product identity could not be verified");
      }
      const { data: catalogRows, error: catalogError } = await (
        supabase as SupabaseClient
      )
        .from("affiliate_products")
        .select(
          "advertiser_id, locale, external_product_id, merchant_name, title, image_url, affiliate_url, price, currency, destination_health_status, destination_checked_at",
        )
        .eq("provider", "awin")
        .eq("advertiser_id", productScope.advertiserId)
        .eq("locale", productScope.locale)
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
      const destinationError = getSavedGiftDestinationError(
        canonicalProductMatch,
      );
      if (destinationError) return badRequest(destinationError);
    }
  }

  const savedPresentation = resolveGiftCatalogPresentation({
    title: sourceSuggestion.title,
    supportingText: sourceSuggestion.why_it_fits,
    productMatch: canonicalProductMatch,
  });
  if (savedPresentation?.usesCatalogIdentity) {
    sourceSuggestion = {
      ...sourceSuggestion,
      title: savedPresentation.title,
      why_it_fits: savedPresentation.supportingText,
    };
  }

  const snapshot = buildSavedGiftSnapshot(
    sourceSuggestion,
    canonicalProductMatch,
  );
  if (!snapshot) return badRequest("title is required");

  const { data: existingSavedGifts, error: existingSavedGiftsError } =
    await supabase
      .from("recipient_saved_gift_ideas")
      .select("id, title, suggestion_id, product_match, created_at")
      .eq("user_id", user.id)
      .eq("recipient_id", trimmedRecipientId)
      .limit(500);

  if (existingSavedGiftsError) {
    return NextResponse.json(
      { error: "Unable to verify whether this gift is already saved" },
      { status: 500 },
    );
  }

  const existingSavedGift = findMatchingSavedGift(
    existingSavedGifts ?? [],
    snapshot.title,
    snapshot.productMatch,
  );
  if (existingSavedGift) {
    return NextResponse.json({
      savedGift: existingSavedGift,
      alreadySaved: true,
    });
  }

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

  if (error?.code === "23505") {
    const { data: concurrentSavedGifts } = await supabase
      .from("recipient_saved_gift_ideas")
      .select("id, title, suggestion_id, product_match, created_at")
      .eq("user_id", user.id)
      .eq("recipient_id", trimmedRecipientId)
      .limit(500);
    const concurrentSavedGift = findMatchingSavedGift(
      concurrentSavedGifts ?? [],
      snapshot.title,
      snapshot.productMatch,
    );
    if (concurrentSavedGift) {
      return NextResponse.json({
        savedGift: concurrentSavedGift,
        alreadySaved: true,
      });
    }
  }

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
