"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  RECENT_GIFT_IMAGE_FALLBACK,
  type RecentGiftCardModel,
} from "@/lib/dashboardRecentGifts";
import styles from "./RecentGiftIdeasCarousel.module.css";

const AUTOPLAY_INTERVAL_MS = 5000;
const MANUAL_IDLE_MS = 7000;
const DRAG_THRESHOLD_PX = 7;
const MAX_DOTS = 5;

type DragState = {
  pointerId: number;
  pointerType: string;
  startX: number;
  startScrollLeft: number;
};

function ProductImage({ title, src }: { title: string; src: string }) {
  const [imageSrc, setImageSrc] = useState(src);

  return (
    <Image
      src={imageSrc}
      alt={imageSrc === RECENT_GIFT_IMAGE_FALLBACK ? "Gift idea placeholder" : title}
      fill
      sizes="(min-width: 1536px) 18vw, (min-width: 768px) 28vw, 82vw"
      className="object-contain p-2"
      unoptimized={imageSrc.startsWith("https://")}
      draggable={false}
      onError={() => setImageSrc(RECENT_GIFT_IMAGE_FALLBACK)}
    />
  );
}

function RecipientAvatar({ gift }: { gift: RecentGiftCardModel }) {
  const [failed, setFailed] = useState(false);
  const avatar = gift.recipientAvatar;

  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gp-app-gold/45 bg-[#eef4e9] text-[11px] font-bold text-gp-app-evergreen">
      {avatar.kind === "image" && !failed ? (
        <Image
          src={avatar.src}
          alt=""
          fill
          sizes="32px"
          className="object-cover"
          unoptimized={avatar.src.startsWith("https://")}
          onError={() => setFailed(true)}
        />
      ) : avatar.kind === "image" ? (
        avatar.fallbackInitials
      ) : (
        avatar.initials
      )}
    </span>
  );
}

