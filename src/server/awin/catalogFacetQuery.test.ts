import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogRetrievalSelectionSeed,
  deriveCatalogRetrievalFacets,
} from "./catalogFacetQuery";

test("derives concrete fishing facets from natural recipient language", () => {
  assert.deepEqual(
    deriveCatalogRetrievalFacets(["A thoughtful gift for an avid angler"]),
    ["fishing", "reel", "rod", "tackle"],
  );
});

test("keeps primary categories out of facet retrieval while preserving cross-category interests", () => {
  const facets = deriveCatalogRetrievalFacets([
    "Personalized fishing mug for a partner",
  ]);
  assert.ok(facets.includes("personalized"));
  assert.ok(facets.includes("drinkware"));
  assert.ok(facets.includes("fishing"));
  assert.ok(facets.includes("reel"));
});

test("derives preserved-rose retrieval for romantic language without generic gift expansion", () => {
  assert.ok(
    deriveCatalogRetrievalFacets(["Anniversary gift for my spouse"])
      .includes("preserved_rose"),
  );
  assert.deepEqual(deriveCatalogRetrievalFacets(["A nice gift"]), []);
});

test("retrieves personalized photo gifts for pet-owner language", () => {
  const facets = deriveCatalogRetrievalFacets(["A custom portrait for a dog owner"]);
  assert.ok(facets.includes("photo_gift"));
  assert.ok(facets.includes("personalized"));
});

test("derives bounded bedding, office, and puzzle facets from explicit requests", () => {
  assert.ok(
    deriveCatalogRetrievalFacets(["A silk pillowcase for better sleep"])
      .includes("bedding"),
  );
  assert.ok(
    deriveCatalogRetrievalFacets(["An ergonomic office chair"])
      .includes("home_decor"),
  );
  assert.ok(
    deriveCatalogRetrievalFacets(["A mechanical dragon puzzle"])
      .includes("gaming"),
  );
});

test("uses a bounded stable retrieval seed", () => {
  const facets = deriveCatalogRetrievalFacets(["Fishing reel"]);
  const first = catalogRetrievalSelectionSeed(["Fishing reel"], facets);
  assert.equal(first, catalogRetrievalSelectionSeed(["Fishing reel"], facets));
  assert.ok(first.length < 2_000);
});
