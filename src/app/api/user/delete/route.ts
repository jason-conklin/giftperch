import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient();

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    // Gather recipient and wishlist ids for cascading deletes.
    const { data: recipientRows, error: recipientFetchError } = await supabase
      .from("recipient_profiles")
      .select("id")
      .eq("user_id", userId);
    if (recipientFetchError) throw recipientFetchError;
    const recipientIds = (recipientRows ?? []).map((r) => r.id);

    if (recipientIds.length) {
      const childDeletes = [
        supabase.from("recipient_events").delete().in("recipient_id", recipientIds),
        supabase.from("recipient_interests").delete().in("recipient_id", recipientIds),
        supabase.from("gift_history").delete().in("recipient_id", recipientIds),
        supabase.from("gift_suggestions").delete().in("recipient_id", recipientIds),
        supabase.from("ai_interactions").delete().in("recipient_id", recipientIds),
      ];
      for (const promise of childDeletes) {
        const { error } = await promise;
        if (error) throw error;
      }
    }

    const { data: wishlistRows, error: wishlistFetchError } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", userId);
    if (wishlistFetchError) throw wishlistFetchError;
    const wishlistIds = (wishlistRows ?? []).map((w) => w.id);
    if (wishlistIds.length) {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .in("wishlist_id", wishlistIds);
      if (error) throw error;
    }

    const deletions = [
      supabase.from("gift_guides").delete().eq("user_id", userId),
      supabase.from("ai_interactions").delete().eq("user_id", userId),
      supabase.from("gift_history").delete().eq("user_id", userId),
      supabase.from("gift_suggestions").delete().eq("user_id", userId),
      supabase.from("wishlists").delete().eq("user_id", userId),
      supabase.from("recipient_profiles").delete().eq("user_id", userId),
      supabase.from("user_settings").delete().eq("user_id", userId),
      supabase.from("profiles").delete().eq("id", userId),
    ];

    for (const promise of deletions) {
      const { error } = await promise;
      if (error) throw error;
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user account", error);
    return NextResponse.json(
      { error: "Unable to delete account" },
      { status: 500 },
    );
  }
}
