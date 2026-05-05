"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Phase = "fly-out" | "pause" | "return" | "landing" | "final";

type AnimationFrame = {
  src: string;
  width: number;
  height: number;
};

type GiftPerchHeroIntroProps = {
  onComplete?: () => void;
};

const FLY_OUT_MS = 1450;
const OFFSCREEN_PAUSE_MS = 260;
const RETURN_MS = 1380;
const LOGO_HOLD_MS = 420;
const FINAL_REVEAL_MS = 920;

const FLYING_FRAMES: AnimationFrame[] = [
  { src: "/giftperch_flying_animation1.PNG", width: 814, height: 814 },
  { src: "/giftperch_flying_animation2.PNG", width: 814, height: 814 },
  { src: "/giftperch_flying_animation3.PNG", width: 814, height: 814 },
];

const RETRIEVE_FRAMES: AnimationFrame[] = [
  { src: "/giftperch_retrieve_animation_1.png", width: 892, height: 892 },
  { src: "/giftperch_retrieve_animation_2.png", width: 892, height: 892 },
  { src: "/giftperch_retrieve_animation_3.PNG", width: 892, height: 892 },
];

const LANDING_FRAMES: AnimationFrame[] = [
  { src: "/intro-frame1.png", width: 892, height: 892 },
  { src: "/intro-frame2.png", width: 892, height: 892 },
  { src: "/intro-frame3.png", width: 892, height: 892 },
  { src: "/intro-frame4.png", width: 892, height: 892 },
  { src: "/intro-frame5.png", width: 892, height: 892 },
  { src: "/intro-frame6.png", width: 892, height: 892 },
  { src: "/intro-frame7.png", width: 892, height: 892 },
  { src: "/intro-frame8.png", width: 892, height: 892 },
  { src: "/intro-frame9.png", width: 1022, height: 1022 },
];

const LANDING_FRAME_DURATIONS = [
  120, 120, 120, 120, 165, 175, 180, 240, 255,
];
const LANDING_TOTAL_MS = LANDING_FRAME_DURATIONS.reduce(
  (total, duration) => total + duration,
  0,
);

const FINAL_LOGO_SRC = "/giftperch-home-page-no-bg.png";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () =>
      setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
      return () => mediaQuery.removeEventListener("change", updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  return prefersReducedMotion;
}

