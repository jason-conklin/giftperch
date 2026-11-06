import {
  classifyAffiliateProduct,
  type ProductFacet,
} from "./productClassification";

const MAX_RETRIEVAL_FACETS = 12;
const MAX_RETRIEVAL_TEXTS = 24;
const MAX_RETRIEVAL_TEXT_LENGTH = 500;

type RequestFacetRule = {
  pattern: RegExp;
  facets: readonly ProductFacet[];
};

// These request-side aliases complement the product classifier. They improve
// recall for natural-language intent while the deterministic matcher remains
// responsible for deciding whether a returned product is actually suitable.
const REQUEST_FACET_RULES: readonly RequestFacetRule[] = [
  { pattern: /\b(?:romantic|romance|spouse|partner|wife|husband|girlfriend|boyfriend|fianc)/i, facets: ["preserved_rose", "bouquet", "personalized"] },
  { pattern: /\b(?:cat|dog|pet)\b/i, facets: ["pet_grooming", "photo_gift", "personalized"] },
  { pattern: /\b(?:angler|angling|fish|fishing)\b/i, facets: ["fishing", "reel", "rod", "tackle"] },
  { pattern: /\b(?:jewellery|jewelry)\b/i, facets: ["necklace", "bracelet", "ring", "earrings"] },
  { pattern: /\b(?:coffee|tea)\b/i, facets: ["drinkware"] },
  { pattern: /\b(?:sleep|sleeping|pillowcases?|bedding|silk pillow)\b/i, facets: ["bedding"] },
  { pattern: /\b(?:ergonomic|(?:office )?chairs?|standing desks?|sit[- ]stand|monitor arms?)\b/i, facets: ["home_decor"] },
  { pattern: /\b(?:reading|reader|books?)\b/i, facets: ["reading"] },
  { pattern: /\b(?:gaming|gamer)\b/i, facets: ["gaming"] },
  { pattern: /\b(?:jigsaw|mechanical)?\s*puzzles?\b/i, facets: ["gaming"] },
  { pattern: /\b(?:technology|tech|phone|computer)\b/i, facets: ["tech_accessory"] },
];

function normalizedText(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_RETRIEVAL_TEXT_LENGTH);
}

/**
 * Converts bounded request context into product facets. Facets are a recall
 * mechanism only: callers still run the normal deterministic product matcher.
 */
export function deriveCatalogRetrievalFacets(
  texts: readonly (string | null | undefined)[],
): ProductFacet[] {
  const facets: ProductFacet[] = [];
  const add = (facet: ProductFacet) => {
    if (!facets.includes(facet) && facets.length < MAX_RETRIEVAL_FACETS) {
      facets.push(facet);
    }
  };

  for (const value of texts.slice(0, MAX_RETRIEVAL_TEXTS)) {
    if (typeof value !== "string") continue;
    const text = normalizedText(value);
    if (!text) continue;

    for (const facet of classifyAffiliateProduct({ title: text }).facets) {
      add(facet);
    }
    for (const rule of REQUEST_FACET_RULES) {
      if (rule.pattern.test(text)) {
        for (const facet of rule.facets) add(facet);
      }
    }
  }

  return facets;
}

export function catalogRetrievalSelectionSeed(
  texts: readonly (string | null | undefined)[],
  facets: readonly ProductFacet[],
): string {
  const context = texts
    .slice(0, MAX_RETRIEVAL_TEXTS)
    .filter((value): value is string => typeof value === "string")
    .map(normalizedText)
    .filter(Boolean)
    .join("|");
  return `${facets.join(",")}|${context}`.slice(0, 2_000);
}
