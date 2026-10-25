import type { ProductMatch } from "@/lib/affiliateProduct";
import type {
  CatalogCandidateSelector,
  CatalogGroundedRecommendation,
  CatalogIntentPlanner,
  CatalogRecommendationContext,
  CatalogRecommendationResult,
} from "./catalogRecommendations";

export type CatalogJsonCompletion = (args: {
  purpose: "intent_planning" | "candidate_selection";
  system: string;
  input: unknown;
}) => Promise<unknown>;

export type CatalogFirstSuggestion = {
  id: string;
  title: string;
  short_description: string;
  tier: "thoughtful";
  price_min: number;
  price_max: number;
  price_hint: string;
  price_guidance: string;
  why_it_fits: string;
  suggested_url: string;
  image_url: string;
  productMatch: ProductMatch;
  amazonProduct: null;
  initialSaved?: boolean;
};

export function buildCatalogRecommendationContext(args: {
  recipient: {
    name: string;
    notes?: string | null;
    petType?: string | null;
  };
  interests: CatalogRecommendationContext["recipient"]["interests"];
  occasion?: string | null;
  recipientRelationship?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  requestedCount: number;
  priorGiftTitles?: string[];
  excludedProductKeys?: string[];
  excludedProductTitles?: string[];
}): CatalogRecommendationContext {
  return {
    recipient: {
      name: args.recipient.name,
      interests: [
        ...args.interests,
        ...(args.recipient.petType
          ? [
              {
                label: `${args.recipient.petType} owner`,
                category: "pet",
              },
            ]
          : []),
      ],
      notes: args.recipient.notes,
    },
    occasion: args.occasion,
    recipientRelationship: args.recipientRelationship,
    budgetMin: args.budgetMin,
    budgetMax: args.budgetMax,
    requestedCount: args.requestedCount,
    priorGiftTitles: args.priorGiftTitles,
    excludedProductKeys: args.excludedProductKeys,
    excludedProductTitles: args.excludedProductTitles,
  };
}

function deterministicExplanation(
  recommendation: CatalogGroundedRecommendation,
  context: CatalogRecommendationContext,
): string {
  const recipient = context.recipient.name?.trim();
  const fit = recommendation.matchedIntent.trim();
  return recipient
    ? `A current ${fit} match selected for ${recipient}.`
    : `A current ${fit} match selected for this recipient.`;
}

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `$${price.toFixed(2)}`;
  }
}

export function createCatalogAiPersonalization(
  completeJson: CatalogJsonCompletion,
): {
  planIntents: CatalogIntentPlanner;
  selectCandidates: CatalogCandidateSelector;
} {
  return {
    planIntents: async (context) =>
      completeJson({
        purpose: "intent_planning",
        system: [
          "Interpret a recipient profile into specific, purchasable product-search intents.",
          "Use only the supplied recipient, occasion, relationship, budget, and history context.",
          "Do not invent products, merchants, prices, images, product IDs, or URLs.",
          "Prefer concrete product families over broad themes and return no more than 12 intents.",
          'Return JSON only: {"intents":[{"id":"...","label":"...","description":"..."}]}.',
        ].join("\n"),
        input: context,
      }),
    selectCandidates: async ({ context, candidates, requestedCount }) =>
      completeJson({
        purpose: "candidate_selection",
        system: [
          "Select and order only the supplied catalog candidate IDs for this recipient.",
          "Never create or alter a candidate ID, product, merchant, price, image, or URL.",
          "Return fewer candidates when the available products are weak or repetitive.",
          "Write one concise explanation based only on the supplied context and candidate metadata.",
          'Return JSON only: {"selections":[{"candidateId":"...","explanation":"..."}]}.',
        ].join("\n"),
        input: { context, candidates, requestedCount },
      }),
  };
}

export function catalogResultToGiftSuggestions(
  result: CatalogRecommendationResult,
  context: CatalogRecommendationContext,
): CatalogFirstSuggestion[] {
  return result.recommendations.map((recommendation) => {
    const product = recommendation.product;
    const explanation =
      recommendation.explanation?.trim() ||
      deterministicExplanation(recommendation, context);
    const price = formatPrice(product.price, product.currency);
    return {
      id: recommendation.candidateId,
      title: product.productTitle,
      short_description: explanation,
      tier: "thoughtful",
      price_min: product.price,
      price_max: product.price,
      price_hint: price,
      price_guidance: price,
      why_it_fits: explanation,
      suggested_url: product.affiliateUrl,
      image_url: product.imageUrl,
      productMatch: product,
      amazonProduct: null,
    };
  });
}
