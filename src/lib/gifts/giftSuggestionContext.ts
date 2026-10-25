export type GiftSuggestionRequestPayload = {
  recipientId: string;
  occasion: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  numSuggestions?: number;
};

export type ParsedGiftSuggestionContext = {
  occasion: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
};

function optionalFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildGiftSuggestionRequestPayload(args: {
  recipientId: string;
  occasion?: string | null;
  budgetMin?: unknown;
  budgetMax?: unknown;
  numSuggestions?: number;
}): GiftSuggestionRequestPayload {
  return {
    recipientId: args.recipientId.trim(),
    occasion: optionalText(args.occasion),
    budgetMin: optionalFiniteNumber(args.budgetMin),
    budgetMax: optionalFiniteNumber(args.budgetMax),
    ...(typeof args.numSuggestions === "number"
      ? { numSuggestions: args.numSuggestions }
      : {}),
  };
}

export function parseGiftSuggestionRequestContext(
  body: {
    occasion?: unknown;
    budgetMin?: unknown;
    budgetMax?: unknown;
  },
): ParsedGiftSuggestionContext {
  return {
    occasion: optionalText(body.occasion),
    budgetMin: optionalFiniteNumber(body.budgetMin),
    budgetMax: optionalFiniteNumber(body.budgetMax),
  };
}

export function resolveGiftSuggestionStructuredContext(args: {
  request: ParsedGiftSuggestionContext;
  recipientRelationship?: string | null;
  recipientBudgetMin?: unknown;
  recipientBudgetMax?: unknown;
}) {
  return {
    occasion: args.request.occasion,
    recipientRelationship: optionalText(args.recipientRelationship),
    budgetMin:
      args.request.budgetMin ?? optionalFiniteNumber(args.recipientBudgetMin),
    budgetMax:
      args.request.budgetMax ?? optionalFiniteNumber(args.recipientBudgetMax),
  };
}
