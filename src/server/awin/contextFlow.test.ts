import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGiftSuggestionRequestPayload,
  parseGiftSuggestionRequestContext,
  resolveGiftSuggestionStructuredContext,
} from "@/lib/gifts/giftSuggestionContext";
import type { AmazonProduct } from "@/lib/amazonPaapi";
import type { AwinAdvertiserConfig } from "./advertisers";
import { enrichGiftSuggestionsWithProducts, type AwinCatalogProduct } from "./matcher";

const giftlab: AwinAdvertiserConfig = {
  key: "giftlab",
  advertiserId: "95201",
  displayName: "Giftlab",
  locale: "en_US",
  importEnabled: true,
  recommendationEnabled: true,
  matchingPolicy: "giftlab-personalized",
};

function mug(title: string, id: string): AwinCatalogProduct {
  return {
    provider: "awin",
    advertiserId: "95201",
    locale: "en_US",
    merchantName: "Giftlab",
    externalProductId: id,
    title,
    description: "Category: Kitchen.",
    imageUrl: `https://images.example.test/${id}.jpg`,
    affiliateUrl: `https://www.awin1.com/cread.php?awinmid=95201&product=${id}`,
    price: 25,
    currency: "USD",
    availability: "in_stock",
    active: true,
  };
}

test("available UI context reaches Awin enrichment and the persisted run context", async () => {
  const payload = buildGiftSuggestionRequestPayload({
    recipientId: "recipient-1",
    occasion: " birthday ",
    budgetMin: "20",
    budgetMax: "60",
    numSuggestions: 9,
  });
  const request = parseGiftSuggestionRequestContext(payload);
  const context = resolveGiftSuggestionStructuredContext({
    request,
    recipientRelationship: " Friend ",
    recipientBudgetMin: 10,
    recipientBudgetMax: 100,
  });

  assert.deepEqual(payload, {
    recipientId: "recipient-1",
    occasion: "birthday",
    budgetMin: 20,
    budgetMax: 60,
    numSuggestions: 9,
  });
  assert.deepEqual(context, {
    occasion: "birthday",
    recipientRelationship: "Friend",
    budgetMin: 20,
    budgetMax: 60,
  });

  const amazon: AmazonProduct = {
    asin: "amazon-fallback",
    title: "Personalized Birthday Coffee Mug",
    imageUrl: "https://images.example.test/amazon-mug.jpg",
    detailPageUrl: "https://www.amazon.com/dp/amazon-fallback",
    priceDisplay: "$29.99",
    currency: "USD",
    primeEligible: null,
  };
  const [result] = await enrichGiftSuggestionsWithProducts({
    suggestions: [
      {
        title: "Personalized coffee mug",
        short_description: "A custom mug for a friend's birthday.",
        tier: "thoughtful",
        price_min: 20,
        price_max: 40,
      },
    ],
    budgetMin: context.budgetMin,
    budgetMax: context.budgetMax,
    occasion: context.occasion,
    recipientRelationship: context.recipientRelationship,
    advertiserRegistry: [giftlab],
    loadAwinProducts: async () => [
      mug("Personalized Christmas Coffee Mug for Sister", "christmas-sister"),
    ],
    searchAmazon: async () => amazon,
  });

  assert.equal(result.productMatch?.provider, "amazon");
  assert.equal(result.productMatch?.productId, "amazon-fallback");
});

test("missing request context remains optional and profile budgets remain authoritative", () => {
  const payload = buildGiftSuggestionRequestPayload({
    recipientId: "recipient-2",
  });
  const request = parseGiftSuggestionRequestContext(payload);
  assert.deepEqual(
    resolveGiftSuggestionStructuredContext({
      request,
      recipientRelationship: null,
      recipientBudgetMin: 15,
      recipientBudgetMax: 40,
    }),
    {
      occasion: null,
      recipientRelationship: null,
      budgetMin: 15,
      budgetMax: 40,
    },
  );
});
