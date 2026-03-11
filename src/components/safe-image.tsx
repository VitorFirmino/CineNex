"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc: string;
}

function resolveImageSrc(src: ImageProps["src"]): ImageProps["src"] {
  if (typeof src !== "string") return src;
  if (src.startsWith("http://")) {
    return `/api/catalog/image?url=${encodeURIComponent(src)}`;
  }
  if (src.startsWith("//")) {
    return `/api/catalog/image?url=${encodeURIComponent(`https:${src}`)}`;
  }
  return src;
}

export function SafeImage({
  src,
  fallbackSrc,
  alt,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setCurrentSrc(src);
    setError(false);
  }

  const resolvedSrc = error || !currentSrc
    ? fallbackSrc
    : resolveImageSrc(currentSrc);
  const usesLocalProxy =
    typeof resolvedSrc === "string" &&
    resolvedSrc.startsWith("/api/catalog/image?");

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={() => setError(true)}
      unoptimized={props.unoptimized || usesLocalProxy}
    />
  );
}
