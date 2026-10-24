import assert from "node:assert/strict";
import test from "node:test";
import type { AmazonProduct } from "@/lib/amazonPaapi";
import {
  enrichGiftSuggestionsWithProducts,
  findBestAwinProductMatch,
  getCatalogEligibleAwinAdvertiserIds,
  getRelevantAwinAdvertiserIds,
  type AwinCatalogProduct,
} from "./matcher";
import type { AwinAdvertiserConfig } from "./advertisers";

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

function advertiserProduct(
  advertiserId: string,
  merchantName: string,
  overrides: Partial<AwinCatalogProduct> = {},
): AwinCatalogProduct {
  return product({
    advertiserId,
    merchantName,
    externalProductId: `${advertiserId}-product-1`,
    title: `${merchantName} Sample Product`,
    description: `A ${merchantName} product.`,
    imageUrl: `https://images.example.test/${advertiserId}.jpg`,
    affiliateUrl: `https://www.awin1.com/cread.php?awinmid=${advertiserId}&product=${advertiserId}-product-1`,
    price: 49.99,
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

test("unjoined advertisers cannot be selected from the production matcher", () => {
  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Desktop audio amplifier upgrade",
      short_description: "A compact DAC and amplifier for music listening.",
      tier: "thoughtful",
    },
    products: [fosiProduct()],
  });

  assert.equal(match, null);
});

test("catalog retrieval rejects unjoined and unknown advertiser scopes", () => {
  assert.deepEqual(
    getCatalogEligibleAwinAdvertiserIds(["89509", "119395", "unknown"]),
    ["89509"],
  );
  assert.deepEqual(
    getCatalogEligibleAwinAdvertiserIds(["119395", "unknown"]),
    [],
  );
});

test("BONHEUR matches jewelry gifts without opening unrelated accessories", () => {
  const necklace = advertiserProduct("90759", "BONHEUR JEWELRY", {
    title: "Laurel Gold Anniversary Necklace",
    description: "A gold plated necklace for an anniversary jewelry gift.",
    price: 198,
  });
  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Gold anniversary necklace jewelry gift",
      short_description: "A special necklace for their anniversary.",
      tier: "thoughtful",
      price_max: 250,
    },
    products: [necklace],
  });
  const unrelated = findBestAwinProductMatch({
    suggestion: {
      title: "Leather travel wallet accessory",
      short_description: "A compact wallet for frequent trips.",
      tier: "thoughtful",
    },
    products: [necklace],
  });

  assert.equal(match?.advertiserId, "90759");
  assert.equal(unrelated, null);
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

test("preselects only advertiser policies that can pass the current suggestion intent", () => {
  const ids = getRelevantAwinAdvertiserIds([
    {
      title: "Portable DAC headphone amplifier for an audiophile",
      short_description: "A desktop audio upgrade for music listening.",
      tier: "thoughtful",
    },
    {
      title: "Bike taillight for a road cyclist",
      short_description: "A visibility upgrade for evening cycling rides.",
      tier: "safe",
    },
  ]).sort();

  assert.deepEqual(ids, []);
  assert.deepEqual(
    getRelevantAwinAdvertiserIds([
      {
        title: "Mechanical keyboard for a programmer",
        short_description: "A comfortable typing upgrade for a home office.",
        tier: "thoughtful",
      },
    ]),
    [],
  );
});

test("retains standard advertisers in candidate retrieval when no specialized policy applies", () => {
  const registry: readonly AwinAdvertiserConfig[] = [
    {
      key: "standard-test",
      advertiserId: "100833",
      displayName: "Standard Test",
      locale: "en_US",
      importEnabled: true,
      recommendationEnabled: true,
      matchingPolicy: "standard",
    },
  ];

  assert.deepEqual(
    getRelevantAwinAdvertiserIds(
      [
        {
          title: "Handwritten recipe collection",
          short_description: "A personal collection of family recipes.",
          tier: "thoughtful",
        },
      ],
      registry,
    ),
    ["100833"],
  );
});

test("candidate preselection preserves matcher results for mixed advertiser intents", () => {
  const products = [
    product(),
    advertiserProduct("90759", "BONHEUR JEWELRY", {
      title: "Laurel Gold Anniversary Necklace",
      description: "A gold plated necklace for an anniversary jewelry gift.",
      price: 198,
    }),
  ];
  const suggestions = [
    fishingSuggestion,
    {
      title: "Gold anniversary necklace jewelry gift",
      short_description: "A special necklace for their anniversary.",
      tier: "thoughtful",
      price_max: 250,
    },
  ];
  const relevantIds = new Set(getRelevantAwinAdvertiserIds(suggestions));
  const reducedCatalog = products.filter((candidate) =>
    relevantIds.has(candidate.advertiserId),
  );

  for (const suggestion of suggestions) {
    assert.deepEqual(
      findBestAwinProductMatch({ suggestion, products }),
      findBestAwinProductMatch({ suggestion, products: reducedCatalog }),
    );
  }
});

test("enrichment passes the union of eligible advertisers to the shared catalog load", async () => {
  let requestedAdvertiserIds: readonly string[] | undefined;
  const suggestions = [
    fishingSuggestion,
    {
      title: "Gold anniversary necklace jewelry gift",
      short_description: "A special necklace for their anniversary.",
      tier: "thoughtful",
      price_max: 250,
    },
  ];

  const enriched = await enrichGiftSuggestionsWithProducts({
    suggestions,
    loadAwinProducts: async ({ advertiserIds }) => {
      requestedAdvertiserIds = advertiserIds;
      return [
        product(),
        advertiserProduct("90759", "BONHEUR JEWELRY", {
          title: "Laurel Gold Anniversary Necklace",
          description: "A gold plated necklace for an anniversary jewelry gift.",
          price: 198,
        }),
      ];
    },
    searchAmazon: async () => null,
  });

  assert.deepEqual([...requestedAdvertiserIds!].sort(), ["89509", "90759"]);
  assert.equal(enriched[0].productMatch?.advertiserId, "89509");
  assert.equal(enriched[1].productMatch?.advertiserId, "90759");
});
