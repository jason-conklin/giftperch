import assert from "node:assert/strict";
import test from "node:test";
import type { AmazonProduct } from "@/lib/amazonPaapi";
import {
  enrichGiftSuggestionsWithProducts,
  findBestAwinProductMatch,
  getCatalogEligibleAwinAdvertiserIds,
  getAwinProductDiversityKey,
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

const loveIsARose: AwinAdvertiserConfig = {
  key: "love-is-a-rose",
  advertiserId: "96879",
  displayName: "LoveIsARose.com",
  locale: "en_US",
  importEnabled: true,
  recommendationEnabled: true,
  matchingPolicy: "love-is-a-rose",
};

function loveIsARoseProduct(
  title: string,
  id: string,
  overrides: Partial<AwinCatalogProduct> = {},
): AwinCatalogProduct {
  return advertiserProduct("96879", "LoveIsARose.com", {
    externalProductId: id,
    title,
    description: "A preserved rose gift.",
    affiliateUrl: `https://www.awin1.com/cread.php?awinmid=96879&product=${id}`,
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

test("LoveIsARose requires specific romantic or sentimental gift context", () => {
  const registry = [loveIsARose];
  const anniversary = loveIsARoseProduct(
    "20th Anniversary Bouquet",
    "anniversary",
    { price: 149.95 },
  );
  const valentine = loveIsARoseProduct(
    "Valentine's Day Rose and Engraved Heart",
    "valentine",
    { price: 89.95 },
  );
  const wedding = loveIsARoseProduct(
    "Wedding Bells Rose Personalized Anniversary Gift: 11in",
    "wedding",
    { price: 129.95 },
  );
  const personalized = loveIsARoseProduct(
    "24kt Gold Rose Bloom in Personalized Walnut Vase",
    "personalized",
    { price: 139.95 },
  );
  const engraved = loveIsARoseProduct(
    "Engraved Wedding Invitation Keepsake Gift Box",
    "engraved",
    { price: 99.95 },
  );
  const preserved = loveIsARoseProduct(
    "Garnet Preserved Rose in Keepsake Case",
    "preserved",
    { price: 79.95 },
  );
  const christmas = loveIsARoseProduct(
    "Personalized Christmas Rose Gift and Engraved Heart",
    "christmas",
    { price: 99.95 },
  );
  const mothersDay = loveIsARoseProduct(
    "A Mother's Light 11\" Personalized 24k Gold Rose Gift",
    "mothers-day",
    { price: 116.95 },
  );

  const cases = [
    {
      title: "Anniversary rose keepsake",
      occasion: "anniversary",
      recipientRelationship: "spouse",
      product: anniversary,
    },
    {
      title: "Valentine's Day rose gift",
      occasion: "Valentine's Day",
      recipientRelationship: "partner",
      product: valentine,
    },
    {
      title: "Wedding rose keepsake",
      occasion: "wedding",
      recipientRelationship: "friend",
      product: wedding,
    },
    {
      title: "Personalized romantic rose keepsake",
      recipientRelationship: "wife",
      product: personalized,
    },
    {
      title: "Engraved romantic keepsake",
      occasion: "wedding",
      recipientRelationship: "husband",
      product: engraved,
    },
    {
      title: "Preserved rose gift",
      recipientRelationship: "partner",
      product: preserved,
    },
  ];

  for (const item of cases) {
    const match = findBestAwinProductMatch({
      suggestion: { title: item.title, price_max: 150 },
      products: [item.product],
      advertiserRegistry: registry,
      occasion: item.occasion,
      recipientRelationship: item.recipientRelationship,
    });
    assert.equal(match?.productId, item.product.externalProductId);
  }

  for (const title of [
    "Birthday gift idea",
    "Thoughtful gift",
    "Fresh flowers for spring",
    "Personalized gift",
    "Fishing enthusiast gift",
  ]) {
    assert.equal(
      findBestAwinProductMatch({
        suggestion: { title, price_max: 150 },
        products: [anniversary],
        advertiserRegistry: registry,
      }),
      null,
    );
  }
  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Anniversary rose keepsake", price_max: 150 },
      products: [anniversary],
      advertiserRegistry: registry,
      occasion: "work anniversary",
      recipientRelationship: "spouse",
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Personalized romantic rose keepsake", price_max: 150 },
      products: [christmas],
      advertiserRegistry: registry,
      recipientRelationship: "wife",
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Personalized romantic rose keepsake", price_max: 150 },
      products: [mothersDay],
      advertiserRegistry: registry,
      recipientRelationship: "wife",
    }),
    null,
  );
});

test("LoveIsARose keeps planned product requirements separate from broad recipient preferences", () => {
  const registry = [loveIsARose];
  const goldAnniversaryRose = loveIsARoseProduct(
    "20th Anniversary 24k Gold Dipped Rose",
    "gold-anniversary",
    { price: 199.95 },
  );
  const preservedRose = loveIsARoseProduct(
    "Preserved Rose in Keepsake Case",
    "preserved-rose",
    { price: 199.95 },
  );
  const personalizedRose = loveIsARoseProduct(
    "Personalized Gold Rose in Walnut Vase",
    "personalized-rose",
    { price: 199.95 },
  );
  const broadPreferences =
    "Loves preserved roses, gold-dipped roses, gold-trimmed roses, and personalized anniversary rose gifts.";

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Anniversary rose keepsake",
        short_description: "A romantic anniversary rose gift.",
        why_it_fits: broadPreferences,
        price_max: 250,
      },
      products: [goldAnniversaryRose],
      advertiserRegistry: registry,
      occasion: "anniversary",
      recipientRelationship: "spouse",
    })?.productId,
    "gold-anniversary",
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Preserved rose gift", price_max: 250 },
      products: [goldAnniversaryRose],
      advertiserRegistry: registry,
      recipientRelationship: "spouse",
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Gold dipped rose gift", price_max: 250 },
      products: [preservedRose],
      advertiserRegistry: registry,
      recipientRelationship: "spouse",
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Personalized rose gift", price_max: 250 },
      products: [goldAnniversaryRose],
      advertiserRegistry: registry,
      recipientRelationship: "spouse",
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Personalized rose gift", price_max: 250 },
      products: [personalizedRose],
      advertiserRegistry: registry,
      recipientRelationship: "spouse",
    })?.productId,
    "personalized-rose",
  );
});

