"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Gift, Users } from "lucide-react";
import type {
  DashboardPreviewGroup,
  DashboardPreviewImage,
} from "@/lib/dashboardPreviews";

function PreviewImage({ image }: { image: DashboardPreviewImage }) {
  const [src, setSrc] = useState(image.src);
  const [failed, setFailed] = useState(false);

  return (
    <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#f4f0e5] shadow-[0_3px_10px_rgba(15,61,62,0.16)]">
      {failed ? (
        <span className="flex h-full w-full items-center justify-center text-gp-app-evergreen/70">
          {image.kind === "recipient" ? (
            <Users aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Gift aria-hidden="true" className="h-5 w-5" />
          )}
        </span>
      ) : (
        <Image
          src={src}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
          unoptimized={src.startsWith("https://")}
          onError={() => {
            if (image.fallbackSrc && src !== image.fallbackSrc) {
              setSrc(image.fallbackSrc);
              return;
            }
            setFailed(true);
          }}
        />
      )}
    </span>
  );
}

export function RotatingImageStack({
  groups,
  label,
  intervalMs = 5000,
}: {
  groups: DashboardPreviewGroup[];
  label: string;
  intervalMs?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (groups.length <= 1) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      if (media.matches || document.hidden) return;
      timer = setInterval(() => {
        setActiveIndex((index) => (index + 1) % groups.length);
      }, intervalMs);
    };
    const handleVisibility = () => start();

    start();
    media.addEventListener("change", start);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      media.removeEventListener("change", start);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [groups, intervalMs]);

  if (!groups.length) return null;
  const visibleIndex = activeIndex % groups.length;

  return (
    <span
      className="relative block h-12 w-[4.75rem] shrink-0"
      role="img"
      aria-label={label}
    >
      {groups.map((group, index) => (
        <span
          key={group.id}
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 flex -space-x-3 transition-opacity duration-500 motion-reduce:transition-none ${
            index === visibleIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {group.images.map((image, imageIndex) => (
            <PreviewImage
              key={`${group.id}-${image.src}-${imageIndex}`}
              image={image}
            />
          ))}
        </span>
      ))}
    </span>
  );
}
