import assert from "node:assert/strict";
import test from "node:test";
import type { AmazonProduct } from "@/lib/amazonPaapi";
import {
  enrichGiftSuggestionsWithProducts,
  findBestAwinProductMatch,
  type AwinCatalogProduct,
} from "./matcher";

function product(
  overrides: Partial<AwinCatalogProduct> = {},
): AwinCatalogProduct {
  return {
    provider: "awin",
    advertiserId: "89509",
    locale: "en_US",
    merchantName: "Piscifun",
    externalProductId: "reel-1",
    title: "Piscifun Carbon X Fishing Reel",
    description: "A lightweight spinning reel for freshwater anglers.",
    imageUrl: "https://images.example.test/reel.jpg",
    affiliateUrl: "https://www.awin1.com/cread.php?product=reel-1",
    price: 59.99,
    currency: "USD",
    availability: "in_stock",
    active: true,
    ...overrides,
  };
}

const fishingSuggestion = {
  title: "Lightweight fishing reel",
  short_description: "A smooth spinning reel for weekend lake trips.",
  why_it_fits: "They enjoy fishing and need lighter tackle.",
  tier: "thoughtful",
  price_min: 40,
  price_max: 80,
};

function fosiProduct(
  overrides: Partial<AwinCatalogProduct> = {},
): AwinCatalogProduct {
  return product({
    advertiserId: "119395",
    merchantName: "Fosi Audio",
    externalProductId: "fosi-q4",
    title: "Fosi Audio Q4 Desktop DAC Headphone Amplifier",
    description: "A compact DAC and headphone amplifier for desktop listening.",
    imageUrl: "https://images.example.test/fosi-q4.jpg",
    affiliateUrl:
      "https://www.awin1.com/cread.php?awinmid=119395&product=fosi-q4",
    price: 69.99,
    ...overrides,
  });
}

test("selects a strong relevant in-stock Awin product", () => {
  const match = findBestAwinProductMatch({
    suggestion: fishingSuggestion,
    recipientInterests: [{ label: "Fishing", category: "Outdoors" }],
    products: [product()],
  });

  assert.equal(match?.provider, "awin");
  assert.equal(match?.advertiserId, "89509");
  assert.equal(match?.locale, "en_US");
  assert.equal(match?.merchant, "Piscifun");
  assert.equal(match?.productTitle, "Piscifun Carbon X Fishing Reel");
  assert.equal(match?.price, 59.99);
});

test("rejects a Piscifun product for an unrelated gift concept", () => {
  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Waterproof hiking backpack",
      short_description: "A durable day pack for mountain trails.",
      why_it_fits: "They hike every weekend.",
      tier: "thoughtful",
      price_min: 40,
      price_max: 80,
    },
    recipientInterests: [
      { label: "Hiking", category: "Outdoors" },
      { label: "Fishing", category: "Outdoors" },
    ],
    products: [
      product({
        title: "Piscifun Waterproof Fishing Backpack",
        description: "A durable outdoor tackle backpack.",
      }),
    ],
  });

  assert.equal(match, null);
});

test("production matching includes Fosi Audio when its audio policy has a relevant intent", () => {
  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Desktop audio amplifier upgrade",
      short_description: "A compact DAC and amplifier for music listening.",
      tier: "thoughtful",
    },
    products: [fosiProduct()],
  });

  assert.equal(match?.advertiserId, "119395");
});

test("the Fosi policy matches specific audio equipment intents", () => {
  const cases = [
    {
      title: "Desktop audio amplifier upgrade",
      description: "A compact DAC and amplifier for music listening.",
      product: fosiProduct(),
    },
    {
      title: "Compact stereo amplifier",
      description: "A small amplifier for a home audio setup.",
      product: fosiProduct({
        externalProductId: "fosi-v1",
        title: "Fosi Audio V1 Mini Stereo Audio Amplifier",
      }),
    },
    {
      title: "Headphone listening amplifier",
      description: "A headphone amplifier for focused music listening.",
      product: fosiProduct(),
    },
  ];

  for (const candidate of cases) {
    const match = findBestAwinProductMatch({
      suggestion: {
        title: candidate.title,
        short_description: candidate.description,
        tier: "thoughtful",
      },
      products: [candidate.product],
    });
    assert.equal(match?.advertiserId, "119395");
    assert.equal(match?.locale, "en_US");
  }
});

