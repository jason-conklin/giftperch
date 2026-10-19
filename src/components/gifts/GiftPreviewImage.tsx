"use client";

import { useState } from "react";
import Image from "next/image";
import type { GiftPreviewSource } from "@/lib/gifts/getGiftPreviewIcon";

type GiftPreviewImageProps = {
  source: GiftPreviewSource;
  alt: string;
  sizes: string;
  className: string;
  draggable?: boolean;
};

export function GiftPreviewImage({
  source,
  alt,
  sizes,
  className,
  draggable,
}: GiftPreviewImageProps) {
  const [imageSrc, setImageSrc] = useState(source.primary);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      unoptimized={imageSrc.startsWith("https://")}
      draggable={draggable}
      onError={() => {
        if (imageSrc !== source.fallback) setImageSrc(source.fallback);
      }}
    />
  );
}
