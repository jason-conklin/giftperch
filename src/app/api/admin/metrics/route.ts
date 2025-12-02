import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const ADMIN_EMAILS = new Set(["giftperch@gmail.com"]);

export const dynamic = "force-dynamic";

async function countTable(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  table: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function countUsersAdmin(
  supabase: ReturnType<typeof getSupabaseServerClient>,
) {
  // Try direct auth.users count first
  try {
    const { count, error } = await supabase
      .schema("auth")
      .from("users")
      .select("*", { count: "exact", head: true });
    if (!error && typeof count === "number") {
      return count;
    }
  } catch {
    // fall back
  }

  // Fallback: paginate GoTrue admin users
  let page = 1;
  const perPage = 1000;
  let total = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const count = data?.users?.length ?? 0;
    total += count;
    hasMore = count >= perPage;
    if (hasMore) {
      page += 1;
    }
  }
  return total;
}

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/Bearer\s+/i, "").trim();
  const headerEmail = request.headers.get("x-user-email")?.trim().toLowerCase();

  let resolvedEmail: string | null = null;

  // Prefer explicit header for the two known admins
  if (headerEmail && ADMIN_EMAILS.has(headerEmail)) {
    resolvedEmail = headerEmail;
  }

  // Otherwise try bearer token
  if (!resolvedEmail && token) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (!userError && user?.email) {
      resolvedEmail = user.email.toLowerCase();
    }
  }

  if (!resolvedEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_EMAILS.has(resolvedEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await countUsersAdmin(supabase);
    const recipientProfiles = await countTable(supabase, "recipient_profiles");
    const wishlistItems = await countTable(supabase, "wishlist_items");

    const suggestionTables = ["gift_suggestions", "ai_interactions", "ai_interaction_logs"];
    let giftSuggestions: number | null = null;
    for (const table of suggestionTables) {
      try {
        giftSuggestions = await countTable(supabase, table);
        break;
      } catch {
        // try next table
      }
    }

    return NextResponse.json({
      users,
      recipientProfiles,
      giftSuggestions: giftSuggestions ?? 0,
      wishlistItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
