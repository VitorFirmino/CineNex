"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@components/ui/button";
import { Skeleton } from "@components/ui/skeleton";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@components/ui/carousel";
import type { CatalogType } from "@shared/types/catalog-types";
import type { HighlightItem, HighlightRow, HomeHighlights } from "@shared/types/highlights-types";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Info,
  LayoutGrid,
} from "lucide-react";
import { cn, sanitizeDisplayTitle } from "@shared/utils";
import { SafeImage } from "@components/safe-image";
import {
  useCatalogExplorer,
  placeholderImage,
  resolveExternalHighlightPath,
  resolveExternalHighlightPlayPath,
  COLLECTION_ROUTE_BY_TAB,
} from "./hooks/use-catalog-explorer";
import type { ViewMode } from "@store/catalog-store";

const BrowseView = dynamic(
  () => import("./browse-view").then((m) => m.BrowseView),
  {
    loading: () => (
      <section className="space-y-12 px-4 xs:px-6 sm:px-12 lg:px-20 pb-20">
        <div className="space-y-6">
          <Skeleton className="h-24 w-full max-w-2xl rounded-[2rem] bg-white/5" />
          <Skeleton className="h-16 w-full rounded-[2rem] bg-white/5" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 sm:gap-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[2/3] rounded-[2rem] bg-white/5" />
            ))}
          </div>
        </div>
      </section>
    ),
  },
);

interface HighlightCarouselProps {
  row: HighlightRow;
  rowIndex: number;
}

interface CatalogExplorerProps {
  highlights: HomeHighlights;
  initialTab?: CatalogType;
  initialViewMode?: ViewMode;
}

