import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeProductMatch,
  type ProductMatch,
} from "@/lib/affiliateProduct";
import { canonicalizeGiftSuggestionText } from "@/lib/giftSuggestionCanonical";
import {
  AWIN_ADVERTISERS,
  isApprovedAwinAdvertiserId,
  type AwinAdvertiserConfig,
} from "./advertisers";
import {
  findBestAwinProductMatch,
  getAwinProductDiversityKey,
  getRelevantAwinAdvertiserIds,
  loadAwinProductCandidates,
  type AwinCandidateLoadOptions,
  type AwinCatalogProduct,
  type MatchableGiftSuggestion,
  type RecipientInterestForMatching,
} from "./matcher";

const DEFAULT_FRESHNESS_TARGET_HOURS = 72;
const MAX_REQUESTED_PRODUCTS = 12;
const MAX_SHORTLIST_PRODUCTS = 24;
const MAX_CATALOG_CANDIDATES = 5_000;
const MAX_INTENTS = 12;

export type CatalogRecommendationContext = {
  recipient: {
    name?: string | null;
    interests: RecipientInterestForMatching[];
    notes?: string | null;
  };
  occasion?: string | null;
  recipientRelationship?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  requestedCount: number;
  priorGiftTitles?: string[];
  excludedProductKeys?: string[];
  excludedProductTitles?: string[];
};

export type CatalogGiftIntent = {
  id: string;
  label: string;
  description: string | null;
};

export type CatalogGroundedProduct = ProductMatch & {
  provider: "awin";
  advertiserId: string;
  locale: string;
  imageUrl: string;
  price: number;
  currency: "USD";
};

export type CatalogGroundedRecommendation = {
  candidateId: string;
  product: CatalogGroundedProduct;
  active: true;
  availability: "in_stock";
  explanation: string | null;
  matchedIntent: string;
};

export type CatalogRecommendationResult = {
  status: "success" | "no_results";
  recommendations: CatalogGroundedRecommendation[];
  intents: CatalogGiftIntent[];
  requestedCount: number;
  eligibleCandidateCount: number;
  shortlistCount: number;
  freshness: {
    targetHours: number;
    enforced: false;
  };
};

export type CatalogIntentPlanner = (
  context: CatalogRecommendationContext,
) => Promise<unknown>;

export type CatalogAiSelection = {
  candidateId: string;
  explanation?: string | null;
};

export type CatalogCandidateSelector = (args: {
  context: CatalogRecommendationContext;
  candidates: ReadonlyArray<{
    candidateId: string;
    title: string;
    description: string | null;
    merchant: string;
    price: number;
    currency: "USD";
    matchedIntent: string;
  }>;
  requestedCount: number;
}) => Promise<unknown>;

export type CatalogProductLoader = (
  options: AwinCandidateLoadOptions,
) => Promise<AwinCatalogProduct[]>;

type CatalogRecommendationDependencies = {
  loadProducts: CatalogProductLoader;
  advertiserRegistry?: readonly AwinAdvertiserConfig[];
  planIntents?: CatalogIntentPlanner;
  selectCandidates?: CatalogCandidateSelector;
};

function optionalText(value: unknown, maximumLength = 500): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > maximumLength || /https?:\/\//i.test(text)) {
    return null;
  }
  return text;
}

function normalizedRequestedCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_REQUESTED_PRODUCTS, Math.max(1, Math.round(value)));
}