test("LoveIsARose honors budgets and only collapses the audited color variants", () => {
  const registry = [loveIsARose];
  const red = loveIsARoseProduct(
    '24k Gold Trimmed Rose: 11" Red Rose',
    "gold-red",
    { price: 49.95 },
  );
  const blue = loveIsARoseProduct(
    '24k Gold Trimmed Rose: 11" Blue Rose',
    "gold-blue",
    { price: 49.95 },
  );
  const silver = loveIsARoseProduct(
    "Silver Dipped Rose: 11in",
    "silver",
    { price: 79.95 },
  );
  const premiumGold = loveIsARoseProduct(
    '24k Gold Trimmed Rose: 11" Walnut Base',
    "premium-gold",
    { price: 149.95 },
  );
  const premiumPlatinum = loveIsARoseProduct(
    "Platinum Dipped Rose: 11in Illuminated Case",
    "premium-platinum",
    { price: 249.95 },
  );

  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Gold trimmed rose", price_max: 25 },
      products: [red],
      advertiserRegistry: registry,
    }),
    null,
  );
  assert.notEqual(
    findBestAwinProductMatch({
      suggestion: { title: "Gold trimmed rose", price_max: 50 },
      products: [red],
      advertiserRegistry: registry,
    }),
    null,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: { title: "Gold trimmed rose", price_max: 100 },
      products: [silver],
      advertiserRegistry: registry,
    }),
    null,
  );
  assert.notEqual(
    findBestAwinProductMatch({
      suggestion: { title: "Gold trimmed rose", price_max: 150 },
      products: [premiumGold],
      advertiserRegistry: registry,
    }),
    null,
  );
  assert.notEqual(
    findBestAwinProductMatch({
      suggestion: { title: "Platinum dipped rose", price_max: 250 },
      products: [premiumPlatinum],
      advertiserRegistry: registry,
    }),
    null,
  );
  assert.equal(getAwinProductDiversityKey(red, loveIsARose), getAwinProductDiversityKey(blue, loveIsARose));
  assert.notEqual(getAwinProductDiversityKey(red, loveIsARose), getAwinProductDiversityKey(silver, loveIsARose));
});

