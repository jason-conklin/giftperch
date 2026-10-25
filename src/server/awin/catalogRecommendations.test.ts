import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AwinAdvertiserConfig } from "./advertisers";
import {
  buildCatalogGroundedProduct,
  evaluateCatalogFirstRecommendations,
  getCatalogFreshnessTargetHours,
  isCatalogFirstRecommendationsEnabled,
  runCatalogFirstRecommendations,
} from "./catalogRecommendations";
import {
  loadAwinProductCandidates,
  type AwinCatalogProduct,
} from "./matcher";

const piscifun: AwinAdvertiserConfig = {
  key: "piscifun",
  advertiserId: "89509",
  displayName: "Piscifun",
  locale: "en_US",
  importEnabled: true,
  recommendationEnabled: true,
  matchingPolicy: "piscifun-fishing",
};

const bonheur: AwinAdvertiserConfig = {
  key: "bonheur-jewelry",
  advertiserId: "90759",
  displayName: "BONHEUR JEWELRY",
  locale: "en_US",
  importEnabled: true,
  recommendationEnabled: true,
  matchingPolicy: "bonheur-jewelry",
};

const enabledGiftlab: AwinAdvertiserConfig = {
  key: "giftlab",
  advertiserId: "95201",
  displayName: "Giftlab",
  locale: "en_US",
  importEnabled: true,
  recommendationEnabled: true,
  matchingPolicy: "giftlab-personalized",
};

const disabledGiftlab = {
  ...enabledGiftlab,
  recommendationEnabled: false,
};

function product(
  overrides: Partial<AwinCatalogProduct> = {},
): AwinCatalogProduct {
  return {
    provider: "awin",
    advertiserId: "89509",
    locale: "en_US",
    merchantName: "Piscifun",
    externalProductId: "reel-1",
    title: "Piscifun Carbon Fishing Reel",
    description: "A lightweight spinning reel for freshwater fishing.",
    imageUrl: "https://images.example.test/reel.jpg",
    affiliateUrl:
      "https://www.awin1.com/cread.php?awinmid=89509&product=reel-1",
    price: 49.99,
    currency: "USD",
    availability: "in_stock",
    active: true,
    ...overrides,
  };
}

function giftlabProduct(
  title: string,
  id: string,
  overrides: Partial<AwinCatalogProduct> = {},
): AwinCatalogProduct {
  return product({
    advertiserId: "95201",
    merchantName: "Giftlab",
    externalProductId: id,
    title,
    description: "Category: Kitchen. Personalized gift.",
    imageUrl: `https://images.example.test/${id}.jpg`,
    affiliateUrl: `https://www.awin1.com/cread.php?awinmid=95201&product=${id}`,
    price: 25,
    ...overrides,
  });
}

function bonheurProduct(
  title: string,
  id: string,
  overrides: Partial<AwinCatalogProduct> = {},
): AwinCatalogProduct {
  return product({
    advertiserId: "90759",
    merchantName: "BONHEUR JEWELRY",
    externalProductId: id,
    title,
    description: "Fine jewelry and accessories.",
    imageUrl: `https://images.example.test/${id}.jpg`,
    affiliateUrl: `https://www.awin1.com/cread.php?awinmid=90759&product=${id}`,
    price: 75,
    ...overrides,
  });
}

function context(
  overrides: Partial<Parameters<typeof evaluateCatalogFirstRecommendations>[0]> = {},
) {
  return {
    recipient: {
      name: "Test Recipient",
      interests: [{ label: "Fishing", category: "Outdoors" }],
      notes: null,
    },
    occasion: "birthday",
    recipientRelationship: "friend",
    budgetMin: 20,
    budgetMax: 80,
    requestedCount: 3,
    ...overrides,
  };
}

test("constructs only complete authoritative catalog products", () => {
  const valid = buildCatalogGroundedProduct(product(), [piscifun]);
  assert.equal(valid?.provider, "awin");
  assert.equal(valid?.productId, "reel-1");
  assert.equal(valid?.productTitle, "Piscifun Carbon Fishing Reel");
  assert.equal(valid?.price, 49.99);
  assert.equal(valid?.currency, "USD");

  assert.equal(
    buildCatalogGroundedProduct(product({ active: false }), [piscifun]),
    null,
  );
  assert.equal(
    buildCatalogGroundedProduct(product({ availability: "out_of_stock" }), [
      piscifun,
    ]),
    null,
  );
  assert.equal(
    buildCatalogGroundedProduct(product({ imageUrl: "http://bad.test/x.jpg" }), [
      piscifun,
    ]),
    null,
  );
  assert.equal(
    buildCatalogGroundedProduct(
      product({ affiliateUrl: "https://merchant.example.test/item" }),
      [piscifun],
    ),
    null,
  );
  assert.equal(
    buildCatalogGroundedProduct(product({ currency: "EUR" }), [piscifun]),
    null,
  );
});

