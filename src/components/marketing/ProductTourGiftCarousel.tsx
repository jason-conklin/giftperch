"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ProductTourIdea, ProductTourProfile } from "./productTourDemoData";
import {
  getProductTourCarouselDurationMs,
  hasProductTourCarouselDragged,
  shouldPauseProductTourCarouselForFocus,
  shouldStartProductTourCarouselDrag,
  shouldAutoplayProductTourCarousel,
} from "./productTourCarouselMotion";
const MANUAL_PAUSE_MS = 3_500;

function cardKey(profile: ProductTourProfile, idea: ProductTourIdea) {
  return `${profile.id}:${idea.id}`;
}

export function ProductTourGiftCarousel({
  profile,
  savedIdeas,
  onToggleSaved,
  productEntryPath,
}: {
  profile: ProductTourProfile;
  savedIdeas: ReadonlySet<string>;
  onToggleSaved: (ideaKey: string) => void;
  productEntryPath: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const hasCenteredLoopRef = useRef(false);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointerInitiatedFocusRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, scrollLeft: 0 });
  const manualPauseTimerRef = useRef<number | null>(null);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInteractivePress, setIsInteractivePress] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cycleWidth, setCycleWidth] = useState(0);

  const updateLoopMetrics = useCallback((center = false) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const firstSet = track.querySelector<HTMLElement>("[data-tour-copy='0']");
    const secondSet = track.querySelector<HTMLElement>("[data-tour-copy='1']");
    const nextCycleWidth =
      firstSet && secondSet ? secondSet.offsetLeft - firstSet.offsetLeft : 0;
    if (!nextCycleWidth) return;

    setCycleWidth((current) =>
      Math.abs(current - nextCycleWidth) > 0.5 ? nextCycleWidth : current,
    );
    if (center || !hasCenteredLoopRef.current) {
      viewport.scrollLeft = nextCycleWidth;
      hasCenteredLoopRef.current = true;
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isInteractivePress) return;

    const releaseInteractivePress = () => setIsInteractivePress(false);
    window.addEventListener("pointerup", releaseInteractivePress, { once: true });
    window.addEventListener("pointercancel", releaseInteractivePress, { once: true });
    return () => {
      window.removeEventListener("pointerup", releaseInteractivePress);
      window.removeEventListener("pointercancel", releaseInteractivePress);
    };
  }, [isInteractivePress]);

  useEffect(() => {
    const updateVisibility = () => {
      setDocumentVisible(document.visibilityState === "visible");
    };

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    updateLoopMetrics(true);
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => updateLoopMetrics(false));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [profile.id, updateLoopMetrics]);

  useEffect(() => {
    return () => {
      if (manualPauseTimerRef.current !== null) {
        window.clearTimeout(manualPauseTimerRef.current);
      }
    };
  }, []);

  const pauseAfterManualAction = useCallback(() => {
    if (manualPauseTimerRef.current !== null) {
      window.clearTimeout(manualPauseTimerRef.current);
    }
    setIsManuallyPaused(true);
    manualPauseTimerRef.current = window.setTimeout(() => {
      manualPauseTimerRef.current = null;
      setIsManuallyPaused(false);
    }, MANUAL_PAUSE_MS);
  }, []);

  const moveByCard = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const card = viewport.querySelector<HTMLElement>(".gp-tour-carousel-card");
    const gap = Number.parseFloat(getComputedStyle(viewport).getPropertyValue("--gp-tour-card-gap")) || 10;
    viewport.scrollBy({ left: direction * ((card?.offsetWidth ?? 180) + gap), behavior: "smooth" });
    pauseAfterManualAction();
  }, [pauseAfterManualAction]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || event.button !== 0) return;
    pointerInitiatedFocusRef.current = true;
    if (!shouldStartProductTourCarouselDrag(event.target)) return;
    pointerStartRef.current = { x: event.clientX, scrollLeft: viewport.scrollLeft };
    draggingRef.current = false;
    viewport.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !viewport.hasPointerCapture(event.pointerId)) return;
    const distance = event.clientX - pointerStartRef.current.x;
    if (hasProductTourCarouselDragged(distance)) {
      draggingRef.current = true;
      suppressClickRef.current = true;
    }
    viewport.scrollLeft = pointerStartRef.current.scrollLeft - distance;
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (viewport?.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (draggingRef.current) {
      pauseAfterManualAction();
    }
    draggingRef.current = false;
    setIsDragging(false);
    window.setTimeout(() => {
      pointerInitiatedFocusRef.current = false;
      suppressClickRef.current = false;
    }, 0);
  };

  const handleFocusCapture = () => {
    if (shouldPauseProductTourCarouselForFocus(pointerInitiatedFocusRef.current)) {
      setIsFocusWithin(true);
    }
  };

  const handleInteractivePointerDown = () => {
    setIsInteractivePress(true);
  };

  const handleInteractivePointerEnd = () => {
    setIsInteractivePress(false);
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const autoplayActive = shouldAutoplayProductTourCarousel({
    cycleWidth,
    documentVisible,
    isDragging,
    isFocusWithin,
    isInteractivePress,
    isManuallyPaused,
    reducedMotion,
  });
  const carouselStyle = {
    "--gp-tour-carousel-duration": `${getProductTourCarouselDurationMs(cycleWidth)}ms`,
    "--gp-tour-cycle-width": `${cycleWidth}px`,
  } as CSSProperties;

  const renderCard = (idea: ProductTourIdea, copy: number) => {
    const ideaKey = cardKey(profile, idea);
    const isSaved = savedIdeas.has(ideaKey);
    const isPrimaryCopy = copy === 1;

    return (
      <article className="gp-tour-carousel-card" key={`${copy}-${idea.id}`} aria-hidden={!isPrimaryCopy || undefined}>
        <div className="gp-tour-carousel-image">
          <Image src={idea.imageSrc} alt="" fill draggable={false} sizes="(max-width: 640px) 78vw, (max-width: 1024px) 34vw, 13rem" className="object-cover" />
          <button type="button" className="gp-tour-save-button" aria-label={`${isSaved ? "Remove" : "Save"} ${idea.title} in this demonstration`} aria-pressed={isSaved} tabIndex={isPrimaryCopy ? 0 : -1} onPointerDown={handleInteractivePointerDown} onPointerUp={handleInteractivePointerEnd} onPointerCancel={handleInteractivePointerEnd} onClick={() => { onToggleSaved(ideaKey); pauseAfterManualAction(); }}>
            <Heart aria-hidden="true" className={isSaved ? "fill-current" : ""} />
          </button>
        </div>
        <div className="gp-tour-carousel-copy">
          <h5>{idea.title}</h5>
          <p>{idea.description}</p>
          <div className="gp-tour-carousel-footer">
            <strong>{idea.price}</strong>
            <Link href={productEntryPath} className="gp-tour-view-product" tabIndex={isPrimaryCopy ? 0 : -1} onPointerDown={handleInteractivePointerDown} onPointerUp={handleInteractivePointerEnd} onPointerCancel={handleInteractivePointerEnd}>View Product</Link>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="gp-tour-carousel-shell">
      <div className="gp-tour-carousel-header">
        <p className="gp-tour-panel-label">{profile.ideasLabel}</p>
        <span>Illustrative gift ideas</span>
      </div>
      <div className="gp-tour-carousel-frame">
        <button type="button" className="gp-tour-carousel-arrow gp-tour-carousel-arrow--left" aria-label="Show previous sample gift ideas" onClick={() => moveByCard(-1)} onFocus={() => setIsFocusWithin(true)} onBlur={() => setIsFocusWithin(false)}><ChevronLeft aria-hidden="true" /></button>
        <div ref={viewportRef} className="gp-tour-carousel-viewport" role="region" aria-label={`${profile.name}'s sample gift ideas`} onFocusCapture={handleFocusCapture} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsFocusWithin(false); }} onDragStart={(event) => event.preventDefault()} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onClickCapture={handleClickCapture}>
          <div ref={trackRef} className={`gp-tour-carousel-track${cycleWidth > 0 ? " gp-tour-carousel-track--autoplay" : ""}${autoplayActive ? "" : " gp-tour-carousel-track--paused"}`} style={carouselStyle}>
            {[0, 1, 2].map((copy) => <div className="gp-tour-carousel-set" data-tour-copy={copy} key={copy}>{profile.ideas.map((idea) => renderCard(idea, copy))}</div>)}
          </div>
        </div>
        <button type="button" className="gp-tour-carousel-arrow gp-tour-carousel-arrow--right" aria-label="Show next sample gift ideas" onClick={() => moveByCard(1)} onFocus={() => setIsFocusWithin(true)} onBlur={() => setIsFocusWithin(false)}><ChevronRight aria-hidden="true" /></button>
      </div>
    </div>
  );
}