test("PerchPal loads and matches LoveIsARose with the same romantic context", async () => {
  let requestedAdvertiserIds: readonly string[] | undefined;
  const rose = loveIsARoseProduct("20th Anniversary Bouquet", "perchpal", {
    price: 149.95,
  });
  const [result] = await enrichGiftSuggestionsWithProducts({
    suggestions: [{ title: "Anniversary rose keepsake", price_max: 150 }],
    occasion: "anniversary",
    recipientRelationship: "spouse",
    advertiserRegistry: [loveIsARose],
    loadAwinProducts: async ({ advertiserIds }) => {
      requestedAdvertiserIds = advertiserIds;
      return [rose];
    },
    searchAmazon: async () => null,
  });

  assert.deepEqual(requestedAdvertiserIds, ["96879"]);
  assert.equal(result.productMatch?.advertiserId, "96879");
  assert.equal(result.amazonProduct, null);
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

test("Giftlab rejects the three confirmed production product-type mismatches", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const cases = [
    {
      suggestion: {
        title: "Custom Mug Warmer",
        short_description:
          "A sleek mug warmer that keeps her coffee at the perfect temperature.",
        tier: "thoughtful",
        price_min: 25,
        price_max: 50,
      },
      bad: {
        externalProductId: "41887622756",
        title:
          "Anniversary Gifts Custom Magic Mug Heat Color Changing Coffee Mug",
        description: "Category: Kitchen.",
        price: 25.95,
      },
      good: {
        title: "Personalized Electric Mug Warmer USB Heating Plate",
        description: "Category: Kitchen Appliances.",
        price: 34.95,
      },
    },
    {
      suggestion: {
        title: "Custom Star Map Print",
        short_description:
          "A framed print showing the stars' alignment on a significant date.",
        tier: "thoughtful",
        price_min: 40,
        price_max: 80,
      },
      bad: {
        externalProductId: "41887622053",
        title: "Car Seat Cover Custom Car Seat Print Cute Pets",
        description: "Category: Accessories.",
        price: 45.95,
      },
      good: {
        title: "Personalized Constellation Star Map Print",
        description: "Category: Wall Art.",
        price: 49.95,
      },
    },
    {
      suggestion: {
        title: "Custom Coordinates Necklace",
        short_description:
          "A delicate necklace featuring the coordinates of a special place.",
        tier: "thoughtful",
        price_min: 30,
        price_max: 60,
      },
      bad: {
        externalProductId: "41887622793",
        title: "Valentine's Day Gift Custom Name Necklace",
        description: "Category: Jewelry.",
        price: 39.95,
      },
      good: {
        title: "Custom Coordinates Necklace Latitude Longitude Engraving",
        description: "Category: Jewelry.",
        price: 44.95,
      },
    },
  ] as const;

  for (const item of cases) {
    const badProduct = advertiserProduct("95201", "Giftlab", item.bad);
    assert.equal(
      findBestAwinProductMatch({
        suggestion: item.suggestion,
        products: [badProduct],
        advertiserRegistry: [giftlab],
        occasion: "Birthday",
        recipientRelationship: "Friend",
      }),
      null,
      item.suggestion.title,
    );
    assert.equal(
      findBestAwinProductMatch({
        suggestion: item.suggestion,
        products: [badProduct, advertiserProduct("95201", "Giftlab", item.good)],
        advertiserRegistry: [giftlab],
        occasion: "Birthday",
        recipientRelationship: "Friend",
      })?.productTitle,
      item.good.title,
      item.suggestion.title,
    );
  }
});

test("Giftlab keeps generic mug and necklace requests backward-compatible", () => {
  const giftlab: AwinAdvertiserConfig = {
    key: "giftlab",
    advertiserId: "95201",
    displayName: "Giftlab",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "giftlab-personalized",
  };
  const genericMug = advertiserProduct("95201", "Giftlab", {
    title: "Custom Magic Heat Color Changing Coffee Mug",
    description: "Category: Kitchen.",
    price: 25.95,
  });
  const nameNecklace = advertiserProduct("95201", "Giftlab", {
    title: "Custom Name Necklace",
    description: "Category: Jewelry.",
    price: 39.95,
  });

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized coffee mug",
        short_description: "A custom mug for their morning coffee.",
        tier: "thoughtful",
      },
      products: [genericMug],
      advertiserRegistry: [giftlab],
    })?.productTitle,
    genericMug.title,
  );
  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized name necklace",
        short_description: "A custom necklace with their name.",
        tier: "thoughtful",
      },
      products: [nameNecklace],
      advertiserRegistry: [giftlab],
    })?.productTitle,
    nameNecklace.title,
  );
});