test("excludes disabled advertisers before matching", async () => {
  let loadCalled = false;
  const result = await evaluateCatalogFirstRecommendations(
    context({
      recipient: {
        interests: [{ label: "Personalized photo mug" }],
      },
    }),
    {
      advertiserRegistry: [disabledGiftlab],
      loadProducts: async () => {
        loadCalled = true;
        return [giftlabProduct("Personalized Photo Mug", "mug-1")];
      },
    },
  );

  assert.equal(result.status, "no_results");
  assert.equal(loadCalled, false);
});

test("applies budget bounds and forwards bounded database filters", async () => {
  let receivedOptions: unknown;
  const result = await evaluateCatalogFirstRecommendations(context(), {
    advertiserRegistry: [piscifun],
    loadProducts: async (options) => {
      receivedOptions = options;
      return [
        product({ externalProductId: "cheap", price: 10 }),
        product({ externalProductId: "fit", price: 45 }),
        product({ externalProductId: "expensive", price: 100 }),
      ];
    },
  });

  assert.equal(result.status, "success");
  assert.deepEqual(
    result.recommendations.map((item) => item.product.productId),
    ["fit"],
  );
  assert.deepEqual(receivedOptions, {
    advertiserIds: ["89509"],
    budgetMin: 20,
    budgetMax: 80,
    currency: "USD",
    maximumProducts: 5000,
  });
});

test("excludes products already present in saved ideas or prior runs", async () => {
  const result = await evaluateCatalogFirstRecommendations(
    context({
      requestedCount: 3,
      excludedProductKeys: ["89509:en_US:reel-saved"],
      excludedProductTitles: ["Piscifun Prior Fishing Reel"],
    }),
    {
      advertiserRegistry: [piscifun],
      loadProducts: async () => [
        product({
          externalProductId: "reel-saved",
          title: "Piscifun Saved Fishing Reel",
        }),
        product({
          externalProductId: "reel-prior",
          title: "Piscifun Prior Fishing Reel",
        }),
        product({
          externalProductId: "reel-new",
          title: "Piscifun New Fishing Reel",
        }),
      ],
    },
  );

  assert.deepEqual(
    result.recommendations.map((item) => item.product.productId),
    ["reel-new"],
  );
});

test("preserves product identity and does not accept AI product fields", async () => {
  const source = product();
  const result = await evaluateCatalogFirstRecommendations(context(), {
    advertiserRegistry: [piscifun],
    loadProducts: async () => [source],
    selectCandidates: async ({ candidates }) => ({
      selections: [
        {
          candidateId: candidates[0].candidateId,
          explanation: "A lightweight choice for regular fishing trips.",
          productTitle: "Invented title",
          affiliateUrl: "https://untrusted.example.test/item",
          price: 1,
        },
      ],
    }),
  });

  const recommendation = result.recommendations[0];
  assert.equal(recommendation.product.productId, source.externalProductId);
  assert.equal(recommendation.product.productTitle, source.title);
  assert.equal(recommendation.product.price, source.price);
  assert.equal(recommendation.product.affiliateUrl, source.affiliateUrl);
  assert.equal(
    recommendation.explanation,
    "A lightweight choice for regular fishing trips.",
  );
});

test("rejects AI selections outside the server shortlist", async () => {
  const result = await evaluateCatalogFirstRecommendations(context(), {
    advertiserRegistry: [piscifun],
    loadProducts: async () => [product()],
    selectCandidates: async () => ({
      selections: [
        {
          candidateId: "awin:89509:en_US:invented-product",
          explanation: "Invented selection",
        },
      ],
    }),
  });

  assert.equal(result.status, "success");
  assert.equal(result.recommendations[0].product.productId, "reel-1");
  assert.equal(result.recommendations[0].explanation, null);
});

