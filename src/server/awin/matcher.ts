import type { SupabaseClient } from "@supabase/supabase-js";
import type { AmazonProduct } from "@/lib/amazonPaapi";
import {
  getSafeImageUrl,
  isExpectedAwinTrackingUrl,
  type ProductMatch,
} from "@/lib/affiliateProduct";
import {
  AWIN_ADVERTISERS,
  isApprovedAwinAdvertiserId,
  type AwinAdvertiserConfig,
} from "./advertisers";

const CATALOG_PAGE_SIZE = 1_000;
const MINIMUM_MATCH_SCORE = 10;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "gift",
  "gifts",
  "her",
  "him",
  "his",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "set",
  "that",
  "the",
  "their",
  "them",
  "this",
  "to",
  "with",
]);

const GENERIC_MATCH_WORDS = new Set([
  "accessory",
  "best",
  "classic",
  "custom",
  "deluxe",
  "durable",
  "essential",
  "great",
  "kit",
  "new",
  "outdoor",
  "personalized",
  "portable",
  "premium",
  "professional",
  "quality",
  "special",
  "unique",
  "waterproof",
]);

const PHYSICAL_PRODUCT_EXCLUSIONS = new Set([
  "class",
  "classes",
  "donation",
  "experience",
  "lesson",
  "lessons",
  "membership",
  "subscription",
  "tickets",
  "tour",
  "trip",
  "workshop",
]);

const FISHING_INTENT_WORDS = new Set([
  "angler",
  "angling",
  "bait",
  "casting",
  "fish",
  "fisherman",
  "fishing",
  "lure",
  "reel",
  "rod",
  "tackle",
  "wader",
]);

const BROAD_FISHING_CONTEXT_WORDS = new Set([
  "angler",
  "angling",
  "fish",
  "fisherman",
  "fishing",
]);

const AUDIO_INTENT_WORDS = new Set([
  "amp",
  "amplifier",
  "audio",
  "audiophile",
  "dac",
  "headphone",
  "headset",
  "music",
  "phono",
  "preamp",
  "preamplifier",
  "receiver",
  "speaker",
  "stereo",
  "subwoofer",
  "turntable",
  "vinyl",
]);

const MOSAIC_COMFORT_INTENT_WORDS = new Set([
  "bedding",
  "blanket",
  "cozy",
  "comfort",
  "duvet",
  "pillow",
  "relaxation",
  "relaxing",
  "sleep",
  "weighted",
]);

const IMARKU_KITCHEN_INTENT_WORDS = new Set([
  "bake",
  "baking",
  "barbecue",
  "bbq",
  "chef",
  "cook",
  "cooking",
  "cookware",
  "culinary",
  "cutlery",
  "grill",
  "kitchen",
  "knife",
  "meal",
  "pan",
  "skillet",
]);

const BABY_INTENT_WORDS = new Set([
  "baby",
  "infant",
  "newborn",
  "nursery",
  "parent",
  "parents",
  "shower",
  "toddler",
]);

const MOJO_TOY_INTENT_WORDS = new Set([
  "collectible",
  "collection",
  "dinosaur",
  "figure",
  "figurine",
  "play",
  "toy",
]);

const LOOMY_HOME_INTENT_WORDS = new Set([
  "bedroom",
  "cushion",
  "decor",
  "housewarming",
  "interior",
  "living",
  "pillow",
  "rug",
  "throw",
]);

const BONHEUR_JEWELRY_INTENT_WORDS = new Set([
  "anniversary",
  "bracelet",
  "earring",
  "jewelry",
  "necklace",
  "ring",
]);

const FAN_INK_INTENT_WORDS = new Set([
  "baseball",
  "basketball",
  "fan",
  "football",
  "hockey",
  "soccer",
  "snapback",
  "sport",
  "sports",
  "team",
]);

const FAN_INK_GENERIC_CONTEXT_WORDS = new Set([
  "apparel",
  "baseball",
  "basketball",
  "cap",
  "city",
  "club",
  "collectible",
  "fan",
  "fans",
  "football",
  "hat",
  "hockey",
  "jersey",
  "merchandise",
  "soccer",
  "snapback",
  "sport",
  "sports",
  "team",
  "teams",
  "united",
]);

const BEYOND_MEMORIES_INTENT_WORDS = new Set([
  "anniversary",
  "commemorate",
  "custom",
  "family",
  "graduation",
  "keepsake",
  "memorial",
  "personalized",
  "photo",
  "remembrance",
  "wedding",
]);

const MEMORIAL_INTENT_WORDS = new Set(["memorial", "remembrance"]);

const MAGICSHINE_CYCLING_INTENT_WORDS = new Set([
  "bicycle",
  "bike",
  "cycling",
  "cyclist",
  "ebike",
  "headlight",
  "helmet",
  "mountain",
  "mtb",
  "road",
  "taillight",
  "visibility",
]);

const HULA_DADDY_COFFEE_INTENT_WORDS = new Set([
  "brew",
  "coffee",
  "espresso",
  "kona",
  "pour",
  "roast",
]);

const COZIWOW_PET_INTENT_WORDS = new Set([
  "bird",
  "bunny",
  "cat",
  "dog",
  "guinea",
  "hamster",
  "kitten",
  "pet",
  "puppy",
  "rabbit",
]);

