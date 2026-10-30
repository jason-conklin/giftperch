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
  requiresVerifiedAwinProductDestination,
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

const LOVE_IS_A_ROSE_ROMANTIC_RELATIONSHIP =
  /\b(?:spouse|partner|wife|husband|girlfriend|boyfriend|fianc(?:e|ee|é|ée))\b/i;
const LOVE_IS_A_ROSE_WORK_ANNIVERSARY =
  /\b(?:work|company|employee|employment|service|professional|career|coworker|colleague)\b[^.]{0,40}\banniversar(?:y|ies)\b|\banniversar(?:y|ies)\b[^.]{0,40}\b(?:work|company|employee|employment|service|professional|career|coworker|colleague)\b/i;
const LOVE_IS_A_ROSE_ROSE_PRODUCT = /\broses?\b|\bbouquets?\b/i;
const LOVE_IS_A_ROSE_CUSTOM_PRODUCT = /\b(?:personalized|engraved)\b/i;
const LOVE_IS_A_ROSE_OCCASION_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ["anniversary", /\banniversar(?:y|ies)\b/i],
  ["birthday", /\bbirthday\b/i],
  ["christmas", /\b(?:christmas|xmas|mistletoe)\b/i],
  ["fathers-day", /\b(?:father'?s|dad'?s)\b/i],
  ["mothers-day", /\b(?:mother'?s|mom'?s)\b/i],
  ["valentines-day", /\bvalentine'?s?(?:\s+day)?\b/i],
  ["wedding", /\bwedding\b/i],
];

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
  destinationHealthStatus?: "valid" | "invalid" | "uncertain" | "unchecked";
  destinationCheckedAt?: string;
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

export type AwinMatchContext = {
  occasion?: string | null;
  recipientRelationship?: string | null;
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
  destination_health_status?: unknown;
  destination_checked_at?: unknown;
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
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  /**
   * Fails closed when the eligible partition exceeds this size. This avoids
   * silently dropping potentially relevant products behind an arbitrary cap.
   */
  maximumProducts?: number;
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

  if (requiresVerifiedAwinProductDestination(row.advertiser_id)) {
    const advertiser = AWIN_ADVERTISERS.find(
      (candidate) => candidate.advertiserId === row.advertiser_id,
    ) as AwinAdvertiserConfig | undefined;
    const checkedAt =
      typeof row.destination_checked_at === "string"
        ? Date.parse(row.destination_checked_at)
        : Number.NaN;
    const maximumAgeMs =
      (advertiser?.destinationValidationMaxAgeHours ?? 72) * 60 * 60 * 1_000;
    if (
      row.destination_health_status !== "valid" ||
      !Number.isFinite(checkedAt) ||
      Date.now() - checkedAt > maximumAgeMs
    ) {
      return null;
    }
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
    ...(typeof row.destination_health_status === "string"
      ? {
          destinationHealthStatus:
            row.destination_health_status as AwinCatalogProduct["destinationHealthStatus"],
        }
      : {}),
    ...(typeof row.destination_checked_at === "string"
      ? { destinationCheckedAt: row.destination_checked_at }
      : {}),
  };
}

export async function loadAwinProductCandidates(
  supabase: SupabaseClient,
  options: AwinCandidateLoadOptions = {},
): Promise<AwinCatalogProduct[]> {
  const products: AwinCatalogProduct[] = [];
  const maximumProducts =
    typeof options.maximumProducts === "number" &&
    Number.isSafeInteger(options.maximumProducts) &&
    options.maximumProducts > 0
      ? options.maximumProducts
      : null;
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
        "provider, advertiser_id, locale, merchant_name, external_product_id, title, description, image_url, affiliate_url, price, currency, availability, active, destination_health_status, destination_checked_at",
      )
      .eq("provider", "awin")
      .eq("active", true)
      .eq("availability", "in_stock");

    query = query.in("advertiser_id", advertiserIds);
    if (options.currency?.trim()) {
      query = query.eq("currency", options.currency.trim().toUpperCase());
    }
    if (typeof options.budgetMin === "number" && Number.isFinite(options.budgetMin)) {
      query = query.gte("price", options.budgetMin);
    }
    if (typeof options.budgetMax === "number" && Number.isFinite(options.budgetMax)) {
      query = query.lte("price", options.budgetMax);
    }

    const pageSize = maximumProducts
      ? Math.min(CATALOG_PAGE_SIZE, maximumProducts - offset + 1)
      : CATALOG_PAGE_SIZE;

    const { data, error } = await query
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error("Unable to read the Awin affiliate product catalog.");
    }

    const rows = (data ?? []) as CatalogRow[];
    if (maximumProducts && offset + rows.length > maximumProducts) {
      throw new Error(
        `Awin candidate retrieval exceeded the ${maximumProducts}-product safety limit.`,
      );
    }
    for (const row of rows) {
      const product = normalizeCatalogRow(row);
      if (product) products.push(product);
    }

    if (rows.length < pageSize) break;
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

