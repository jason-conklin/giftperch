export const PRODUCT_CLASSIFICATION_VERSION = 1;

export const PRODUCT_PRIMARY_CATEGORIES = [
  "personalized_gifts",
  "home_kitchen",
  "jewelry_accessories",
  "flowers_romantic",
  "pets",
  "sports_outdoors",
  "hobbies_entertainment",
  "tech_gadgets",
  "beauty_wellness",
  "clothing_accessories",
  "kids_baby",
  "other",
] as const;

export type ProductPrimaryCategory =
  (typeof PRODUCT_PRIMARY_CATEGORIES)[number];

export const PRODUCT_FACETS = [
  "personalized",
  "engraved",
  "photo_gift",
  "drinkware",
  "kitchen_tool",
  "home_decor",
  "bedding",
  "necklace",
  "bracelet",
  "ring",
  "earrings",
  "preserved_rose",
  "bouquet",
  "romantic",
  "pet_grooming",
  "fishing",
  "reel",
  "rod",
  "tackle",
  "camping",
  "gardening",
  "reading",
  "music",
  "gaming",
  "tech_accessory",
  "apparel",
  "baby",
  "anniversary",
  "valentines",
  "wedding",
  "mothers_day",
  "memorial",
] as const;

export type ProductFacet = (typeof PRODUCT_FACETS)[number];
export type ClassificationEvidenceSource =
  | "title"
  | "merchant_category"
  | "description";
export type ClassificationConfidence = "high" | "medium" | "low";

export type ProductClassificationEvidence = {
  facet: ProductFacet | ProductPrimaryCategory;
  source: ClassificationEvidenceSource;
  matchedTerms: string[];
  weight: number;
};

export type ProductClassification = {
  primaryCategory: ProductPrimaryCategory;
  facets: ProductFacet[];
  classificationVersion: typeof PRODUCT_CLASSIFICATION_VERSION;
  confidence: ClassificationConfidence;
  evidence: ProductClassificationEvidence[];
};

export type ProductClassificationInput = {
  title: string;
  description?: string | null;
  rawMerchantCategory?: string | null;
  advertiserId?: string | null;
  merchantName?: string | null;
};

type Rule = {
  facet: ProductFacet;
  category: ProductPrimaryCategory;
  pattern: RegExp;
  weight: number;
};

