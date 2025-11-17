import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
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
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const systemMessage = {
      role: "system" as const,
      content:
        "You are PerchPal, a warm but efficient AI gifting assistant inside the GiftPerch app. Focus on concrete, thoughtful gift suggestions based on the user's description, budgets, interests, and occasions. Prefer 2-4 suggestions per reply, each with a short name, rough price range, and 1-2 sentence rationale. Be concise and avoid emoji.",
    };

    const trimmedHistory = history
      .slice(-15)
      .filter(
        (entry: any) =>
          entry &&
          typeof entry.role === "string" &&
          typeof entry.content === "string"
      )
      .map((entry: any) => ({
        role:
          entry.role === "assistant" || entry.role === "system"
            ? entry.role
            : "user",
        content: entry.content,
      }));

    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      temperature: 0.6,
      messages: [
        systemMessage,
        ...trimmedHistory,
        { role: "user", content: message },
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
          metadata: { source: "perchpal-chat", model: "gpt-5.1" },
          created_at: timestamp,
        },
        {
          user_id: user.id,
          recipient_id: null,
          role: "assistant",
          message: reply,
          metadata: { source: "perchpal-chat", model: "gpt-5.1" },
          created_at: timestamp,
        },
      ]);

    if (insertError) {
      console.error("Failed to log ai_interactions", insertError);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
