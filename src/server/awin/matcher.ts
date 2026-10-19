import type { SupabaseClient } from "@supabase/supabase-js";
import type { AmazonProduct } from "@/lib/amazonPaapi";
import {
  getSafeImageUrl,
  isExpectedAwinTrackingUrl,
  type ProductMatch,
} from "@/lib/affiliateProduct";
import {
  findRecommendationEnabledAwinAdvertiserById,
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
  headphones: "headphone",
  headsets: "headset",
  preamplifiers: "preamplifier",
  receivers: "receiver",
  reels: "reel",
  rods: "rod",
  speakers: "speaker",
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
): Promise<AwinCatalogProduct[]> {
  const products: AwinCatalogProduct[] = [];

  for (let offset = 0; ; offset += CATALOG_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("affiliate_products")
      .select(
        "provider, advertiser_id, locale, merchant_name, external_product_id, title, description, image_url, affiliate_url, price, currency, availability, active",
      )
      .eq("provider", "awin")
      .eq("active", true)
      .eq("availability", "in_stock")
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

function isMemorialProduct(title: string): boolean {
  return /\b(?:memorial|remembrance|in loving memory)\b/i.test(title);
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

export function findBestAwinProductMatch(args: {
  suggestion: MatchableGiftSuggestion;
  recipientInterests?: RecipientInterestForMatching[];
  products: AwinCatalogProduct[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  advertiserRegistry?: readonly AwinAdvertiserConfig[];
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
  const suggestionIntentTokens = union(titleTokens, detailTokens);
  const fishingIntent = intersection(
    suggestionIntentTokens,
    FISHING_INTENT_WORDS,
  );
  const audioIntent = intersection(suggestionIntentTokens, AUDIO_INTENT_WORDS);
  const mosaicComfortIntent = intersection(
    suggestionIntentTokens,
    MOSAIC_COMFORT_INTENT_WORDS,
  );
  const imarkuKitchenIntent = intersection(
    suggestionIntentTokens,
    IMARKU_KITCHEN_INTENT_WORDS,
  );
  const babyIntent = intersection(suggestionIntentTokens, BABY_INTENT_WORDS);
  const mojoToyIntent = intersection(suggestionIntentTokens, MOJO_TOY_INTENT_WORDS);
  const loomyHomeIntent = intersection(
    suggestionIntentTokens,
    LOOMY_HOME_INTENT_WORDS,
  );
  const bonheurJewelryIntent = intersection(
    suggestionIntentTokens,
    BONHEUR_JEWELRY_INTENT_WORDS,
  );
  const fanInkIntent = intersection(suggestionIntentTokens, FAN_INK_INTENT_WORDS);
  const beyondMemoriesIntent = intersection(
    suggestionIntentTokens,
    BEYOND_MEMORIES_INTENT_WORDS,
  );
  const memorialIntent = intersection(
    suggestionIntentTokens,
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

  for (const product of products) {
    const advertiser = findRecommendationEnabledAwinAdvertiserById(
      product.advertiserId,
      args.advertiserRegistry,
    );
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

    const productTitleTokens = tokens(product.title);
    const productDescriptionTokens = tokens(product.description);
    if (
      !passesAdvertiserPolicy({
        advertiser,
        product,
        fishingIntent,
        audioIntent,
        mosaicComfortIntent,
        imarkuKitchenIntent,
        babyIntent,
        mojoToyIntent,
        loomyHomeIntent,
        bonheurJewelryIntent,
        fanInkIntent,
        beyondMemoriesIntent,
        memorialIntent,
        teamContextTokens: union(titleTokens, interestTokens),
        productTitleTokens,
      })
    ) continue;

    const titleTitle = intersection(titleTokens, productTitleTokens);
    const titleDescription = intersection(titleTokens, productDescriptionTokens);
    const detailTitle = intersection(detailTokens, productTitleTokens);
    const interestTitle = intersection(interestTokens, productTitleTokens);
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
      (titleTitle.size >= 1 && hasSpecificSupportingMatch);
    if (!strongAnchor) continue;

    const score =
      titleTitle.size * 6 +
      titleDescription.size * 2 +
      detailTitle.size * 2 +
      interestTitle.size * 3 +
      (fishingIntent.size > 0 ? 4 : 0);
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
  loadAwinProducts: () => Promise<AwinCatalogProduct[]>;
  searchAmazon: AmazonSearch;
}): Promise<Array<T & { productMatch: ProductMatch | null; amazonProduct: AmazonProduct | null }>> {
  let awinProducts: AwinCatalogProduct[] = [];
  try {
    awinProducts = await args.loadAwinProducts();
  } catch {
    console.warn(
      "[perchpal] Awin catalog lookup failed; continuing with Amazon fallback.",
    );
  }

  return Promise.all(
    args.suggestions.map(async (suggestion) => {
      if (!isPhysicalProductConcept(suggestion)) {
        return { ...suggestion, productMatch: null, amazonProduct: null };
      }

      let awinMatch: ProductMatch | null = null;
      try {
        awinMatch = findBestAwinProductMatch({
          suggestion,
          recipientInterests: args.recipientInterests,
          products: awinProducts,
          budgetMin: args.budgetMin,
          budgetMax: args.budgetMax,
        });
      } catch {
        console.warn(
          "[perchpal] Awin matching failed; continuing with Amazon fallback.",
        );
      }
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