test("Giftlab enforces name-necklace, pet-portrait, and swimwear specificity", () => {
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
      suggestion: "Personalized name necklace",
      good: "Personalized Custom Nameplate Necklace with Initial",
      bad: "Love Knot Necklace With Personalized Custom Message Card",
    },
    {
      suggestion: "Custom pet portrait",
      good: "Custom Dog Portrait Canvas Wall Art",
      bad: "Custom Pet Photo Beach Towel",
    },
  ];

  for (const [index, item] of cases.entries()) {
    const match = findBestAwinProductMatch({
      suggestion: {
        title: item.suggestion,
        short_description: "A personalized gift selected for this recipient.",
        tier: "thoughtful",
      },
      products: [
        advertiserProduct("95201", "Giftlab", {
          externalProductId: `specificity-bad-${index}`,
          title: item.bad,
          description: "Category: Personalized.",
        }),
        advertiserProduct("95201", "Giftlab", {
          externalProductId: `specificity-good-${index}`,
          title: item.good,
          description: "Category: Personalized.",
        }),
      ],
      advertiserRegistry: registry,
    });
    assert.equal(match?.productTitle, item.good, item.suggestion);
  }

  for (const [index, title] of [
    "Personalized Song Code Necklace With Custom Message Card",
    "Custom Pet Photo Beach Towel",
    "Custom Dog Portrait Socks Painted Art",
    "Puppy Custom Photo 3D Portrait Pillow",
    "Custom Pet Photo Laptop Skin",
    "Custom Dog Photo Mailbox Cover",
  ].entries()) {
    const suggestion = index === 0 ? "Personalized name necklace" : "Custom pet portrait";
    assert.equal(
      findBestAwinProductMatch({
        suggestion: {
          title: suggestion,
          short_description: "A personalized gift selected for this recipient.",
          tier: "thoughtful",
        },
        products: [
          advertiserProduct("95201", "Giftlab", {
            externalProductId: `specificity-rejected-${index}`,
            title,
            description: "Category: Personalized.",
          }),
        ],
        advertiserRegistry: registry,
      }),
      null,
      title,
    );
  }

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized swimsuit",
        short_description: "Custom swimwear for a beach vacation.",
        tier: "thoughtful",
      },
      products: [
        advertiserProduct("95201", "Giftlab", {
          title: "Personalized Photo Beach Towel",
          description: "Category: Bed/Bath.",
        }),
      ],
      advertiserRegistry: registry,
    }),
    null,
  );

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized necklace",
        short_description: "A custom jewelry gift.",
        tier: "thoughtful",
      },
      products: [
        advertiserProduct("95201", "Giftlab", {
          title: "Personalized Song Code Necklace",
          description: "Category: Jewelry.",
        }),
      ],
      advertiserRegistry: registry,
    })?.productTitle,
    "Personalized Song Code Necklace",
  );
});

