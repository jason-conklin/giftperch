export const RECENT_GIFT_AUTOPLAY_SPEED_PX_PER_SECOND = 30;

export type RecentGiftAutoplayState = {
  canScroll: boolean;
  isDragging: boolean;
  manualPause: boolean;
  isDocumentHidden: boolean;
  reducedMotion: boolean;
};

export function shouldStartRecentGiftDrag({
  canScroll,
  isPrimaryMouseButton,
  isInteractiveTarget,
}: {
  canScroll: boolean;
  isPrimaryMouseButton: boolean;
  isInteractiveTarget: boolean;
}) {
  return canScroll && isPrimaryMouseButton && !isInteractiveTarget;
}

export function shouldRunRecentGiftAutoplay({
  canScroll,
  isDragging,
  manualPause,
  isDocumentHidden,
  reducedMotion,
}: RecentGiftAutoplayState) {
  return (
    canScroll &&
    !isDragging &&
    !manualPause &&
    !isDocumentHidden &&
    !reducedMotion
  );
}

export function getContinuousScrollDelta(
  elapsedMs: number,
  speed = RECENT_GIFT_AUTOPLAY_SPEED_PX_PER_SECOND,
) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return speed * (Math.min(elapsedMs, 100) / 1000);
}

export function advanceContinuousScrollPosition(
  position: number,
  elapsedMs: number,
) {
  return position + getContinuousScrollDelta(elapsedMs);
}

export function wrapContinuousScrollPosition(
  position: number,
  middleStart: number,
  setWidth: number,
) {
  if (!Number.isFinite(position) || setWidth <= 0) return position;
  let wrapped = position;
  while (wrapped >= middleStart + setWidth) wrapped -= setWidth;
  while (wrapped < middleStart) wrapped += setWidth;
  return wrapped;
}
