import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductTourCarouselDurationMs,
  PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND,
  shouldAutoplayProductTourCarousel,
} from "./productTourCarouselMotion";

test("derives a linear marquee duration from the measured sequence width", () => {
  assert.equal(PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND, 22);
  assert.equal(getProductTourCarouselDurationMs(1_100), 50_000);
  assert.equal(getProductTourCarouselDurationMs(0), 0);
  assert.equal(getProductTourCarouselDurationMs(Number.NaN), 0);
});

test("starts the marquee only when the visible carousel is not paused", () => {
  const ready = {
    cycleWidth: 1_100,
    documentVisible: true,
    isDragging: false,
    isFocusWithin: false,
    isManuallyPaused: false,
    reducedMotion: false,
  };

  assert.equal(shouldAutoplayProductTourCarousel(ready), true);
  assert.equal(shouldAutoplayProductTourCarousel({ ...ready, isFocusWithin: true }), false);
  assert.equal(shouldAutoplayProductTourCarousel({ ...ready, isDragging: true }), false);
  assert.equal(shouldAutoplayProductTourCarousel({ ...ready, isManuallyPaused: true }), false);
  assert.equal(shouldAutoplayProductTourCarousel({ ...ready, reducedMotion: true }), false);
  assert.equal(shouldAutoplayProductTourCarousel({ ...ready, documentVisible: false }), false);
  assert.equal(shouldAutoplayProductTourCarousel({ ...ready, cycleWidth: 0 }), false);
});
