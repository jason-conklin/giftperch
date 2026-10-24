import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextProductTourProfileIndex,
  normalizeProductTourProfileIndex,
  PRODUCT_TOUR_RECIPIENT_CYCLE_DURATION_MS,
} from "./productTourRotation";

test("uses one nine-second cycle for each Product Tour recipient", () => {
  assert.equal(PRODUCT_TOUR_RECIPIENT_CYCLE_DURATION_MS, 9_000);
});

test("cycles Maya, Mocha, Dad, then Maya", () => {
  assert.equal(getNextProductTourProfileIndex(0, 3), 1);
  assert.equal(getNextProductTourProfileIndex(1, 3), 2);
  assert.equal(getNextProductTourProfileIndex(2, 3), 0);
});

test("normalizes manual recipient selection to an available profile", () => {
  assert.equal(normalizeProductTourProfileIndex(1, 3), 1);
  assert.equal(normalizeProductTourProfileIndex(-1, 3), 2);
  assert.equal(normalizeProductTourProfileIndex(4, 3), 1);
});