function HighlightCarousel({
  row,
  rowIndex,
}: HighlightCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
  }, [api]);

  const getHighlightHref = (item: HighlightItem) => {
    if (item.kind === "external") {
      const externalPath = resolveExternalHighlightPath(item);
      if (externalPath) return externalPath;
      return item.externalUrl || "#";
    }
    return `/view/${item.kind}/${item.id.replace(/^(launch|4k|series)-/, "")}`;
  };

  const isWide = rowIndex === 0;

  const accentColor = useMemo(() => {
    const id = row.id.toLowerCase();
    if (id.includes("launch")) return "emerald";
    if (id.includes("4k")) return "indigo";
    if (id.includes("series")) return "violet";
    if (id.includes("trending")) return "amber";
    return "emerald";
  }, [row.id]);

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
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-2xl xs:text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4"
          >
            <span className={cn("size-2 rounded-full", dotColorMap[accentColor as keyof typeof dotColorMap])} />
            {row.title}
          </motion.h2>
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
            onClick={() => api?.scrollPrev()}
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
            onClick={() => api?.scrollNext()}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: "start", dragFree: true }}
        className="w-full relative"
      >
        <CarouselContent className="-ml-4 sm:-ml-6">
          {row.items.map((item, index) => {
            const eagerLoadCard = rowIndex === 0 && index === 0;
            return (
              <CarouselItem
                key={item.id}
                className={cn(
                  "pl-4 sm:pl-6 transition-all duration-500 ease-out",
                  isWide
                    ? "basis-[90%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                    : "basis-[65%] xs:basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6",
                )}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link
                    href={getHighlightHref(item)}
                    className="group relative block cursor-pointer"
                  >
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
                          isWide
                            ? "(max-width: 768px) 100vw, 50vw"
                            : "(max-width: 768px) 50vw, 20vw"
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
                </motion.div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

function DeferredHighlightCarousel({
  row,
  rowIndex,
}: HighlightCarouselProps) {
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
    return <HighlightCarousel row={row} rowIndex={rowIndex} />;
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

export function CatalogExplorer({
  highlights,
  initialTab = "movies",
  initialViewMode = "discover",
}: CatalogExplorerProps) {
  const router = useRouter();
  const {
    tab,
    viewMode,
    catalogSectionRef,
    query,
    isCommandOpen,
    setIsCommandOpen,
    heroApi,
    setHeroApi,
    heroIndex,
    heroSlides,
    activeHero,
    activeHeroSubtitle,
    discoverRows,
    groups,
    isLoadingList,
    page,
    currentData,
    visibleItems,
    onTabChange,
    onQueryChange,
    onHighlightClick,
    onPageChange,
    filters,
  } = useCatalogExplorer({
    highlights,
    initialTab,
    initialViewMode,
  });

  const {
    selectedGroups,
    quality,
    legendado,
    isAdvancedOpen,
    setIsAdvancedOpen,
    sortOptions,
    activeAdvancedCount,
    onSelectSingleGroup,
    onToggleGroupFilter,
    onSortChange,
    setLegendado,
    resetAdvancedFilters,
    sort,
  } = filters;

  return (
    <main className="texture-noise relative min-h-screen overflow-x-clip text-zinc-100 pt-16">
      <section className="relative group/hero overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,var(--glow-15),transparent_45%),radial-gradient(circle_at_80%_0%,var(--glow-secondary-12),transparent_40%)]" />
        <div className="relative mx-auto w-full max-w-[2100px] px-0 pt-2 sm:px-4 sm:pt-6 lg:px-6">
          <div className="relative h-[65vh] min-h-[500px] sm:h-[72vh] sm:min-h-[600px] lg:h-[82vh] lg:min-h-[700px] lg:max-h-[1000px] overflow-hidden rounded-3xl sm:rounded-[3rem] border border-white/10 bg-zinc-950 shadow-[0_50px_140px_rgba(0,0,0,0.7)]">
            {heroSlides.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center space-y-4">
                  <Sparkles className="size-12 text-emerald-500 mx-auto animate-pulse" />
                  <p className="text-zinc-500 font-bold tracking-[0.3em] uppercase">
                    Preparando Catálogo...
                  </p>
                </div>
              </div>
            ) : (
              <Carousel
                setApi={setHeroApi}
                opts={{ loop: true }}
                className="h-full [&_[data-slot=carousel-content]]:h-full"
              >
                <CarouselContent className="-ml-0 h-full">
                  {heroSlides.map((slide, index) => {
                    const isActive = index === heroIndex;
                    const eagerLoadSlide = index === 0;
                    return (
                      <CarouselItem
                        key={slide.id}
                        className="h-full pl-0 relative overflow-hidden"
                      >
                        <div className="relative h-full w-full bg-zinc-900">
                          <SafeImage
                            src={slide.imageUrl || placeholderImage("backdrop")}
                            fallbackSrc={placeholderImage("backdrop")}
                            alt={slide.title}
                            fill
                            sizes="100vw"
                            loading={eagerLoadSlide ? "eager" : "lazy"}
                            priority={eagerLoadSlide}
                            className={cn(
                              "object-cover object-center transition-opacity duration-300 ease-out sm:transition-all sm:duration-[10000ms]",
                              isActive ? "scale-100 opacity-100 sm:scale-[1.08]" : "scale-100 opacity-60",
                            )}
                          />
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/80 to-transparent" />

            <div className="absolute inset-y-0 left-6 hidden sm:flex items-center z-30">
              <Button
                size="icon"
                variant="ghost"
                className="size-14 rounded-full bg-black/40 text-white backdrop-blur-2xl border border-white/10 hover:bg-emerald-500 hover:text-white transition-all shadow-xl"
                onClick={() => heroApi?.scrollPrev()}
              >
                <ChevronLeft className="size-8" />
              </Button>
            </div>
            <div className="absolute inset-y-0 right-6 hidden sm:flex items-center z-30">
              <Button
                size="icon"
                variant="ghost"
                className="size-14 rounded-full bg-black/40 text-white backdrop-blur-2xl border border-white/10 hover:bg-emerald-500 hover:text-white transition-all shadow-xl"
                onClick={() => heroApi?.scrollNext()}
              >
                <ChevronRight className="size-8" />
              </Button>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:bottom-12 sm:right-12 z-30 sm:pb-4">
              <div className="flex items-center gap-2 sm:hidden" aria-hidden="true">
                {heroSlides.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all duration-700",
                      i === heroIndex
                        ? "w-8 bg-emerald-400 shadow-[0_0_20px_var(--glow-full)]"
                        : "w-2 bg-white/30",
                    )}
                  />
                ))}
              </div>

              <div className="hidden items-center gap-3 sm:flex">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ir para o destaque ${i + 1}: ${sanitizeDisplayTitle(heroSlides[i]?.title || "Catálogo")}`}
                    aria-current={i === heroIndex ? "true" : undefined}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-700",
                      i === heroIndex
                        ? "w-16 bg-emerald-400 shadow-[0_0_20px_var(--glow-full)]"
                        : "w-3 bg-white/30 hover:bg-white/50",
                    )}
                    onClick={() => heroApi?.scrollTo(i)}
                  />
                ))}
              </div>
            </div>

            <div className="absolute inset-0 flex items-end z-20 pointer-events-none">
              <div className="mx-auto w-full max-w-[1800px] px-6 py-12 sm:px-12 sm:py-20 lg:px-20 mt-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="pointer-events-auto max-w-4xl space-y-8"
                >
                  <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 backdrop-blur-3xl">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_var(--glow-full)]" />
                    <p className="text-[11px] sm:text-xs font-black tracking-[0.3em] text-emerald-300 uppercase">
                      DESTAQUE PREMIUM
                    </p>
                  </div>

                  <div className="space-y-6">
                    <h1
                      className="headline-neo line-clamp-3 text-4xl leading-[1] font-black tracking-tighter sm:text-7xl lg:text-9xl uppercase italic"
                      title={sanitizeDisplayTitle(activeHero?.title || "Explorer")}
                    >
                      {sanitizeDisplayTitle(activeHero?.title || "Explorer")}
                    </h1>
                    <p className="max-w-2xl text-base font-medium text-zinc-100/80 sm:text-lg lg:text-xl border-l-2 border-emerald-500/50 pl-6 leading-relaxed line-clamp-3">
                      {sanitizeDisplayTitle(activeHeroSubtitle)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button
                      size="lg"
                      className="h-16 px-10 rounded-2xl bg-white text-slate-950 font-black text-sm sm:text-base hover:bg-emerald-400 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95"
                      onClick={() => {
                        if (!activeHero) return;
                        if (activeHero.kind === "external") {
                          const playPath = resolveExternalHighlightPlayPath(activeHero);
                          if (playPath) {
                            router.push(playPath);
                            return;
                          }
                          if (activeHero.externalUrl) {
                            router.push(activeHero.externalUrl);
                            return;
                          }
                        }
                        const realId = activeHero.id.replace(/^(launch|4k|series)-/, "");
                        router.push(`/play/${activeHero.kind}/${realId}`);
                      }}
                    >
                      <Play className="size-6 fill-current mr-4" />
                      ASSISTIR AGORA
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="h-16 px-10 rounded-2xl border-white/10 bg-black/40 text-white font-black text-sm sm:text-base hover:bg-white/10 backdrop-blur-3xl transition-all active:scale-95"
                      onClick={() => activeHero && onHighlightClick(activeHero)}
                    >
                      <Info className="size-6 mr-4" />
                      MAIS INFO
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

      </section>

      <div
        ref={catalogSectionRef}
        className="relative z-30 mx-auto w-full space-y-24 py-12 sm:py-20"
        id="catalog"
      >
        <div className="sticky top-20 z-50 flex justify-center px-4">
          <motion.div
            layout
            className="inline-flex p-1.5 bg-black/60 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
          >
            <Link
              href="/"
              scroll={false}
              className={cn(
                "relative inline-flex h-12 items-center justify-center rounded-[1.6rem] px-8 sm:px-12 font-black text-[10px] sm:text-xs tracking-widest uppercase transition-all duration-500 overflow-hidden",
                viewMode === "discover"
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {viewMode === "discover" && (
                <motion.div
                  layoutId="active-mode-bg"
                  className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-900 shadow-[0_4px_20px_rgba(16,185,129,0.4)]"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className={cn("size-3.5", viewMode === "discover" ? "text-emerald-100" : "text-zinc-600")} />
                DESCOBRIR
              </span>
            </Link>
            <Link
              href={COLLECTION_ROUTE_BY_TAB[tab]}
              scroll={false}
              className={cn(
                "relative inline-flex h-12 items-center justify-center rounded-[1.6rem] px-8 sm:px-12 font-black text-[10px] sm:text-xs tracking-widest uppercase transition-all duration-500 overflow-hidden",
                viewMode === "browse"
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {viewMode === "browse" && (
                <motion.div
                  layoutId="active-mode-bg"
                  className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-900 shadow-[0_4px_20px_rgba(16,185,129,0.4)]"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <LayoutGrid className={cn("size-3.5", viewMode === "browse" ? "text-emerald-100" : "text-zinc-600")} />
                COLEÇÃO
              </span>
            </Link>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === "discover" ? (
            <motion.section
              key="discover-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-24 pb-20"
            >
              {discoverRows.map((row, rowIndex) => (
                <DeferredHighlightCarousel
                  key={row.id}
                  row={row}
                  rowIndex={rowIndex}
                />
              ))}
            </motion.section>
          ) : (
            <BrowseView
              activeAdvancedCount={activeAdvancedCount}
              currentData={currentData}
              groups={groups}
              isAdvancedOpen={isAdvancedOpen}
              isCommandOpen={isCommandOpen}
              isLoadingList={isLoadingList}
              legendado={legendado}
              onPageChange={onPageChange}
              onQueryChange={onQueryChange}
              onSelectSingleGroup={(value) => {
                onSelectSingleGroup(value);
                catalogSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              onSortChange={onSortChange}
              onTabChange={onTabChange}
              onToggleGroupFilter={onToggleGroupFilter}
              page={page}
              quality={quality}
              query={query}
              resetAdvancedFilters={resetAdvancedFilters}
              selectedGroups={selectedGroups}
              setIsAdvancedOpen={setIsAdvancedOpen}
              setIsCommandOpen={setIsCommandOpen}
              setLegendado={setLegendado}
              sort={sort}
              sortOptions={sortOptions}
              tab={tab}
              visibleItems={visibleItems}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
