"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HighlightItem, HighlightRow } from "@shared/types/highlights-types";
import { resolveExternalHighlightPath } from "../../catalog-explorer/hooks/use-catalog-explorer";

export function useHomeHighlightRow(row: HighlightRow, rowIndex: number) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const updateScrollState = () => {
      const maxScrollLeft = node.scrollWidth - node.clientWidth;
      setCanScrollPrev(node.scrollLeft > 4);
      setCanScrollNext(node.scrollLeft < maxScrollLeft - 4);
    };

    const handleScroll = () => updateScrollState();
    updateScrollState();
    node.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateScrollState())
        : null;
    resizeObserver?.observe(node);

    const frame = window.requestAnimationFrame(updateScrollState);

    return () => {
      window.cancelAnimationFrame(frame);
      node.removeEventListener("scroll", handleScroll);
      resizeObserver?.disconnect();
    };
  }, [row.items.length]);

  const isWide = rowIndex === 0;

  const accentColor = useMemo(() => {
    const id = row.id.toLowerCase();
    if (id.includes("launch")) return "emerald";
    if (id.includes("4k")) return "indigo";
    if (id.includes("series")) return "violet";
    if (id.includes("trending")) return "amber";
    return "emerald";
  }, [row.id]);

  const getHighlightHref = (item: HighlightItem) => {
    if (item.kind === "external") {
      const externalPath = resolveExternalHighlightPath(item);
      if (externalPath) return externalPath;
      return item.externalUrl || "#";
    }
    return `/view/${item.kind}/${item.id.replace(/^(launch|4k|series)-/, "")}`;
  };

  const scrollHighlights = (direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) return;

    const distance = Math.max(
      Math.round(node.clientWidth * (isWide ? 0.82 : 0.72)),
      isWide ? 320 : 260,
    );

    node.scrollBy({
      left: distance * direction,
      behavior: "smooth",
    });
  };

  return {
    accentColor,
    canScrollNext,
    canScrollPrev,
    getHighlightHref,
    isWide,
    scrollerRef,
    scrollHighlights,
  };
}
