import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const ADMIN_EMAILS = new Set(["giftperch@gmail.com", "jasonconklin64@gmail.com"]);

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

async function listUsersAdmin(
  supabase: ReturnType<typeof getSupabaseServerClient>,
) {
  let page = 1;
  const perPage = 1000;
  const users: { email?: string; created_at?: string }[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    hasMore = pageUsers.length >= perPage;
    if (hasMore) {
      page += 1;
    }
  }

  const registeredUserEmails = users
    .filter((user) => user.email)
    .sort((a, b) => {
      const aTime = a.created_at ? Date.parse(a.created_at) : 0;
      const bTime = b.created_at ? Date.parse(b.created_at) : 0;
      return bTime - aTime;
    })
    .map((user) => user.email as string);

  return {
    users: users.length,
    registeredUserEmails,
  };
}

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  const resolvedEmail = user?.email?.toLowerCase() ?? null;

  if (userError || !resolvedEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_EMAILS.has(resolvedEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { users, registeredUserEmails } = await listUsersAdmin(supabase);
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
      registeredUserEmails,
      recipientProfiles,
      giftSuggestions: giftSuggestions ?? 0,
      wishlistItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
