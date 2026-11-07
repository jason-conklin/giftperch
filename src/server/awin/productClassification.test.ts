import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_CLASSIFICATION_VERSION,
  classifyAffiliateProduct,
  extractStoredSourceCategory,
} from "./productClassification";

test("recovers the preserved legacy source category without treating notes as categories", () => {
  assert.equal(
    extractStoredSourceCategory("Category: Jewelry. Custom pendant."),
    "Jewelry",
  );
  assert.equal(extractStoredSourceCategory("Category: Personalized\nCustom mug."), null);
  assert.equal(extractStoredSourceCategory("A category: Jewelry gift."), null);
});

test("classifies Giftlab personalized gifts without relying on generic gift language", () => {
  const result = classifyAffiliateProduct({
    advertiserId: "95201",
    title: "Personalized Photo Mug for Dad",
    description: "The perfect unique gift for every occasion.",
    rawMerchantCategory: "Personalized",
  });

  assert.equal(result.primaryCategory, "personalized_gifts");
  assert.deepEqual(result.facets, ["drinkware", "personalized", "photo_gift"]);
  assert.equal(result.confidence, "high");
  assert.equal(result.classificationVersion, PRODUCT_CLASSIFICATION_VERSION);
});

test("uses Giftlab merchant categories only where they add meaningful evidence", () => {
  const result = classifyAffiliateProduct({
    advertiserId: "95201",
    title: "Simple Canvas Tote",
    rawMerchantCategory: "Accessories",
  });

  assert.equal(result.primaryCategory, "other");
  assert.deepEqual(result.facets, []);
  assert.equal(result.confidence, "low");
});

test("classifies Piscifun fishing product types and preserves multiple facets", () => {
  const result = classifyAffiliateProduct({
    advertiserId: "89509",
    title: "Piscifun Carbon Spinning Fishing Reel and Tackle Bag",
    description: "Built for freshwater anglers.",
  });

  assert.equal(result.primaryCategory, "sports_outdoors");
  assert.deepEqual(result.facets, ["fishing", "reel", "tackle"]);
  assert.equal(result.confidence, "high");
});

test("does not classify a generic marketing fishing reference as a fishing product", () => {
  const result = classifyAffiliateProduct({
    title: "Insulated Travel Tumbler",
    description: "A great gift for fishing enthusiasts and everyone else.",
  });

  assert.equal(result.primaryCategory, "home_kitchen");
  assert.deepEqual(result.facets, ["drinkware"]);
});

test("classifies Crown and Paw pet portraits from concrete title evidence", () => {
  const result = classifyAffiliateProduct({
    advertiserId: "57823",
    title: "The Cowboy - Custom Pet Poster - 12 x 16 / Unframed",
    description: "Upload a pet photo for a custom portrait.",
  });

  assert.equal(result.primaryCategory, "pets");
  assert.deepEqual(result.facets, ["personalized", "photo_gift"]);
  assert.equal(result.confidence, "high");
});

test("classifies BONHEUR jewelry types independently of the merchant", () => {
  const result = classifyAffiliateProduct({
    advertiserId: "90759",
    title: "Gold Initial Necklace with Crystal Charm",
    description: "An elegant jewelry piece.",
  });

  assert.equal(result.primaryCategory, "jewelry_accessories");
  assert.deepEqual(result.facets, ["engraved", "necklace"]);
  assert.equal(result.confidence, "high");
});

test("classifies LoveIsARose preserved roses and occasion facets from product evidence", () => {
  const result = classifyAffiliateProduct({
    advertiserId: "96879",
    title: "24k Gold Dipped Rose in Personalized Anniversary Case",
    description: "Category: Arts & Entertainment > Party & Celebration > Gift Giving.",
    rawMerchantCategory: "Arts & Entertainment > Party & Celebration > Gift Giving",
  });

  assert.equal(result.primaryCategory, "flowers_romantic");
  assert.deepEqual(result.facets, ["anniversary", "personalized", "preserved_rose"]);
  assert.equal(result.confidence, "high");
});

