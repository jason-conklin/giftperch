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

test("Giftlab requires personalized context and excludes sensitive or incompatible products", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const necklace = advertiserProduct("95201", "Giftlab", {
    title: "Custom Name Anniversary Necklace",
    description: "Category: Jewelry. A personalized anniversary necklace.",
    price: 29.95,
  });
  const memorial = advertiserProduct("95201", "Giftlab", {
    externalProductId: "giftlab-memorial",
    title: "Custom Photo Pet Memorial Candle",
    description: "Category: Sympathy.",
    price: 24.95,
  });
  const sympathy = advertiserProduct("95201", "Giftlab", {
    externalProductId: "giftlab-sympathy",
    title: "Custom Pet Sympathy Gift Candle",
    description: "Category: Sympathy.",
    price: 24.95,
  });
  const deviceCase = advertiserProduct("95201", "Giftlab", {
    externalProductId: "giftlab-case",
    title: "Custom Photo AirPods Case",
    description: "Category: Accessories.",
    price: 15.95,
  });
  const registry = [giftlab];

  const positive = findBestAwinProductMatch({
    suggestion: {
      title: "Personalized anniversary necklace",
      short_description: "A custom keepsake for their anniversary.",
      tier: "thoughtful",
      price_max: 50,
    },
    products: [necklace],
    advertiserRegistry: registry,
  });
  const unrelated = findBestAwinProductMatch({
    suggestion: {
      title: "Cozy throw blanket",
      short_description: "A warm home gift for relaxing evenings.",
      tier: "thoughtful",
    },
    products: [necklace],
    advertiserRegistry: registry,
  });
  const memorialWithoutContext = findBestAwinProductMatch({
    suggestion: {
      title: "Personalized pet photo keepsake",
      short_description: "A custom gift for a dog owner.",
      tier: "thoughtful",
    },
    products: [memorial],
    advertiserRegistry: registry,
  });
  const caseWithoutDevice = findBestAwinProductMatch({
    suggestion: {
      title: "Personalized photo gift",
      short_description: "A custom gift for a friend.",
      tier: "thoughtful",
    },
    products: [deviceCase],
    advertiserRegistry: registry,
  });
  const sympathyWithoutContext = findBestAwinProductMatch({
    suggestion: {
      title: "Personalized pet photo keepsake",
      short_description: "A custom gift for a dog owner.",
      tier: "thoughtful",
    },
    products: [sympathy],
    advertiserRegistry: registry,
  });

  assert.equal(positive?.advertiserId, "95201");
  assert.equal(unrelated, null);
  assert.equal(memorialWithoutContext, null);
  assert.equal(sympathyWithoutContext, null);
  assert.equal(caseWithoutDevice, null);
});

test("Giftlab near-identical color variants are not repeated within one suggestion set", async () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const blue = advertiserProduct("95201", "Giftlab", {
    externalProductId: "blue-necklace",
    title: "Custom Photo Necklace Blue",
    description: "Category: Jewelry.",
    price: 29.95,
  });
  const red = advertiserProduct("95201", "Giftlab", {
    externalProductId: "red-necklace",
    title: "Custom Photo Necklace Red",
    description: "Category: Jewelry.",
    price: 29.95,
  });
  const results = await enrichGiftSuggestionsWithProducts({
    suggestions: [
      {
        title: "Personalized photo necklace",
        short_description: "A custom jewelry gift.",
        tier: "thoughtful",
      },
      {
        title: "Personalized photo necklace",
        short_description: "A custom jewelry gift.",
        tier: "thoughtful",
      },
    ],
    advertiserRegistry: [giftlab],
    loadAwinProducts: async () => [blue, red],
    searchAmazon: async () => null,
  });
  assert.equal(results[0]?.productMatch?.productId, "blue-necklace");
  assert.equal(results[1]?.productMatch, null);
});

