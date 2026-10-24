"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
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
}: {
  profile: ProductTourProfile;
  savedIdeas: ReadonlySet<string>;
  onToggleSaved: (ideaKey: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const hasCenteredLoopRef = useRef(false);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, scrollLeft: 0 });
  const manualPauseTimerRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cycleWidth, setCycleWidth] = useState(0);
  const [selectedIdea, setSelectedIdea] = useState<ProductTourIdea | null>(null);

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

  useEffect(() => {
    if (!selectedIdea) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIdea(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIdea]);

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
    pointerStartRef.current = { x: event.clientX, scrollLeft: viewport.scrollLeft };
    draggingRef.current = false;
    viewport.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !viewport.hasPointerCapture(event.pointerId)) return;
    const distance = event.clientX - pointerStartRef.current.x;
    if (Math.abs(distance) > 5) {
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
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    draggingRef.current = false;
    setIsDragging(false);
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
    isHovered,
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
          <Image src={idea.imageSrc} alt="" fill sizes="(max-width: 640px) 78vw, (max-width: 1024px) 34vw, 13rem" className="object-cover" />
          <button type="button" className="gp-tour-save-button" aria-label={`${isSaved ? "Remove" : "Save"} ${idea.title} in this demonstration`} aria-pressed={isSaved} tabIndex={isPrimaryCopy ? 0 : -1} onClick={() => { onToggleSaved(ideaKey); pauseAfterManualAction(); }}>
            <Heart aria-hidden="true" className={isSaved ? "fill-current" : ""} />
          </button>
        </div>
        <div className="gp-tour-carousel-copy">
          <h5>{idea.title}</h5>
          <p>{idea.description}</p>
          <div className="gp-tour-carousel-footer">
            <strong>{idea.price}</strong>
            <button type="button" className="gp-tour-view-product" tabIndex={isPrimaryCopy ? 0 : -1} onClick={() => { setSelectedIdea(idea); pauseAfterManualAction(); }}>View Product</button>
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
        <div ref={viewportRef} className="gp-tour-carousel-viewport" role="region" aria-label={`${profile.name}'s sample gift ideas`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onFocusCapture={() => setIsFocusWithin(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsFocusWithin(false); }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onClickCapture={handleClickCapture}>
          <div ref={trackRef} className={`gp-tour-carousel-track${cycleWidth > 0 ? " gp-tour-carousel-track--autoplay" : ""}${autoplayActive ? "" : " gp-tour-carousel-track--paused"}`} style={carouselStyle}>
            {[0, 1, 2].map((copy) => <div className="gp-tour-carousel-set" data-tour-copy={copy} key={copy}>{profile.ideas.map((idea) => renderCard(idea, copy))}</div>)}
          </div>
        </div>
        <button type="button" className="gp-tour-carousel-arrow gp-tour-carousel-arrow--right" aria-label="Show next sample gift ideas" onClick={() => moveByCard(1)} onFocus={() => setIsFocusWithin(true)} onBlur={() => setIsFocusWithin(false)}><ChevronRight aria-hidden="true" /></button>
      </div>
      {selectedIdea ? <div className="gp-tour-preview-backdrop" role="presentation" onMouseDown={() => setSelectedIdea(null)}><section className="gp-tour-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="gp-tour-preview-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="gp-tour-preview-close" aria-label="Close sample product preview" onClick={() => setSelectedIdea(null)}><X aria-hidden="true" /></button><div className="gp-tour-preview-image"><Image src={selectedIdea.imageSrc} alt="" fill sizes="min(92vw, 30rem)" className="object-cover" /></div><p className="gp-tour-panel-label">Sample listing</p><h5 id="gp-tour-preview-title">{selectedIdea.title}</h5><p>{selectedIdea.description}</p><strong>{selectedIdea.price}</strong><small>Illustrative gift idea. Not a purchasable product listing.</small></section></div> : null}
    </div>
  );
}
