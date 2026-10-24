import assert from "node:assert/strict";
import test from "node:test";
import type { AmazonProduct } from "@/lib/amazonPaapi";
import {
  enrichGiftSuggestionsWithProducts,
  findBestAwinProductMatch,
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

test("Mosaic only matches specific comfort and bedding intents", () => {
  const blanket = advertiserProduct("87403", "Mosaic Weighted Blankets", {
    title: "Mosaic Weighted Blanket for Cozy Evenings",
    description: "A weighted blanket for comfortable relaxation at home.",
    price: 89.99,
  });

  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Weighted blanket for cozy relaxation",
      short_description: "A comfort gift for restful evenings at home.",
      tier: "thoughtful",
      price_max: 100,
    },
    products: [blanket],
  });
  const unrelated = findBestAwinProductMatch({
    suggestion: {
      title: "Modern home decor vase",
      short_description: "A decorative accent for their living room.",
      tier: "thoughtful",
    },
    products: [blanket],
  });

  assert.equal(match?.advertiserId, "87403");
  assert.equal(unrelated, null);
});

test("Imarku matches kitchen gifts but excludes restricted and gift-card listings", () => {
  const kitchenKnife = advertiserProduct("78080", "Imarku", {
    title: "Imarku Japanese Chef Knife for Cooking",
    description: "A kitchen knife for home chefs and meal preparation.",
    price: 59.99,
  });
  const restrictedKnife = { ...kitchenKnife, title: "Imarku Tactical Hunting Knife" };
  const giftCard = { ...kitchenKnife, title: "Imarku Gift Card - $50" };
  const suggestion = {
    title: "Chef knife for a cooking enthusiast",
    short_description: "A useful kitchen tool for meal preparation.",
    tier: "thoughtful",
    price_max: 80,
  };

  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [kitchenKnife] })?.advertiserId,
    "78080",
  );
  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [restrictedKnife, giftCard] }),
    null,
  );
});

test("Baby Shusher excludes medical products while retaining relevant baby gifts", () => {
  const soundMachine = advertiserProduct("118079", "Baby Shusher", {
    title: "Baby Shusher Sound Machine for Nursery Sleep Routines",
    description: "A soothing sound machine for new parents and their nursery.",
    price: 34.99,
  });
  const saline = {
    ...soundMachine,
    title: "Baby Saline Nasal Ampoules",
  };
  const suggestion = {
    title: "Baby shower sound machine for new parents",
    short_description: "A nursery gift for a newborn sleep routine.",
    tier: "thoughtful",
  };

  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [soundMachine] })?.advertiserId,
    "118079",
  );
  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [saline] }),
    null,
  );
});

test("Mojo Fun requires toy or collectible context rather than animal alone", () => {
  const dinosaur = advertiserProduct("122958", "Mojo Fun", {
    title: "Mojo Fun Dinosaur Figurine",
    description: "A detailed dinosaur toy figure for imaginative play.",
    price: 14.99,
  });
  const match = findBestAwinProductMatch({
    suggestion: {
      title: "Dinosaur figurine for a young collector",
      short_description: "A toy animal figure for imaginative play.",
      tier: "safe",
    },
    products: [dinosaur],
  });
  const unrelated = findBestAwinProductMatch({
    suggestion: {
      title: "Personalized pet portrait of their dog",
      short_description: "Custom artwork celebrating a beloved animal.",
      tier: "thoughtful",
    },
    products: [dinosaur],
  });

  assert.equal(match?.advertiserId, "122958");
  assert.equal(unrelated, null);
});

test("administrative products are excluded for every advertiser policy", () => {
  const productAdjustment = advertiserProduct("87403", "Mosaic Weighted Blankets", {
    title: "Make Up the Price Difference",
    description: "A payment adjustment.",
    price: 5,
  });

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Weighted blanket for comfort",
        short_description: "A cozy bedding gift.",
        tier: "safe",
      },
      products: [productAdjustment],
    }),
    null,
  );
});

