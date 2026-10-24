export const PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND = 14;

export function advanceProductTourCarouselScroll(args: {
  scrollLeft: number;
  elapsedMs: number;
  cycleWidth: number;
}): number {
  const { scrollLeft, cycleWidth } = args;
  if (!Number.isFinite(scrollLeft) || cycleWidth <= 0) return scrollLeft;

  const elapsedMs = Math.min(Math.max(args.elapsedMs, 0), 100);
  let next =
    scrollLeft +
    (PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND * elapsedMs) / 1_000;

  // The viewport begins at the middle copy. Returning by one full copy keeps
  // the same card at the same visual offset when the third copy is reached.
  while (next >= cycleWidth * 2) {
    next -= cycleWidth;
  }

  return next;
}
