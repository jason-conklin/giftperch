import { NextRequest, NextResponse } from "next/server";
import OpenAI, { type ChatCompletionMessageParam } from "openai";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const PERCHPAL_UNAVAILABLE =
  "PerchPal is temporarily unavailable. Please try again later.";

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "PerchPal chat attempted without OPENAI_API_KEY configured.",
    );
    return NextResponse.json(
      { error: PERCHPAL_UNAVAILABLE },
      { status: 503 },
    );
  }

  try {
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

    const body = await request.json();
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    type HistoryEntry = { role: string; content: string };
    const rawHistory: unknown[] = Array.isArray(body.history)
      ? body.history
      : [];
    const history: HistoryEntry[] = rawHistory.filter(
      (entry): entry is HistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as HistoryEntry).role === "string" &&
        typeof (entry as HistoryEntry).content === "string"
    );

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content:
        "You are PerchPal, a warm but efficient AI gifting assistant inside the GiftPerch app. Focus on concrete, thoughtful gift suggestions based on the user's description, budgets, interests, and occasions. Prefer 2-4 suggestions per reply, each with a short name, rough price range, and 1-2 sentence rationale. Be concise and avoid emoji.",
    };

    const trimmedHistory: ChatCompletionMessageParam[] = history
      .slice(-15)
      .map((entry) => {
        const role: ChatCompletionMessageParam["role"] =
          entry.role === "assistant" || entry.role === "system"
            ? entry.role
            : "user";
        return {
          role,
          content: entry.content,
        };
      });

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.6,
      messages: [
        systemMessage,
        ...trimmedHistory,
        { role: "user" as const, content: message },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I had trouble thinking of gift ideas just now. Please try again.";

    const timestamp = new Date().toISOString();
    const { error: insertError } = await supabase
      .from("ai_interactions")
      .insert([
        {
          user_id: user.id,
          recipient_id: null,
          role: "user",
          message,
          metadata: { source: "perchpal-chat", model: CHAT_MODEL },
          created_at: timestamp,
        },
        {
          user_id: user.id,
          recipient_id: null,
          role: "assistant",
          message: reply,
          metadata: { source: "perchpal-chat", model: CHAT_MODEL },
          created_at: timestamp,
        },
      ]);

    if (insertError) {
      console.error("Failed to log ai_interactions", insertError);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("PerchPal chat failed", error);
    return NextResponse.json(
      { error: PERCHPAL_UNAVAILABLE },
      { status: 503 },
    );
  }
}