test("the Fosi policy rejects unrelated and generic-only gift intents", () => {
  const unrelated = [
    ["Fishing tackle organizer", "Waterproof storage for fishing gear."],
    ["Gardening tool organizer", "Storage for hand tools and seeds."],
    ["Personalized pet portrait", "Custom artwork featuring a beloved dog."],
    ["Portable home accessory", "A useful device for around the home."],
  ];

  for (const [title, short_description] of unrelated) {
    assert.equal(
      findBestAwinProductMatch({
        suggestion: { title, short_description, tier: "thoughtful" },
        products: [fosiProduct()],
      }),
      null,
    );
  }
});

test("the Fosi policy excludes administrative listings and gift cards", () => {
  const suggestion = {
    title: "Fosi Audio gift card for a music enthusiast",
    short_description: "Credit toward an audio amplifier upgrade.",
    tier: "safe",
  };
  const products = [
    fosiProduct({
      externalProductId: "price-adjustment",
      title: "Fosi Audio Make Up the Price Difference of $1 - $5",
      price: 5,
    }),
    fosiProduct({
      externalProductId: "gift-card",
      title: "Fosi Audio Gift Card",
      price: 50,
    }),
  ];

  assert.equal(
    findBestAwinProductMatch({
      suggestion,
      products,
    }),
    null,
  );
});

test("the Fosi policy retains relevant audio accessories and standard filters", () => {
  const suggestion = {
    title: "Headphone amplifier power supply",
    short_description: "A power supply accessory for their headphone amplifier.",
    tier: "safe",
    price_min: 15,
    price_max: 40,
  };
  const accessory = fosiProduct({
    externalProductId: "power-supply",
    title: "Fosi Audio Headphone Amplifier Power Supply",
    description: "Replacement power supply for a desktop headphone amplifier.",
    price: 24.99,
  });

  const match = findBestAwinProductMatch({
    suggestion,
    products: [accessory],
  });
  const unavailable = findBestAwinProductMatch({
    suggestion,
    products: [
      { ...accessory, availability: "out_of_stock" },
      { ...accessory, externalProductId: "over-budget", price: 55 },
    ],
  });

  assert.equal(match?.productId, "power-supply");
  assert.equal(match?.advertiserId, "119395");
  assert.equal(unavailable, null);
});

test("broad fishing context alone cannot substitute a different product", () => {
  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Fishing cookbook",
      short_description: "Recipes for preparing a fresh catch.",
      why_it_fits: "They enjoy cooking fish for family dinners.",
      tier: "thoughtful",
      price_min: 20,
      price_max: 80,
    },
    recipientInterests: [{ label: "Fishing", category: "Outdoors" }],
    products: [product()],
  });

  assert.equal(match, null);
});

test("excludes inactive and out-of-stock products", () => {
  const match = findBestAwinProductMatch({
    suggestion: fishingSuggestion,
    products: [
      product({ availability: "out_of_stock" }),
      product({ externalProductId: "inactive", active: false }),
    ],
  });
  assert.equal(match, null);
});

test("rejects products with unsafe image metadata", () => {
  const match = findBestAwinProductMatch({
    suggestion: fishingSuggestion,
    products: [product({ imageUrl: "http://images.example.test/reel.jpg" })],
  });

  assert.equal(match, null);
});

