import {
  getSavedGiftProductKey,
  normalizeSavedGiftTitle,
} from "@/lib/savedGiftIdentity";

export type HistoricalFeedback = {
  id: string;
  userId: string;
  recipientId: string;
  suggestionId: string | null;
  suggestionIndex: number | null;
  preference: "liked" | "disliked";
};

export type HistoricalSuggestionRun = {
  id: string;
  userId: string;
  recipientId: string;
  suggestions: unknown;
};

export type ExistingSavedGift = {
  userId: string;
  recipientId: string;
  title: string;
  productMatch?: unknown;
  sourceFeedbackId?: string | null;
};

export type FeedbackMigrationDecision =
  | { feedbackId: string; status: "convert"; title: string }
  | { feedbackId: string; status: "duplicate"; title: string }
  | { feedbackId: string; status: "discard-disliked" }
  | {
      feedbackId: string;
      status: "unconvertible";
      reason: "missing-run" | "ownership-mismatch" | "invalid-suggestion";
    };

export function planFeedbackMigration(
  feedbackRows: readonly HistoricalFeedback[],
  runs: readonly HistoricalSuggestionRun[],
  savedGifts: readonly ExistingSavedGift[],
): FeedbackMigrationDecision[] {
  const runsById = new Map(runs.map((run) => [run.id, run]));
  const savedKeys = new Set(
    savedGifts.map(
      (gift) =>
        `${gift.userId}:${gift.recipientId}:${normalizeSavedGiftTitle(gift.title)}`,
    ),
  );
  const savedProductKeys = new Set(
    savedGifts
      .map((gift) => {
        const productKey = getSavedGiftProductKey(gift.productMatch);
        return productKey
          ? `${gift.userId}:${gift.recipientId}:${productKey}`
          : null;
      })
      .filter((key): key is string => Boolean(key)),
  );
  const migratedFeedbackIds = new Set(
    savedGifts
      .map((gift) => gift.sourceFeedbackId)
      .filter((id): id is string => Boolean(id)),
  );

  return feedbackRows.map((feedback) => {
    if (feedback.preference === "disliked") {
      return { feedbackId: feedback.id, status: "discard-disliked" };
    }

    const run = feedback.suggestionId
      ? runsById.get(feedback.suggestionId)
      : null;
    if (!run) {
      return {
        feedbackId: feedback.id,
        status: "unconvertible",
        reason: "missing-run",
      };
    }
    if (
      run.userId !== feedback.userId ||
      run.recipientId !== feedback.recipientId
    ) {
      return {
        feedbackId: feedback.id,
        status: "unconvertible",
        reason: "ownership-mismatch",
      };
    }

    const suggestions = Array.isArray(run.suggestions) ? run.suggestions : [];
    const index = feedback.suggestionIndex;
    const suggestion =
      Number.isInteger(index) && (index ?? -1) >= 0
        ? suggestions[index as number]
        : null;
    const title =
      suggestion && typeof suggestion === "object" && !Array.isArray(suggestion)
        ? (suggestion as { title?: unknown }).title
        : null;
    if (typeof title !== "string" || !title.trim()) {
      return {
        feedbackId: feedback.id,
        status: "unconvertible",
        reason: "invalid-suggestion",
      };
    }

    const normalizedTitle = title.trim();
    const suggestionProductMatch =
      suggestion && typeof suggestion === "object" && !Array.isArray(suggestion)
        ? (suggestion as { productMatch?: unknown }).productMatch
        : null;
    const productKey = getSavedGiftProductKey(suggestionProductMatch);
    const savedProductKey = productKey
      ? `${feedback.userId}:${feedback.recipientId}:${productKey}`
      : null;
    const savedKey = `${feedback.userId}:${feedback.recipientId}:${normalizeSavedGiftTitle(normalizedTitle)}`;
    if (
      migratedFeedbackIds.has(feedback.id) ||
      (savedProductKey
        ? savedProductKeys.has(savedProductKey)
        : savedKeys.has(savedKey))
    ) {
      return {
        feedbackId: feedback.id,
        status: "duplicate",
        title: normalizedTitle,
      };
    }

    savedKeys.add(savedKey);
    if (savedProductKey) savedProductKeys.add(savedProductKey);
    return {
      feedbackId: feedback.id,
      status: "convert",
      title: normalizedTitle,
    };
  });
}
