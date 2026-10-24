export function canAutoRotateProductTourProfile({
  manualPauseUntil,
  now,
  prefersReducedMotion,
}: {
  manualPauseUntil: number;
  now: number;
  prefersReducedMotion: boolean;
}): boolean {
  return !prefersReducedMotion && manualPauseUntil <= now;
}

export function normalizeProductTourProfileIndex(
  selectedIndex: number,
  profileCount: number,
): number {
  if (profileCount <= 0) return 0;
  return ((selectedIndex % profileCount) + profileCount) % profileCount;
}