test("Giftlab enforces concrete product types instead of broad shared words", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const registry = [giftlab];
  const cases = [
    {
      title: "Personalized dog Christmas ornament",
      good: "Custom Dog Photo Christmas Ornament",
      bad: "Custom Dog Photo Blanket",
    },
    {
      title: "Personalized fishing tackle box",
      good: "Custom Fishing Tackle Box",
      bad: "Custom Fishing Mailbox Cover",
    },
    {
      title: "Personalized DIY tool organizer",
      good: "Custom Tool Storage Organizer",
      bad: "Personalized Car Backseat Organizer",
    },
    {
      title: "Personalized coffee mug",
      good: "Custom Photo Coffee Mug",
      bad: "Personalized Coffee Lover Shirt",
    },
    {
      title: "Personalized reading bookmark",
      good: "Custom Photo Bookmark",
      bad: "Personalized Reading Pillow",
    },
  ];

  for (const [index, item] of cases.entries()) {
    const match = findBestAwinProductMatch({
      suggestion: {
        title: item.title,
        short_description: "A custom gift selected for their interests.",
        tier: "thoughtful",
        price_max: 100,
      },
      products: [
        advertiserProduct("95201", "Giftlab", {
          externalProductId: `bad-${index}`,
          title: item.bad,
          description: "Category: Personalized.",
          price: 29,
        }),
        advertiserProduct("95201", "Giftlab", {
          externalProductId: `good-${index}`,
          title: item.good,
          description: "Category: Personalized.",
          price: 39,
        }),
      ],
      advertiserRegistry: registry,
    });
    assert.equal(match?.productTitle, item.good, item.title);
  }
});

test("Giftlab abstains when no product has the requested concrete type", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Personalized fishing tackle box",
      short_description: "A custom tackle organizer for an angler.",
      tier: "thoughtful",
    },
    products: [
      advertiserProduct("95201", "Giftlab", {
        title: "Custom Fishing Mailbox Cover",
        description: "Category: Accessories.",
      }),
    ],
    advertiserRegistry: [giftlab],
  });
  assert.equal(match, null);
});

test("Giftlab applies category safety and memorial typo checks", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const registry = [giftlab];
  const suggestion = {
    title: "Personalized pet photo keepsake",
    short_description: "A custom gift for a dog owner.",
    tier: "thoughtful",
  };
  const unsafeProducts = [
    advertiserProduct("95201", "Giftlab", {
      title: "Custom Pet Photo Pajamas",
      description: "Category: Costumes.",
    }),
    advertiserProduct("95201", "Giftlab", {
      title: "Custom Photo Beach Cover Up",
      description: "Category: Swimming.",
    }),
    advertiserProduct("95201", "Giftlab", {
      title: "Custom Photo Lounge Set",
      description: "Category: Lingerie.",
    }),
    advertiserProduct("95201", "Giftlab", {
      title: "Custom Pet Memoral Keepsake",
      description: "Category: Personalized.",
    }),
  ];

  for (const unsafe of unsafeProducts) {
    assert.equal(
      findBestAwinProductMatch({
        suggestion,
        products: [unsafe],
        advertiserRegistry: registry,
      }),
      null,
      unsafe.title,
    );
  }

  const memorial = unsafeProducts.at(-1)!;
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        ...suggestion,
        title: "Personalized pet memorial keepsake",
        short_description: "A remembrance gift after the loss of a dog.",
      },
      products: [memorial],
      advertiserRegistry: registry,
    })?.productTitle,
    memorial.title,
  );
});