test("falls back to deterministic ranking for malformed AI output", async () => {
  const result = await evaluateCatalogFirstRecommendations(context(), {
    advertiserRegistry: [piscifun],
    loadProducts: async () => [product()],
    selectCandidates: async () => ({ selections: "not-an-array" }),
  });

  assert.equal(result.status, "success");
  assert.equal(result.recommendations[0].product.productId, "reel-1");
  assert.equal(result.recommendations[0].explanation, null);
});

test("falls back to deterministic planning and ranking when AI calls fail", async () => {
  const result = await evaluateCatalogFirstRecommendations(context(), {
    advertiserRegistry: [piscifun],
    loadProducts: async () => [product()],
    planIntents: async () => {
      throw new Error("planner unavailable");
    },
    selectCandidates: async () => {
      throw new Error("selector unavailable");
    },
  });

  assert.equal(result.status, "success");
  assert.equal(result.recommendations[0].product.productId, "reel-1");
  assert.equal(result.recommendations[0].explanation, null);
});

test("returns a structured empty result instead of forcing unrelated products", async () => {
  const result = await evaluateCatalogFirstRecommendations(
    context({
      recipient: { interests: [{ label: "PC gaming" }] },
    }),
    {
      advertiserRegistry: [piscifun, bonheur, disabledGiftlab],
      loadProducts: async () => {
        assert.fail("irrelevant advertiser partitions should not be loaded");
      },
    },
  );

  assert.deepEqual(result.recommendations, []);
  assert.equal(result.status, "no_results");
  assert.equal(result.eligibleCandidateCount, 0);
});

test("abstains from context-free personalized gift requests", async () => {
  let loadCalled = false;
  const result = await evaluateCatalogFirstRecommendations(
    context({
      recipient: { interests: [{ label: "Meaningful personalized gifts" }] },
    }),
    {
      advertiserRegistry: [enabledGiftlab],
      loadProducts: async () => {
        loadCalled = true;
        return [
          giftlabProduct(
            "Personalized Auto Repairman Bobblehead",
            "occupation-specific",
          ),
        ];
      },
    },
  );

  assert.equal(result.status, "no_results");
  assert.equal(loadCalled, false);
});

test("uses product-type, sensitive-category, occasion, and relationship gates", async () => {
  const products = [
    giftlabProduct("Personalized Christmas Mug for Sister", "wrong-context"),
    giftlabProduct("Personalized Costume Photo Shirt", "costume", {
      description: "Category: Costumes. Personalized apparel.",
    }),
    giftlabProduct("Personalized Birthday Photo Mug", "valid"),
  ];
  const result = await evaluateCatalogFirstRecommendations(
    context({
      recipient: { interests: [{ label: "Personalized photo mug" }] },
      occasion: "birthday",
      recipientRelationship: "friend",
    }),
    {
      advertiserRegistry: [enabledGiftlab],
      loadProducts: async () => products,
      planIntents: async () => ({
        intents: [{ id: "mug", label: "Personalized birthday photo mug" }],
      }),
    },
  );

  assert.equal(result.recommendations[0]?.product.productId, "valid");
  assert.equal(
    result.recommendations.some((item) => item.product.productId === "costume"),
    false,
  );
  assert.equal(
    result.recommendations.some(
      (item) => item.product.productId === "wrong-context",
    ),
    false,
  );
});

test("collapses Giftlab AirPods color variants in the shortlist", async () => {
  const result = await evaluateCatalogFirstRecommendations(
    context({
      recipient: { interests: [{ label: "Personalized AirPods case" }] },
      requestedCount: 6,
    }),
    {
      advertiserRegistry: [enabledGiftlab],
      loadProducts: async () => [
        giftlabProduct("Custom Photo AirPods Case Black", "airpods-black", {
          description: "Category: Accessories.",
        }),
        giftlabProduct("Custom Photo AirPods Case Blue", "airpods-blue", {
          description: "Category: Accessories.",
        }),
      ],
    },
  );

  assert.equal(result.recommendations.length, 1);
  assert.equal(result.shortlistCount, 1);
});

