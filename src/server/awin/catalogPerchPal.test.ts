import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCatalogRecommendationContext,
  catalogResultToGiftSuggestions,
  createCatalogAiPersonalization,
} from "./catalogPerchPal";
import type {
  CatalogGroundedProduct,
  CatalogRecommendationContext,
  CatalogRecommendationResult,
} from "./catalogRecommendations";

const context: CatalogRecommendationContext = {
  recipient: {
    name: "Avery",
    interests: [{ label: "Fishing", category: "Outdoors" }],
    notes: "Prefers practical gear.",
  },
  avoidances: ["gift cards"],
  occasion: "birthday",
  recipientRelationship: "friend",
  budgetMin: 25,
  budgetMax: 75,
  requestedCount: 3,
  priorGiftTitles: ["Fishing pliers"],
  excludedProductTitles: ["Old fishing reel"],
};

const product: CatalogGroundedProduct = {
  provider: "awin",
  advertiserId: "89509",
  locale: "en_US",
  productId: "reel-1",
  merchant: "Piscifun",
  productTitle: "Carbon Fishing Reel",
  imageUrl: "https://images.example.test/reel.jpg",
  price: 49.99,
  currency: "USD",
  affiliateUrl: "https://www.awin1.com/cread.php?product=reel-1",
};

test("builds catalog context from authoritative request and recipient fields", () => {
  const built = buildCatalogRecommendationContext({
    recipient: {
      name: "Avery",
      notes: "Prefers practical gear.",
      petType: "dog",
    },
    interests: [{ label: "Fishing", category: "Outdoors" }],
    avoidances: ["gift cards"],
    occasion: "birthday",
    recipientRelationship: "friend",
    budgetMin: 25,
    budgetMax: 75,
    requestedCount: 3,
    priorGiftTitles: ["Fishing pliers"],
    excludedProductKeys: ["89509:en_US:reel-previous"],
    excludedProductTitles: ["Previous reel"],
  });

  assert.deepEqual(built, {
    recipient: {
      name: "Avery",
      notes: "Prefers practical gear.",
      interests: [
        { label: "Fishing", category: "Outdoors" },
        { label: "dog owner", category: "pet" },
      ],
    },
    avoidances: ["gift cards"],
    occasion: "birthday",
    recipientRelationship: "friend",
    budgetMin: 25,
    budgetMax: 75,
    requestedCount: 3,
    priorGiftTitles: ["Fishing pliers"],
    excludedProductKeys: ["89509:en_US:reel-previous"],
    excludedProductTitles: ["Previous reel"],
  });
});

test("maps only authoritative catalog fields into persisted suggestions", () => {
  const result: CatalogRecommendationResult = {
    status: "success",
    recommendations: [
      {
        candidateId: "awin:89509:en_US:reel-1",
        product,
        active: true,
        availability: "in_stock",
        matchedIntent: "freshwater fishing reel",
        explanation: "A practical upgrade for Avery's fishing trips.",
      },
    ],
    intents: [],
    requestedCount: 3,
    eligibleCandidateCount: 1,
    shortlistCount: 1,
    freshness: { targetHours: 72, enforced: false },
  };

  const [suggestion] = catalogResultToGiftSuggestions(result, context);
  assert.equal(suggestion.title, product.productTitle);
  assert.equal(suggestion.image_url, product.imageUrl);
  assert.equal(suggestion.suggested_url, product.affiliateUrl);
  assert.equal(suggestion.price_min, product.price);
  assert.equal(suggestion.productMatch, product);
  assert.equal(suggestion.amazonProduct, null);
  assert.equal(
    suggestion.why_it_fits,
    "A practical upgrade for Avery's fishing trips.",
  );
});

test("uses a safe deterministic explanation when AI selection fails", () => {
  const result: CatalogRecommendationResult = {
    status: "success",
    recommendations: [
      {
        candidateId: "awin:89509:en_US:reel-1",
        product,
        active: true,
        availability: "in_stock",
        matchedIntent: "fishing reel",
        explanation: null,
      },
    ],
    intents: [],
    requestedCount: 3,
    eligibleCandidateCount: 1,
    shortlistCount: 1,
    freshness: { targetHours: 72, enforced: false },
  };

  const [suggestion] = catalogResultToGiftSuggestions(result, context);
  assert.equal(
    suggestion.why_it_fits,
    "A current fishing reel match selected for Avery.",
  );
  assert.equal(suggestion.title, product.productTitle);
});

test("AI prompts receive context and only bounded candidate metadata", async () => {
  const calls: Array<{ purpose: string; input: unknown }> = [];
  const personalization = createCatalogAiPersonalization(async (request) => {
    calls.push({ purpose: request.purpose, input: request.input });
    return request.purpose === "intent_planning"
      ? { intents: [{ id: "intent-1", label: "spinning fishing reel" }] }
      : {
          selections: [
            {
              candidateId: "awin:89509:en_US:reel-1",
              explanation: "Fits Avery's practical fishing setup.",
            },
          ],
        };
  });

  await personalization.planIntents(context);
  await personalization.selectCandidates({
    context,
    candidates: [
      {
        candidateId: "awin:89509:en_US:reel-1",
        title: product.productTitle,
        description: "Lightweight spinning reel.",
        merchant: product.merchant,
        price: product.price,
        currency: "USD",
        matchedIntent: "fishing reel",
      },
    ],
    requestedCount: 3,
  });

  assert.deepEqual(
    calls.map((call) => call.purpose),
    ["intent_planning", "candidate_selection"],
  );
  assert.deepEqual(calls[0]?.input, context);
  assert.equal(JSON.stringify(calls).includes("affiliateUrl"), false);
  assert.equal(JSON.stringify(calls).includes("imageUrl"), false);
});
