import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceProductTourCarouselScroll,
  PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND,
} from "./productTourCarouselMotion";

test("advances the Product Tour carousel continuously from elapsed time", () => {
  assert.equal(PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND, 14);
  assert.equal(
    advanceProductTourCarouselScroll({
      scrollLeft: 500,
      elapsedMs: 1_000,
      cycleWidth: 500,
    }),
    501.4,
  );
});

test("wraps the Product Tour carousel between equivalent repeated sets", () => {
  assert.equal(
    advanceProductTourCarouselScroll({
      scrollLeft: 999,
      elapsedMs: 1_000,
      cycleWidth: 500,
    }),
    500.4,
  );
});

test("caps long frames so a restored tab does not visibly jump", () => {
  assert.equal(
    advanceProductTourCarouselScroll({
      scrollLeft: 500,
      elapsedMs: 5_000,
      cycleWidth: 500,
    }),
    501.4,
  );
});
