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

  const deleteByUserId = async (table: string, column = "user_id") =>
    supabase.from(table).delete().eq(column, userId);

  try {
    // Delete user-owned data; cascades handle child rows where defined.
    const deletionOrder: Array<[string, string?]> = [
      ["gift_guides"],
      ["gift_suggestions"],
      ["gift_history"],
      ["ai_interactions"],
      ["wishlists"],
      ["recipient_profiles"],
      ["user_settings"],
      ["profiles", "id"],
    ];

    for (const [table, column] of deletionOrder) {
      const { error } = await deleteByUserId(table, column);
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
