import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  AmazonProduct,
  searchAmazonProductForSuggestion,
} from "@/lib/amazonPaapi";
import {
  canonicalizeGiftSuggestionText,
  getGiftSuggestionCanonicalKey,
} from "@/lib/giftSuggestionCanonical";

type SuggestRequestBody = {
  recipientId?: string;
  occasion?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  numSuggestions?: number;
  previousSuggestions?: string[];
};

type GiftSuggestion = {
  id: string;
  title: string;
  short_description: string;
  tier: "safe" | "thoughtful" | "experience" | "splurge";
  price_min?: number | null;
  price_max?: number | null;
  price_hint?: string | null;
  price_guidance?: string | null;
  why_it_fits: string;
  suggested_url?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  amazonProduct?: AmazonProduct | null;
  initialSaved?: boolean;
  initialPreference?: "liked" | "disliked" | null;
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

type FeedbackRow = {
  preference: "liked" | "disliked";
  suggestion_id: string | null;
  suggestion_index: number | null;
  title?: string | null;
  tier?: string | null;
};

type GiftSuggestionRunRow = {
  id: string;
  created_at: string;
  suggestions: unknown;
};

type GiftSuggestionFromRun = {
  title?: string | null;
  tier?: string | null;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUGGESTION_MODEL =
  process.env.OPENAI_SUGGESTION_MODEL?.trim() || "gpt-4o-mini";

const PERCHPAL_UNAVAILABLE =
  "PerchPal is temporarily unavailable. Please try again later.";

const TIER_FALLBACK: GiftSuggestion["tier"] = "thoughtful";
const MIN_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 10;
const MAX_EXTRA_GENERATION_PASSES = 3;
const TOP_UP_BUFFER = 2;
const RECENT_RUN_LOOKBACK_DAYS = 90;
const RECENT_RUN_LIMIT = 24;
const SAVED_IDEA_LIMIT = 200;
const FEEDBACK_LIMIT = 250;
const SUGGESTIONS_PER_RUN_CAP = 20;
const PROMPT_EXCLUSION_LIMIT = 30;

const PRICE_REGEX = /\$/;
const DIGIT_REGEX = /\d/;
const normalize = (str: string | null | undefined) =>
  (str ?? "").trim().toLowerCase();
const makeIdentity = (title: string, tier?: string | null) =>
  `${normalize(title)}::${normalize(tier) || "none"}`;
const OPENAI_TIMEOUT_MS = 90_000;

const tryParseJsonObject = (raw: string): { suggestions?: unknown } => {
  try {
    return JSON.parse(raw);
  } catch (err) {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1));
      } catch {
        // ignore
      }
    }
    console.error("Unable to parse AI JSON after fallback", err, raw);
    return {};
  }
};

