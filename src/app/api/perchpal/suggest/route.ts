import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type SuggestRequestBody = {
  recipientId: string;
  occasion?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  numSuggestions?: number;
};

type GiftSuggestion = {
  id: string;
  title: string;
  short_description: string;
  tier: "safe" | "thoughtful" | "experience" | "splurge";
  price_min?: number | null;
  price_max?: number | null;
  price_hint?: string | null;
  why_it_fits: string;
  suggested_url?: string | null;
};

type GiftPromptContext = {
  recipient_id: string;
  recipient_name: string;
  relationship?: string | null;
  occasion?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  annual_budget?: number | null;
  notes_summary?: string | null;
  interests_summary?: string | null;
  last_gifts_summary?: string | null;
};

type RecipientRecord = {
  id: string;
  user_id: string;
  name: string;
  relationship: string | null;
  pet_type: string | null;
  gender: "male" | "female" | "other" | null;
  notes: string | null;
  annual_budget: number | null;
  gift_budget_min: number | null;
  gift_budget_max: number | null;
  birthday: string | null;
};

type RecipientInterest = {
  label: string;
  category: string | null;
};

type GiftHistoryItem = {
  title: string;
  price: number | null;
  purchased_at: string | null;
  notes: string | null;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUGGESTION_MODEL =
  process.env.OPENAI_SUGGESTION_MODEL?.trim() || "gpt-4o-mini";

const TIER_FALLBACK: GiftSuggestion["tier"] = "thoughtful";
const MIN_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 10;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OpenAI configuration" },
      { status: 500 },
    );
  }

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

  let body: SuggestRequestBody;
  try {
    body = (await request.json()) as SuggestRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const recipientId =
    typeof body.recipientId === "string" ? body.recipientId.trim() : "";
  if (!recipientId) {
    return NextResponse.json(
      { error: "recipientId is required" },
      { status: 400 },
    );
  }

  const occasion =
    typeof body.occasion === "string" && body.occasion.trim().length > 0
      ? body.occasion.trim()
      : null;

  let numSuggestions =
    typeof body.numSuggestions === "number" && !Number.isNaN(body.numSuggestions)
      ? Math.round(body.numSuggestions)
      : 5;
  numSuggestions = Math.min(
    MAX_SUGGESTIONS,
    Math.max(MIN_SUGGESTIONS, numSuggestions),
  );

  const requestedBudgetMin =
    typeof body.budgetMin === "number" && !Number.isNaN(body.budgetMin)
      ? body.budgetMin
      : null;
  const requestedBudgetMax =
    typeof body.budgetMax === "number" && !Number.isNaN(body.budgetMax)
      ? body.budgetMax
      : null;

  try {
    const { data: recipient, error: recipientError } = await supabase
      .from("recipient_profiles")
      .select(
        "id, user_id, name, relationship, pet_type, gender, notes, annual_budget, gift_budget_min, gift_budget_max, birthday",
      )
      .eq("id", recipientId)
      .eq("user_id", user.id)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 },
      );
    }

    const [{ data: interestsData }, { data: giftsData }] = await Promise.all([
      supabase
        .from("recipient_interests")
        .select("label, category")
        .eq("recipient_id", recipientId)
        .order("created_at", { ascending: true }),
      supabase
        .from("gift_history")
        .select("title, price, purchased_at, notes")
        .eq("recipient_id", recipientId)
        .order("purchased_at", { ascending: false, nullsFirst: false })
        .limit(5),
    ]);

    const interests = (interestsData ?? []) as RecipientInterest[];
    const gifts = (giftsData ?? []) as GiftHistoryItem[];

    const notes_summary = summarizeNotes(recipient);
    const interests_summary = summarizeInterests(interests);
    const last_gifts_summary = summarizeGifts(gifts);
    const resolvedBudgetMin =
      requestedBudgetMin ?? recipient.gift_budget_min ?? null;
    const resolvedBudgetMax =
      requestedBudgetMax ?? recipient.gift_budget_max ?? null;
    const resolvedAnnualBudget = recipient.annual_budget ?? null;

    const promptContext: GiftPromptContext = {
      recipient_id: recipient.id,
      recipient_name: recipient.name,
      relationship: recipient.relationship,
      occasion,
      budget_min: resolvedBudgetMin,
      budget_max: resolvedBudgetMax,
      annual_budget: resolvedAnnualBudget,
      notes_summary,
      interests_summary,
      last_gifts_summary,
    };

    const userMessageContent = {
      recipient,
      occasion,
      budget_min: resolvedBudgetMin,
      budget_max: resolvedBudgetMax,
      annual_budget: resolvedAnnualBudget,
      interests,
      recent_gifts: gifts,
      num_suggestions: numSuggestions,
    };

    const completion = await openai.chat.completions.create({
      model: SUGGESTION_MODEL,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: [
            "You are PerchPal, an AI gifting assistant inside the GiftPerch app.",
            "You generate concrete gift ideas tailored to the recipient’s profile, interests, budget, and gift history.",
            "You must respond ONLY as JSON, with no extra prose, using this exact TypeScript-like structure:",
            "",
            "type GiftSuggestion = {",
            '  id: string;',
            '  title: string;',
            '  short_description: string;',
            '  tier: \"safe\" | \"thoughtful\" | \"experience\" | \"splurge\";',
            "  price_min?: number | null;",
            "  price_max?: number | null;",
            "  price_hint?: string | null;",
            "  why_it_fits: string;",
            "  suggested_url?: string | null;",
            "};",
            "",
            "Return an object: { suggestions: GiftSuggestion[] }.",
            "Do not include code fences or any text outside JSON.",
          ].join("\n"),
        },
        { role: "user", content: JSON.stringify(userMessageContent) },
      ],
    });

    const rawContent =
      completion.choices[0]?.message?.content?.trim() ?? '{"suggestions":[]}';

    let parsed: { suggestions?: GiftSuggestion[] } = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      console.error("Failed to parse suggestions JSON", err, rawContent);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }

    const normalizedSuggestions = (parsed.suggestions ?? [])
      .filter((item): item is GiftSuggestion => typeof item === "object")
      .map((item, index) => normalizeSuggestion(item, index));

    if (normalizedSuggestions.length === 0) {
      return NextResponse.json(
        { error: "AI did not return any suggestions" },
        { status: 500 },
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("gift_suggestions")
      .insert({
        user_id: user.id,
        recipient_id: recipient.id,
        model: SUGGESTION_MODEL,
        prompt_context: promptContext,
        suggestions: normalizedSuggestions,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Failed to persist gift suggestions", insertError);
      return NextResponse.json(
        { error: "Unable to save suggestions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      suggestionRunId: inserted.id,
      createdAt: inserted.created_at,
      suggestions: normalizedSuggestions,
      promptContext,
    });
  } catch (err) {
    console.error("Error generating gift suggestions", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 },
    );
  }
}

function summarizeNotes(recipient: RecipientRecord): string | null {
  if (!recipient.notes) return null;
  const trimmed = recipient.notes.trim();
  if (!trimmed) return null;
  return trimmed.length > 280 ? `${trimmed.slice(0, 277)}...` : trimmed;
}

function summarizeInterests(interests: RecipientInterest[]): string | null {
  if (interests.length === 0) return null;
  const sections: Record<string, string[]> = {
    interest: [],
    vibe: [],
    personality: [],
    brand: [],
    other: [],
  };

  interests.forEach((item) => {
    const key = (item.category ?? "other") as keyof typeof sections;
    if (sections[key]) {
      sections[key].push(item.label);
    } else {
      sections.other.push(item.label);
    }
  });

  const parts: string[] = [];
  if (sections.interest.length) {
    parts.push(`Interests: ${sections.interest.join(", ")}`);
  }
  if (sections.vibe.length) {
    parts.push(`Vibes: ${sections.vibe.join(", ")}`);
  }
  if (sections.personality.length) {
    parts.push(`Personality: ${sections.personality.join(", ")}`);
  }
  if (sections.brand.length) {
    parts.push(`Brands: ${sections.brand.join(", ")}`);
  }
  if (sections.other.length) {
    parts.push(`Tags: ${sections.other.join(", ")}`);
  }

  return parts.join(" | ");
}

function summarizeGifts(gifts: GiftHistoryItem[]): string | null {
  if (gifts.length === 0) return null;
  const snippets = gifts.slice(0, 3).map((gift) => {
    const price = gift.price ? `$${gift.price}` : null;
    const date = gift.purchased_at
      ? new Date(gift.purchased_at).getFullYear()
      : null;
    const bits = [gift.title, price, date].filter(Boolean);
    return bits.join(" - ");
  });
  return `Recent gifts: ${snippets.join("; ")}. Avoid exact repeats.`;
}

function normalizeSuggestion(
  suggestion: GiftSuggestion,
  index: number,
): GiftSuggestion {
  const allowedTiers: GiftSuggestion["tier"][] = [
    "safe",
    "thoughtful",
    "experience",
    "splurge",
  ];

  const tier = allowedTiers.includes(suggestion.tier)
    ? suggestion.tier
    : TIER_FALLBACK;

  const id =
    typeof suggestion.id === "string" && suggestion.id.trim().length > 0
      ? suggestion.id
      : String(index + 1);

  const price_min =
    typeof suggestion.price_min === "number" &&
    Number.isFinite(suggestion.price_min)
      ? suggestion.price_min
      : null;

  const price_max =
    typeof suggestion.price_max === "number" &&
    Number.isFinite(suggestion.price_max)
      ? suggestion.price_max
      : null;

  const price_hint =
    typeof suggestion.price_hint === "string" &&
    suggestion.price_hint.trim().length > 0
      ? suggestion.price_hint.trim()
      : null;

  return {
    id,
    title: suggestion.title?.trim() || `Idea ${index + 1}`,
    short_description:
      suggestion.short_description?.trim() || "Thoughtful gift idea.",
    tier,
    price_min,
    price_max,
    price_hint,
    why_it_fits:
      suggestion.why_it_fits?.trim() ||
      "PerchPal believes this matches their profile well.",
    suggested_url:
      typeof suggestion.suggested_url === "string" &&
      suggestion.suggested_url.trim().length > 0
        ? suggestion.suggested_url.trim()
        : null,
  };
}
