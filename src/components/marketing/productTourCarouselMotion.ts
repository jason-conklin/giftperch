export const PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND = 22;
export const PRODUCT_TOUR_DRAG_THRESHOLD_PX = 5;

export function hasProductTourCarouselDragged(distance: number): boolean {
  return Math.abs(distance) > PRODUCT_TOUR_DRAG_THRESHOLD_PX;
}

export function getProductTourCarouselDurationMs(cycleWidth: number): number {
  if (!Number.isFinite(cycleWidth) || cycleWidth <= 0) return 0;
  return Math.round(
    (cycleWidth / PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND) * 1_000,
  );
}

export function shouldAutoplayProductTourCarousel({
  cycleWidth,
  documentVisible,
  isDragging,
  isFocusWithin,
  isManuallyPaused,
  reducedMotion,
}: {
  cycleWidth: number;
  documentVisible: boolean;
  isDragging: boolean;
  isFocusWithin: boolean;
  isManuallyPaused: boolean;
  reducedMotion: boolean;
}): boolean {
  return (
    cycleWidth > 0 &&
    documentVisible &&
    !isDragging &&
    !isFocusWithin &&
    !isManuallyPaused &&
    !reducedMotion
  );
}
