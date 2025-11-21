"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type PerchPalLoaderProps = {
  variant?: "inline" | "block" | "overlay";
  size?: "sm" | "md" | "lg";
  message?: string | null;
  ariaLabel?: string;
  className?: string;
  showText?: boolean;
};

const FLYING_SEQUENCE = [
  "/giftperch_flying_animation1.PNG",
  "/giftperch_flying_animation3.PNG",
  "/giftperch_flying_animation2.PNG",
  "/giftperch_flying_animation3.PNG",
  "/giftperch_flying_animation1.PNG",
  "/giftperch_flying_animation3.PNG",
  "/giftperch_flying_animation2.PNG",
  "/giftperch_flying_animation3.PNG",
] as const;

const RETURN_SEQUENCE = [
  "/giftperch_retrieve_animation_1.png",
  "/giftperch_retrieve_animation_3.PNG",
  "/giftperch_retrieve_animation_2.png",
  "/giftperch_retrieve_animation_3.PNG",
  "/giftperch_retrieve_animation_1.png",
  "/giftperch_retrieve_animation_3.PNG",
  "/giftperch_retrieve_animation_2.png",
  "/giftperch_retrieve_animation_3.PNG",
] as const;

const FRAME_SEQUENCE = [...FLYING_SEQUENCE, ...RETURN_SEQUENCE] as const;

const FRAME_DURATION_MS = 200;

const sizeMap = {
  sm: { width: 48, height: 48, text: "text-xs", circle: "p-2" },
  md: { width: 56, height: 56, text: "text-sm", circle: "p-2.5" },
  lg: { width: 64, height: 64, text: "text-base", circle: "p-3" },
} as const;

export function PerchPalLoader({
  variant = "block",
  size = "md",
  message,
  ariaLabel,
  className,
  showText = true,
}: PerchPalLoaderProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const sizeStyles = sizeMap[size];
  const label =
    ariaLabel ?? "PerchPal is fetching gift suggestions...";
  const helperMessage =
    message === undefined ? "PerchPal is fetching thoughtful gift ideas..." : message;

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
        unoptimized
        priority
        aria-hidden="true"
        className="object-contain"
      />
    </div>
  );

  if (!showText) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        className={className}
      >
        {bird}
      </div>
    );
  }

  const text =
    helperMessage === null ? null : (
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
      className={`flex items-center gap-3 ${className ?? ""}`}
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
        className={`flex flex-col items-center gap-3 rounded-3xl border border-gp-gold/40 bg-white/90 px-8 py-6 text-center shadow-lg ${className ?? ""}`}
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
      className={`flex flex-col items-center gap-3 text-center ${className ?? ""}`}
    >
      {bird}
      {text}
    </div>
  );
}

export function PerchPalFlyingAvatar({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses =
    size === "lg" ? "h-16 w-16" : size === "sm" ? "h-12 w-12" : "h-14 w-14";

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full bg-gp-cream/90 ${sizeClasses} ${className ?? ""}`}
    >
      <PerchPalLoader
        showText={false}
        ariaLabel="PerchPal flying animation"
        className="h-full w-full"
      />
    </div>
  );
}

/**
 * Example:
 * <PerchPalLoader variant="block" size="md" />
 * <PerchPalLoader variant="inline" size="sm" message="Asking PerchPal..." />
 * <PerchPalLoader variant="overlay" size="lg" />
 */