test("enforces the gift and recipient budget boundaries", () => {
  const overBudget = findBestAwinProductMatch({
    suggestion: fishingSuggestion,
    products: [product({ price: 95 })],
  });
  const belowRecipientMinimum = findBestAwinProductMatch({
    suggestion: { ...fishingSuggestion, price_min: null },
    products: [product({ price: 45 })],
    budgetMin: 50,
  });

  assert.equal(overBudget, null);
  assert.equal(belowRecipientMinimum, null);
});

test("returns no match for an empty catalog", () => {
  assert.equal(
    findBestAwinProductMatch({
      suggestion: fishingSuggestion,
      products: [],
    }),
    null,
  );
});

test("experience suggestions do not receive physical product enrichment", async () => {
  let amazonCalls = 0;
  const suggestion = {
    title: "Guided fly fishing lesson",
    short_description: "A private lesson with a local guide.",
    why_it_fits: "They want to improve their fishing technique.",
    tier: "experience",
    price_min: 50,
    price_max: 200,
  };

  const [result] = await enrichGiftSuggestionsWithProducts({
    suggestions: [suggestion],
    loadAwinProducts: async () => [product()],
    searchAmazon: async () => {
      amazonCalls += 1;
      return null;
    },
  });

  assert.equal(amazonCalls, 0);
  assert.equal(result.productMatch, null);
  assert.equal(result.amazonProduct, null);
});

test("uses Amazon as fallback when Awin has no relevant match", async () => {
  const amazon: AmazonProduct = {
    asin: "B000TEST",
    title: "Leather Watch Case",
    imageUrl: "https://images.example.test/watch.jpg",
    detailPageUrl: "https://www.amazon.com/dp/B000TEST?tag=giftperch-20",
    priceDisplay: "$39.99",
    currency: "USD",
  };
  let amazonCalls = 0;
  const suggestion = {
    title: "Leather watch case",
    short_description: "A compact travel case.",
    why_it_fits: "They collect watches.",
    tier: "safe",
    price_min: 20,
    price_max: 50,
  };

  const [result] = await enrichGiftSuggestionsWithProducts({
    suggestions: [suggestion],
    loadAwinProducts: async () => [product()],
    searchAmazon: async () => {
      amazonCalls += 1;
      return amazon;
    },
  });

  assert.equal(amazonCalls, 1);
  assert.equal(result.amazonProduct, amazon);
  assert.equal(result.productMatch?.provider, "amazon");
  assert.equal(result.productMatch?.price, 39.99);
});

test("Supabase catalog failures degrade to Amazon fallback", async () => {
  let amazonCalls = 0;
  const [result] = await enrichGiftSuggestionsWithProducts({
    suggestions: [fishingSuggestion],
    loadAwinProducts: async () => {
      throw new Error("synthetic Supabase failure");
    },
    searchAmazon: async () => {
      amazonCalls += 1;
      return null;
    },
  });

  assert.equal(amazonCalls, 1);
  assert.equal(result.productMatch, null);
  assert.equal(result.amazonProduct, null);
});

test("a strong Awin match avoids Amazon and preserves generated content", async () => {
  let amazonCalls = 0;
  const original = {
    id: "idea-1",
    ...fishingSuggestion,
    title: "Lightweight fishing reel",
    short_description: "The original AI description.",
    why_it_fits: "The original personalized reasoning.",
    suggested_url: "https://example.test/original-idea",
  };

  const [result] = await enrichGiftSuggestionsWithProducts({
    suggestions: [original],
    recipientInterests: [{ label: "Fishing", category: "Outdoors" }],
    loadAwinProducts: async () => [product()],
    searchAmazon: async () => {
      amazonCalls += 1;
      return null;
    },
  });

  assert.equal(amazonCalls, 0);
  assert.equal(result.title, original.title);
  assert.equal(result.short_description, original.short_description);
  assert.equal(result.why_it_fits, original.why_it_fits);
  assert.equal(result.suggested_url, original.suggested_url);
  assert.equal(result.productMatch?.provider, "awin");
  assert.equal(result.amazonProduct, null);
});