function buildPriceGuidance(
  min?: number | null,
  max?: number | null,
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `$${Math.round(min)}–$${Math.round(max)}`;
  if (min != null) return `$${Math.round(min)}+`;
  return `Up to $${Math.round(max as number)}`;
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "PerchPal suggestions attempted without OPENAI_API_KEY configured.",
    );
    return NextResponse.json(
      { error: PERCHPAL_UNAVAILABLE },
      { status: 503 },
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
      : 9;
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
  const previousSuggestions =
    Array.isArray(body.previousSuggestions) && body.previousSuggestions.length
      ? body.previousSuggestions
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const cappedPreviousSuggestions = previousSuggestions.slice(0, 50);

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

    const recentRunCutoffIso = new Date(
      Date.now() - RECENT_RUN_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [
      { data: interestsData },
      { data: giftsData },
      { data: savedData },
      { data: feedbackData },
      { data: recentRunsData },
    ] = await Promise.all([
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
      supabase
        .from("recipient_saved_gift_ideas")
        .select("title, tier")
        .eq("recipient_id", recipientId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(SAVED_IDEA_LIMIT),
      supabase
        .from("recipient_gift_feedback")
        .select("preference, suggestion_id, suggestion_index, title, tier")
        .eq("recipient_id", recipientId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(FEEDBACK_LIMIT),
      supabase
        .from("gift_suggestions")
        .select("id, created_at, suggestions")
        .eq("recipient_id", recipientId)
        .eq("user_id", user.id)
        .gte("created_at", recentRunCutoffIso)
        .order("created_at", { ascending: false })
        .limit(RECENT_RUN_LIMIT),
    ]);

    const interests = (interestsData ?? []) as RecipientInterest[];
    const gifts = (giftsData ?? []) as GiftHistoryItem[];
    const recentRuns = (recentRunsData ?? []) as GiftSuggestionRunRow[];
    const feedbackRows = ((feedbackData ?? []) as FeedbackRow[]).filter(
      (row) => row.preference === "liked" || row.preference === "disliked",
    );

    const savedByIdentity: Record<string, boolean> = {};
    const savedByCanonical: Record<string, boolean> = {};
    const preferenceByIdentity: Record<string, "liked" | "disliked"> = {};
    const preferenceByCanonical: Record<string, "liked" | "disliked"> = {};

    const previouslySavedTitles: string[] = [];
    const likedTitles: string[] = [];
    const dislikedTitles: string[] = [];
    const recentSuggestionTitles: string[] = [];

    const suggestionsByRunId = new Map<string, GiftSuggestionFromRun[]>();
    recentRuns.forEach((run) => {
      const runSuggestions = extractSuggestionPayloads(
        run.suggestions,
        SUGGESTIONS_PER_RUN_CAP,
      );
      suggestionsByRunId.set(run.id, runSuggestions);
      runSuggestions.forEach((item) => {
        if (typeof item.title === "string" && item.title.trim().length > 0) {
          recentSuggestionTitles.push(item.title.trim());
        }
      });
    });

    const feedbackSuggestionIds = Array.from(
      new Set(
        feedbackRows
          .map((row) =>
            typeof row.suggestion_id === "string" ? row.suggestion_id.trim() : "",
          )
          .filter(Boolean),
      ),
    );
    const missingFeedbackSuggestionIds = feedbackSuggestionIds.filter(
      (id) => !suggestionsByRunId.has(id),
    );

    if (missingFeedbackSuggestionIds.length > 0) {
      const { data: feedbackRunsData } = await supabase
        .from("gift_suggestions")
        .select("id, suggestions")
        .eq("recipient_id", recipientId)
        .eq("user_id", user.id)
        .in("id", missingFeedbackSuggestionIds);

      (feedbackRunsData ?? []).forEach((run) => {
        if (typeof run.id !== "string") return;
        suggestionsByRunId.set(
          run.id,
          extractSuggestionPayloads(run.suggestions, SUGGESTIONS_PER_RUN_CAP),
        );
      });
    }

    (savedData ?? []).forEach((row) => {
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!title) return;
      const tier =
        typeof row.tier === "string" && row.tier.trim().length > 0
          ? row.tier.trim()
          : null;

      const identity = makeIdentity(title, tier);
      savedByIdentity[identity] = true;

      const canonicalKey = getGiftSuggestionCanonicalKey(title);
      if (canonicalKey) {
        savedByCanonical[canonicalKey] = true;
      }

      previouslySavedTitles.push(title);
    });

    feedbackRows.forEach((row) => {
      const suggestionId =
        typeof row.suggestion_id === "string" ? row.suggestion_id.trim() : "";
      const hasExplicitSuggestionIndex =
        typeof row.suggestion_index === "number" &&
        Number.isInteger(row.suggestion_index) &&
        row.suggestion_index >= 0;
      const suggestionIndex =
        hasExplicitSuggestionIndex
          ? (row.suggestion_index as number)
          : 0;

      const runSuggestions = suggestionId ? suggestionsByRunId.get(suggestionId) : null;
      const fromRun =
        runSuggestions?.[suggestionIndex] ??
        (!hasExplicitSuggestionIndex ? runSuggestions?.[0] ?? null : null);
      const resolvedTitle =
        typeof fromRun?.title === "string" && fromRun.title.trim().length > 0
          ? fromRun.title.trim()
          : typeof row.title === "string" && row.title.trim().length > 0
            ? row.title.trim()
            : "";
      const resolvedTier =
        typeof fromRun?.tier === "string" && fromRun.tier.trim().length > 0
          ? fromRun.tier.trim()
          : typeof row.tier === "string" && row.tier.trim().length > 0
            ? row.tier.trim()
            : null;

      if (!resolvedTitle) return;

      const identity = makeIdentity(resolvedTitle, resolvedTier);
      if (!preferenceByIdentity[identity]) {
        preferenceByIdentity[identity] = row.preference;
      }

      const canonicalKey = getGiftSuggestionCanonicalKey(resolvedTitle);
      if (canonicalKey && !preferenceByCanonical[canonicalKey]) {
        preferenceByCanonical[canonicalKey] = row.preference;
      }

      if (row.preference === "liked") {
        likedTitles.push(resolvedTitle);
      } else if (row.preference === "disliked") {
        dislikedTitles.push(resolvedTitle);
      }
    });

    const uniqueSavedTitles = uniqueTrimmedValues(previouslySavedTitles);
    const uniqueLikedTitles = uniqueTrimmedValues(likedTitles);
    const uniqueDislikedTitles = uniqueTrimmedValues(dislikedTitles);
    const uniqueRecentSuggestionTitles = uniqueTrimmedValues(recentSuggestionTitles);

    const historicalExclusionKeys = new Set<string>();
    [
      ...cappedPreviousSuggestions,
      ...uniqueSavedTitles,
      ...uniqueLikedTitles,
      ...uniqueDislikedTitles,
      ...uniqueRecentSuggestionTitles,
    ].forEach((title) => {
      const key = canonicalizeGiftSuggestionText(title);
      if (key) {
        historicalExclusionKeys.add(key);
      }
    });

    logSuggestionDedupeDebug("loaded recipient exclusions", {
      recipientId,
      savedIdeaCount: uniqueSavedTitles.length,
      likedIdeaCount: uniqueLikedTitles.length,
      dislikedIdeaCount: uniqueDislikedTitles.length,
      recentSuggestionCount: uniqueRecentSuggestionTitles.length,
      canonicalExclusionCount: historicalExclusionKeys.size,
    });

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

    const requestSuggestionPass = async (
      requestedCount: number,
      doNotSuggestCanonical: string[],
    ): Promise<GiftSuggestion[]> => {
      const userMessageContent = {
        recipient,
        occasion,
        budget_min: resolvedBudgetMin,
        budget_max: resolvedBudgetMax,
        annual_budget: resolvedAnnualBudget,
        interests,
        recent_gifts: gifts,
        num_suggestions: requestedCount,
        previously_saved_titles: uniqueSavedTitles.slice(0, 25),
        previous_suggestions: cappedPreviousSuggestions,
        do_not_suggest_canonical: doNotSuggestCanonical,
      };

      const completion = await openai.chat.completions.create(
        {
          model: SUGGESTION_MODEL,
          temperature: 0.9,
          top_p: 0.95,
          messages: [
            {
              role: "system",
              content: [
                "You are PerchPal, an AI gifting assistant inside the GiftPerch app.",
                "You generate concrete gift ideas tailored to the recipient's profile, interests, budget, and gift history.",
                "",
                "Follow this staged process before you answer:",
                "1) Interpret the recipient and notes deeply.",
                "2) Create at least 5 diverse thematic angles (e.g., creative experiences, sentimental keepsakes, tech + hobbies, subscriptions, DIY/handmade, etc.).",
                "3) Brainstorm many internal candidate ideas (at least 2-3x the requested count N).",
                "4) Select the most unique, surprising, and recipient-aligned ideas.",
                "",
                "Generation rules:",
                ` - Generate exactly ${requestedCount} distinct gift ideas. Assume N can vary; always respect the requested count.`,
                " - Each batch must span multiple categories: physical items, personalized items, experience-based gifts, digital/AI gifts, subscription-type gifts, and sentimental/DIY gifts. Use at least min(4, N) distinct categories in each batch.",
                " - Avoid generic, overused gifts like cozy blanket, spa set, scented candles, or generic gift cards unless the context makes them unusually specific and personalized.",
                " - You will receive previous gift ideas. Treat them as ALREADY USED. Do not repeat or closely mimic any of them.",
                " - You will receive a DO NOT SUGGEST canonical list. Do not return any of those ideas, and avoid close variants with different casing, punctuation, or minor phrasing.",
                "You must respond ONLY as JSON, with no extra prose, using this exact TypeScript-like structure:",
                "",
                "type GiftSuggestion = {",
                '  id: string;',
                '  title: string;',
                '  short_description: string;',
                '  tier: "safe" | "thoughtful" | "experience" | "splurge";',
                "  price_min?: number | null;",
                "  price_max?: number | null;",
                "  price_hint?: string | null;",
                '  price_guidance?: string | null; // SHORT price text only, e.g., "$25-$50", "$50+", "Under $25". If unknown, set null.',
                "  why_it_fits: string;",
                "  suggested_url?: string | null;",
                "  image_url?: string | null; // REQUIRED: real, publicly accessible HTTPS product/inspiration image (never example.com)",
                "};",
                "",
                "Expectations:",
                '- price_guidance MUST be price-only text. Do NOT include descriptions. Examples: "$25-$50", "$50+", "Under $25". If no good price guess, use null.',
                "- Every suggestion should include image_url whenever possible.",
                "- Use reputable sources (brand CDN, Amazon images, Unsplash, etc.).",
                "- Never invent unreachable URLs or placeholders.",
                "",
                "Return an object: { suggestions: GiftSuggestion[] }.",
                "Do not include code fences or any text outside JSON.",
                "",
                `Requested count N: ${requestedCount}. Generate exactly this many suggestions.`,
                cappedPreviousSuggestions.length
                  ? [
                      "Previously suggested (DO NOT REPEAT OR IMITATE):",
                      ...cappedPreviousSuggestions.map((idea) => `- ${idea}`),
                    ].join("\n")
                  : "",
                doNotSuggestCanonical.length
                  ? [
                      "DO NOT SUGGEST (canonical ideas):",
                      ...doNotSuggestCanonical.map((idea) => `- ${idea}`),
                    ].join("\n")
                  : "",
                uniqueLikedTitles.length
                  ? `The user has previously liked these gift ideas for this recipient: ${uniqueLikedTitles
                      .slice(0, 20)
                      .join("; ")}. Favor ideas with similar qualities or vibe.`
                  : "",
                uniqueDislikedTitles.length
                  ? `The user has previously disliked these gift ideas: ${uniqueDislikedTitles
                      .slice(0, 20)
                      .join("; ")}. Avoid repeating or closely matching these items.`
                  : "",
                uniqueSavedTitles.length
                  ? `The user has already saved these gift ideas for this recipient: ${uniqueSavedTitles
                      .slice(0, 20)
                      .join("; ")}. Do not repeat these ideas. Prefer novel, distinct recommendations.`
                  : "",
              ].join("\n"),
            },
            { role: "user", content: JSON.stringify(userMessageContent) },
          ],
        },
        { timeout: OPENAI_TIMEOUT_MS },
      );

      const rawContent =
        completion.choices[0]?.message?.content?.trim() ?? '{"suggestions":[]}';
      const parsed = tryParseJsonObject(rawContent) as {
        suggestions?: GiftSuggestion[];
      };

      const parsedSuggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : [];

      return parsedSuggestions
        .filter(
          (item): item is GiftSuggestion =>
            typeof item === "object" && item !== null,
        )
        .map((item, index) => normalizeSuggestion(item, index));
    };

    const exclusionSet = new Set(historicalExclusionKeys);
    let finalSuggestions: GiftSuggestion[] = [];
    let filteredByExclusion = 0;
    let filteredAsPlaceholder = 0;
    let filteredWithoutCanonicalKey = 0;
    let totalGenerationPasses = 0;
    let topUpPassesUsed = 0;

    for (
      let pass = 0;
      pass <= MAX_EXTRA_GENERATION_PASSES &&
      finalSuggestions.length < numSuggestions;
      pass += 1
    ) {
      const remaining = numSuggestions - finalSuggestions.length;
      const requestedCountForPass = Math.min(
        MAX_SUGGESTIONS,
        Math.max(MIN_SUGGESTIONS, remaining + TOP_UP_BUFFER),
      );

      const doNotSuggestForPrompt = Array.from(exclusionSet).slice(
        0,
        PROMPT_EXCLUSION_LIMIT,
      );

      let normalizedSuggestions: GiftSuggestion[] = [];
      try {
        normalizedSuggestions = await requestSuggestionPass(
          requestedCountForPass,
          doNotSuggestForPrompt,
        );
      } catch (err) {
        if (pass === 0) {
          console.error("OpenAI suggestion generation failed", err);
          return NextResponse.json(
            { error: PERCHPAL_UNAVAILABLE },
            { status: 504 },
          );
        }
        console.warn("OpenAI top-up suggestion generation failed", err);
        break;
      }

      totalGenerationPasses += 1;
      if (pass > 0) {
        topUpPassesUsed += 1;
      }

      normalizedSuggestions.forEach((item) => {
        if (finalSuggestions.length >= numSuggestions) return;
        const title = item.title?.trim();
        if (!title) {
          filteredWithoutCanonicalKey += 1;
          return;
        }

        const titleLower = title.toLowerCase();
        const isPlaceholder =
          /^idea\s*\d+/i.test(titleLower) || titleLower === "placeholder";
        const isGenericStub =
          item.short_description
            ?.toLowerCase()
            .includes("thoughtful gift idea") && titleLower.startsWith("idea ");

        if (isPlaceholder || isGenericStub) {
          filteredAsPlaceholder += 1;
          return;
        }

        const canonicalKey = getGiftSuggestionCanonicalKey(title);
        if (!canonicalKey) {
          filteredWithoutCanonicalKey += 1;
          return;
        }
        if (exclusionSet.has(canonicalKey)) {
          filteredByExclusion += 1;
          return;
        }

        exclusionSet.add(canonicalKey);
        finalSuggestions.push(item);
      });
    }

    logSuggestionDedupeDebug("suggestion filtering summary", {
      recipientId,
      requestedCount: numSuggestions,
      returnedCount: finalSuggestions.length,
      filteredByExclusion,
      filteredAsPlaceholder,
      filteredWithoutCanonicalKey,
      totalGenerationPasses,
      topUpPassesUsed,
    });

    if (finalSuggestions.length > numSuggestions) {
      finalSuggestions = finalSuggestions.slice(0, numSuggestions);
    }

    if (finalSuggestions.length < numSuggestions) {
      console.warn(
        `AI returned ${finalSuggestions.length}/${numSuggestions} suggestions after filtering and top-up passes.`,
      );
    }

    if (finalSuggestions.length === 0) {
      return NextResponse.json(
        { error: "AI did not return any suggestions" },
        { status: 500 },
      );
    }

    const enrichedSuggestions: GiftSuggestion[] = await Promise.all(
      finalSuggestions.map(async (suggestion) => {
        const title = suggestion.title?.trim();
        if (!title) {
          return {
            ...suggestion,
            amazonProduct: null,
          };
        }

        try {
          const amazonProduct = await searchAmazonProductForSuggestion({
            query: title,
            minPriceCents:
              typeof suggestion.price_min === "number"
                ? Math.round(suggestion.price_min * 100)
                : undefined,
            maxPriceCents:
              typeof suggestion.price_max === "number"
                ? Math.round(suggestion.price_max * 100)
                : undefined,
          });

          return {
            ...suggestion,
            amazonProduct,
          };
        } catch (error) {
          console.warn(
            "[perchpal] Amazon enrichment failed for suggestion",
            title,
            error,
          );
          return {
            ...suggestion,
            amazonProduct: null,
          };
        }
      }),
    );

    const { data: inserted, error: insertError } = await supabase
      .from("gift_suggestions")
      .insert({
        user_id: user.id,
        recipient_id: recipient.id,
        model: SUGGESTION_MODEL,
        prompt_context: promptContext,
        suggestions: enrichedSuggestions,
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

    const suggestionsWithFlags = enrichedSuggestions.map((s) => {
      const identity = makeIdentity(s.title, s.tier);
      const canonicalKey = getGiftSuggestionCanonicalKey(s.title);
      const canonicalPreference = canonicalKey
        ? preferenceByCanonical[canonicalKey]
        : null;
      return {
        ...s,
        initialSaved:
          !!savedByIdentity[identity] ||
          (!!canonicalKey && !!savedByCanonical[canonicalKey]),
        initialPreference:
          preferenceByIdentity[identity] ?? canonicalPreference ?? null,
      };
    });

    return NextResponse.json({
      suggestionRunId: inserted.id,
      createdAt: inserted.created_at,
      suggestions: suggestionsWithFlags,
      promptContext,
    });
  } catch (err) {
    console.error("Error generating gift suggestions", err);
    return NextResponse.json(
      { error: PERCHPAL_UNAVAILABLE },
      { status: 503 },
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

  const price_guidance_raw =
    typeof suggestion.price_guidance === "string" &&
    suggestion.price_guidance.trim().length > 0
      ? suggestion.price_guidance.trim()
      : null;
  const cleaned_price_guidance =
    price_guidance_raw &&
    PRICE_REGEX.test(price_guidance_raw) &&
    DIGIT_REGEX.test(price_guidance_raw)
      ? price_guidance_raw
      : null;

  const image_url =
    typeof suggestion.image_url === "string" &&
    suggestion.image_url.trim().length > 0
      ? suggestion.image_url.trim()
      : typeof suggestion.imageUrl === "string" &&
          suggestion.imageUrl.trim().length > 0
        ? suggestion.imageUrl.trim()
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
    price_guidance:
      cleaned_price_guidance ?? buildPriceGuidance(price_min, price_max),
    why_it_fits:
      suggestion.why_it_fits?.trim() ||
      "PerchPal believes this matches their profile well.",
    suggested_url:
      typeof suggestion.suggested_url === "string" &&
      suggestion.suggested_url.trim().length > 0
        ? suggestion.suggested_url.trim()
        : null,
    image_url,
  };
}

function extractSuggestionPayloads(
  rawSuggestions: unknown,
  cap: number,
): GiftSuggestionFromRun[] {
  if (!Array.isArray(rawSuggestions)) return [];
  return rawSuggestions
    .slice(0, Math.max(1, cap))
    .filter(
    (item): item is GiftSuggestionFromRun =>
      !!item && typeof item === "object",
  );
}

function uniqueTrimmedValues(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    unique.push(trimmed);
  });

  return unique;
}

function logSuggestionDedupeDebug(
  message: string,
  details: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[perchpal][dedupe] ${message}`, details);
}