function normalizedBudget(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function normalizeContext(
  context: CatalogRecommendationContext,
): CatalogRecommendationContext {
  const budgetMin = normalizedBudget(context.budgetMin);
  const budgetMax = normalizedBudget(context.budgetMax);
  return {
    recipient: {
      name: optionalText(context.recipient.name, 200),
      notes: optionalText(context.recipient.notes, 1_000),
      interests: context.recipient.interests
        .map((interest) => ({
          label: optionalText(interest.label, 200) ?? "",
          category: optionalText(interest.category, 200),
        }))
        .filter((interest) => interest.label),
    },
    occasion: optionalText(context.occasion, 100),
    recipientRelationship: optionalText(context.recipientRelationship, 100),
    budgetMin,
    budgetMax,
    requestedCount: normalizedRequestedCount(context.requestedCount),
    priorGiftTitles: (context.priorGiftTitles ?? [])
      .map((title) => optionalText(title, 1_000))
      .filter((title): title is string => !!title)
      .slice(0, 50),
    excludedProductKeys: (context.excludedProductKeys ?? [])
      .map((key) => optionalText(key, 500))
      .filter((key): key is string => !!key)
      .slice(0, 200),
    excludedProductTitles: (context.excludedProductTitles ?? [])
      .map((title) => optionalText(title, 1_000))
      .filter((title): title is string => !!title)
      .slice(0, 200),
  };
}

function expandBroadInterest(label: string): string[] {
  const normalized = label.toLowerCase();
  let expanded = [label];
  if (/\b(?:fish|fishing|angler|angling)\b/.test(normalized)) {
    expanded = [
      `${label} fishing reel`,
      `${label} fishing rod`,
      `${label} tackle box organizer`,
    ];
  } else if (/\b(?:jewelry|jewellery)\b/.test(normalized)) {
    expanded = [
      `${label} necklace pendant`,
      `${label} tennis bracelet bangle`,
      `${label} earrings jewelry`,
    ];
  } else if (/\bcoffee\b/.test(normalized)) {
    expanded = [`${label} coffee mug`, `${label} drinkware tumbler`];
  } else if (/\b(?:pet|dog|cat)\b/.test(normalized)) {
    expanded = [`${label} pet gift`];
  } else if (/\b(?:gaming|gamer)\b/.test(normalized)) {
    expanded = [`${label} gaming accessory`];
  } else if (/\b(?:cook|cooking)\b/.test(normalized)) {
    expanded = [`${label} kitchen cooking tool`];
  } else if (/\b(?:garden|gardening)\b/.test(normalized)) {
    expanded = [`${label} gardening tool`, `${label} planter`];
  } else if (/\b(?:read|reading|books?)\b/.test(normalized)) {
    expanded = [`${label} book`, `${label} bookmark`];
  }
  if (/\b(?:custom|customized|engraved|personalized)\b/.test(normalized)) {
    expanded = expanded.map(
      (intent) => `${intent} custom engraved personalized`,
    );
  }
  return expanded;
}

function isOverlyBroadPersonalization(label: string): boolean {
  if (!/\b(?:custom|customized|engraved|personalized)\b/i.test(label)) {
    return false;
  }
  const specificTerms = label
    .normalize("NFKD")
    .toLowerCase()
    .replace(
      /\b(?:custom|customized|engraved|gift|gifts|idea|ideas|keepsake|keepsakes|meaningful|personalized|special|thoughtful|unique)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return !specificTerms;
}

export function deriveDeterministicCatalogIntents(
  context: CatalogRecommendationContext,
): CatalogGiftIntent[] {
  const sources = context.recipient.interests.map((interest) => ({
    label: interest.label,
    description: interest.category ?? null,
  }));
  if (sources.length === 0 && context.recipient.notes) {
    sources.push({ label: context.recipient.notes, description: null });
  }

  const seen = new Set<string>();
  const intents: CatalogGiftIntent[] = [];
  for (const source of sources) {
    const label = optionalText(source.label, 200);
    if (!label || isOverlyBroadPersonalization(label)) continue;
    for (const expandedLabel of expandBroadInterest(label)) {
      const key = expandedLabel.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      intents.push({
        id: `intent-${intents.length + 1}`,
        label: expandedLabel,
        description: optionalText(source.description, 200),
      });
      if (intents.length >= MAX_INTENTS) break;
    }
    if (intents.length >= MAX_INTENTS) break;
  }
  return intents;
}

function normalizePlannedIntents(value: unknown): CatalogGiftIntent[] {
  const raw =
    value && typeof value === "object" && "intents" in value
      ? (value as { intents?: unknown }).intents
      : value;
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const intents: CatalogGiftIntent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const label = optionalText(candidate.label, 200);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    intents.push({
      id: optionalText(candidate.id, 100) ?? `intent-${intents.length + 1}`,
      label,
      description: optionalText(candidate.description, 500),
    });
    if (intents.length >= MAX_INTENTS) break;
  }
  return intents;
}

function intentSuggestion(
  intent: CatalogGiftIntent,
  context: CatalogRecommendationContext,
): MatchableGiftSuggestion {
  const recipientContext = context.recipient.interests
    .flatMap((interest) => [interest.label, interest.category ?? ""])
    .filter(Boolean)
    .join(", ");
  return {
    title: intent.label,
    short_description: intent.description,
    why_it_fits: [recipientContext, context.recipient.notes]
      .filter(Boolean)
      .join(". "),
    price_min: context.budgetMin,
    price_max: context.budgetMax,
  };
}

const EXPLICIT_PRODUCT_TYPE_PATTERNS: ReadonlyArray<RegExp> = [
  /\bnecklaces?\b/i,
  /\bbracelets?\b/i,
  /\bearrings?\b/i,
  /\brings?\b/i,
  /\breels?\b/i,
  /\brods?\b/i,
  /\btackle\b/i,
  /\bmugs?\b/i,
  /\bdrinkware\b/i,
  /\bbookmarks?\b/i,
  /\bplanters?\b/i,
  /\btools?\b/i,
];

function passesExplicitIntentRequirements(
  intent: CatalogGiftIntent,
  product: AwinCatalogProduct,
): boolean {
  const request = `${intent.label} ${intent.description ?? ""}`;
  const evidence = `${product.title} ${product.description ?? ""}`;
  const customizationTitle = product.title.replace(
    /\bcustom message cards?\b/gi,
    " ",
  );
  if (
    /\b(?:custom|customized|engraved|personalized)\b/i.test(request) &&
    !/\b(?:custom|customized|engraved|initial|monogram|name|personalized)\b/i.test(
      customizationTitle,
    )
  ) {
    return false;
  }
  const requestedTypes = EXPLICIT_PRODUCT_TYPE_PATTERNS.filter((pattern) =>
    pattern.test(request),
  );
  return (
    requestedTypes.length === 0 ||
    requestedTypes.some((pattern) => pattern.test(evidence))
  );
}

function catalogProductFamilyKey(
  product: AwinCatalogProduct,
  advertiser: AwinAdvertiserConfig,
): string {
  if (advertiser.matchingPolicy === "giftlab-personalized") {
    return getAwinProductDiversityKey(product, advertiser);
  }
  const baseTitle = product.title
    .split(/\s+-\s+/)[0]
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\b(?:flash sale|new arrival|sale)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${product.advertiserId}:${baseTitle || product.externalProductId}`;
}

export function buildCatalogGroundedProduct(
  product: AwinCatalogProduct,
  advertiserRegistry: readonly AwinAdvertiserConfig[] = AWIN_ADVERTISERS,
): CatalogGroundedProduct | null {
  const advertiser = advertiserRegistry.find(
    (candidate) =>
      candidate.advertiserId === product.advertiserId &&
      candidate.locale === product.locale,
  );
  if (
    !advertiser?.recommendationEnabled ||
    !isApprovedAwinAdvertiserId(product.advertiserId) ||
    !product.active ||
    product.availability !== "in_stock" ||
    product.currency !== "USD" ||
    product.price <= 0
  ) {
    return null;
  }
  if (
    advertiser.requireVerifiedProductDestination &&
    (product.destinationHealthStatus !== "valid" ||
      !product.destinationCheckedAt ||
      !Number.isFinite(Date.parse(product.destinationCheckedAt)) ||
      Date.now() - Date.parse(product.destinationCheckedAt) >
        (advertiser.destinationValidationMaxAgeHours ?? 72) * 60 * 60 * 1_000)
  ) {
    return null;
  }

  const normalized = normalizeProductMatch({
    provider: "awin",
    advertiserId: product.advertiserId,
    locale: product.locale,
    productId: product.externalProductId,
    merchant: product.merchantName,
    productTitle: product.title,
    imageUrl: product.imageUrl,
    price: product.price,
    currency: product.currency,
    affiliateUrl: product.affiliateUrl,
    destinationHealthStatus: product.destinationHealthStatus,
    destinationCheckedAt: product.destinationCheckedAt,
  });
  if (
    !normalized ||
    normalized.provider !== "awin" ||
    !normalized.advertiserId ||
    !normalized.locale ||
    !normalized.imageUrl ||
    normalized.price === null ||
    normalized.currency !== "USD"
  ) {
    return null;
  }
  return normalized as CatalogGroundedProduct;
}

export function getCatalogCandidateId(product: CatalogGroundedProduct): string {
  return [
    product.provider,
    product.advertiserId,
    product.locale,
    product.productId,
  ]
    .map(encodeURIComponent)
    .join(":");
}

function getCatalogSourceProductKey(product: AwinCatalogProduct): string {
  return [product.advertiserId, product.locale, product.externalProductId]
    .map(encodeURIComponent)
    .join(":");
}

function productForMatch(
  products: AwinCatalogProduct[],
  match: ProductMatch,
): AwinCatalogProduct | null {
  return (
    products.find(
      (product) =>
        product.advertiserId === match.advertiserId &&
        product.locale === match.locale &&
        product.externalProductId === match.productId,
    ) ?? null
  );
}

function normalizeAiSelections(value: unknown): CatalogAiSelection[] {
  const raw =
    value && typeof value === "object" && "selections" in value
      ? (value as { selections?: unknown }).selections
      : value;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const selection = item as Record<string, unknown>;
    const candidateId = optionalText(selection.candidateId, 1_000);
    if (!candidateId) return [];
    return [{
      candidateId,
      explanation: optionalText(selection.explanation, 1_000),
    }];
  });
}

export async function evaluateCatalogFirstRecommendations(
  inputContext: CatalogRecommendationContext,
  dependencies: CatalogRecommendationDependencies,
): Promise<CatalogRecommendationResult> {
  const context = normalizeContext(inputContext);
  const advertiserRegistry =
    dependencies.advertiserRegistry ?? AWIN_ADVERTISERS;
  let intents = deriveDeterministicCatalogIntents(context);
  if (dependencies.planIntents) {
    try {
      const planned = normalizePlannedIntents(
        await dependencies.planIntents(context),
      );
      if (planned.length > 0) intents = planned;
    } catch {
      // Deterministic intents remain the safe fallback.
    }
  }

  const requestedCount = context.requestedCount;
  const freshness = {
    targetHours: getCatalogFreshnessTargetHours(),
    enforced: false as const,
  };
  if (intents.length === 0) {
    return {
      status: "no_results",
      recommendations: [],
      intents,
      requestedCount,
      eligibleCandidateCount: 0,
      shortlistCount: 0,
      freshness,
    };
  }

  const suggestions = intents.map((intent) => intentSuggestion(intent, context));
  const advertiserIds = getRelevantAwinAdvertiserIds(
    suggestions,
    advertiserRegistry,
  );
  if (advertiserIds.length === 0) {
    return {
      status: "no_results",
      recommendations: [],
      intents,
      requestedCount,
      eligibleCandidateCount: 0,
      shortlistCount: 0,
      freshness,
    };
  }

  const loadedProducts = await dependencies.loadProducts({
    advertiserIds,
    budgetMin: context.budgetMin,
    budgetMax: context.budgetMax,
    currency: "USD",
    maximumProducts: MAX_CATALOG_CANDIDATES,
  });
  const historicalProductKeys = new Set(context.excludedProductKeys ?? []);
  const excludedProductTitles = new Set(
    (context.excludedProductTitles ?? [])
      .map(canonicalizeGiftSuggestionText)
      .filter(Boolean),
  );
  const products = loadedProducts.filter((product) => {
    if (!buildCatalogGroundedProduct(product, advertiserRegistry)) return false;
    if (historicalProductKeys.has(getCatalogSourceProductKey(product))) {
      return false;
    }
    const canonicalTitle = canonicalizeGiftSuggestionText(product.title);
    return !canonicalTitle || !excludedProductTitles.has(canonicalTitle);
  });
  const advertiserById = new Map(
    advertiserRegistry.map((advertiser) => [advertiser.advertiserId, advertiser]),
  );
  const excludedProductKeys = new Set<string>();
  const selectedProductFamilies = new Set<string>();
  const shortlist: CatalogGroundedRecommendation[] = [];
  const shortlistTarget = Math.min(
    MAX_SHORTLIST_PRODUCTS,
    Math.max(requestedCount, requestedCount * 3),
  );

  while (shortlist.length < shortlistTarget) {
    let addedThisRound = false;
    for (let index = 0; index < intents.length; index += 1) {
      if (shortlist.length >= shortlistTarget) break;
      const compatibleProducts = products.filter((product) => {
        const advertiser = advertiserById.get(product.advertiserId);
        return (
          !!advertiser &&
          passesExplicitIntentRequirements(intents[index], product) &&
          !selectedProductFamilies.has(
            catalogProductFamilyKey(product, advertiser),
          )
        );
      });
      const match = findBestAwinProductMatch({
        suggestion: suggestions[index],
        recipientInterests: context.recipient.interests,
        products: compatibleProducts,
        budgetMin: context.budgetMin,
        budgetMax: context.budgetMax,
        advertiserRegistry,
        excludedProductKeys,
        occasion: context.occasion,
        recipientRelationship: context.recipientRelationship,
      });
      if (!match) continue;
      const sourceProduct = productForMatch(products, match);
      const grounded = sourceProduct
        ? buildCatalogGroundedProduct(sourceProduct, advertiserRegistry)
        : null;
      const advertiser = sourceProduct
        ? advertiserById.get(sourceProduct.advertiserId)
        : null;
      if (!sourceProduct || !grounded || !advertiser) continue;

      excludedProductKeys.add(
        getAwinProductDiversityKey(sourceProduct, advertiser),
      );
      selectedProductFamilies.add(
        catalogProductFamilyKey(sourceProduct, advertiser),
      );
      shortlist.push({
        candidateId: getCatalogCandidateId(grounded),
        product: grounded,
        active: true,
        availability: "in_stock",
        explanation: null,
        matchedIntent: intents[index].label,
      });
      addedThisRound = true;
    }
    if (!addedThisRound) break;
  }

  if (shortlist.length === 0) {
    return {
      status: "no_results",
      recommendations: [],
      intents,
      requestedCount,
      eligibleCandidateCount: products.length,
      shortlistCount: 0,
      freshness,
    };
  }

  let recommendations = shortlist.slice(0, requestedCount);
  if (dependencies.selectCandidates) {
    try {
      const response = await dependencies.selectCandidates({
        context,
        candidates: shortlist.map((candidate) => ({
          candidateId: candidate.candidateId,
          title: candidate.product.productTitle,
          description:
            productForMatch(products, candidate.product)?.description ?? null,
          merchant: candidate.product.merchant,
          price: candidate.product.price,
          currency: candidate.product.currency,
          matchedIntent: candidate.matchedIntent,
        })),
        requestedCount,
      });
      const byId = new Map(
        shortlist.map((candidate) => [candidate.candidateId, candidate]),
      );
      const selectedIds = new Set<string>();
      const selected = normalizeAiSelections(response).flatMap((selection) => {
        const candidate = byId.get(selection.candidateId);
        if (!candidate || selectedIds.has(selection.candidateId)) return [];
        selectedIds.add(selection.candidateId);
        return [{ ...candidate, explanation: selection.explanation ?? null }];
      });
      if (selected.length > 0) {
        recommendations = selected.slice(0, requestedCount);
      }
    } catch {
      // Deterministic ranking remains the safe fallback.
    }
  }

  return {
    status: "success",
    recommendations,
    intents,
    requestedCount,
    eligibleCandidateCount: products.length,
    shortlistCount: shortlist.length,
    freshness,
  };
}

export function isCatalogFirstRecommendationsEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return environment.GIFTPERCH_CATALOG_FIRST_RECOMMENDATIONS === "true";
}

export function getCatalogFreshnessTargetHours(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = Number(
    environment.GIFTPERCH_CATALOG_FRESHNESS_HOURS ??
      DEFAULT_FRESHNESS_TARGET_HOURS,
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_FRESHNESS_TARGET_HOURS;
}

export async function runCatalogFirstRecommendations(args: {
  context: CatalogRecommendationContext;
  supabase: SupabaseClient;
  planIntents?: CatalogIntentPlanner;
  selectCandidates?: CatalogCandidateSelector;
}): Promise<CatalogRecommendationResult | { status: "disabled" }> {
  if (!isCatalogFirstRecommendationsEnabled()) {
    return { status: "disabled" };
  }
  return evaluateCatalogFirstRecommendations(args.context, {
    loadProducts: (options) =>
      loadAwinProductCandidates(args.supabase, options),
    planIntents: args.planIntents,
    selectCandidates: args.selectCandidates,
  });
}
