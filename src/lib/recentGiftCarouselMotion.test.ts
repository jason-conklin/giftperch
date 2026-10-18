import assert from "node:assert/strict";
import test from "node:test";
import {
  getContinuousScrollDelta,
  wrapContinuousScrollPosition,
} from "./recentGiftCarouselMotion";

test("computes frame-rate-independent movement at thirty pixels per second", () => {
  assert.equal(getContinuousScrollDelta(1000 / 60), 0.5);
  assert.equal(getContinuousScrollDelta(50), 1.5);
  assert.equal(getContinuousScrollDelta(0), 0);
});

test("caps long frame gaps so a restored tab cannot jump", () => {
  assert.equal(getContinuousScrollDelta(1000), 3);
});

test("wraps equivalent positions into the interactive middle card set", () => {
  assert.equal(wrapContinuousScrollPosition(2200, 1000, 1200), 1000);
  assert.equal(wrapContinuousScrollPosition(700, 1000, 1200), 1900);
  assert.equal(wrapContinuousScrollPosition(1450, 1000, 1200), 1450);
});
