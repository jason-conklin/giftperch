"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type PerchPalLoaderProps = {
  variant?: "inline" | "block" | "overlay";
  size?: "sm" | "md" | "lg";
  message?: string;
  ariaLabel?: string;
};

const AWAY_FRAMES = [
  "/giftperch_flying_animation1.PNG",
  "/giftperch_flying_animation2.PNG",
] as const;

const RETURN_FRAMES = [
  "/giftperch_retrieve_animation_1.png",
  "/giftperch_retrieve_animation_2.png",
] as const;

const FRAME_SEQUENCE = [
  ...AWAY_FRAMES,
  ...AWAY_FRAMES,
  ...RETURN_FRAMES,
  ...RETURN_FRAMES,
] as const;

const FRAME_DURATION_MS = 180;

const sizeMap = {
  sm: { width: 40, height: 40, text: "text-xs", circle: "p-2" },
  md: { width: 64, height: 64, text: "text-sm", circle: "p-3" },
  lg: { width: 96, height: 96, text: "text-base", circle: "p-4" },
} as const;

export function PerchPalLoader({
  variant = "block",
  size = "md",
  message,
  ariaLabel,
}: PerchPalLoaderProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const sizeStyles = sizeMap[size];
  const label =
    ariaLabel ?? "PerchPal is fetching gift suggestions...";
  const helperMessage =
    message ?? "PerchPal is fetching thoughtful gift ideas...";

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % FRAME_SEQUENCE.length);
    }, FRAME_DURATION_MS);

    return () => clearInterval(interval);
  }, []);

  const currentFrame = useMemo(
    () => FRAME_SEQUENCE[frameIndex] ?? FRAME_SEQUENCE[0],
    [frameIndex]
  );

  const bird = (
    <div
      className={`flex items-center justify-center rounded-full border border-gp-gold/60 bg-gp-cream shadow-sm ${sizeStyles.circle}`}
    >
      <Image
        src={currentFrame}
        alt="PerchPal animation frame"
        width={sizeStyles.width}
        height={sizeStyles.height}
        priority
        aria-hidden="true"
      />
    </div>
  );

  const text = (
    <p className={`${sizeStyles.text} text-gp-evergreen/80`}>
      {helperMessage}
    </p>
  );

  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        className="flex items-center gap-3"
      >
        {bird}
        {text}
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-gp-evergreen/10 backdrop-blur-sm">
        <div
          role="status"
          aria-live="polite"
          aria-label={label}
          className="flex flex-col items-center gap-3 rounded-3xl border border-gp-gold/40 bg-white/90 px-8 py-6 text-center shadow-lg"
        >
          {bird}
          {text}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex flex-col items-center gap-3 text-center"
    >
      {bird}
      {text}
    </div>
  );
}

/**
 * Example:
 * <PerchPalLoader variant="block" size="md" />
 * <PerchPalLoader variant="inline" size="sm" message="Asking PerchPal..." />
 * <PerchPalLoader variant="overlay" size="lg" />
 */
