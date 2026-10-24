import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  PRODUCT_TOUR_IDEA_COUNT,
  PRODUCT_TOUR_PROFILES,
} from "./productTourDemoData";

test("Product Tour provides six local sample gift ideas for each recipient", () => {
  assert.deepEqual(
    PRODUCT_TOUR_PROFILES.map((profile) => profile.id),
    ["maya", "mocha", "dad"],
  );

  for (const profile of PRODUCT_TOUR_PROFILES) {
    assert.equal(profile.ideas.length, PRODUCT_TOUR_IDEA_COUNT);
    assert.equal(new Set(profile.ideas.map((idea) => idea.id)).size, PRODUCT_TOUR_IDEA_COUNT);
    assert.ok(profile.ideas.every((idea) => idea.price.startsWith("$")));
    assert.ok(profile.ideas.every((idea) => !idea.imageSrc.includes("://")));
  }
});

test("Product Tour preview paths resolve to the supplied local assets", () => {
  for (const profile of PRODUCT_TOUR_PROFILES) {
    for (const idea of profile.ideas) {
      assert.ok(
        existsSync(path.join(process.cwd(), "public", idea.imageSrc)),
        `${profile.id}:${idea.id} image is missing`,
      );
    }
  }
});

test("Product Tour uses the intended illustrative product names", () => {
  assert.deepEqual(
    Object.fromEntries(
      PRODUCT_TOUR_PROFILES.map((profile) => [
        profile.id,
        profile.ideas.map((idea) => idea.title),
      ]),
    ),
    {
      maya: [
        "Solenne Amber Glow Candle",
        "Northline Everyday Backpack",
        "Lumiere Radiance Skincare Set",
        "MiraBelle Insulated Tumbler",
        "Veloura Essential Brush Set",
        "Hearthvale Cozy Knit Throw",
      ],
      mocha: [
        "Pawlio Squeaky Play Balls",
        "PurrNest Cloud Donut Bed",
        "Wagwell Treat Puzzle",
        "TrailPup Adventure Harness",
        "Bark & Bloom Gourmet Bites",
        "TrailPup Travel Water Bottle",
      ],
      dad: [
        "GrillForge Digital Thermometer",
        "Roastwell Signature Coffee Sampler",
        "Sonivo Portable Bluetooth Speaker",
        "Castline Tackle Organizer",
        "Oakmont Classic Leather Wallet",
        "GrillForge BBQ Tool Set",
      ],
    },
  );
});