test("Giftlab rejects explicit occasion and relationship conflicts", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const registry = [giftlab];
  const birthdayMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "birthday-mug",
    title: "Custom Photo Birthday Coffee Mug",
    description: "Category: Kitchen.",
    price: 25,
  });
  const christmasMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "christmas-mug",
    title: "Custom Photo Christmas Coffee Mug",
    description: "Category: Kitchen.",
    price: 20,
  });
  const genericMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "generic-mug",
    title: "Custom Photo Coffee Mug",
    description: "Category: Kitchen.",
    price: 22,
  });
  const wifeNecklace = advertiserProduct("95201", "Giftlab", {
    externalProductId: "wife-necklace",
    title: "Personalized Anniversary Necklace for Wife",
    description: "Category: Jewelry.",
    price: 45,
  });
  const daughterNecklace = advertiserProduct("95201", "Giftlab", {
    externalProductId: "daughter-necklace",
    title: "Personalized Anniversary Necklace for Daughter",
    description: "Category: Jewelry.",
    price: 35,
  });
  const sisterNecklace = advertiserProduct("95201", "Giftlab", {
    externalProductId: "sister-necklace",
    title: "Personalized Anniversary Necklace for Sister",
    description: "Category: Jewelry.",
    price: 40,
  });
  const mothersDayMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "mothers-day-mug",
    title: "Personalized Mother's Day Coffee Mug for Mom",
    description: "Category: Kitchen.",
    price: 25,
  });
  const fathersDayMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "fathers-day-mug",
    title: "Personalized Father's Day Coffee Mug for Dad",
    description: "Category: Kitchen.",
    price: 25,
  });
  const motherMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "mother-mug",
    title: "Custom Photo Coffee Mug for Mom",
    description: "Category: Kitchen.",
    price: 24,
  });
  const fatherMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "father-mug",
    title: "Custom Photo Coffee Mug for Dad",
    description: "Category: Kitchen.",
    price: 24,
  });

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized coffee mug",
        short_description: "A custom mug for a parent.",
        tier: "thoughtful",
      },
      products: [fatherMug, motherMug],
      advertiserRegistry: registry,
      recipientRelationship: "Mom",
    })?.productTitle,
    motherMug.title,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized coffee mug",
        short_description: "A custom mug for a coffee lover.",
        tier: "thoughtful",
      },
      products: [christmasMug, birthdayMug, genericMug],
      advertiserRegistry: registry,
      occasion: "Birthday",
    })?.productTitle,
    birthdayMug.title,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized anniversary necklace",
        short_description: "A custom jewelry gift.",
        tier: "thoughtful",
      },
      products: [daughterNecklace, sisterNecklace, wifeNecklace],
      advertiserRegistry: registry,
      occasion: "Anniversary",
      recipientRelationship: "Wife",
    })?.productTitle,
    wifeNecklace.title,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized coffee mug",
        short_description: "A generic custom mug.",
        tier: "thoughtful",
      },
      products: [genericMug],
      advertiserRegistry: registry,
      occasion: "Birthday",
      recipientRelationship: "Friend",
    })?.productTitle,
    genericMug.title,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized coffee mug",
        short_description: "A holiday mug for a parent.",
        tier: "thoughtful",
      },
      products: [fathersDayMug, mothersDayMug],
      advertiserRegistry: registry,
      occasion: "Mother's Day",
      recipientRelationship: "Mother",
    })?.productTitle,
    mothersDayMug.title,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized Christmas coffee mug for sister",
        short_description: "A Christmas mug for a sister.",
        tier: "thoughtful",
      },
      products: [christmasMug, birthdayMug],
      advertiserRegistry: registry,
      occasion: "Birthday",
      recipientRelationship: "Mother",
    })?.productTitle,
    birthdayMug.title,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized coffee mug",
        short_description: "A custom mug for a coffee lover.",
        tier: "thoughtful",
      },
      products: [christmasMug],
      advertiserRegistry: registry,
    })?.productTitle,
    christmasMug.title,
  );
});