test("classifies office furniture and sleep products from concrete title evidence", () => {
  const chair = classifyAffiliateProduct({
    advertiserId: "122512",
    title: "Resistance Color Ergonomic Office Chair - Green",
  });
  const pillowcase = classifyAffiliateProduct({
    advertiserId: "100833",
    title: "Mulberry Silk Pillowcase - Queen / Champagne",
  });
  const puzzle = classifyAffiliateProduct({
    advertiserId: "125856",
    title: "Mechanical Wooden Jigsaw Puzzle - Dragon",
  });

  assert.equal(chair.primaryCategory, "home_kitchen");
  assert.deepEqual(chair.facets, ["home_decor"]);
  assert.equal(pillowcase.primaryCategory, "home_kitchen");
  assert.deepEqual(pillowcase.facets, ["bedding"]);
  assert.equal(puzzle.primaryCategory, "hobbies_entertainment");
  assert.deepEqual(puzzle.facets, ["gaming"]);
});

test("classifies cycling and model-display accessories from concrete title evidence", () => {
  const cycling = classifyAffiliateProduct({
    advertiserId: "58007",
    title: "ROCKBROS Mini Bike Tire Pump 150PSI",
  });
  const display = classifyAffiliateProduct({
    advertiserId: "129093",
    title: "Wall Display Frame Compatible with LEGO Technic Racing Set",
  });

  assert.equal(cycling.primaryCategory, "sports_outdoors");
  assert.deepEqual(cycling.facets, ["cycling"]);
  assert.equal(display.primaryCategory, "hobbies_entertainment");
  assert.deepEqual(display.facets, ["display_accessory", "model_building"]);
});

test("classifies real gold-trimmed rose and jewelry-title variants from title evidence", () => {
  const rose = classifyAffiliateProduct({
    advertiserId: "96879",
    title: '11" 24k Gold Trimmed Velvet Lavender Rose',
  });
  const chain = classifyAffiliateProduct({
    advertiserId: "90759",
    title: "Lucile Gold Round Snake Chain - 18k Gold Plated",
  });

  assert.equal(rose.primaryCategory, "flowers_romantic");
  assert.equal(rose.confidence, "high");
  assert.deepEqual(rose.facets, ["preserved_rose"]);
  assert.equal(chain.primaryCategory, "jewelry_accessories");
  assert.deepEqual(chain.facets, ["necklace"]);
});

test("keeps generic merchant gift categories from overclassifying products", () => {
  const result = classifyAffiliateProduct({
    advertiserId: "96879",
    title: "Limited Edition Keepsake Box",
    rawMerchantCategory: "Arts & Entertainment > Party & Celebration > Gift Giving",
  });

  assert.equal(result.primaryCategory, "other");
  assert.deepEqual(result.facets, []);
});

test("supports multi-category products while choosing the strongest primary category", () => {
  const result = classifyAffiliateProduct({
    title: "Personalized Pet Grooming Brush",
    description: "Custom name engraving available.",
  });

  assert.equal(result.primaryCategory, "pets");
  assert.deepEqual(result.facets, ["engraved", "personalized", "pet_grooming"]);
});

test("returns other with low confidence for unknown products", () => {
  const result = classifyAffiliateProduct({
    title: "Premium Everyday Essential",
    description: "A thoughtful, unique, perfect gift.",
  });

  assert.equal(result.primaryCategory, "other");
  assert.deepEqual(result.facets, []);
  assert.equal(result.confidence, "low");
  assert.deepEqual(result.evidence, []);
});

test("returns identical classifications for identical input", () => {
  const input = {
    advertiserId: "89509",
    title: "Piscifun Fish Lip Gripper with Digital Scale",
    description: "A durable fishing accessory.",
  };

  assert.deepEqual(
    classifyAffiliateProduct(input),
    classifyAffiliateProduct(input),
  );
  assert.equal(classifyAffiliateProduct(input).primaryCategory, "sports_outdoors");
});