function isLoveIsARoseWorkAnniversary(value: string): boolean {
  return LOVE_IS_A_ROSE_WORK_ANNIVERSARY.test(value);
}

function loveIsARoseOccasionLabels(value: string): Set<string> {
  return new Set(
    LOVE_IS_A_ROSE_OCCASION_PATTERNS.filter(([, pattern]) => pattern.test(value))
      .map(([label]) => label),
  );
}

function hasConflictingLoveIsARoseOccasion(
  request: string,
  productTitle: string,
): boolean {
  const requested = loveIsARoseOccasionLabels(request);
  const offered = loveIsARoseOccasionLabels(productTitle);
  if (offered.size === 0) return false;
  if (requested.size === 0) return true;
  return [...offered].some(
    (label) =>
      !requested.has(label) &&
      !(
        (label === "wedding" && requested.has("anniversary")) ||
        (label === "anniversary" && requested.has("wedding"))
      ),
  );
}

export function getLoveIsARoseContextualIntentLabels(
  context: AwinMatchContext,
): string[] {
  const occasion = context.occasion ?? "";
  const relationship = context.recipientRelationship ?? "";
  const combined = `${occasion} ${relationship}`;
  if (isLoveIsARoseWorkAnniversary(combined)) return [];

  const labels: string[] = [];
  if (/\bvalentine'?s?(?:\s+day)?\b/i.test(occasion)) {
    labels.push("Valentine's Day rose gift");
  }
  if (/\bwedding\b/i.test(occasion)) {
    labels.push("wedding rose keepsake");
  }
  if (
    /\banniversar(?:y|ies)\b/i.test(occasion) &&
    LOVE_IS_A_ROSE_ROMANTIC_RELATIONSHIP.test(relationship)
  ) {
    labels.push("anniversary rose keepsake");
  }
  return labels;
}

function getLoveIsARoseIntent(
  suggestion: MatchableGiftSuggestion,
  context: AwinMatchContext = {},
): Set<string> {
  const suggestionText = `${suggestion.title} ${suggestion.short_description ?? ""} ${suggestion.why_it_fits ?? ""}`;
  const contextualLabels = getLoveIsARoseContextualIntentLabels(context);
  const request = `${suggestionText} ${contextualLabels.join(" ")}`;
  const relationship = context.recipientRelationship ?? "";
  const intent = new Set<string>();

  if (/\b(?:preserved|dipped|trimmed)\s+roses?\b|\broses?\s+(?:bouquet|arrangement)\b/i.test(suggestionText)) {
    intent.add("rose");
  }
  if (/\bvalentine'?s?(?:\s+day)?\b/i.test(request)) {
    intent.add("valentine");
  }
  if (/\bwedding\b/i.test(request)) {
    intent.add("wedding");
  }
  if (
    /\banniversar(?:y|ies)\b/i.test(request) &&
    LOVE_IS_A_ROSE_ROMANTIC_RELATIONSHIP.test(relationship)
  ) {
    intent.add("anniversary");
  }
  if (
    /\b(?:romantic|romance|love)\b/i.test(suggestionText) &&
    (LOVE_IS_A_ROSE_ROMANTIC_RELATIONSHIP.test(relationship) ||
      LOVE_IS_A_ROSE_ROSE_PRODUCT.test(suggestionText))
  ) {
    intent.add("romantic");
  }
  if (
    LOVE_IS_A_ROSE_CUSTOM_PRODUCT.test(suggestionText) &&
    /\b(?:romantic|romance|love|sentimental|keepsake|anniversar(?:y|ies)|valentine|wedding|rose)\b/i.test(
      request,
    )
  ) {
    intent.add("personalized");
  }
  return intent;
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
  return /\b(?:lingerie|pant(?:y|ies)|underwear|boxer(?:\s+\w+){0,2}\s+shorts?|briefs?|bikini|swim(?:suit|wear|ming)|costumes?|gift cards?|payment adjustment|price difference)\b/i.test(
    `${product.title} ${giftlabCategory(product)}`,
  );
}

