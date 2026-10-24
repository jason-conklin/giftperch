import assert from "node:assert/strict";
import test from "node:test";
import {
  canAutoRotateProductTourProfile,
  normalizeProductTourProfileIndex,
} from "./productTourRotation";

test("keeps profile rotation eligible without a hover state", () => {
  assert.equal(
    canAutoRotateProductTourProfile({
      manualPauseUntil: 0,
      now: 1_000,
      prefersReducedMotion: false,
    }),
    true,
  );
});

test("pauses profile rotation only for manual selection and reduced motion", () => {
  assert.equal(
    canAutoRotateProductTourProfile({
      manualPauseUntil: 1_500,
      now: 1_000,
      prefersReducedMotion: false,
    }),
    false,
  );
  assert.equal(
    canAutoRotateProductTourProfile({
      manualPauseUntil: 0,
      now: 1_000,
      prefersReducedMotion: true,
    }),
    false,
  );
});

test("normalizes manual recipient selection to an available profile", () => {
  assert.equal(normalizeProductTourProfileIndex(1, 3), 1);
  assert.equal(normalizeProductTourProfileIndex(-1, 3), 2);
  assert.equal(normalizeProductTourProfileIndex(4, 3), 1);
});
