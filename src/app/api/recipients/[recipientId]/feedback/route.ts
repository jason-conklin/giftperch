import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/database.types";

type SupabaseTypedClient = SupabaseClient<Database>;

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });
const forbidden = () =>
  NextResponse.json({ error: "Forbidden" }, { status: 403 });

async function getUser(request: NextRequest, supabase: SupabaseTypedClient) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user ?? null;
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

  const feedbackId = request.nextUrl.searchParams.get("id");
  if (!feedbackId) return badRequest("id query param is required");

  // Verify the feedback row belongs to the user & recipient
  const { data: feedbackRow, error: fetchError } = await supabase
    .from("recipient_gift_feedback")
    .select("id, recipient_id, user_id")
    .eq("id", feedbackId)
    .single();

  if (fetchError || !feedbackRow) return forbidden();
  if (feedbackRow.user_id !== user.id || feedbackRow.recipient_id !== trimmedRecipientId) {
    return forbidden();
  }

  const { error } = await supabase
    .from("recipient_gift_feedback")
    .delete()
    .eq("id", feedbackId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to remove feedback" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
