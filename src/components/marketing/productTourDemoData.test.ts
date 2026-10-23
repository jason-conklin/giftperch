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