test("requires requested customization evidence and collapses merchant variants", async () => {
  const result = await evaluateCatalogFirstRecommendations(
    context({
      recipient: { interests: [{ label: "Personalized jewelry" }] },
      occasion: "anniversary",
      recipientRelationship: "wife",
      requestedCount: 4,
    }),
    {
      advertiserRegistry: [bonheur],
      loadProducts: async () => [
        bonheurProduct("Anik Tennis Bracelet - Gold / Blue", "generic"),
        bonheurProduct(
          "Necklace Gift With Custom Message Card",
          "message-card-only",
        ),
        bonheurProduct("Custom Engraved Heart Necklace - Gold", "custom-gold"),
        bonheurProduct("Custom Engraved Heart Necklace - Silver", "custom-silver"),
      ],
    },
  );

  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].product.productId, "custom-gold");
  assert.equal(
    result.recommendations.some((item) => item.product.productId === "generic"),
    false,
  );
  assert.equal(
    result.recommendations.some(
      (item) => item.product.productId === "message-card-only",
    ),
    false,
  );
});

test("keeps generic jewelry eligible while collapsing option variants", async () => {
  const result = await evaluateCatalogFirstRecommendations(
    context({
      recipient: { interests: [{ label: "Jewelry" }] },
      budgetMin: 40,
      budgetMax: 100,
      requestedCount: 4,
    }),
    {
      advertiserRegistry: [bonheur],
      loadProducts: async () => [
        bonheurProduct("Anik Tennis Bracelet - Gold / Blue", "anik-blue"),
        bonheurProduct("Anik Tennis Bracelet - Gold / Pink", "anik-pink"),
        bonheurProduct("Laurel Pendant Necklace - Gold", "laurel"),
      ],
    },
  );

  assert.equal(result.status, "success");
  assert.equal(result.recommendations.length, 2);
  assert.equal(
    new Set(
      result.recommendations.map((item) =>
        item.product.productTitle.split(" - ")[0],
      ),
    ).size,
    2,
  );
});

test("caps requested products without filling beyond relevant inventory", async () => {
  const inventory = Array.from({ length: 15 }, (_, index) =>
    product({
      externalProductId: `reel-${index}`,
      title: `Piscifun Carbon Fishing Reel Model ${index}`,
      affiliateUrl: `https://www.awin1.com/cread.php?awinmid=89509&product=reel-${index}`,
    }),
  );
  const result = await evaluateCatalogFirstRecommendations(
    context({ requestedCount: 99 }),
    {
      advertiserRegistry: [piscifun],
      loadProducts: async () => inventory,
    },
  );

  assert.equal(result.requestedCount, 12);
  assert.equal(result.recommendations.length, 12);
});

test("the rollout flag defaults off and freshness is advisory", async () => {
  assert.equal(isCatalogFirstRecommendationsEnabled({}), false);
  assert.equal(
    isCatalogFirstRecommendationsEnabled({
      GIFTPERCH_CATALOG_FIRST_RECOMMENDATIONS: "true",
    }),
    true,
  );
  assert.equal(getCatalogFreshnessTargetHours({}), 72);
  assert.equal(
    getCatalogFreshnessTargetHours({
      GIFTPERCH_CATALOG_FRESHNESS_HOURS: "48",
    }),
    48,
  );

  const result = await runCatalogFirstRecommendations({
    context: context(),
    supabase: {} as never,
  });
  assert.deepEqual(result, { status: "disabled" });
});

test("candidate retrieval fails closed instead of truncating at its ceiling", async () => {
  const rows = Array.from({ length: 3 }, (_, index) => ({
    provider: "awin",
    advertiser_id: "89509",
    locale: "en_US",
    merchant_name: "Piscifun",
    external_product_id: `reel-${index}`,
    title: `Fishing Reel ${index}`,
    description: "Fishing reel",
    image_url: `https://images.example.test/reel-${index}.jpg`,
    affiliate_url: `https://www.awin1.com/cread.php?product=reel-${index}`,
    price: 50,
    currency: "USD",
    availability: "in_stock",
    active: true,
  }));
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    in() {
      return this;
    },
    gte() {
      return this;
    },
    lte() {
      return this;
    },
    order() {
      return this;
    },
    range(from: number, to: number) {
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    },
  };
  const supabase = {
    from() {
      return query;
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    () =>
      loadAwinProductCandidates(supabase, {
        advertiserIds: ["89509"],
        currency: "USD",
        maximumProducts: 2,
      }),
    /exceeded the 2-product safety limit/,
  );
});