function isGiftlabDeviceSpecificProduct(title: string): boolean {
  return /\b(?:airpods?|airtag|iphone|ipad|phone case|earphone case|samsung)\b/i.test(
    title,
  );
}

function hasGiftlabPetEvidence(value: string): boolean {
  return /\b(?:cat|cats|dog|dogs|kitten|kittens|pet|pets|puppy|puppies)\b/i.test(
    value,
  );
}

function isCompatibleGiftlabPetProduct(
  request: string,
  productEvidence: string,
): boolean {
  if (!hasGiftlabPetEvidence(request)) return true;
  if (!hasGiftlabPetEvidence(productEvidence)) return false;

  const requestsDog = /\b(?:dog|dogs|puppy|puppies)\b/i.test(request);
  const requestsCat = /\b(?:cat|cats|kitten|kittens)\b/i.test(request);
  const offersDog = /\b(?:dog|dogs|puppy|puppies)\b/i.test(productEvidence);
  const offersCat = /\b(?:cat|cats|kitten|kittens)\b/i.test(productEvidence);

  if (requestsDog && !requestsCat && offersCat && !offersDog) return false;
  if (requestsCat && !requestsDog && offersDog && !offersCat) return false;
  return true;
}

const GIFTLAB_PRODUCT_TYPE_RULES: ReadonlyArray<{
  request: RegExp;
  product: RegExp;
}> = [
  {
    request:
      /\b(?:mugs?|cups?|coffee)\s+(?:warmers?|heaters?|warming devices?)\b|\b(?:warmers?|heaters?)\s+(?:for\s+)?(?:mugs?|cups?|coffee)\b/i,
    product:
      /\b(?:mugs?|cups?|coffee)\s+(?:warmers?|heaters?)\b|\b(?:warmers?|heaters?)\s+(?:for\s+)?(?:mugs?|cups?|coffee)\b|\bheating plates?\b/i,
  },
  {
    request:
      /\bstar\s+maps?\b|\bconstellation\s+(?:maps?|prints?|art(?:work)?)\b|\bnight[ -]sky\s+(?:maps?|prints?|art(?:work)?)\b/i,
    product:
      /\bstar\s+maps?\b|\bconstellation\s+(?:maps?|prints?|art(?:work)?)\b|\bnight[ -]sky\s+(?:maps?|prints?|art(?:work)?)\b/i,
  },
  {
    request:
      /\b(?:coordinates?|latitude|longitude|gps)\b|\blocation[ -]+engraved\b/i,
    product:
      /\b(?:coordinates?|latitude|longitude|gps)\b|\blocation[ -]+engraved\b/i,
  },
  { request: /\bornaments?\b/i, product: /\bornaments?\b/i },
  {
    request: /\b(?:coffee\s+)?mugs?\b/i,
    product: /\b(?:mugs?|coffee cups?|tumblers?|drinkware)\b/i,
  },
  { request: /\btowels?\b/i, product: /\btowels?\b/i },
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
  ["christmas", /\b(?:christmas|xmas|holidays?)\b/i],
  ["anniversary", /\banniversar(?:y|ies)\b/i],
  ["halloween", /\bhalloween\b/i],
  ["graduation", /\bgraduation\b/i],
  ["back-to-school", /\b(?:back\s+to\s+school|first\s+day\s+of\s+school)\b/i],
  ["teacher-appreciation", /\b(?:teacher'?s?\s+day|teacher\s+appreciation)\b/i],
  ["wedding", /\bwedding\b/i],
  ["new-baby", /\b(?:baby\s+shower|new\s+baby|newborn)\b/i],
  ["remembrance", /\b(?:memorial|memoral|remembrance|sympathy)\b/i],
  ["mothers-day", /\b(?:mother's|mothers|moms?)\s+day\b/i],
  ["fathers-day", /\b(?:father's|fathers|dads?)\s+day\b/i],
  ["valentines-day", /\bvalentine'?s?(?:\s+day)?\b/i],
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
  ["friend", /\b(?:best\s+friends?|friends?)\b/i],
  ["partner", /\b(?:partner|spouse)\b/i],
  ["fiance", /\bfianc(?:e|ee|é|ée)\b/i],
  ["granddaughter", /\bgranddaughter\b/i],
  ["grandson", /\bgrandson\b/i],
  ["grandmother", /\b(?:grandma|grandmother)\b/i],
  ["grandfather", /\b(?:grandpa|grandfather)\b/i],
  ["child", /\b(?:baby\s+(?:boy|girl)|child|children|kid|newborn|toddler)\b/i],
];

function matchingLabels(
  value: string,
  patterns: ReadonlyArray<[string, RegExp]>,
): Set<string> {
  const normalized = value.replace(/[_-]+/g, " ");
  return new Set(
    patterns
      .filter(([, pattern]) => pattern.test(normalized))
      .map(([label]) => label),
  );
}

function hasConflictingGiftlabLabels(
  requestLabels: Set<string>,
  productTitle: string,
  patterns: ReadonlyArray<[string, RegExp]>,
  compatiblePairs: ReadonlySet<string> = new Set(),
): boolean {
  const offered = matchingLabels(productTitle, patterns);
  return (
    requestLabels.size > 0 &&
    offered.size > 0 &&
    [...offered].some(
      (offeredLabel) =>
        ![...requestLabels].some(
          (requestedLabel) =>
            requestedLabel === offeredLabel ||
            compatiblePairs.has(`${requestedLabel}:${offeredLabel}`),
        ),
    )
  );
}

const GIFTLAB_COMPATIBLE_OCCASION_PAIRS = new Set([
  "anniversary:wedding",
  "wedding:anniversary",
]);

const GIFTLAB_COMPATIBLE_RELATIONSHIP_PAIRS = new Set([
  "partner:wife",
  "partner:husband",
  "partner:girlfriend",
  "partner:boyfriend",
  "partner:fiance",
  "daughter:child",
  "son:child",
]);

function isCompatibleGiftlabProductType(
  request: string,
  product: AwinCatalogProduct,
): boolean {
  const productEvidence = `${product.title} ${giftlabCategory(product)}`;
  const requestsMugWarmer =
    /\b(?:mugs?|cups?|coffee)\s+(?:warmers?|heaters?|warming devices?)\b|\b(?:warmers?|heaters?)\s+(?:for\s+)?(?:mugs?|cups?|coffee)\b/i.test(
      request,
    );
  if (
    requestsMugWarmer &&
    (!/\b(?:electric|usb|powered|heating plates?)\b/i.test(productEvidence) ||
      /\b(?:magic|heat|color)\s+(?:color\s+)?chang(?:e|es|ing)\b/i.test(
        productEvidence,
      ))
  ) {
    return false;
  }
  const requestsNameNecklace =
    /\b(?:name|initial|monogram)\b.*\bnecklaces?\b|\bnecklaces?\b.*\b(?:name|initial|monogram)\b/i.test(
      request,
    );
  if (
    requestsNameNecklace &&
    !/\b(?:initial|monogram|name|nameplate)\b/i.test(product.title)
  ) {
    return false;
  }
  const requestsPetPortrait =
    /\b(?:cat|dog|pet)\b.*\bportraits?\b|\bportraits?\b.*\b(?:cat|dog|pet)\b/i.test(
      request,
    );
  if (requestsPetPortrait) {
    const hasPortraitArtMedium =
      /\b(?:art\s+print|artwork|canvas(?:\s+print)?|framed\s+print|illustration|painting|poster|wall\s+art)\b/i.test(
        productEvidence,
      );
    const hasStandalonePortrait =
      /\bportraits?\b/i.test(productEvidence) &&
      !/\b(?:aprons?|blankets?|cases?|covers?|hats?|keychains?|laptops?|mailboxes?|mugs?|necklaces?|pillows?|sandals?|shirts?|skins?|slippers?|socks?|stickers?|towels?)\b/i.test(
        productEvidence,
      );
    if (!hasPortraitArtMedium && !hasStandalonePortrait) return false;
  }
  const requestsSwimwear = /\b(?:bikini|swimsuits?|swimwear)\b/i.test(request);
  if (
    requestsSwimwear &&
    !/\b(?:bikini|swimsuits?|swimwear)\b/i.test(productEvidence)
  ) {
    return false;
  }
  if (!isCompatibleGiftlabPetProduct(request, productEvidence)) return false;
  const requestedRules = GIFTLAB_PRODUCT_TYPE_RULES.filter(({ request: pattern }) =>
    pattern.test(request),
  );
  if (/\bcases?\b/i.test(request) && requestedRules.length === 0) return false;
  return (
    requestedRules.length === 0 ||
    requestedRules.every(({ product: pattern }) => pattern.test(productEvidence))
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
  context: AwinMatchContext,
): boolean {
  if (/\bgift cards?\b/i.test(request)) return false;
  if (!isCompatibleGiftlabProductType(request, product)) return false;
  const structuredOccasion = matchingLabels(
    context.occasion ?? "",
    GIFTLAB_OCCASION_PATTERNS,
  );
  const structuredRelationship = matchingLabels(
    context.recipientRelationship ?? "",
    GIFTLAB_RELATIONSHIP_PATTERNS,
  );
  const requestedOccasions = structuredOccasion.size
    ? structuredOccasion
    : matchingLabels(request, GIFTLAB_OCCASION_PATTERNS);
  const requestedRelationships = structuredRelationship.size
    ? structuredRelationship
    : matchingLabels(request, GIFTLAB_RELATIONSHIP_PATTERNS);
  if (
    hasConflictingGiftlabLabels(
      requestedOccasions,
      product.title,
      GIFTLAB_OCCASION_PATTERNS,
      GIFTLAB_COMPATIBLE_OCCASION_PAIRS,
    ) ||
    hasConflictingGiftlabLabels(
      requestedRelationships,
      product.title,
      GIFTLAB_RELATIONSHIP_PATTERNS,
      GIFTLAB_COMPATIBLE_RELATIONSHIP_PAIRS,
    )
  ) {
    return false;
  }
  return true;
}

function passesLoveIsARoseCompatibility(
  productRequirementText: string,
  product: AwinCatalogProduct,
  context: AwinMatchContext,
): boolean {
  const contextText = `${context.occasion ?? ""} ${context.recipientRelationship ?? ""}`;
  if (isLoveIsARoseWorkAnniversary(`${productRequirementText} ${contextText}`)) return false;
  if (isMemorialProduct(product.title)) return false;

  const productTitle = product.title;
  const requestText = `${productRequirementText} ${contextText}`;
  const requestsPreservedRose = /\bpreserved\s+roses?\b/i.test(requestText);
  const requestsDippedRose = /\b(?:gold|silver|platinum)\s+dipped\s+roses?\b|\bdipped\s+roses?\b/i.test(
    requestText,
  );
  const requestsGold = /\bgold(?:\s+dipped|\s+trimmed)?\s+roses?\b/i.test(
    requestText,
  );
  const requestsSilver = /\bsilver(?:\s+dipped|\s+trimmed)?\s+roses?\b/i.test(
    requestText,
  );
  const requestsPlatinum = /\bplatinum(?:\s+dipped|\s+trimmed)?\s+roses?\b/i.test(
    requestText,
  );
  const requestsRose = /\broses?\b|\bbouquets?\b/i.test(requestText);
  const requestsWedding = /\bwedding\b/i.test(requestText);
  const requestsValentine = /\bvalentine'?s?(?:\s+day)?\b/i.test(requestText);
  const requestsAnniversary = /\banniversar(?:y|ies)\b/i.test(requestText);
  const requestsCustom = LOVE_IS_A_ROSE_CUSTOM_PRODUCT.test(requestText);

  const productRose = LOVE_IS_A_ROSE_ROSE_PRODUCT.test(productTitle);
  const productWedding = /\bwedding\b/i.test(productTitle);
  const productValentine = /\bvalentine'?s?(?:\s+day)?\b/i.test(productTitle);
  const productAnniversary = /\banniversar(?:y|ies)\b/i.test(productTitle);

  if (hasConflictingLoveIsARoseOccasion(requestText, productTitle)) {
    return false;
  }

  if (requestsPreservedRose && !/\bpreserved\s+roses?\b/i.test(productTitle)) {
    return false;
  }
  if (requestsDippedRose && !/\b(?:gold|silver|platinum)\s+(?:dipped|trimmed)\s+roses?\b/i.test(productTitle)) {
    return false;
  }
  if (requestsGold && !/\b(?:24k\s+)?gold\s+(?:dipped|trimmed)\s+roses?\b/i.test(productTitle)) {
    return false;
  }
  if (requestsSilver && !/\bsilver\s+(?:dipped|trimmed)\s+roses?\b/i.test(productTitle)) {
    return false;
  }
  if (requestsPlatinum && !/\bplatinum\s+dipped\s+roses?\b/i.test(productTitle)) {
    return false;
  }
  if (requestsCustom && !LOVE_IS_A_ROSE_CUSTOM_PRODUCT.test(productTitle)) {
    return false;
  }
  if (requestsWedding && !productWedding) return false;
  if (requestsValentine && !(productValentine || productRose)) return false;
  if (requestsAnniversary && !(productAnniversary || productRose)) return false;
  return !requestsRose || productRose;
}

export function getAwinProductDiversityKey(
  product: Pick<AwinCatalogProduct, "advertiserId" | "externalProductId" | "title">,
  advertiser: AwinAdvertiserConfig,
): string {
  if (advertiser.matchingPolicy === "love-is-a-rose") {
    const colorVariant = product.title.match(
      /^(24k\s+gold\s+trimmed\s+rose:\s*11\"\s+)(?:black|blue|brown|burgundy|cream|dark\s+blue|dark\s+green|green|light\s+blue|light\s+green|orange|peach|pink(?:\s+and\s+cream)?|purple(?:\s+cream)?|red(?:\s+and\s+cream)?|teal|white|yellow)(\s+rose)$/i,
    );
    if (colorVariant) {
      return `${product.advertiserId}:${`${colorVariant[1]}${colorVariant[2]}`
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()}`;
    }
    return `${product.advertiserId}:${product.externalProductId}`;
  }
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
  loveIsARoseIntent: Set<string>;
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
    case "love-is-a-rose":
      return args.loveIsARoseIntent.size > 0;
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
  loveIsARose: Set<string>;
};

function getSuggestionPolicyIntent(
  suggestion: MatchableGiftSuggestion,
  context: AwinMatchContext = {},
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
    loveIsARose: getLoveIsARoseIntent(suggestion, context),
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
    case "love-is-a-rose":
      return intent.loveIsARose.size > 0;
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
  context: AwinMatchContext = {},
): string[] {
  const relevantAdvertisers = new Set<string>();

  for (const suggestion of suggestions) {
    if (!isPhysicalProductConcept(suggestion)) continue;

    const intent = getSuggestionPolicyIntent(suggestion, context);
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
  occasion?: string | null;
  recipientRelationship?: string | null;
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
  const loveIsARoseProductRequirements = `${suggestion.title} ${suggestion.short_description ?? ""}`;
  const policyIntent = getSuggestionPolicyIntent(suggestion, {
    occasion: args.occasion,
    recipientRelationship: args.recipientRelationship,
  });
  const memorialIntent = intersection(
    union(titleTokens, detailTokens, tokens(args.occasion)),
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

    if (
      args.excludedProductKeys?.has(
        getAwinProductDiversityKey(product, advertiser),
      )
    ) {
      continue;
    }

    const productTitleTokens = tokens(product.title);
    const productDescriptionTokens = productDescriptionTokensForMatching(
      product,
      advertiser,
    );
    if (
      advertiser.matchingPolicy === "giftlab-personalized" &&
      !passesGiftlabCompatibility(suggestionContext, product, {
        occasion: args.occasion,
        recipientRelationship: args.recipientRelationship,
      })
    ) {
      continue;
    }
    if (
      advertiser.matchingPolicy === "love-is-a-rose" &&
      !passesLoveIsARoseCompatibility(loveIsARoseProductRequirements, product, {
        occasion: args.occasion,
        recipientRelationship: args.recipientRelationship,
      })
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
        loveIsARoseIntent: policyIntent.loveIsARose,
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
      (advertiser.matchingPolicy === "love-is-a-rose" &&
        policyIntent.loveIsARose.size > 0 &&
        titleTitle.size >= 1) ||
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
      (policyIntent.fishing.size > 0 ? 4 : 0) +
      (policyIntent.loveIsARose.size > 0 ? 4 : 0);
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
    ...(best.product.destinationHealthStatus
      ? { destinationHealthStatus: best.product.destinationHealthStatus }
      : {}),
    ...(best.product.destinationCheckedAt
      ? { destinationCheckedAt: best.product.destinationCheckedAt }
      : {}),
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
  occasion?: string | null;
  recipientRelationship?: string | null;
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
        {
          occasion: args.occasion,
          recipientRelationship: args.recipientRelationship,
        },
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
        occasion: args.occasion,
        recipientRelationship: args.recipientRelationship,
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
          getAwinProductDiversityKey(
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
