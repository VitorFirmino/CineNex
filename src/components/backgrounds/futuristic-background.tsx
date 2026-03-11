"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, type CSSProperties } from "react";
import { normalizeImageSrc } from "@shared/media/image-utils";

type FuturisticBackgroundProps = {
  images?: string[];
};

const ThreeBackground = dynamic(
  () => import("./three-background").then((mod) => mod.ThreeBackground),
  { ssr: false },
);

const FALLBACK_TILE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23040a16'/%3E%3Cstop offset='100%25' stop-color='%230d1f3b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E";

function buildTiles(rawImages: string[] = []): string[] {
  const normalized = rawImages
    .map((item) => normalizeImageSrc(item))
    .filter((item): item is string => Boolean(item));

  const unique = Array.from(new Set(normalized));
  if (unique.length === 0) return Array.from({ length: 12 }, () => FALLBACK_TILE);

  const tiles: string[] = [];
  while (tiles.length < 12) {
    tiles.push(unique[tiles.length % unique.length]);
  }
  return tiles;
}

export function FuturisticBackground({ images = [] }: FuturisticBackgroundProps) {
  const tiles = useMemo(() => buildTiles(images), [images]);

  return (
    <>
      <ThreeBackground />
      <div className="futuristic-bg pointer-events-none fixed inset-0 -z-[2] overflow-hidden" aria-hidden>
        <div className="futuristic-bg__matrix opacity-20">
          {tiles.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="futuristic-bg__tile"
              style={{ "--tile-delay": `${index * 85}ms` } as CSSProperties}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
                className="object-cover grayscale brightness-50 contrast-125"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
        <div className="futuristic-bg__mesh opacity-10" />
        <div className="futuristic-bg__line futuristic-bg__line--one opacity-40" />
        <div className="futuristic-bg__line futuristic-bg__line--two opacity-40" />
        <div className="futuristic-bg__line futuristic-bg__line--three opacity-40" />
        <div className="futuristic-bg__shade" />
      </div>
    </>
  );
}
