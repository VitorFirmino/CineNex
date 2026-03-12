"use client";

import Link from "next/link";
import { Button } from "@components/ui/button";
import { SafeImage } from "@components/safe-image";
import { cn, sanitizeDisplayTitle } from "@shared/utils";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { placeholderImage } from "../../catalog-explorer/hooks/use-catalog-explorer";
import { useHomeHighlightRow } from "../hooks/use-home-highlight-row";
import type { HomeHighlightRowProps } from "../types";

export function HomeHighlightRow({ row, rowIndex }: HomeHighlightRowProps) {
  const {
    accentColor,
    canScrollNext,
    canScrollPrev,
    getHighlightHref,
    isWide,
    scrollerRef,
    scrollHighlights,
  } = useHomeHighlightRow(row, rowIndex);

  const colorMap = {
    emerald: "text-emerald-400 group-hover:text-emerald-300 shadow-emerald-500/20",
    indigo: "text-indigo-400 group-hover:text-indigo-300 shadow-indigo-500/20",
    rose: "text-rose-400 group-hover:text-rose-300 shadow-rose-500/20",
    violet: "text-violet-400 group-hover:text-violet-300 shadow-violet-500/20",
    amber: "text-amber-400 group-hover:text-amber-300 shadow-amber-500/20",
  };

  const dotColorMap = {
    emerald: "bg-emerald-500 shadow-[0_0_10px_var(--glow-full)]",
    indigo: "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]",
    rose: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)]",
    violet: "bg-violet-500 shadow-[0_0_10px_var(--glow-secondary-full)]",
    amber: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)]",
  };

  return (
    <section
      className="group/section space-y-8 relative px-4 xs:px-6 sm:px-12 lg:px-20"
      style={{
        contentVisibility: rowIndex === 0 ? "visible" : "auto",
        containIntrinsicSize: isWide ? "720px" : "540px",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl xs:text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
            <span className={cn("size-2 rounded-full", dotColorMap[accentColor as keyof typeof dotColorMap])} />
            {row.title}
          </h2>
          {row.caption && (
            <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] ml-6 opacity-70">
              {row.caption}
            </p>
          )}
        </div>

        <div className="hidden sm:flex gap-3">
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "size-10 rounded-xl bg-white/5 border border-white/10 text-white backdrop-blur-xl transition-all hover:bg-emerald-500 hover:text-white",
              !canScrollPrev && "opacity-20 pointer-events-none",
            )}
            onClick={() => scrollHighlights(-1)}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "size-10 rounded-xl bg-white/5 border border-white/10 text-white backdrop-blur-xl transition-all hover:bg-emerald-500 hover:text-white",
              !canScrollNext && "opacity-20 pointer-events-none",
            )}
            onClick={() => scrollHighlights(1)}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 pl-0 pr-2 sm:gap-6 sm:pr-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {row.items.map((item, index) => {
          const eagerLoadCard = rowIndex === 0 && index === 0;
          return (
            <div
              key={item.id}
              className={cn(
                "shrink-0 transition-all duration-500 ease-out snap-start",
                isWide
                  ? "basis-[90%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                  : "basis-[65%] xs:basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6",
              )}
            >
              <Link href={getHighlightHref(item)} className="group relative block cursor-pointer">
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-zinc-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]",
                    isWide ? "aspect-video" : "aspect-[2/3]",
                  )}
                >
                  <SafeImage
                    src={item.imageUrl || placeholderImage(isWide ? "backdrop" : "poster")}
                    fallbackSrc={placeholderImage(isWide ? "backdrop" : "poster")}
                    alt={item.title}
                    fill
                    sizes={
                      isWide ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 20vw"
                    }
                    loading={eagerLoadCard ? "eager" : "lazy"}
                    priority={eagerLoadCard}
                    className="object-cover opacity-85 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100 pointer-events-none">
                    <div className="size-16 sm:size-20 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-[0_0_30px_var(--glow-full)]">
                      <Play className="size-8 sm:size-10 fill-current translate-x-1" />
                    </div>
                  </div>

                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 opacity-100 transition-all duration-500">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h3
                          className={cn(
                            "font-black text-white leading-[1.1] tracking-tighter uppercase italic line-clamp-2",
                            isWide ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
                          )}
                        >
                          {sanitizeDisplayTitle(item.title)}
                        </h3>
                        <p
                          className={cn(
                            "text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-80",
                            colorMap[accentColor as keyof typeof colorMap],
                          )}
                        >
                          {item.badge || (isWide ? "CINEMATIC" : "ULTRA HD")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 group-hover:opacity-0 transition-opacity duration-300">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-xl border border-white/10">
                      <div className={cn("size-1.5 rounded-full", dotColorMap[accentColor as keyof typeof dotColorMap])} />
                      <span className="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-widest">
                        {item.badge || "4K"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
