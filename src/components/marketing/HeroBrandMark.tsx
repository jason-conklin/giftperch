"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function HeroBrandMark() {
  const pathname = usePathname();
  const [playKey, setPlayKey] = useState(1);
  const lastPathRef = useRef(pathname);
  const motionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: number | null = null;

    if (pathname === "/" && lastPathRef.current !== "/") {
      timeoutId = window.setTimeout(() => {
        setPlayKey((current) => current + 1);
      }, 0);
    }
    lastPathRef.current = pathname;

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [pathname]);

  useEffect(() => {
    const motionEl = motionRef.current;
    if (!motionEl) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const desktopMotion = window.matchMedia("(min-width: 1024px)");
    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    let frameId: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const setMotionVars = (nx: number, ny: number) => {
      motionEl.style.setProperty("--gp-tilt-x", `${(-ny * 4).toFixed(2)}deg`);
      motionEl.style.setProperty("--gp-tilt-y", `${(nx * 6).toFixed(2)}deg`);
      motionEl.style.setProperty("--gp-parallax-y", `${(-ny * 6).toFixed(1)}px`);
    };

    const shouldDisableMotion = () =>
      prefersReducedMotion.matches || !desktopMotion.matches;

    const stopAnimationLoop = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const animate = () => {
      frameId = null;
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      setMotionVars(currentX, currentY);

      if (
        Math.abs(targetX - currentX) > 0.005 ||
        Math.abs(targetY - currentY) > 0.005
      ) {
        frameId = window.requestAnimationFrame(animate);
      } else if (targetX === 0 && targetY === 0) {
        currentX = 0;
        currentY = 0;
        setMotionVars(0, 0);
      }
    };

    const queueAnimation = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const resetMotion = () => {
      targetX = 0;
      targetY = 0;

      if (shouldDisableMotion()) {
        currentX = 0;
        currentY = 0;
        stopAnimationLoop();
        setMotionVars(0, 0);
        return;
      }

      queueAnimation();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (shouldDisableMotion()) return;

      const rect = motionEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const nx = clamp(
        (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2),
        -1,
        1,
      );
      const ny = clamp(
        (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2),
        -1,
        1,
      );

      targetX = nx;
      targetY = ny;
      queueAnimation();
    };

    const handleMouseLeave = () => {
      resetMotion();
    };

    const handleMediaChange = () => {
      resetMotion();
    };

    motionEl.addEventListener("mousemove", handleMouseMove);
    motionEl.addEventListener("mouseleave", handleMouseLeave);

    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", handleMediaChange);
      desktopMotion.addEventListener("change", handleMediaChange);
    } else {
      prefersReducedMotion.addListener(handleMediaChange);
      desktopMotion.addListener(handleMediaChange);
    }

    resetMotion();

    return () => {
      stopAnimationLoop();
      motionEl.removeEventListener("mousemove", handleMouseMove);
      motionEl.removeEventListener("mouseleave", handleMouseLeave);

      if (typeof prefersReducedMotion.removeEventListener === "function") {
        prefersReducedMotion.removeEventListener("change", handleMediaChange);
        desktopMotion.removeEventListener("change", handleMediaChange);
      } else {
        prefersReducedMotion.removeListener(handleMediaChange);
        desktopMotion.removeListener(handleMediaChange);
      }
    };
  }, [playKey]);

  return (
    <div className="gp-media-static w-full">
      <div key={playKey} className="gp-hero-intro mx-auto w-full">
        <div className="gp-hero-motion-wrap gp-hero-float mx-auto w-full">
          <div
            ref={motionRef}
            className="gp-hero-motion-wrap gp-hero-parallax mx-auto w-full"
          >
            <Image
              src="/giftperch-home-page-no-bg.png"
              alt="GiftPerch AI-Powered Gifting Workspace"
              width={1600}
              height={760}
              className="gp-media-static gp-landing-hero-art h-auto w-full max-w-[min(88vw,62rem)] object-contain"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