test("LOOMY matches specific decor gifts and excludes zero-price swatches", () => {
  const pillow = advertiserProduct("90515", "LOOMY Home", {
    title: "Aurora Silk Ikat Lumbar Pillow",
    description: "A decorative lumbar pillow for a colorful living room.",
    price: 119,
  });
  const swatch = {
    ...pillow,
    title: "Aurora Silk Ikat Pillow Swatch",
    price: 0,
  };
  const suggestion = {
    title: "Decorative lumbar pillow for a living room",
    short_description: "A housewarming decor gift with a colorful accent.",
    tier: "thoughtful",
    price_max: 150,
  };

  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [pillow] })?.advertiserId,
    "90515",
  );
  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [swatch] }),
    null,
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

test("Fan Ink requires a team-specific title match", () => {
  const manchesterCityHat = advertiserProduct("103359", "Fan Ink", {
    title: "Manchester City Classic Snapback Hat",
    description: "A Manchester City fan hat for match days.",
    price: 32,
  });
  const specificMatch = findBestAwinProductMatch({
    suggestion: {
      title: "Manchester City soccer fan snapback hat",
      short_description: "Team merchandise for a devoted Manchester City supporter.",
      tier: "thoughtful",
    },
    products: [manchesterCityHat],
  });
  const genericSports = findBestAwinProductMatch({
    suggestion: {
      title: "Sports fan hat",
      short_description: "A cap for someone who enjoys soccer.",
      tier: "thoughtful",
    },
    products: [manchesterCityHat],
  });
  const otherTeam = findBestAwinProductMatch({
    suggestion: {
      title: "Inter Miami soccer fan snapback hat",
      short_description: "Team merchandise for an Inter Miami supporter.",
      tier: "thoughtful",
    },
    products: [manchesterCityHat],
  });
  const interestSupported = findBestAwinProductMatch({
    suggestion: {
      title: "Soccer fan hat",
      short_description: "A team hat for match days.",
      tier: "thoughtful",
    },
    recipientInterests: [{ label: "Manchester City", category: "Soccer" }],
    products: [manchesterCityHat],
  });

  assert.equal(specificMatch?.advertiserId, "103359");
  assert.equal(genericSports, null);
  assert.equal(otherTeam, null);
  assert.equal(interestSupported?.advertiserId, "103359");
});

test("Beyond Memories requires a keepsake context and gates memorial products", () => {
  const photoCrystal = advertiserProduct("87175", "Beyond Memories", {
    title: "3D Memory Crystal Photo Keepsake",
    description: "A personalized family photo crystal for anniversaries.",
    price: 89.99,
  });
  const memorialCrystal = {
    ...photoCrystal,
    title: "Memorial Photo Crystal Keepsake",
  };
  const anniversarySuggestion = {
    title: "Personalized family photo keepsake for an anniversary",
    short_description: "A custom commemorative gift with a favorite photo.",
    tier: "thoughtful",
  };
  const memorialSuggestion = {
    title: "Memorial photo keepsake in remembrance",
    short_description: "A custom commemorative gift to honor a loved one.",
    tier: "thoughtful",
  };

  assert.equal(
    findBestAwinProductMatch({
      suggestion: anniversarySuggestion,
      products: [photoCrystal],
    })?.advertiserId,
    "87175",
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: anniversarySuggestion,
      products: [memorialCrystal],
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: memorialSuggestion,
      products: [memorialCrystal],
    })?.advertiserId,
    "87175",
  );
});

test("Magicshine matches cycling equipment but rejects generic lighting", () => {
  const bikeLight = advertiserProduct("107838", "Magicshine", {
    title: "Magicshine SEEMEE 200 Bike Taillight",
    description: "A compact cycling taillight for road and mountain bikes.",
    price: 39.99,
  });

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Bike taillight for a road cyclist",
        short_description: "A visibility upgrade for evening cycling rides.",
        tier: "thoughtful",
      },
      products: [bikeLight],
    })?.advertiserId,
    "107838",
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Desk lamp for a home office",
        short_description: "A useful light for reading at home.",
        tier: "thoughtful",
      },
      products: [bikeLight],
    }),
    null,
  );
});