const TITLE_RULES: readonly Rule[] = [
  { facet: "preserved_rose", category: "flowers_romantic", pattern: /\b(?:preserved|enchanted|dipped|trimmed)\s+roses?\b|\broses?\s+in\s+(?:glass|museum|shadow)\s+(?:dome|box|case)\b/i, weight: 8 },
  { facet: "preserved_rose", category: "flowers_romantic", pattern: /\b(?:gold|silver|platinum|24k)\b[^\n]{0,48}\b(?:dipped|trimmed)\b[^\n]{0,48}\brose\b/i, weight: 8 },
  { facet: "bouquet", category: "flowers_romantic", pattern: /\b(?:bouquet|flower arrangement|floral arrangement)\b/i, weight: 7 },
  { facet: "necklace", category: "jewelry_accessories", pattern: /\bnecklace\b/i, weight: 8 },
  { facet: "necklace", category: "jewelry_accessories", pattern: /\b(?:gold|silver|platinum)\b[^\n]{0,24}\bchain\b/i, weight: 7 },
  { facet: "bracelet", category: "jewelry_accessories", pattern: /\bbracelet\b|\bbangle\b/i, weight: 8 },
  { facet: "ring", category: "jewelry_accessories", pattern: /\bring\b/i, weight: 8 },
  { facet: "ring", category: "jewelry_accessories", pattern: /\beternity band\b/i, weight: 7 },
  { facet: "earrings", category: "jewelry_accessories", pattern: /\bearrings?\b|\bhoops?\b/i, weight: 8 },
  { facet: "reel", category: "sports_outdoors", pattern: /\b(?:fishing|spinning|baitcasting|ice)\s+reels?\b/i, weight: 8 },
  { facet: "rod", category: "sports_outdoors", pattern: /\b(?:fishing|casting|spinning|catfish)\s+rods?\b/i, weight: 8 },
  { facet: "fishing", category: "sports_outdoors", pattern: /\bfishing\b/i, weight: 5 },
  { facet: "tackle", category: "sports_outdoors", pattern: /\b(?:tackle|lures?|bait)\b/i, weight: 7 },
  { facet: "fishing", category: "sports_outdoors", pattern: /\bfish lip gripper\b/i, weight: 7 },
  { facet: "pet_grooming", category: "pets", pattern: /\b(?:pet|dog|cat)\s+(?:grooming|brush|comb|deshedding)\b/i, weight: 8 },
  { facet: "drinkware", category: "home_kitchen", pattern: /\b(?:mug|tumbler|travel cup|water bottle)\b/i, weight: 7 },
  { facet: "kitchen_tool", category: "home_kitchen", pattern: /\b(?:kitchen|chef|cookware|cutlery|skillet|knife)\b/i, weight: 7 },
  { facet: "home_decor", category: "home_kitchen", pattern: /\b(?:home decor|wall art|throw pillow|cushion|planter)\b/i, weight: 7 },
  { facet: "bedding", category: "home_kitchen", pattern: /\b(?:blanket|duvet|bedding|weighted blanket)\b/i, weight: 7 },
  { facet: "gardening", category: "hobbies_entertainment", pattern: /\b(?:garden|gardening|planter|planting)\b/i, weight: 7 },
  { facet: "reading", category: "hobbies_entertainment", pattern: /\b(?:book|bookmark|bookend)\b/i, weight: 7 },
  { facet: "music", category: "hobbies_entertainment", pattern: /\b(?:kalimba|guitar|turntable|vinyl|musical instrument)\b/i, weight: 7 },
  { facet: "gaming", category: "hobbies_entertainment", pattern: /\b(?:gaming|gamer|game controller)\b/i, weight: 7 },
  { facet: "tech_accessory", category: "tech_gadgets", pattern: /\b(?:airpods?|earphone case|phone case|charging)\b/i, weight: 7 },
  { facet: "apparel", category: "clothing_accessories", pattern: /\b(?:t-?shirt|hoodie|swimsuit|bikini|slippers?|shoes?)\b/i, weight: 7 },
  { facet: "baby", category: "kids_baby", pattern: /\b(?:baby|infant|newborn|toddler)\b/i, weight: 7 },
  { facet: "personalized", category: "personalized_gifts", pattern: /\b(?:personalized|customi[sz]ed|custom)\b/i, weight: 5 },
  { facet: "engraved", category: "personalized_gifts", pattern: /\b(?:engraved|monogram|initial)\b/i, weight: 6 },
  { facet: "photo_gift", category: "personalized_gifts", pattern: /\b(?:photo|picture)\b/i, weight: 5 },
  { facet: "anniversary", category: "flowers_romantic", pattern: /\banniversary\b/i, weight: 4 },
  { facet: "valentines", category: "flowers_romantic", pattern: /\bvalentine(?:'s)?\b/i, weight: 4 },
  { facet: "wedding", category: "flowers_romantic", pattern: /\bwedding\b/i, weight: 4 },
  { facet: "mothers_day", category: "flowers_romantic", pattern: /\bmother(?:'s)? day\b/i, weight: 4 },
  { facet: "memorial", category: "other", pattern: /\b(?:memorial|remembrance)\b/i, weight: 4 },
];

const DESCRIPTION_RULES: readonly Rule[] = [
  { facet: "preserved_rose", category: "flowers_romantic", pattern: /\b(?:preserved|dipped|trimmed)\s+roses?\b/i, weight: 3 },
  { facet: "reel", category: "sports_outdoors", pattern: /\b(?:spinning|fishing|baitcasting)\s+reels?\b/i, weight: 3 },
  { facet: "rod", category: "sports_outdoors", pattern: /\b(?:spinning|fishing|casting)\s+rods?\b/i, weight: 3 },
  { facet: "pet_grooming", category: "pets", pattern: /\b(?:pet|dog|cat)\s+(?:grooming|brush|comb|deshedding)\b/i, weight: 3 },
  { facet: "engraved", category: "personalized_gifts", pattern: /\b(?:engraved|engraving|monogram)\b/i, weight: 2 },
];

const GIFTLAB_CATEGORY_RULES: Readonly<Record<string, readonly [ProductPrimaryCategory, ProductFacet][]>> = {
  "baby/infant": [["kids_baby", "baby"]],
  "bed/bath": [["home_kitchen", "bedding"]],
  garden: [["hobbies_entertainment", "gardening"]],
  jewelry: [["jewelry_accessories", "personalized"]],
  kitchen: [["home_kitchen", "kitchen_tool"]],
  "music instruments": [["hobbies_entertainment", "music"]],
  "outdoors/camping": [["sports_outdoors", "camping"]],
  pets: [["pets", "pet_grooming"]],
  personalized: [["personalized_gifts", "personalized"]],
  "t-shirts": [["clothing_accessories", "apparel"]],
  athletic: [["sports_outdoors", "apparel"]],
  cycling: [["sports_outdoors", "apparel"]],
  mens: [["clothing_accessories", "apparel"]],
  womens: [["clothing_accessories", "apparel"]],
  footware: [["clothing_accessories", "apparel"]],
  swimming: [["clothing_accessories", "apparel"]],
};

function normalizedText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function extractStoredSourceCategory(
  description: string | null | undefined,
): string | null {
  const match = normalizedText(description).match(/^Category:\s*([^\.\r\n]+)\.(?:\s|$)/i);
  return match?.[1]?.trim() || null;
}

function matchedTerms(value: string, pattern: RegExp): string[] {
  const flags = pattern.flags.replace("g", "") + "g";
  return [...value.matchAll(new RegExp(pattern.source, flags))]
    .map((match) => match[0].toLowerCase())
    .filter((term, index, terms) => terms.indexOf(term) === index);
}

export function classifyAffiliateProduct(
  input: ProductClassificationInput,
): ProductClassification {
  const title = normalizedText(input.title);
  const description = normalizedText(input.description);
  const rawCategory = normalizedText(input.rawMerchantCategory);
  const evidence: ProductClassificationEvidence[] = [];
  const facets = new Set<ProductFacet>();
  const categoryScores = new Map<ProductPrimaryCategory, number>();

  const addEvidence = (
    facet: ProductFacet,
    category: ProductPrimaryCategory,
    source: ClassificationEvidenceSource,
    terms: string[],
    weight: number,
  ) => {
    facets.add(facet);
    evidence.push({ facet, source, matchedTerms: terms, weight });
    categoryScores.set(category, (categoryScores.get(category) ?? 0) + weight);
  };

  for (const rule of TITLE_RULES) {
    const terms = matchedTerms(title, rule.pattern);
    if (terms.length > 0) {
      addEvidence(rule.facet, rule.category, "title", terms, rule.weight);
    }
  }

  for (const rule of DESCRIPTION_RULES) {
    const terms = matchedTerms(description, rule.pattern);
    if (terms.length > 0) {
      addEvidence(rule.facet, rule.category, "description", terms, rule.weight);
    }
  }

  if (input.advertiserId?.trim() === "95201") {
    for (const [category, facet] of GIFTLAB_CATEGORY_RULES[rawCategory.toLowerCase()] ?? []) {
      addEvidence(facet, category, "merchant_category", [rawCategory], 3);
    }
  }

  const primaryCategory = [...categoryScores.entries()]
    .sort(([leftCategory, leftScore], [rightCategory, rightScore]) =>
      rightScore - leftScore || leftCategory.localeCompare(rightCategory),
    )[0]?.[0] ?? "other";
  const strongestEvidence = Math.max(0, ...evidence.map((item) => item.weight));
  const confidence: ClassificationConfidence =
    strongestEvidence >= 7 ? "high" : strongestEvidence >= 4 ? "medium" : "low";

  return {
    primaryCategory,
    facets: [...facets].sort(),
    classificationVersion: PRODUCT_CLASSIFICATION_VERSION,
    confidence,
    evidence,
  };
}