test("Giftlab requires pet evidence and respects explicit dog or cat context", () => {
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
  const neutralPet = advertiserProduct("95201", "Giftlab", {
    externalProductId: "neutral-pet",
    title: "Personalized Pet Photo Keychain",
    description: "Category: Accessories.",
  });
  const catHat = advertiserProduct("95201", "Giftlab", {
    externalProductId: "cat-hat",
    title: "Custom Cat Photo Hat for Cat Owner",
    description: "Category: Accessories.",
  });
  const dogTag = advertiserProduct("95201", "Giftlab", {
    externalProductId: "dog-tag",
    title: "Personalized Dog Bone Pet ID Tag",
    description: "Category: Pets.",
  });
  const unrelated = advertiserProduct("95201", "Giftlab", {
    externalProductId: "song-necklace",
    title: "Personalized Song Code Necklace",
    description: "Category: Jewelry.",
  });
  const intimateCatApparel = advertiserProduct("95201", "Giftlab", {
    externalProductId: "cat-boxer-shorts",
    title: "Personalized Face Boxer Custom Shorts for Cat Lovers",
    description: "Category: Mens.",
  });

  const dogMatch = findBestAwinProductMatch({
    suggestion: {
      title: "Personalized dog gift",
      short_description: "A custom gift for a dog owner.",
      tier: "thoughtful",
    },
    products: [catHat, unrelated, neutralPet, dogTag],
    advertiserRegistry: registry,
  });
  assert.equal(dogMatch?.productTitle, dogTag.title);

  const catMatch = findBestAwinProductMatch({
    suggestion: {
      title: "Personalized cat gift",
      short_description: "A custom gift for a cat owner.",
      tier: "thoughtful",
    },
    products: [dogTag, unrelated, intimateCatApparel, neutralPet, catHat],
    advertiserRegistry: registry,
  });
  assert.equal(catMatch?.productTitle, catHat.title);

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized pet photo gift",
        short_description: "A neutral custom gift for a pet owner.",
        tier: "thoughtful",
      },
      products: [unrelated, neutralPet],
      advertiserRegistry: registry,
    })?.productTitle,
    neutralPet.title,
  );
});

test("Giftlab rejects incompatible life events and child-directed relationship products", () => {
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
  const neutralMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "neutral-mug",
    title: "Personalized Photo Coffee Mug",
    description: "Category: Kitchen.",
  });
  const neutralMothersDayKeepsake = advertiserProduct("95201", "Giftlab", {
    externalProductId: "neutral-mothers-day-keepsake",
    title: "Personalized Photo Keepsake for Mom",
    description: "Category: Personalized.",
  });
  const schoolBackpack = advertiserProduct("95201", "Giftlab", {
    externalProductId: "school-backpack",
    title: "Personalized Backpack First Day Of School Gift",
    description: "Category: Accessories.",
  });
  const babyMug = advertiserProduct("95201", "Giftlab", {
    externalProductId: "baby-mug",
    title: "Baby Boy Gift Personalized Travel Mug",
    description: "Category: Kitchen.",
  });

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized Mother's Day gift",
        short_description: "A thoughtful personalized gift for Mom.",
        tier: "thoughtful",
      },
      products: [schoolBackpack, neutralMothersDayKeepsake],
      advertiserRegistry: registry,
      occasion: "mothers_day",
      recipientRelationship: "mother",
    })?.productTitle,
    neutralMothersDayKeepsake.title,
  );

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized coffee mug",
        short_description: "A birthday mug for an adult friend.",
        tier: "thoughtful",
      },
      products: [babyMug, neutralMug],
      advertiserRegistry: registry,
      occasion: "birthday",
      recipientRelationship: "friend",
    })?.productTitle,
    neutralMug.title,
  );

  assert.equal(
    findBestAwinProductMatch({
      suggestion: {
        title: "Personalized coffee mug",
        short_description: "A custom mug for a son.",
        tier: "thoughtful",
      },
      products: [babyMug],
      advertiserRegistry: registry,
      recipientRelationship: "son",
    })?.productTitle,
    babyMug.title,
  );
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
      occasion: "mothers_day",
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

  assert.deepEqual([...requestedAdvertiserIds!].sort(), [
    "89509",
    "90759",
    "95201",
  ]);
  assert.equal(enriched[0].productMatch?.advertiserId, "89509");
  assert.equal(enriched[1].productMatch?.advertiserId, "90759");
});
