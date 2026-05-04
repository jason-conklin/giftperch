"use client";
import ForestBorder from "./ForestBorder";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Phase = "fly-out" | "pause" | "return" | "landing" | "final";

type AnimationFrame = {
  src: string;
  width: number;
  height: number;
};

const FLY_OUT_MS = 1450;
const OFFSCREEN_PAUSE_MS = 260;
const RETURN_MS = 1380;
const LOGO_HOLD_MS = 420;

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

export default function AnimationPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
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
  }, [prefersReducedMotion]);

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

    const totalLandingDuration = LANDING_FRAME_DURATIONS.reduce(
      (total, duration) => total + duration,
      0,
    );

    timers.push(
      window.setTimeout(
        () => setPhase("final"),
        totalLandingDuration + LOGO_HOLD_MS,
      ),
    );

    return () => timers.forEach((timerId) => window.clearTimeout(timerId));
  }, [phase, prefersReducedMotion]);

  const flightFrames =
    phase === "return" ? RETRIEVE_FRAMES : FLYING_FRAMES;
  const currentFlightFrame =
    flightFrames[flightFrameIndex % flightFrames.length];
  const currentLandingFrame = LANDING_FRAMES[landingFrameIndex];
  const showFlyingBird = phase === "fly-out" || phase === "return";
  const showLanding = phase === "landing";
  const showFinal = phase === "final";

  return (
    <main
      className="gp-animation-shell"
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      aria-labelledby="giftperch-animation-title"
    >
      <style>{`
        .gp-animation-forest {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: clamp(160px, 20vh, 230px);
          overflow: hidden;
          z-index: 1;
          pointer-events: none;
        }

        .gp-animation-forest svg {
          display: block;
          width: 100%;
          height: 100%;
        }
        .gp-animation-shell + .gp-global-footer {
          display: none;
        }

        .gp-animation-shell {
          --gp-animation-evergreen: #0f3d3e;
          --gp-animation-evergreen-dark: #0b2f30;
          --gp-animation-gold: #d9c189;
          --gp-animation-gold-rich: #e8c978;
          --gp-animation-cream: #f8f5e0;
          --gp-animation-flight-size: clamp(170px, 32vw, 360px);
          --gp-animation-mark-size: clamp(124px, 34vw, 360px);
          min-height: 100vh;
          min-height: 100svh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          isolation: isolate;
          padding: 1.5rem;
          color: var(--gp-animation-evergreen);
          background:
            linear-gradient(180deg, #ffffff 0%, #fffaf0 46%, var(--gp-animation-cream) 100%),
            var(--gp-animation-cream);
        }

        .gp-animation-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(15, 61, 62, 0.07), transparent 28%, transparent 72%, rgba(15, 61, 62, 0.08)),
            linear-gradient(180deg, rgba(255, 255, 255, 0.72), transparent 32%, rgba(15, 61, 62, 0.05));
        }

        .gp-animation-stage {
          position: relative;
          width: min(94vw, 1120px);
          height: clamp(320px, 68svh, 620px);
          flex: none;
          overflow: visible;
          isolation: isolate;
        }

        .gp-animation-stage::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 12%;
          width: min(82%, 860px);
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(15, 61, 62, 0.18), transparent);
          opacity: 0.62;
        }

        .gp-animation-bird {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 2;
          width: var(--gp-animation-flight-size);
          aspect-ratio: 1;
          filter: drop-shadow(0 18px 26px rgba(15, 61, 62, 0.16));
          will-change: transform;
        }

        .gp-animation-bird--fly-out {
          animation: gp-animation-fly-out ${FLY_OUT_MS}ms linear both;
        }

        .gp-animation-bird--return {
          animation: gp-animation-return ${RETURN_MS}ms cubic-bezier(0.12, 0.76, 0.18, 1) both;
        }

        .gp-animation-bird-frame {
          position: absolute;
          inset: 0;
          animation: gp-animation-wing-bob 360ms ease-in-out infinite;
          transform-origin: 50% 55%;
          will-change: transform;
        }

        .gp-animation-bird--return .gp-animation-bird-frame {
          animation-duration: 430ms;
        }

        .gp-animation-landing {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 3;
          width: var(--gp-animation-mark-size);
          aspect-ratio: 1;
          filter: drop-shadow(0 20px 30px rgba(15, 61, 62, 0.18));
          animation: gp-animation-landing-weight 1.55s cubic-bezier(0.2, 0.72, 0.2, 1) both;
          will-change: transform;
        }

        .gp-animation-final-composition {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.8rem;
          width: min(98%, 1040px);
          margin: 0 auto;
        }

        .gp-animation-final-mark {
          position: relative;
          width: var(--gp-animation-mark-size);
          aspect-ratio: 1;
          flex: 0 0 auto;
          filter: drop-shadow(0 20px 30px rgba(15, 61, 62, 0.18));
          animation: gp-animation-logo-lock 560ms cubic-bezier(0.18, 0.78, 0.22, 1) both;
          will-change: transform, opacity;
        }

        .gp-animation-wordmark {
          min-width: 0;
          max-width: 620px;
          flex: 0 1 auto;
        }

        .gp-animation-wordmark-title,
        .gp-animation-wordmark-rule,
        .gp-animation-wordmark-subtitle {
          opacity: 0;
          transform: translateX(20px);
          animation: gp-animation-text-reveal 500ms cubic-bezier(0.18, 0.72, 0.22, 1) forwards;
        }

        .gp-animation-wordmark-title {
          margin: 0;
          color: var(--gp-animation-evergreen);
          font-family: Georgia, Cambria, "Times New Roman", serif;
          font-size: 6.15rem;
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

        .gp-animation-wordmark-rule {
          width: 100%;
          height: 4px;
          margin: 1rem 0 1rem;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--gp-animation-gold), var(--gp-animation-gold-rich));
          animation-delay: 230ms;
        }

        .gp-animation-wordmark-subtitle {
          margin: 0;
          color: #caa546;
          font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 1.38rem;
          font-weight: 800;
          letter-spacing: 0;
          line-height: 1.1;
          white-space: nowrap;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.58),
            0 8px 16px rgba(114, 83, 18, 0.13);
          animation-delay: 340ms;
        }

        .gp-animation-preload {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        @keyframes gp-animation-fly-out {
          0% {
            transform: translate(-50%, -50%) translate3d(13vw, -1.5vh, 0) rotate(-1deg) scale(0.86);
          }
          28% {
            transform: translate(-50%, -50%) translate3d(-4vw, -5vh, 0) rotate(-3deg) scale(0.86);
          }
          58% {
            transform: translate(-50%, -50%) translate3d(-28vw, -1vh, 0) rotate(-4deg) scale(0.82);
          }
          100% {
            transform: translate(-50%, -50%) translate3d(calc(-50vw - var(--gp-animation-flight-size)), -4vh, 0) rotate(-6deg) scale(0.78);
          }
        }

        @keyframes gp-animation-return {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translate3d(calc(-50vw - var(--gp-animation-flight-size)), -9vh, 0) rotate(5deg) scale(0.82);
          }
          42% {
            transform: translate(-50%, -50%) translate3d(-23vw, -6vh, 0) rotate(2deg) scale(0.86);
          }
          76% {
            transform: translate(-50%, -50%) translate3d(-6vw, -2vh, 0) rotate(0.6deg) scale(0.88);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) translate3d(0, 0, 0) rotate(0deg) scale(0.88);
          }
        }

        @keyframes gp-animation-wing-bob {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(1deg);
          }
        }

        @keyframes gp-animation-landing-weight {
          0% {
            transform: translate(-50%, -50%) translateY(-18px) scale(0.94);
          }
          30% {
            transform: translate(-50%, -50%) translateY(6px) scale(1.01, 0.96);
          }
          48% {
            transform: translate(-50%, -50%) translateY(-4px) scale(0.98, 1.02);
          }
          68% {
            transform: translate(-50%, -50%) translateY(2px) scale(1.005, 0.99);
          }
          100% {
            transform: translate(-50%, -50%) translateY(0) scale(1);
          }
        }

        @keyframes gp-animation-logo-lock {
          0% {
            opacity: 0.95;
            transform: translateX(clamp(7rem, 20vw, 17rem)) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes gp-animation-text-reveal {
          0% {
            opacity: 0;
            transform: translateX(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 980px) {
          .gp-animation-shell {
            --gp-animation-mark-size: clamp(124px, 31vw, 260px);
          }

          .gp-animation-stage {
            height: clamp(300px, 62svh, 540px);
          }

          .gp-animation-final-composition {
            gap: 1.2rem;
          }

          .gp-animation-wordmark-title {
            font-size: 4.6rem;
          }

          .gp-animation-wordmark-subtitle {
            font-size: 1.05rem;
          }
        }

        @media (max-width: 640px) {
          .gp-animation-shell {
            --gp-animation-flight-size: clamp(158px, 48vw, 210px);
            --gp-animation-mark-size: clamp(112px, 34vw, 150px);
            padding: 1rem;
          }

          .gp-animation-stage {
            width: min(96vw, 560px);
            height: clamp(260px, 56svh, 420px);
          }

          .gp-animation-final-composition {
            gap: 0.55rem;
            width: min(99%, 520px);
          }

          .gp-animation-wordmark {
            max-width: 62vw;
          }

          .gp-animation-wordmark-title {
            font-size: 2.55rem;
          }

          .gp-animation-wordmark-rule {
            height: 2px;
            margin: 0.46rem 0 0.5rem;
          }

          .gp-animation-wordmark-subtitle {
            font-size: 0.66rem;
            font-weight: 800;
          }
        }

        @media (max-width: 380px) {
          .gp-animation-shell {
            --gp-animation-mark-size: 106px;
          }

          .gp-animation-final-composition {
            gap: 0.4rem;
          }

          .gp-animation-wordmark {
            max-width: 64vw;
          }

          .gp-animation-wordmark-title {
            font-size: 2.2rem;
          }

          .gp-animation-wordmark-subtitle {
            font-size: 0.58rem;
          }
        }

        .gp-animation-shell[data-reduced-motion="true"] .gp-animation-final-mark,
        .gp-animation-shell[data-reduced-motion="true"] .gp-animation-wordmark-title,
        .gp-animation-shell[data-reduced-motion="true"] .gp-animation-wordmark-rule,
        .gp-animation-shell[data-reduced-motion="true"] .gp-animation-wordmark-subtitle {
          animation: none;
          opacity: 1;
          transform: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .gp-animation-shell *,
          .gp-animation-shell *::before,
          .gp-animation-shell *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="gp-animation-preload" aria-hidden="true">
        <Image
          src={FINAL_LOGO_SRC}
          alt=""
          width={1375}
          height={389}
          className="h-full w-full object-contain"
          unoptimized
        />
      </div>

      <section className="gp-animation-stage" aria-label="GiftPerch brand intro">
        {showFlyingBird ? (
          <div
            key={phase}
            className={`gp-animation-bird gp-animation-bird--${phase}`}
            aria-hidden="true"
          >
            <div className="gp-animation-bird-frame">
              <Image
                src={currentFlightFrame.src}
                alt=""
                fill
                sizes="(max-width: 640px) 210px, 360px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </div>
        ) : null}

        {showLanding ? (
          <div className="gp-animation-landing" aria-hidden="true">
            <Image
              key={currentLandingFrame.src}
              src={currentLandingFrame.src}
              alt=""
              fill
              sizes="(max-width: 640px) 150px, 360px"
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        ) : null}

        {showFinal ? (
          <div className="gp-animation-final-composition">
            <div className="gp-animation-final-mark" aria-hidden="true">
              <Image
                src="/intro-frame9.png"
                alt=""
                fill
                sizes="(max-width: 640px) 150px, 360px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <div className="gp-animation-wordmark">
              <h1
                id="giftperch-animation-title"
                className="gp-animation-wordmark-title"
              >
                GiftPerch
              </h1>
              <div className="gp-animation-wordmark-rule" aria-hidden="true" />
              <p className="gp-animation-wordmark-subtitle">
                AI-Powered Gifting Workspace
              </p>
            </div>
          </div>
        ) : null}
      </section>
      <div className="gp-animation-forest">
        <ForestBorder />
      </div>
    </main>
  );
}