const GIFTLAB_PERSONALIZED_INTENT_WORDS = new Set([
  "anniversary",
  "birthday",
  "bracelet",
  "christmas",
  "custom",
  "engraved",
  "family",
  "holiday",
  "jewelry",
  "keepsake",
  "memorial",
  "mug",
  "necklace",
  "personalized",
  "pet",
  "photo",
  "wedding",
]);

const GIFTLAB_DEVICE_WORDS = new Set([
  "airpods",
  "airtag",
  "iphone",
  "ipad",
  "phone",
  "samsung",
]);

const GIFTLAB_PRODUCT_SIGNALS = new Set([
  "bracelet",
  "custom",
  "engraved",
  "jewelry",
  "keepsake",
  "mug",
  "necklace",
  "personalized",
  "photo",
]);

const GIFTLAB_GENERIC_MATCH_WORDS = new Set([
  "anniversary",
  "birthday",
  "christmas",
  "custom",
  "family",
  "gift",
  "gifts",
  "holiday",
  "personalized",
  "photo",
]);

const TOKEN_ALIASES: Record<string, string> = {
  amplifiers: "amplifier",
  anglers: "angler",
  baits: "bait",
  blankets: "blanket",
  bracelets: "bracelet",
  cooking: "cook",
  dinosaurs: "dinosaur",
  earrings: "earring",
  figurines: "figurine",
  fishes: "fish",
  fishermen: "fisherman",
  lures: "lure",
  knives: "knife",
  necklaces: "necklace",
  photos: "photo",
  personalized: "personalized",
  headphones: "headphone",
  headsets: "headset",
  preamplifiers: "preamplifier",
  receivers: "receiver",
  reels: "reel",
  rods: "rod",
  speakers: "speaker",
  bicycles: "bicycle",
  bikes: "bike",
  cats: "cat",
  dogs: "dog",
  rabbits: "rabbit",
  subwoofers: "subwoofer",
  turntables: "turntable",
  waders: "wader",
};

export type AwinCatalogProduct = {
  provider: "awin";
  advertiserId: string;
  locale: string;
  merchantName: string;
  externalProductId: string;
  title: string;
  description: string | null;
  imageUrl: string;
  affiliateUrl: string;
  price: number;
  currency: string;
  availability: string;
  active: boolean;
};

export type MatchableGiftSuggestion = {
  title: string;
  short_description?: string | null;
  why_it_fits?: string | null;
  tier?: string | null;
  price_min?: number | null;
  price_max?: number | null;
};

export type RecipientInterestForMatching = {
  label: string;
  category?: string | null;
};

type CatalogRow = {
  provider: unknown;
  advertiser_id: unknown;
  locale: unknown;
  merchant_name: unknown;
  external_product_id: unknown;
  title: unknown;
  description: unknown;
  image_url: unknown;
  affiliate_url: unknown;
  price: unknown;
  currency: unknown;
  availability: unknown;
  active: unknown;
};

type AmazonSearch = (params: {
  query: string;
  minPriceCents?: number;
  maxPriceCents?: number;
}) => Promise<AmazonProduct | null>;

export type AwinCandidateLoadOptions = {
  /**
   * Restricts the catalog read to advertisers whose policy can match one of
   * the current suggestions. Undefined retains the complete active catalog.
   */
  advertiserIds?: readonly string[];
};

export function getCatalogEligibleAwinAdvertiserIds(
  requestedAdvertiserIds?: readonly string[],
): string[] {
  const eligibleAdvertiserIds = new Set<string>(
    AWIN_ADVERTISERS.filter(
      (advertiser) =>
        advertiser.recommendationEnabled &&
        isApprovedAwinAdvertiserId(advertiser.advertiserId),
    ).map((advertiser) => advertiser.advertiserId),
  );
  const requested = requestedAdvertiserIds ?? [...eligibleAdvertiserIds];
  return [...new Set(requested.filter((id) => eligibleAdvertiserIds.has(id)))];
}

function normalizeCatalogRow(row: CatalogRow): AwinCatalogProduct | null {
  const price = typeof row.price === "number" ? row.price : Number(row.price);
  const imageUrl = getSafeImageUrl(row.image_url);
  if (
    row.provider !== "awin" ||
    typeof row.advertiser_id !== "string" ||
    typeof row.locale !== "string" ||
    typeof row.merchant_name !== "string" ||
    typeof row.external_product_id !== "string" ||
    typeof row.title !== "string" ||
    !imageUrl ||
    !isExpectedAwinTrackingUrl(row.affiliate_url) ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof row.currency !== "string" ||
    row.availability !== "in_stock" ||
    row.active !== true
  ) {
    return null;
  }

  return {
    provider: "awin",
    advertiserId: row.advertiser_id,
    locale: row.locale,
    merchantName: row.merchant_name.trim(),
    externalProductId: row.external_product_id.trim(),
    title: row.title.trim(),
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : null,
    imageUrl,
    affiliateUrl: row.affiliate_url,
    price,
    currency: row.currency.trim().toUpperCase(),
    availability: row.availability,
    active: true,
  };
}