test("Hula Daddy matches coffee gifts and retains availability and budget guards", () => {
  const coffee = advertiserProduct("122368", "Hula Daddy Kona Coffee", {
    title: "Hula Daddy Kona Coffee Cold Brew Whole Bean",
    description: "Kona coffee beans for cold brew and coffee enthusiasts.",
    price: 29.95,
  });
  const suggestion = {
    title: "Kona coffee gift for an espresso enthusiast",
    short_description: "Specialty coffee beans for a favorite morning brew.",
    tier: "thoughtful",
    price_max: 35,
  };

  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [coffee] })?.advertiserId,
    "122368",
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion,
      products: [{ ...coffee, availability: "out_of_stock" }],
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Chef knife for meal prep",
        short_description: "A practical kitchen gift.",
        tier: "thoughtful",
      },
      products: [coffee],
    }),
    null,
  );
});

test("Coziwow matches specific pet furniture while excluding unsuitable pet equipment", () => {
  const catTree = advertiserProduct("121696", "Coziwow", {
    title: "Coziwow Multi-Level Cat Tree with Condo",
    description: "A cat tree and condo for a kitten's indoor play space.",
    price: 109.99,
  });
  const petTreadmill = {
    ...catTree,
    externalProductId: "cat-treadmill",
    title: "Coziwow Cat Running Treadmill",
  };
  const suggestion = {
    title: "Cat tree condo for a kitten",
    short_description: "Pet furniture for an indoor cat's play space.",
    tier: "thoughtful",
    price_max: 150,
  };

  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [catTree] })?.advertiserId,
    "121696",
  );
  assert.equal(
    findBestAwinProductMatch({ suggestion, products: [petTreadmill] }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Living room storage cabinet",
        short_description: "A furniture gift for a new apartment.",
        tier: "thoughtful",
      },
      products: [catTree],
    }),
    null,
  );
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

  assert.deepEqual(ids, ["107838", "119395"]);
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
      advertiserId: "standard-1",
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
    ["standard-1"],
  );
});

test("candidate preselection preserves matcher results for mixed advertiser intents", () => {
  const products = [
    product(),
    fosiProduct(),
    advertiserProduct("107838", "Magicshine", {
      title: "Magicshine SEEMEE 200 Bike Taillight",
      description: "A compact cycling taillight for road bikes.",
      price: 39.99,
    }),
    advertiserProduct("87403", "Mosaic Weighted Blankets", {
      title: "Mosaic Weighted Blanket",
      description: "A weighted blanket for cozy relaxation.",
      price: 89.99,
    }),
  ];
  const suggestions = [
    fishingSuggestion,
    {
      title: "Desktop DAC headphone amplifier",
      short_description: "An audio upgrade for music listening.",
      tier: "thoughtful",
      price_max: 100,
    },
    {
      title: "Bike taillight for a cyclist",
      short_description: "A visibility upgrade for evening rides.",
      tier: "safe",
      price_max: 60,
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
      title: "Desktop DAC headphone amplifier",
      short_description: "An audio upgrade for music listening.",
      tier: "thoughtful",
      price_max: 100,
    },
  ];

  const enriched = await enrichGiftSuggestionsWithProducts({
    suggestions,
    loadAwinProducts: async ({ advertiserIds }) => {
      requestedAdvertiserIds = advertiserIds;
      return [product(), fosiProduct()];
    },
    searchAmazon: async () => null,
  });

  assert.deepEqual([...requestedAdvertiserIds!].sort(), ["119395", "89509"]);
  assert.equal(enriched[0].productMatch?.advertiserId, "89509");
  assert.equal(enriched[1].productMatch?.advertiserId, "119395");
});
