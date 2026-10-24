export const PRODUCT_TOUR_AUTO_SCROLL_PIXELS_PER_SECOND = 22;

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
  isHovered,
  isManuallyPaused,
  reducedMotion,
}: {
  cycleWidth: number;
  documentVisible: boolean;
  isDragging: boolean;
  isFocusWithin: boolean;
  isHovered: boolean;
  isManuallyPaused: boolean;
  reducedMotion: boolean;
}): boolean {
  return (
    cycleWidth > 0 &&
    documentVisible &&
    !isDragging &&
    !isFocusWithin &&
    !isHovered &&
    !isManuallyPaused &&
    !reducedMotion
  );
}