export async function loadAwinProductCandidates(
  supabase: SupabaseClient,
  options: AwinCandidateLoadOptions = {},
): Promise<AwinCatalogProduct[]> {
  const products: AwinCatalogProduct[] = [];
  const advertiserIds = getCatalogEligibleAwinAdvertiserIds(
    options.advertiserIds,
  );

  if (advertiserIds.length === 0) {
    return products;
  }

  for (let offset = 0; ; offset += CATALOG_PAGE_SIZE) {
    let query = supabase
      .from("affiliate_products")
      .select(
        "provider, advertiser_id, locale, merchant_name, external_product_id, title, description, image_url, affiliate_url, price, currency, availability, active",
      )
      .eq("provider", "awin")
      .eq("active", true)
      .eq("availability", "in_stock");

    query = query.in("advertiser_id", advertiserIds);

    const { data, error } = await query
      .order("id", { ascending: true })
      .range(offset, offset + CATALOG_PAGE_SIZE - 1);

    if (error) {
      throw new Error("Unable to read the Awin affiliate product catalog.");
    }

    const rows = (data ?? []) as CatalogRow[];
    for (const row of rows) {
      const product = normalizeCatalogRow(row);
      if (product) products.push(product);
    }

    if (rows.length < CATALOG_PAGE_SIZE) break;
  }

  return products;
}

