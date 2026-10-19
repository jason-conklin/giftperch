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
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { GiftPreviewImage } from "@/components/gifts/GiftPreviewImage";
import {
  type RecentGiftCardModel,
} from "@/lib/dashboardRecentGifts";
import {
  advanceContinuousScrollPosition,
  shouldRunRecentGiftAutoplay,
  wrapContinuousScrollPosition,
} from "@/lib/recentGiftCarouselMotion";
import styles from "./RecentGiftIdeasCarousel.module.css";

const MANUAL_IDLE_MS = 1200;
const DRAG_THRESHOLD_PX = 7;

type DragState = {
  pointerId: number;
  pointerType: string;
  startX: number;
  startScrollLeft: number;
};

function ProductImage({ gift }: { gift: RecentGiftCardModel }) {
  return (
    <GiftPreviewImage
      key={gift.imageSource.primary}
      source={gift.imageSource}
      alt={gift.title}
      sizes="(min-width: 1536px) 18vw, (min-width: 768px) 28vw, 82vw"
      className="object-contain p-2"
      draggable={false}
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
        <ProductImage gift={gift} />
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
        {gift.destination ? (
          <a
            href={gift.destination.href}
            target="_blank"
            rel={
              gift.destination.isAffiliate
                ? "sponsored noopener noreferrer"
                : "noopener noreferrer"
            }
            draggable={false}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-gp-app-evergreen px-3 py-2 text-xs font-semibold text-white transition hover:bg-gp-app-evergreen-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
          >
            {gift.destination.label}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="mt-3 flex items-center justify-center rounded-lg bg-gp-app-evergreen/45 px-3 py-2 text-xs font-semibold text-white">
            Product unavailable
          </span>
        )}
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
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizationTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousFrameTimeRef = useRef<number | null>(null);
  const logicalScrollPositionRef = useRef<number | null>(null);
  const animationFrameCountRef = useRef(0);
  const [canScroll, setCanScroll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const giftKey = gifts.map((gift) => gift.id).join("|");

  const repeatedGifts = canScroll ? [...gifts, ...gifts, ...gifts] : gifts;

  const cards = useCallback(() => {
    const viewport = viewportRef.current;
    return viewport
      ? Array.from(
          viewport.querySelectorAll<HTMLElement>("[data-recent-gift-card]"),
        )
      : [];
  }, []);

  const loopMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    const elements = cards();
    const middleStart = elements[gifts.length]?.offsetLeft;
    const nextStart = elements[gifts.length * 2]?.offsetLeft;
    if (
      !viewport ||
      middleStart === undefined ||
      nextStart === undefined ||
      nextStart <= middleStart
    ) {
      return null;
    }
    return { viewport, middleStart, setWidth: nextStart - middleStart };
  }, [cards, gifts.length]);

  const normalizeLoopPosition = useCallback((syncFromDom = false) => {
    if (!canScroll || dragRef.current) return;
    const metrics = loopMetrics();
    if (!metrics) return;
    const { viewport, middleStart, setWidth } = metrics;
    const sourcePosition =
      syncFromDom || logicalScrollPositionRef.current === null
        ? viewport.scrollLeft
        : logicalScrollPositionRef.current;
    const wrappedPosition = wrapContinuousScrollPosition(
      sourcePosition,
      middleStart,
      setWidth,
    );
    logicalScrollPositionRef.current = wrappedPosition;
    viewport.scrollLeft = wrappedPosition;
  }, [canScroll, loopMetrics]);

  const pauseTemporarily = useCallback(() => {
    setManualPause(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(
      () => setManualPause(false),
      MANUAL_IDLE_MS,
    );
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
      const lastUniqueCard = cards()[gifts.length - 1];
      if (!lastUniqueCard) {
        setCanScroll(false);
        return;
      }
      const uniqueWidth =
        lastUniqueCard.offsetLeft +
        lastUniqueCard.offsetWidth -
        firstCard.offsetLeft;
      setCanScroll(uniqueWidth > viewport.clientWidth + 1);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    const track = viewport.firstElementChild;
    if (track) observer.observe(track);
    const frame = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [cards, gifts.length]);

  useLayoutEffect(() => {
    if (!canScroll || !gifts.length) return;
    const frame = requestAnimationFrame(() => {
      const target = cards()[gifts.length];
      const viewport = viewportRef.current;
      if (target && viewport) {
        logicalScrollPositionRef.current = target.offsetLeft;
        viewport.scrollLeft = target.offsetLeft;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [canScroll, cards, giftKey, gifts.length]);

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
      !shouldRunRecentGiftAutoplay({
        canScroll,
        reducedMotion,
        isDragging,
        manualPause,
        isDocumentHidden,
      })
    ) {
      return;
    }
    const animate = (timestamp: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const previous = previousFrameTimeRef.current;
      previousFrameTimeRef.current = timestamp;
      if (previous !== null) {
        const currentPosition =
          logicalScrollPositionRef.current ?? viewport.scrollLeft;
        logicalScrollPositionRef.current = advanceContinuousScrollPosition(
          currentPosition,
          timestamp - previous,
        );
        normalizeLoopPosition();
      }
      animationFrameCountRef.current += 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    previousFrameTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      previousFrameTimeRef.current = null;
    };
  }, [
    canScroll,
    isDocumentHidden,
    isDragging,
    manualPause,
    normalizeLoopPosition,
    reducedMotion,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const diagnostics = () => {
      const viewport = viewportRef.current;
      const autoplayEnabled = shouldRunRecentGiftAutoplay({
        canScroll,
        reducedMotion,
        isDragging,
        manualPause,
        isDocumentHidden,
      });
      return {
        autoplayEnabled,
        disabledReason: autoplayEnabled
          ? null
          : !canScroll
            ? "content-does-not-overflow"
            : reducedMotion
              ? "prefers-reduced-motion"
              : isDragging
                ? "active-drag"
                : manualPause
                  ? "manual-interaction-cooldown"
                  : isDocumentHidden
                    ? "document-hidden"
                    : "unknown",
        animationFrames: animationFrameCountRef.current,
        renderedScrollLeft: viewport?.scrollLeft ?? null,
        logicalScrollPosition: logicalScrollPositionRef.current,
        viewportWidth: viewport?.clientWidth ?? null,
        scrollWidth: viewport?.scrollWidth ?? null,
        cardCount: cards().length,
      };
    };
    const diagnosticWindow = window as typeof window & {
      __giftPerchRecentGiftCarouselDiagnostics?: typeof diagnostics;
    };
    diagnosticWindow.__giftPerchRecentGiftCarouselDiagnostics = diagnostics;
    return () => {
      if (diagnosticWindow.__giftPerchRecentGiftCarouselDiagnostics === diagnostics) {
        delete diagnosticWindow.__giftPerchRecentGiftCarouselDiagnostics;
      }
    };
  }, [
    canScroll,
    cards,
    isDocumentHidden,
    isDragging,
    manualPause,
    reducedMotion,
  ]);

  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (normalizationTimerRef.current) {
        clearTimeout(normalizationTimerRef.current);
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  const move = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    const elements = cards();
    if (!viewport || elements.length < 2) return;
    const distance = elements[1].offsetLeft - elements[0].offsetLeft;
    pauseTemporarily();
    viewport.scrollBy({
      left: distance * direction,
      behavior: reducedMotion ? "auto" : "smooth",
    });
    if (normalizationTimerRef.current) {
      clearTimeout(normalizationTimerRef.current);
    }
    normalizationTimerRef.current = setTimeout(
      () => normalizeLoopPosition(true),
      500,
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      (event.pointerType === "mouse" && event.button !== 0) ||
      !canScroll
    ) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
    };
    logicalScrollPositionRef.current = event.currentTarget.scrollLeft;
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
      const nextPosition = drag.startScrollLeft - delta;
      logicalScrollPositionRef.current = nextPosition;
      event.currentTarget.scrollLeft = nextPosition;
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
    normalizeLoopPosition(true);
  };

  return (
    <div
      className={styles.carousel}
      aria-roledescription="carousel"
      aria-label="Recent saved gift ideas"
    >
      <div
        ref={viewportRef}
        className={`${styles.viewport} ${isDragging ? styles.viewportDragging : ""}`}
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
            const isClone =
              canScroll &&
              (physicalIndex < gifts.length ||
                physicalIndex >= gifts.length * 2);
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
        </>
      ) : null}
    </div>
  );
}