export function GiftPerchHeroIntro({ onComplete }: GiftPerchHeroIntroProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const completionSentRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("fly-out");
  const [flightFrameIndex, setFlightFrameIndex] = useState(0);
  const [landingFrameIndex, setLandingFrameIndex] = useState(
    LANDING_FRAMES.length - 1,
  );

  const allImageSources = useMemo(
    () => [
      ...FLYING_FRAMES.map((frame) => frame.src),
      ...RETRIEVE_FRAMES.map((frame) => frame.src),
      ...LANDING_FRAMES.map((frame) => frame.src),
      FINAL_LOGO_SRC,
    ],
    [],
  );

  const notifyComplete = useCallback(() => {
    if (completionSentRef.current) return;
    completionSentRef.current = true;
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    allImageSources.forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
  }, [allImageSources]);

  useEffect(() => {
    const timers: number[] = [];
    const queueStateUpdate = (callback: () => void, delay = 0) => {
      timers.push(window.setTimeout(callback, delay));
    };

    completionSentRef.current = false;

    if (prefersReducedMotion) {
      queueStateUpdate(() => {
        setPhase("final");
        setLandingFrameIndex(LANDING_FRAMES.length - 1);
      });
      return () => timers.forEach((timerId) => window.clearTimeout(timerId));
    }

    queueStateUpdate(() => {
      setPhase("fly-out");
      setFlightFrameIndex(0);
      setLandingFrameIndex(0);
    });

    timers.push(window.setTimeout(() => setPhase("pause"), FLY_OUT_MS));
    timers.push(
      window.setTimeout(
        () => setPhase("return"),
        FLY_OUT_MS + OFFSCREEN_PAUSE_MS,
      ),
    );
    timers.push(
      window.setTimeout(
        () => setPhase("landing"),
        FLY_OUT_MS + OFFSCREEN_PAUSE_MS + RETURN_MS,
      ),
    );

    return () => timers.forEach((timerId) => window.clearTimeout(timerId));
  }, [notifyComplete, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const frames =
      phase === "fly-out"
        ? FLYING_FRAMES
        : phase === "return"
          ? RETRIEVE_FRAMES
          : null;

    if (!frames) return;

    const resetTimerId = window.setTimeout(() => setFlightFrameIndex(0), 0);
    const intervalId = window.setInterval(() => {
      setFlightFrameIndex((current) => (current + 1) % frames.length);
    }, phase === "fly-out" ? 105 : 120);

    return () => {
      window.clearTimeout(resetTimerId);
      window.clearInterval(intervalId);
    };
  }, [phase, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "landing" || prefersReducedMotion) return;

    const timers: number[] = [];
    let elapsed = 0;

    timers.push(window.setTimeout(() => setLandingFrameIndex(0), 0));

    LANDING_FRAME_DURATIONS.slice(0, -1).forEach((duration, index) => {
      elapsed += duration;
      timers.push(
        window.setTimeout(() => setLandingFrameIndex(index + 1), elapsed),
      );
    });

    const finalStartMs = LANDING_TOTAL_MS + LOGO_HOLD_MS;
    timers.push(window.setTimeout(() => setPhase("final"), finalStartMs));

    return () => timers.forEach((timerId) => window.clearTimeout(timerId));
  }, [phase, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "final") return;

    const timerId = window.setTimeout(
      () => notifyComplete(),
      prefersReducedMotion ? 0 : FINAL_REVEAL_MS,
    );

    return () => window.clearTimeout(timerId);
  }, [notifyComplete, phase, prefersReducedMotion]);

  const flightFrames =
    phase === "return" ? RETRIEVE_FRAMES : FLYING_FRAMES;
  const currentFlightFrame =
    flightFrames[flightFrameIndex % flightFrames.length];
  const currentLandingFrame = LANDING_FRAMES[landingFrameIndex];
  const showFlyingBird = phase === "fly-out" || phase === "return";
  const showLanding = phase === "landing";
  const showFinal = phase === "final";

  return (
    <div
      className="gp-home-intro"
      data-phase={phase}
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
    >
      <style>{`
        .gp-home-intro {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .gp-home-intro-stage {
          position: relative;
          width: min(88vw, 62rem);
          aspect-ratio: 1375 / 389;
          overflow: visible;
          isolation: isolate;
        }

        .gp-home-intro-stage::after {
          content: "";
          position: absolute;
          left: 50%;
          right: auto;
          bottom: 5%;
          width: 92%;
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(15, 61, 62, 0.12), transparent);
          opacity: 0.7;
        }

        .gp-home-intro-bird,
        .gp-home-intro-landing {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 2;
          height: 108%;
          aspect-ratio: 1;
          filter: drop-shadow(0 18px 26px rgba(15, 61, 62, 0.16));
          will-change: transform;
        }

        .gp-home-intro-bird--fly-out {
          animation: gpHeroFlyOut ${FLY_OUT_MS}ms linear both;
        }

        .gp-home-intro-bird--return {
          animation: gpHeroReturn ${RETURN_MS}ms cubic-bezier(0.14, 0.72, 0.18, 1) both;
        }

        .gp-home-intro-bird-frame {
          position: absolute;
          inset: 0;
          animation: gpHeroWingBob 360ms ease-in-out infinite;
          transform-origin: 50% 55%;
          will-change: transform;
        }

        .gp-home-intro-bird--return .gp-home-intro-bird-frame {
          animation-duration: 430ms;
        }

        .gp-home-intro-landing {
          z-index: 3;
          animation: gpHeroLandingWeight 1.55s cubic-bezier(0.2, 0.72, 0.2, 1) both;
        }

        .gp-home-intro-final-composition {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(0.55rem, 2.4vw, 1.8rem);
          width: 100%;
          margin: 0 auto;
        }

        .gp-home-intro-final-mark {
          position: relative;
          height: 108%;
          aspect-ratio: 1;
          flex: 0 0 auto;
          opacity: 0;
          filter: drop-shadow(0 18px 28px rgba(15, 61, 62, 0.14));
          animation: gpHeroFinalLock 560ms cubic-bezier(0.18, 0.78, 0.22, 1) both;
          will-change: transform, opacity;
        }

        .gp-home-intro-wordmark {
          min-width: 0;
          max-width: min(62%, 620px);
          flex: 0 1 auto;
          text-align: left;
        }

        .gp-home-intro-wordmark-title,
        .gp-home-intro-wordmark-rule,
        .gp-home-intro-wordmark-subtitle {
          opacity: 0;
          transform: translateX(20px);
          animation: gpHeroTextReveal 500ms cubic-bezier(0.18, 0.72, 0.22, 1) forwards;
        }

        .gp-home-intro-wordmark-title {
          margin: 0;
          color: #0f3d3e;
          font-family: Georgia, Cambria, "Times New Roman", serif;
          font-size: clamp(2.55rem, 8.5vw, 6.15rem);
          font-weight: 700;
          letter-spacing: 0;
          line-height: 0.86;
          white-space: nowrap;
          text-shadow:
            -1px -1px 0 rgba(248, 245, 224, 0.95),
            1px -1px 0 rgba(248, 245, 224, 0.95),
            -1px 1px 0 rgba(248, 245, 224, 0.95),
            1px 1px 0 rgba(248, 245, 224, 0.95),
            0 10px 20px rgba(15, 61, 62, 0.14);
          animation-delay: 160ms;
        }

        .gp-home-intro-wordmark-rule {
          width: 100%;
          height: clamp(2px, 0.35vw, 4px);
          margin: clamp(0.46rem, 1.3vw, 1rem) 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #d9c189, #e8c978);
          animation-delay: 230ms;
        }

        .gp-home-intro-wordmark-subtitle {
          margin: 0;
          color: #caa546;
          font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: clamp(0.66rem, 1.9vw, 1.38rem);
          font-weight: 800;
          letter-spacing: 0;
          line-height: 1.1;
          white-space: nowrap;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.58),
            0 8px 16px rgba(114, 83, 18, 0.13);
          animation-delay: 340ms;
        }

        .gp-home-intro-preload {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        @keyframes gpHeroFlyOut {
          0% {
            transform: translate(-50%, -50%) translate3d(22vw, -3%, 0) rotate(-1deg) scale(0.9);
          }
          30% {
            transform: translate(-50%, -50%) translate3d(3vw, -15%, 0) rotate(-3deg) scale(0.9);
          }
          64% {
            transform: translate(-50%, -50%) translate3d(-27vw, -4%, 0) rotate(-4deg) scale(0.86);
          }
          86% {
            transform: translate(-50%, -50%) translate3d(calc(-50vw + 55%), -7%, 0) rotate(-5deg) scale(0.84);
          }
          100% {
            transform: translate(-50%, -50%) translate3d(calc(-50vw - 85%), -9%, 0) rotate(-6deg) scale(0.82);
          }
        }

        @keyframes gpHeroReturn {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translate3d(-270%, -22%, 0) rotate(5deg) scale(0.86);
          }
          42% {
            transform: translate(-50%, -50%) translate3d(-150%, -15%, 0) rotate(2deg) scale(0.9);
          }
          76% {
            transform: translate(-50%, -50%) translate3d(-40%, -5%, 0) rotate(0.6deg) scale(0.93);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) translate3d(0, 0, 0) rotate(0deg) scale(0.93);
          }
        }

        @keyframes gpHeroWingBob {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(1deg);
          }
        }

        @keyframes gpHeroLandingWeight {
          0% {
            transform: translate(-50%, -50%) translateY(-10px) scale(0.94);
          }
          30% {
            transform: translate(-50%, -50%) translateY(4px) scale(1.01, 0.96);
          }
          48% {
            transform: translate(-50%, -50%) translateY(-3px) scale(0.98, 1.02);
          }
          68% {
            transform: translate(-50%, -50%) translateY(1px) scale(1.005, 0.99);
          }
          100% {
            transform: translate(-50%, -50%) translateY(0) scale(1);
          }
        }

        @keyframes gpHeroFinalLock {
          0% {
            opacity: 0.95;
            transform: translateX(clamp(7rem, 20vw, 17rem)) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes gpHeroTextReveal {
          0% {
            opacity: 0;
            transform: translateX(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .gp-home-intro[data-reduced-motion="true"] .gp-home-intro-final-mark,
        .gp-home-intro[data-reduced-motion="true"] .gp-home-intro-wordmark-title,
        .gp-home-intro[data-reduced-motion="true"] .gp-home-intro-wordmark-rule,
        .gp-home-intro[data-reduced-motion="true"] .gp-home-intro-wordmark-subtitle {
          animation: none;
          opacity: 1;
          transform: none;
        }

        @media (max-width: 980px) {
          .gp-home-intro-stage {
            width: min(84vw, 56rem);
          }
        }

        @media (max-width: 640px) {
          .gp-home-intro-stage {
            width: min(92vw, 36rem);
          }

          .gp-home-intro-bird,
          .gp-home-intro-landing,
          .gp-home-intro-final-mark {
            height: 120%;
          }

          .gp-home-intro-wordmark {
            max-width: 62vw;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gp-home-intro *,
          .gp-home-intro *::before,
          .gp-home-intro *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="gp-home-intro-preload" aria-hidden="true">
        <Image
          src={FINAL_LOGO_SRC}
          alt=""
          width={1375}
          height={389}
          className="h-full w-full object-contain"
          unoptimized
        />
      </div>

      <div className="gp-home-intro-stage" aria-label="GiftPerch brand intro">
        {showFlyingBird ? (
          <div
            key={phase}
            className={`gp-home-intro-bird gp-home-intro-bird--${phase}`}
            aria-hidden="true"
          >
            <div className="gp-home-intro-bird-frame">
              <Image
                src={currentFlightFrame.src}
                alt=""
                fill
                sizes="(max-width: 640px) 44vw, 22rem"
                className="object-contain"
                priority
                unoptimized
                draggable={false}
              />
            </div>
          </div>
        ) : null}

        {showLanding ? (
          <div className="gp-home-intro-landing" aria-hidden="true">
            <Image
              key={currentLandingFrame.src}
              src={currentLandingFrame.src}
              alt=""
              fill
              sizes="(max-width: 640px) 44vw, 22rem"
              className="object-contain"
              priority
              unoptimized
              draggable={false}
            />
          </div>
        ) : null}

        {showFinal ? (
          <div className="gp-home-intro-final-composition">
            <div className="gp-home-intro-final-mark" aria-hidden="true">
              <Image
                src="/intro-frame9.png"
                alt=""
                fill
                sizes="(max-width: 640px) 44vw, 22rem"
                className="object-contain"
                priority
                unoptimized
                draggable={false}
              />
            </div>
            <div className="gp-home-intro-wordmark">
              <h1 className="gp-home-intro-wordmark-title">GiftPerch</h1>
              <div className="gp-home-intro-wordmark-rule" aria-hidden="true" />
              <p className="gp-home-intro-wordmark-subtitle">
                AI-Powered Gifting Workspace
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