test("Giftlab blocks gift-card substitutions and enforces AirPods compatibility", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const registry = [giftlab];
  const messageCard = advertiserProduct("95201", "Giftlab", {
    title: "Personalized Necklace with Message Card",
    description: "Category: Jewelry.",
  });
  const phoneCase = advertiserProduct("95201", "Giftlab", {
    externalProductId: "phone-case",
    title: "Custom Photo Phone Case",
    description: "Category: Accessories.",
  });
  const airpodsCase = advertiserProduct("95201", "Giftlab", {
    externalProductId: "airpods-case",
    title: "Custom Photo AirPods Case",
    description: "Category: Accessories.",
  });
  const pillowCase = advertiserProduct("95201", "Giftlab", {
    externalProductId: "pillow-case",
    title: "Custom Photo Pillow Case",
    description: "Category: Bed/Bath.",
  });

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Custom photo case",
        short_description: "A personalized case with their photo.",
        tier: "thoughtful",
      },
      products: [pillowCase, phoneCase, airpodsCase],
      advertiserRegistry: registry,
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized gift card",
        short_description: "A flexible gift card for a friend.",
        tier: "thoughtful",
      },
      products: [messageCard],
      advertiserRegistry: registry,
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized AirPods case",
        short_description: "A custom case for their AirPods.",
        tier: "thoughtful",
      },
      products: [phoneCase, airpodsCase],
      advertiserRegistry: registry,
    })?.productTitle,
    airpodsCase.title,
  );
});

test("Giftlab keeps open-ended personalized gift matching available", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Thoughtful personalized gift",
      short_description: "A meaningful custom keepsake for a dog owner.",
      tier: "thoughtful",
      price_max: 50,
    },
    recipientInterests: [{ label: "Dogs", category: "Pets" }],
    products: [
      advertiserProduct("95201", "Giftlab", {
        title: "Custom Dog Photo Keepsake",
        description: "Category: Personalized.",
        price: 29,
      }),
    ],
    advertiserRegistry: [giftlab],
  });
  assert.equal(match?.productTitle, "Custom Dog Photo Keepsake");
});

test("Giftlab collapses AirPods color and presentation variants", async () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const variants = ["Blue", "Transparent", "Avatar"].map((variant) =>
    advertiserProduct("95201", "Giftlab", {
      externalProductId: `airpods-${variant.toLowerCase()}`,
      title: `Custom Photo AirPods Case ${variant}`,
      description: "Category: Accessories.",
      price: 19.95,
    }),
  );
  const results = await enrichGiftSuggestionsWithProducts({
    suggestions: [
      {
        title: "Personalized AirPods case",
        short_description: "A custom case for their AirPods.",
        tier: "thoughtful",
      },
      {
        title: "Personalized AirPods case",
        short_description: "A custom case for their AirPods.",
        tier: "thoughtful",
      },
    ],
    advertiserRegistry: [giftlab],
    loadAwinProducts: async () => variants,
    searchAmazon: async () => null,
  });
  assert.equal(results[0]?.productMatch?.advertiserId, "95201");
  assert.equal(results[1]?.productMatch, null);
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

test("structured context reaches enrichment and preserves Amazon fallback", async () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const christmasMug = advertiserProduct("95201", "Giftlab", {
    title: "Personalized Christmas Coffee Mug for Sister",
    description: "Category: Kitchen.",
    price: 19.95,
  });
  const amazon: AmazonProduct = {
    asin: "BIRTHDAYMUG",
    title: "Personalized Birthday Coffee Mug",
    imageUrl: "https://images.example.test/birthday-mug.jpg",
    detailPageUrl:
      "https://www.amazon.com/dp/BIRTHDAYMUG?tag=giftperch-20",
    priceDisplay: "$24.99",
    currency: "USD",
  };
  const [result] = await enrichGiftSuggestionsWithProducts({
    suggestions: [
      {
        title: "Personalized coffee mug",
        short_description: "A custom mug for a coffee lover.",
        tier: "thoughtful",
      },
    ],
    occasion: "Birthday",
    recipientRelationship: "Friend",
    advertiserRegistry: [giftlab],
    loadAwinProducts: async () => [christmasMug],
    searchAmazon: async () => amazon,
  });

  assert.equal(result.productMatch?.provider, "amazon");
  assert.equal(result.amazonProduct, amazon);
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
