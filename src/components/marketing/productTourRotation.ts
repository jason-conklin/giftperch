export const PRODUCT_TOUR_RECIPIENT_CYCLE_DURATION_MS = 9_000;

export function getNextProductTourProfileIndex(
  activeIndex: number,
  profileCount: number,
): number {
  return normalizeProductTourProfileIndex(activeIndex + 1, profileCount);
}

export function normalizeProductTourProfileIndex(
  selectedIndex: number,
  profileCount: number,
): number {
  if (profileCount <= 0) return 0;
  return ((selectedIndex % profileCount) + profileCount) % profileCount;
}
