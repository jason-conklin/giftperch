import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const ADMIN_EMAILS = new Set(["jasonconklin64@gmail.com", "giftperch@gmail.com"]);

export const dynamic = "force-dynamic";

async function countTable(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  table: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) return null;
  return count ?? 0;
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

  if (userError || !user?.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = user.email.toLowerCase();
  if (!ADMIN_EMAILS.has(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const usersCount = await (async () => {
    const { count, error } = await supabase
      .schema("auth")
      .from("users")
      .select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  })();

  const recipientProfiles = await countTable(supabase, "recipient_profiles");
  const wishlistItems = await countTable(supabase, "wishlist_items");

  const suggestionTables = ["gift_suggestions", "ai_interactions", "ai_interaction_logs"];
  let giftSuggestions: number | null = null;
  for (const table of suggestionTables) {
    const val = await countTable(supabase, table);
    if (val !== null) {
      giftSuggestions = val;
      break;
    }
  }

  return NextResponse.json({
    users: usersCount ?? 0,
    recipientProfiles: recipientProfiles ?? 0,
    giftSuggestions: giftSuggestions ?? 0,
    wishlistItems: wishlistItems ?? 0,
  });
}
