"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@components/ui/skeleton";
import { cn } from "@shared/utils";
import type { HomeDeferredHighlightRowProps } from "../types";
import { HomeHighlightRow } from "./home-highlight-row";

export function HomeDeferredHighlightRow({
  row,
  rowIndex,
}: HomeDeferredHighlightRowProps) {
  const placeholderRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(rowIndex < 2);

  useEffect(() => {
    if (isVisible) return;

    const node = placeholderRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "450px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  if (isVisible) {
    return <HomeHighlightRow row={row} rowIndex={rowIndex} />;
  }

  return (
    <section
      ref={placeholderRef}
      aria-hidden="true"
      className="relative px-4 xs:px-6 sm:px-12 lg:px-20"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: rowIndex === 0 ? "720px" : "540px",
      }}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-full bg-white/10" />
          <Skeleton className="h-3 w-72 rounded-full bg-white/5" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "shrink-0 rounded-[2rem] bg-white/5",
                rowIndex === 0
                  ? "aspect-video w-[88%] sm:w-[42%] lg:w-[30%]"
                  : "aspect-[2/3] w-[62%] xs:w-[46%] sm:w-[31%] lg:w-[19%]",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