function GiftCard({ gift }: { gift: RecentGiftCardModel }) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-gp-app-evergreen/10 bg-white shadow-[0_7px_20px_rgba(15,61,62,0.045)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f7f4eb]">
        <ProductImage title={gift.title} src={gift.imageUrl} />
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-gp-app-evergreen">
          {gift.title}
        </h3>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="text-sm font-bold text-gp-app-evergreen">
            {gift.price}
          </span>
          {gift.merchant ? (
            <span className="max-w-full truncate text-[11px] text-gp-app-muted">
              {gift.merchant}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-gp-app-evergreen/8 pt-2.5">
          <RecipientAvatar gift={gift} />
          <span className="min-w-0 truncate text-xs font-medium text-gp-app-evergreen/80">
            {gift.recipientName ? `For ${gift.recipientName}` : "Recipient unavailable"}
          </span>
        </div>
        <Link
          href="/history"
          draggable={false}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-gp-app-evergreen px-3 py-2 text-xs font-semibold text-white transition hover:bg-gp-app-evergreen-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
        >
          View saved idea
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function RecentGiftIdeasCarousel({
  gifts,
}: {
  gifts: RecentGiftCardModel[];
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const draggedRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const repeatedGifts = canScroll ? [...gifts, ...gifts, ...gifts] : gifts;

  const cards = useCallback(() => {
    const viewport = viewportRef.current;
    return viewport
      ? Array.from(
          viewport.querySelectorAll<HTMLElement>("[data-recent-gift-card]"),
        )
      : [];
  }, []);

  const nearestPhysicalIndex = useCallback(() => {
    const viewport = viewportRef.current;
    const elements = cards();
    if (!viewport || !elements.length) return 0;
    return elements.reduce((nearest, element, index) => {
      const nearestDistance = Math.abs(
        elements[nearest].offsetLeft - viewport.scrollLeft,
      );
      const distance = Math.abs(element.offsetLeft - viewport.scrollLeft);
      return distance < nearestDistance ? index : nearest;
    }, 0);
  }, [cards]);

  const scrollToPhysical = useCallback(
    (physicalIndex: number, behavior: ScrollBehavior = "smooth") => {
      const viewport = viewportRef.current;
      const elements = cards();
      const target = elements[physicalIndex];
      if (!viewport || !target) return;
      viewport.scrollTo({ left: target.offsetLeft, behavior });
    },
    [cards],
  );

  const settle = useCallback(() => {
    if (!gifts.length) return;
    let physicalIndex = nearestPhysicalIndex();
    const logicalIndex = physicalIndex % gifts.length;
    setActiveIndex(logicalIndex);

    if (canScroll && (physicalIndex < gifts.length || physicalIndex >= gifts.length * 2)) {
      physicalIndex = gifts.length + logicalIndex;
      scrollToPhysical(physicalIndex, "auto");
    } else {
      scrollToPhysical(physicalIndex, reducedMotion ? "auto" : "smooth");
    }
  }, [canScroll, gifts.length, nearestPhysicalIndex, reducedMotion, scrollToPhysical]);

  const pauseTemporarily = useCallback(() => {
    setManualPause(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setManualPause(false), MANUAL_IDLE_MS);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const firstCard = cards()[0];
      if (!firstCard || gifts.length <= 1) {
        setCanScroll(false);
        return;
      }
      const track = firstCard.parentElement;
      const gap = track ? Number.parseFloat(getComputedStyle(track).gap) || 0 : 0;
      const uniqueWidth = firstCard.offsetWidth * gifts.length + gap * (gifts.length - 1);
      setCanScroll(uniqueWidth > viewport.clientWidth + 1);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    measure();
    return () => observer.disconnect();
  }, [cards, gifts.length]);

  useLayoutEffect(() => {
    if (!canScroll || !gifts.length) return;
    const frame = requestAnimationFrame(() => scrollToPhysical(gifts.length, "auto"));
    return () => cancelAnimationFrame(frame);
  }, [canScroll, gifts.length, scrollToPhysical]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(media.matches);
    const syncVisibility = () => setIsDocumentHidden(document.hidden);
    syncMotion();
    syncVisibility();
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      media.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (
      !canScroll ||
      reducedMotion ||
      isHovered ||
      hasFocus ||
      isDragging ||
      manualPause ||
      isDocumentHidden
    ) {
      return;
    }
    const timer = setInterval(() => {
      scrollToPhysical(nearestPhysicalIndex() + 1);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [
    canScroll,
    hasFocus,
    isDocumentHidden,
    isDragging,
    isHovered,
    manualPause,
    nearestPhysicalIndex,
    reducedMotion,
    scrollToPhysical,
  ]);

  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );

  const scheduleSettle = () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(settle, 140);
  };

  const move = (direction: -1 | 1) => {
    pauseTemporarily();
    scrollToPhysical(nearestPhysicalIndex() + direction);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || !canScroll) return;
    dragRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
    };
    draggedRef.current = false;
    setIsDragging(true);
    if (event.pointerType === "mouse") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) >= DRAG_THRESHOLD_PX) draggedRef.current = true;
    if (drag.pointerType === "mouse") {
      event.currentTarget.scrollLeft = drag.startScrollLeft - delta;
    }
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    pauseTemporarily();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    settle();
  };

  const dotIndexes = Array.from(
    { length: Math.min(gifts.length, MAX_DOTS) },
    (_, offset) => {
      if (gifts.length <= MAX_DOTS) return offset;
      const start = Math.min(
        Math.max(activeIndex - Math.floor(MAX_DOTS / 2), 0),
        gifts.length - MAX_DOTS,
      );
      return start + offset;
    },
  );

  return (
    <div
      className={styles.carousel}
      aria-roledescription="carousel"
      aria-label="Recent saved gift ideas"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
    >
      <div
        ref={viewportRef}
        className={`${styles.viewport} ${isDragging ? styles.viewportDragging : ""}`}
        onScroll={scheduleSettle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        onClickCapture={(event) => {
          if (!draggedRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          draggedRef.current = false;
        }}
      >
        <div className={styles.track}>
          {repeatedGifts.map((gift, physicalIndex) => {
            const isClone = canScroll && (physicalIndex < gifts.length || physicalIndex >= gifts.length * 2);
            return (
              <div
                key={`${gift.id}-${physicalIndex}`}
                data-recent-gift-card
                className={styles.card}
                aria-hidden={isClone || undefined}
                inert={isClone || undefined}
              >
                <GiftCard gift={gift} />
              </div>
            );
          })}
        </div>
      </div>

      {canScroll ? (
        <>
          <button
            type="button"
            aria-label="Show previous gift idea"
            onClick={() => move(-1)}
            className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-gp-app-evergreen/12 bg-white text-gp-app-evergreen shadow-[0_6px_18px_rgba(15,61,62,0.12)] transition hover:bg-gp-app-surface-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Show next gift idea"
            onClick={() => move(1)}
            className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-gp-app-evergreen/12 bg-white text-gp-app-evergreen shadow-[0_6px_18px_rgba(15,61,62,0.12)] transition hover:bg-gp-app-surface-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="mt-4 flex justify-center gap-2" aria-label="Carousel position">
            {dotIndexes.map((index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show gift idea ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => {
                  pauseTemporarily();
                  scrollToPhysical(gifts.length + index);
                }}
                className={`h-2 rounded-full transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold ${
                  index === activeIndex
                    ? "w-5 bg-gp-app-evergreen"
                    : "w-2 bg-gp-app-evergreen/20 hover:bg-gp-app-evergreen/35"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