function tokens(value: string | null | undefined): Set<string> {
  const normalized = (value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalized) return new Set();

  return new Set(
    normalized
      .split(/\s+/)
      .map((token) => TOKEN_ALIASES[token] ?? token)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

function union(...sets: Set<string>[]): Set<string> {
  return new Set(sets.flatMap((set) => [...set]));
}

function intersection(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((token) => right.has(token)));
}

function hasAny(source: Set<string>, candidates: Set<string>): boolean {
  return [...source].some((token) => candidates.has(token));
}

function isAdministrativeOrGiftCardProduct(title: string): boolean {
  const normalized = title.normalize("NFKD").toLowerCase();
  return (
    /\b(?:make up|makeup) the price difference\b/.test(normalized) ||
    /\bpayment adjustment\b/.test(normalized) ||
    /\bgift cards?\b/.test(normalized)
  );
}

function isRestrictedImarkuProduct(title: string): boolean {
  return /\b(?:combat|dagger|hunting|tactical|weapon)\b/i.test(title);
}

function isMedicalBabyProduct(title: string): boolean {
  return /\b(?:first aid|health|medical|nasal|nebul|piercing|respiratory|saline|wound)\b/i.test(
    title,
  );
}

function isLoomySwatch(title: string): boolean {
  return /\bswatch\b/i.test(title);
}

function isMemorialProduct(value: string): boolean {
  return /\b(?:memorial|memoral|remembrance|in loving memory|sympathy|pet loss|gravestone|funeral|condolence)\b/i.test(
    value,
  );
}

function isUnsuitableCoziwowProduct(title: string): boolean {
  return /\b(?:air purifier|dryer box|food maker|heated|heating pad|medical|nebulization|treadmill)\b/i.test(
    title,
  );
}

function giftlabCategory(product: AwinCatalogProduct): string {
  return product.description?.match(/^Category:\s*([^.]*)\./i)?.[1]?.trim() ?? "";
}

function isUnsuitableGiftlabProduct(product: AwinCatalogProduct): boolean {
  return /\b(?:lingerie|pant(?:y|ies)|underwear|boxer shorts?|briefs?|bikini|swim(?:suit|wear|ming)|costumes?|gift cards?|payment adjustment|price difference)\b/i.test(
    `${product.title} ${giftlabCategory(product)}`,
  );
}

function isGiftlabDeviceSpecificProduct(title: string): boolean {
  return /\b(?:airpods?|airtag|iphone|ipad|phone case|earphone case|samsung)\b/i.test(
    title,
  );
}

const GIFTLAB_PRODUCT_TYPE_RULES: ReadonlyArray<{
  request: RegExp;
  product: RegExp;
}> = [
  { request: /\bornaments?\b/i, product: /\bornaments?\b/i },
  {
    request: /\b(?:coffee\s+)?mugs?\b/i,
    product: /\b(?:mugs?|coffee cups?|tumblers?|drinkware)\b/i,
  },
  {
    request: /\btackle\b.*\b(?:box|organizer|storage)\b|\b(?:box|organizer|storage)\b.*\btackle\b/i,
    product: /\btackle\b.*\b(?:box|organizer|storage)\b|\b(?:box|organizer|storage)\b.*\btackle\b/i,
  },
  {
    request: /\btools?\b.*\b(?:box|organizer|storage)\b|\b(?:box|organizer|storage)\b.*\btools?\b/i,
    product: /\btools?\b.*\b(?:box|organizer|storage)\b|\b(?:box|organizer|storage)\b.*\btools?\b/i,
  },
  { request: /\bnecklaces?\b/i, product: /\bnecklaces?\b/i },
  { request: /\bbracelets?\b/i, product: /\bbracelets?\b/i },
  { request: /\bbookmarks?\b/i, product: /\bbookmarks?\b/i },
  {
    request: /\bairpods?\b.*\bcases?\b|\bcases?\b.*\bairpods?\b/i,
    product: /\bairpods?\b.*\bcases?\b|\bcases?\b.*\bairpods?\b/i,
  },
  { request: /\bpillow cases?\b/i, product: /\bpillow cases?\b/i },
  { request: /\bpencil cases?\b/i, product: /\bpencil cases?\b/i },
  {
    request: /\b(?:iphone|phone|samsung)\b.*\bcases?\b|\bcases?\b.*\b(?:iphone|phone|samsung)\b/i,
    product: /\b(?:iphone|phone|samsung)\b.*\bcases?\b|\bcases?\b.*\b(?:iphone|phone|samsung)\b/i,
  },
  { request: /\bcutting boards?\b/i, product: /\bcutting boards?\b/i },
];

const GIFTLAB_OCCASION_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ["birthday", /\bbirthdays?\b/i],
  ["christmas", /\b(?:christmas|xmas)\b/i],
  ["anniversary", /\banniversar(?:y|ies)\b/i],
  ["halloween", /\bhalloween\b/i],
  ["graduation", /\bgraduation\b/i],
  ["wedding", /\bwedding\b/i],
  ["remembrance", /\b(?:memorial|memoral|remembrance|sympathy)\b/i],
  ["mothers-day", /\b(?:mother's|mothers|moms?)\s+day\b/i],
  ["fathers-day", /\b(?:father's|fathers|dads?)\s+day\b/i],
  ["valentines-day", /\bvalentine'?s?\s+day\b/i],
];

const GIFTLAB_RELATIONSHIP_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ["mother", /\b(?:mom|mommy|mother|mama)\b/i],
  ["father", /\b(?:dad|daddy|father|papa)\b/i],
  ["daughter", /\bdaughter\b/i],
  ["son", /\bson\b/i],
  ["sister", /\bsister\b/i],
  ["brother", /\bbrother\b/i],
  ["wife", /\bwife\b/i],
  ["husband", /\bhusband\b/i],
  ["girlfriend", /\bgirlfriend\b/i],
  ["boyfriend", /\bboyfriend\b/i],
  ["grandmother", /\b(?:grandma|grandmother)\b/i],
  ["grandfather", /\b(?:grandpa|grandfather)\b/i],
];

function matchingLabels(
  value: string,
  patterns: ReadonlyArray<[string, RegExp]>,
): Set<string> {
  return new Set(
    patterns.filter(([, pattern]) => pattern.test(value)).map(([label]) => label),
  );
}

function hasConflictingGiftlabLabels(
  request: string,
  productTitle: string,
  patterns: ReadonlyArray<[string, RegExp]>,
): boolean {
  const requested = matchingLabels(request, patterns);
  const offered = matchingLabels(productTitle, patterns);
  return requested.size > 0 && offered.size > 0 && intersection(requested, offered).size === 0;
}

function isCompatibleGiftlabProductType(
  request: string,
  productTitle: string,
): boolean {
  const requestedRules = GIFTLAB_PRODUCT_TYPE_RULES.filter(({ request: pattern }) =>
    pattern.test(request),
  );
  if (/\bcases?\b/i.test(request) && requestedRules.length === 0) return false;
  return (
    requestedRules.length === 0 ||
    requestedRules.every(({ product }) => product.test(productTitle))
  );
}

function hasRequestedGiftlabProductType(request: string): boolean {
  return GIFTLAB_PRODUCT_TYPE_RULES.some(({ request: pattern }) =>
    pattern.test(request),
  );
}

function passesGiftlabCompatibility(
  request: string,
  product: AwinCatalogProduct,
): boolean {
  if (/\bgift cards?\b/i.test(request)) return false;
  if (!isCompatibleGiftlabProductType(request, product.title)) return false;
  if (
    hasConflictingGiftlabLabels(
      request,
      product.title,
      GIFTLAB_OCCASION_PATTERNS,
    ) ||
    hasConflictingGiftlabLabels(
      request,
      product.title,
      GIFTLAB_RELATIONSHIP_PATTERNS,
    )
  ) {
    return false;
  }
  return true;
}

function productDiversityKey(
  product: Pick<AwinCatalogProduct, "advertiserId" | "externalProductId" | "title">,
  advertiser: AwinAdvertiserConfig,
): string {
  if (advertiser.matchingPolicy !== "giftlab-personalized") {
    return `${product.advertiserId}:${product.externalProductId}`;
  }
  if (
    /\bairpods?\b.*\bcases?\b|\bcases?\b.*\bairpods?\b/i.test(product.title)
  ) {
    return `${product.advertiserId}:airpods-case`;
  }
  const baseTitle = product.title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\b(?:avatar|black|blue|brown|clear|gold|gray|green|grey|large|medium|opaque|orange|pink|purple|red|silver|small|transparent|white|yellow)\b/g, " ")
    .replace(/\b(?:xs|xl|xxl|\d+\s*(?:cm|in))\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${product.advertiserId}:${baseTitle || product.externalProductId}`;
}

function productDescriptionTokensForMatching(
  product: AwinCatalogProduct,
  advertiser: AwinAdvertiserConfig,
): Set<string> {
  if (advertiser.matchingPolicy !== "giftlab-personalized") {
    return tokens(product.description);
  }
  const category = product.description?.match(/^Category:\s*([^.]*)\./i)?.[1];
  return tokens(category);
}

function hasSpecificFanTeamMatch(
  teamContextTokens: Set<string>,
  productTitleTokens: Set<string>,
): boolean {
  return [...intersection(teamContextTokens, productTitleTokens)].some(
    (token) => !FAN_INK_GENERIC_CONTEXT_WORDS.has(token),
  );
}

function passesAdvertiserPolicy(args: {
  advertiser: AwinAdvertiserConfig;
  product: AwinCatalogProduct;
  fishingIntent: Set<string>;
  audioIntent: Set<string>;
  mosaicComfortIntent: Set<string>;
  imarkuKitchenIntent: Set<string>;
  babyIntent: Set<string>;
  mojoToyIntent: Set<string>;
  loomyHomeIntent: Set<string>;
  bonheurJewelryIntent: Set<string>;
  fanInkIntent: Set<string>;
  beyondMemoriesIntent: Set<string>;
  magicshineCyclingIntent: Set<string>;
  hulaDaddyCoffeeIntent: Set<string>;
  coziwowPetIntent: Set<string>;
  giftlabPersonalizedIntent: Set<string>;
  giftlabDeviceIntent: Set<string>;
  memorialIntent: Set<string>;
  teamContextTokens: Set<string>;
  productTitleTokens: Set<string>;
}): boolean {
  const { advertiser, product } = args;
  if (isAdministrativeOrGiftCardProduct(product.title)) return false;

  switch (advertiser.matchingPolicy) {
    case "piscifun-fishing":
      return args.fishingIntent.size > 0;
    case "fosi-audio":
      return args.audioIntent.size > 0;
    case "mosaic-comfort":
      return args.mosaicComfortIntent.size > 0;
    case "imarku-kitchen":
      return (
        args.imarkuKitchenIntent.size > 0 &&
        !isRestrictedImarkuProduct(product.title)
      );
    case "baby-shusher":
      return args.babyIntent.size > 0 && !isMedicalBabyProduct(product.title);
    case "mojo-fun":
      return args.mojoToyIntent.size > 0;
    case "loomy-home":
      return args.loomyHomeIntent.size > 0 && !isLoomySwatch(product.title);
    case "bonheur-jewelry":
      return args.bonheurJewelryIntent.size > 0;
    case "fan-ink":
      return (
        args.fanInkIntent.size > 0 &&
        hasSpecificFanTeamMatch(
          args.teamContextTokens,
          args.productTitleTokens,
        )
      );
    case "beyond-memories":
      return (
        args.beyondMemoriesIntent.size > 0 &&
        (!isMemorialProduct(product.title) || args.memorialIntent.size > 0)
      );
    case "magicshine-cycling":
      return args.magicshineCyclingIntent.size > 0;
    case "hula-daddy-coffee":
      return args.hulaDaddyCoffeeIntent.size > 0;
    case "coziwow-pets":
      return (
        args.coziwowPetIntent.size > 0 &&
        !isUnsuitableCoziwowProduct(product.title)
      );
    case "giftlab-personalized":
      return (
        args.giftlabPersonalizedIntent.size > 0 &&
        hasAny(args.productTitleTokens, GIFTLAB_PRODUCT_SIGNALS) &&
        !isUnsuitableGiftlabProduct(product) &&
        (!isMemorialProduct(`${product.title} ${giftlabCategory(product)}`) ||
          args.memorialIntent.size > 0) &&
        (!isGiftlabDeviceSpecificProduct(product.title) ||
          hasAny(args.giftlabDeviceIntent, args.productTitleTokens))
      );
    case "standard":
      return true;
  }
}

function finiteNonNegative(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function effectiveBudget(
  suggestion: MatchableGiftSuggestion,
  budgetMin?: number | null,
  budgetMax?: number | null,
) {
  const minimums = [suggestion.price_min, budgetMin]
    .map(finiteNonNegative)
    .filter((value): value is number => value !== null);
  const maximums = [suggestion.price_max, budgetMax]
    .map(finiteNonNegative)
    .filter((value): value is number => value !== null);

  return {
    min: minimums.length ? Math.max(...minimums) : null,
    max: maximums.length ? Math.min(...maximums) : null,
  };
}

function isPhysicalProductConcept(suggestion: MatchableGiftSuggestion): boolean {
  if (suggestion.tier === "experience") return false;
  const titleTokens = tokens(suggestion.title);
  return !hasAny(titleTokens, PHYSICAL_PRODUCT_EXCLUSIONS);
}

type SuggestionPolicyIntent = {
  fishing: Set<string>;
  audio: Set<string>;
  mosaicComfort: Set<string>;
  imarkuKitchen: Set<string>;
  baby: Set<string>;
  mojoToy: Set<string>;
  loomyHome: Set<string>;
  bonheurJewelry: Set<string>;
  fanInk: Set<string>;
  beyondMemories: Set<string>;
  magicshineCycling: Set<string>;
  hulaDaddyCoffee: Set<string>;
  coziwowPets: Set<string>;
  giftlabPersonalized: Set<string>;
  giftlabDevice: Set<string>;
};

function getSuggestionPolicyIntent(
  suggestion: MatchableGiftSuggestion,
): SuggestionPolicyIntent {
  const suggestionIntentTokens = union(
    tokens(suggestion.title),
    tokens(`${suggestion.short_description ?? ""} ${suggestion.why_it_fits ?? ""}`),
  );

  return {
    fishing: intersection(suggestionIntentTokens, FISHING_INTENT_WORDS),
    audio: intersection(suggestionIntentTokens, AUDIO_INTENT_WORDS),
    mosaicComfort: intersection(
      suggestionIntentTokens,
      MOSAIC_COMFORT_INTENT_WORDS,
    ),
    imarkuKitchen: intersection(
      suggestionIntentTokens,
      IMARKU_KITCHEN_INTENT_WORDS,
    ),
    baby: intersection(suggestionIntentTokens, BABY_INTENT_WORDS),
    mojoToy: intersection(suggestionIntentTokens, MOJO_TOY_INTENT_WORDS),
    loomyHome: intersection(suggestionIntentTokens, LOOMY_HOME_INTENT_WORDS),
    bonheurJewelry: intersection(
      suggestionIntentTokens,
      BONHEUR_JEWELRY_INTENT_WORDS,
    ),
    fanInk: intersection(suggestionIntentTokens, FAN_INK_INTENT_WORDS),
    beyondMemories: intersection(
      suggestionIntentTokens,
      BEYOND_MEMORIES_INTENT_WORDS,
    ),
    magicshineCycling: intersection(
      suggestionIntentTokens,
      MAGICSHINE_CYCLING_INTENT_WORDS,
    ),
    hulaDaddyCoffee: intersection(
      suggestionIntentTokens,
      HULA_DADDY_COFFEE_INTENT_WORDS,
    ),
    coziwowPets: intersection(suggestionIntentTokens, COZIWOW_PET_INTENT_WORDS),
    giftlabPersonalized: intersection(
      suggestionIntentTokens,
      GIFTLAB_PERSONALIZED_INTENT_WORDS,
    ),
    giftlabDevice: intersection(suggestionIntentTokens, GIFTLAB_DEVICE_WORDS),
  };
}

function policyCanMatchSuggestion(
  policy: AwinAdvertiserConfig["matchingPolicy"],
  intent: SuggestionPolicyIntent,
): boolean {
  switch (policy) {
    case "piscifun-fishing":
      return intent.fishing.size > 0;
    case "fosi-audio":
      return intent.audio.size > 0;
    case "mosaic-comfort":
      return intent.mosaicComfort.size > 0;
    case "imarku-kitchen":
      return intent.imarkuKitchen.size > 0;
    case "baby-shusher":
      return intent.baby.size > 0;
    case "mojo-fun":
      return intent.mojoToy.size > 0;
    case "loomy-home":
      return intent.loomyHome.size > 0;
    case "bonheur-jewelry":
      return intent.bonheurJewelry.size > 0;
    case "fan-ink":
      return intent.fanInk.size > 0;
    case "beyond-memories":
      return intent.beyondMemories.size > 0;
    case "magicshine-cycling":
      return intent.magicshineCycling.size > 0;
    case "hula-daddy-coffee":
      return intent.hulaDaddyCoffee.size > 0;
    case "coziwow-pets":
      return intent.coziwowPets.size > 0;
    case "giftlab-personalized":
      return intent.giftlabPersonalized.size > 0;
    case "standard":
      return true;
  }
}

/**
 * Selects only catalog partitions that can pass the same intent gate used by
 * the matcher. Product-level exclusions and scoring remain in the matcher.
 */
export function getRelevantAwinAdvertiserIds(
  suggestions: readonly MatchableGiftSuggestion[],
  advertiserRegistry: readonly AwinAdvertiserConfig[] = AWIN_ADVERTISERS,
): string[] {
  const relevantAdvertisers = new Set<string>();

  for (const suggestion of suggestions) {
    if (!isPhysicalProductConcept(suggestion)) continue;

    const intent = getSuggestionPolicyIntent(suggestion);
    for (const advertiser of advertiserRegistry) {
      if (
        advertiser.recommendationEnabled &&
        isApprovedAwinAdvertiserId(advertiser.advertiserId) &&
        policyCanMatchSuggestion(advertiser.matchingPolicy, intent)
      ) {
        relevantAdvertisers.add(advertiser.advertiserId);
      }
    }
  }

  return [...relevantAdvertisers];
}

export function findBestAwinProductMatch(args: {
  suggestion: MatchableGiftSuggestion;
  recipientInterests?: RecipientInterestForMatching[];
  products: AwinCatalogProduct[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  advertiserRegistry?: readonly AwinAdvertiserConfig[];
  excludedProductKeys?: ReadonlySet<string>;
}): ProductMatch | null {
  const { suggestion, products } = args;
  if (!suggestion.title.trim() || !isPhysicalProductConcept(suggestion)) {
    return null;
  }

  const titleTokens = tokens(suggestion.title);
  const detailTokens = tokens(
    `${suggestion.short_description ?? ""} ${suggestion.why_it_fits ?? ""}`,
  );
  const interestTokens = tokens(
    (args.recipientInterests ?? [])
      .flatMap((interest) => [interest.label, interest.category ?? ""])
      .join(" "),
  );
  const suggestionContext = `${suggestion.title} ${suggestion.short_description ?? ""} ${suggestion.why_it_fits ?? ""}`;
  const policyIntent = getSuggestionPolicyIntent(suggestion);
  const memorialIntent = intersection(
    union(titleTokens, detailTokens),
    MEMORIAL_INTENT_WORDS,
  );
  const budget = effectiveBudget(
    suggestion,
    args.budgetMin,
    args.budgetMax,
  );
  if (budget.min !== null && budget.max !== null && budget.min > budget.max) {
    return null;
  }

  let best:
    | { product: AwinCatalogProduct; score: number; budgetDistance: number }
    | undefined;
  const advertisersById = new Map(
    (args.advertiserRegistry ?? AWIN_ADVERTISERS)
      .filter(
        (advertiser) =>
          advertiser.recommendationEnabled &&
          isApprovedAwinAdvertiserId(advertiser.advertiserId),
      )
      .map((advertiser) => [advertiser.advertiserId, advertiser]),
  );

  for (const product of products) {
    const advertiser = advertisersById.get(product.advertiserId);
    if (
      !advertiser ||
      product.locale !== advertiser.locale ||
      !product.active ||
      product.availability !== "in_stock" ||
      !getSafeImageUrl(product.imageUrl) ||
      !isExpectedAwinTrackingUrl(product.affiliateUrl) ||
      product.currency !== "USD" ||
      product.price <= 0 ||
      (budget.min !== null && product.price < budget.min) ||
      (budget.max !== null && product.price > budget.max)
    ) {
      continue;
    }

    if (args.excludedProductKeys?.has(productDiversityKey(product, advertiser))) {
      continue;
    }

    const productTitleTokens = tokens(product.title);
    const productDescriptionTokens = productDescriptionTokensForMatching(
      product,
      advertiser,
    );
    if (
      advertiser.matchingPolicy === "giftlab-personalized" &&
      !passesGiftlabCompatibility(suggestionContext, product)
    ) {
      continue;
    }
    if (
      !passesAdvertiserPolicy({
        advertiser,
        product,
        fishingIntent: policyIntent.fishing,
        audioIntent: policyIntent.audio,
        mosaicComfortIntent: policyIntent.mosaicComfort,
        imarkuKitchenIntent: policyIntent.imarkuKitchen,
        babyIntent: policyIntent.baby,
        mojoToyIntent: policyIntent.mojoToy,
        loomyHomeIntent: policyIntent.loomyHome,
        bonheurJewelryIntent: policyIntent.bonheurJewelry,
        fanInkIntent: policyIntent.fanInk,
        beyondMemoriesIntent: policyIntent.beyondMemories,
        magicshineCyclingIntent: policyIntent.magicshineCycling,
        hulaDaddyCoffeeIntent: policyIntent.hulaDaddyCoffee,
        coziwowPetIntent: policyIntent.coziwowPets,
        giftlabPersonalizedIntent: policyIntent.giftlabPersonalized,
        giftlabDeviceIntent: policyIntent.giftlabDevice,
        memorialIntent,
        teamContextTokens: union(titleTokens, interestTokens),
        productTitleTokens,
      })
    ) continue;

    const titleTitle = intersection(titleTokens, productTitleTokens);
    const titleDescription = intersection(titleTokens, productDescriptionTokens);
    const detailTitle = intersection(detailTokens, productTitleTokens);
    const interestTitle = intersection(interestTokens, productTitleTokens);
    if (advertiser.matchingPolicy === "giftlab-personalized") {
      const hasSpecificTitleMatch = [...titleTitle].some(
        (token) => !GIFTLAB_GENERIC_MATCH_WORDS.has(token),
      );
      const hasSpecificContextMatch = [...detailTitle, ...interestTitle].some(
        (token) =>
          !GIFTLAB_GENERIC_MATCH_WORDS.has(token) &&
          !GENERIC_MATCH_WORDS.has(token),
      );
      if (!hasSpecificTitleMatch && !hasSpecificContextMatch) continue;
    }
    const distinctiveTitleMatch = [...titleTitle].some(
      (token) =>
        !BROAD_FISHING_CONTEXT_WORDS.has(token) &&
        (FISHING_INTENT_WORDS.has(token) ||
          (token.length >= 6 && !GENERIC_MATCH_WORDS.has(token))),
    );
    const hasSpecificSupportingMatch = [
      ...detailTitle,
      ...interestTitle,
    ].some(
      (token) =>
        !BROAD_FISHING_CONTEXT_WORDS.has(token) &&
        !GENERIC_MATCH_WORDS.has(token),
    );
    const strongAnchor =
      titleTitle.size >= 2 ||
      distinctiveTitleMatch ||
      (titleTitle.size >= 1 && hasSpecificSupportingMatch) ||
      (advertiser.matchingPolicy === "giftlab-personalized" &&
        !hasRequestedGiftlabProductType(suggestionContext) &&
        hasSpecificSupportingMatch &&
        detailTitle.size + interestTitle.size >= 2);
    if (!strongAnchor) continue;

    const score =
      titleTitle.size * 6 +
      titleDescription.size * 2 +
      detailTitle.size * 2 +
      interestTitle.size * 3 +
      (policyIntent.fishing.size > 0 ? 4 : 0);
    if (score < MINIMUM_MATCH_SCORE) continue;

    const budgetMidpoint =
      budget.min !== null && budget.max !== null
        ? (budget.min + budget.max) / 2
        : budget.max ?? budget.min ?? product.price;
    const budgetDistance = Math.abs(product.price - budgetMidpoint);

    if (
      !best ||
      score > best.score ||
      (score === best.score && budgetDistance < best.budgetDistance) ||
      (score === best.score &&
        budgetDistance === best.budgetDistance &&
        product.title.localeCompare(best.product.title) < 0)
    ) {
      best = { product, score, budgetDistance };
    }
  }

  if (!best) return null;
  return {
    provider: "awin",
    advertiserId: best.product.advertiserId,
    locale: best.product.locale,
    productId: best.product.externalProductId,
    merchant: best.product.merchantName,
    productTitle: best.product.title,
    imageUrl: best.product.imageUrl,
    price: best.product.price,
    currency: best.product.currency,
    affiliateUrl: best.product.affiliateUrl,
  };
}

function amazonProductMatch(product: AmazonProduct | null): ProductMatch | null {
  if (!product?.detailPageUrl || !product.title) return null;
  const priceText = product.priceDisplay?.replace(/,/g, "") ?? "";
  const priceMatch = priceText.match(/(?:^|[^0-9])(\d+(?:\.\d{1,2})?)/);
  const parsedPrice = priceMatch ? Number(priceMatch[1]) : null;

  return {
    provider: "amazon",
    productId: product.asin,
    merchant: "Amazon",
    productTitle: product.title,
    imageUrl: product.imageUrl,
    price:
      parsedPrice !== null && Number.isFinite(parsedPrice) ? parsedPrice : null,
    currency: product.currency ?? null,
    affiliateUrl: product.detailPageUrl,
  };
}

export async function enrichGiftSuggestionsWithProducts<
  T extends MatchableGiftSuggestion,
>(args: {
  suggestions: T[];
  recipientInterests?: RecipientInterestForMatching[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  advertiserRegistry?: readonly AwinAdvertiserConfig[];
  loadAwinProducts: (
    options: AwinCandidateLoadOptions,
  ) => Promise<AwinCatalogProduct[]>;
  searchAmazon: AmazonSearch;
}): Promise<Array<T & { productMatch: ProductMatch | null; amazonProduct: AmazonProduct | null }>> {
  let awinProducts: AwinCatalogProduct[] = [];
  try {
    awinProducts = await args.loadAwinProducts({
      advertiserIds: getRelevantAwinAdvertiserIds(
        args.suggestions,
        args.advertiserRegistry,
      ),
    });
  } catch {
    console.warn(
      "[perchpal] Awin catalog lookup failed; continuing with Amazon fallback.",
    );
  }

  const selectedProductKeys = new Set<string>();
  const advertiserById = new Map(
    (args.advertiserRegistry ?? AWIN_ADVERTISERS).map((advertiser) => [
      advertiser.advertiserId,
      advertiser,
    ]),
  );
  const awinMatches: Array<ProductMatch | null> = [];

  for (const suggestion of args.suggestions) {
    if (!isPhysicalProductConcept(suggestion)) {
      awinMatches.push(null);
      continue;
    }
    let awinMatch: ProductMatch | null = null;
    try {
      awinMatch = findBestAwinProductMatch({
        suggestion,
        recipientInterests: args.recipientInterests,
        products: awinProducts,
        budgetMin: args.budgetMin,
        budgetMax: args.budgetMax,
        advertiserRegistry: args.advertiserRegistry,
        excludedProductKeys: selectedProductKeys,
      });
    } catch {
      console.warn(
        "[perchpal] Awin matching failed; continuing with Amazon fallback.",
      );
    }
    if (awinMatch) {
      const advertiser = advertiserById.get(awinMatch.advertiserId ?? "");
      if (advertiser) {
        selectedProductKeys.add(
          productDiversityKey(
            {
              advertiserId: awinMatch.advertiserId ?? "",
              externalProductId: awinMatch.productId,
              title: awinMatch.productTitle,
            },
            advertiser,
          ),
        );
      }
    }
    awinMatches.push(awinMatch);
  }

  return Promise.all(
    args.suggestions.map(async (suggestion, index) => {
      if (!isPhysicalProductConcept(suggestion)) {
        return { ...suggestion, productMatch: null, amazonProduct: null };
      }
      const awinMatch = awinMatches[index];
      if (awinMatch) {
        return { ...suggestion, productMatch: awinMatch, amazonProduct: null };
      }
      const title = suggestion.title.trim();
      if (!title) {
        return { ...suggestion, productMatch: null, amazonProduct: null };
      }
      try {
        const amazonProduct = await args.searchAmazon({
          query: title,
          minPriceCents:
            typeof suggestion.price_min === "number"
              ? Math.round(suggestion.price_min * 100)
              : undefined,
          maxPriceCents:
            typeof suggestion.price_max === "number"
              ? Math.round(suggestion.price_max * 100)
              : undefined,
        });
        return {
          ...suggestion,
          productMatch: amazonProductMatch(amazonProduct),
          amazonProduct,
        };
      } catch {
        console.warn(
          "[perchpal] Amazon enrichment failed; returning the original suggestion.",
        );
        return { ...suggestion, productMatch: null, amazonProduct: null };
      }
    }),
  );
}
