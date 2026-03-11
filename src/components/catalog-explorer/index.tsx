"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Skeleton } from "@components/ui/skeleton";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import type { CatalogType, GroupCount } from "@shared/types/catalog-types";
import type { HighlightItem, HighlightRow, HomeHighlights } from "@shared/types/highlights-types";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Command as CommandIcon,
  Info,
  Check,
  TrendingUp,
  LayoutGrid,
  X as XIcon,
} from "lucide-react";
import { cn, sanitizeDisplayTitle, cleanTitleForSearch, formatNumber } from "@shared/utils";
import { SafeImage } from "@components/safe-image";
import { FavoriteButton } from "@components/favorite-button";
import {
  useCatalogExplorer,
  placeholderImage,
  resolveExternalHighlightPath,
  resolveExternalHighlightPlayPath,
  buildPagination,
  COLLECTION_ROUTE_BY_TAB,
  type CatalogItem,
} from "./hooks/use-catalog-explorer";
import { MAX_GROUP_FILTERS } from "./hooks/use-catalog-filters";
import type { LegendadoFilter, SortValue, ViewMode } from "@store/catalog-store";

const SearchCommand = dynamic(
  () => import("@components/search-command").then((m) => m.SearchCommand),
  { ssr: false },
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
    <section className="group/section space-y-8 relative px-4 xs:px-6 sm:px-12 lg:px-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <motion.h3
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-2xl xs:text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4"
          >
            <span className={cn("size-2 rounded-full", dotColorMap[accentColor as keyof typeof dotColorMap])} />
            {row.title}
          </motion.h3>
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
                            <h4
                              className={cn(
                                "font-black text-white leading-[1.1] tracking-tighter uppercase italic line-clamp-2",
                                isWide ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
                              )}
                            >
                              {sanitizeDisplayTitle(item.title)}
                            </h4>
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

  const handleToggleGroupFilter = (value: string) => onToggleGroupFilter(value);

  const handleSortChange = (value: string) =>
    onSortChange(value as SortValue);

  const handleLegendadoChange = (value: string) =>
    setLegendado(value as LegendadoFilter);

  const handleResetAdvancedFilters = () => resetAdvancedFilters();

  const handleSelectSingleGroup = (value: string) => {
    onSelectSingleGroup(value);
    catalogSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
                              "object-cover object-center transition-all duration-[10000ms] ease-out",
                              isActive ? "scale-[1.08] opacity-100" : "scale-100 opacity-60",
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

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:bottom-12 sm:right-12 flex items-center gap-2 sm:gap-3 z-30 sm:pb-4">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  className={cn(
                    "h-1 sm:h-1.5 rounded-full transition-all duration-700",
                    i === heroIndex
                      ? "w-8 sm:w-16 bg-emerald-400 shadow-[0_0_20px_var(--glow-full)]"
                      : "w-2 sm:w-3 bg-white/30 hover:bg-white/50",
                  )}
                  onClick={() => heroApi?.scrollTo(i)}
                />
              ))}
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
                <HighlightCarousel key={row.id} row={row} rowIndex={rowIndex} />
              ))}
            </motion.section>
          ) : (
            <motion.section
              key="browse-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-12 px-4 xs:px-6 sm:px-12 lg:px-20 pb-20"
            >
              <div className="flex flex-col gap-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-white/5 pb-8">
                  <div className="space-y-5">
                    <h2 className="text-5xl font-black sm:text-8xl headline-neo tracking-tighter uppercase italic leading-[0.85] flex flex-col">
                      <span className="text-zinc-600 text-3xl sm:text-5xl">Explorar</span>
                      <span className="bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Toda Coleção</span>
                    </h2>
                    <div className="flex gap-10 pt-4">
                      {(Object.keys(COLLECTION_ROUTE_BY_TAB) as CatalogType[]).map((type) => (
                        <Link
                          key={type}
                          href={COLLECTION_ROUTE_BY_TAB[type]}
                          scroll={false}
                          className={cn(
                            "text-xs font-black tracking-[0.4em] uppercase transition-all pb-4 border-b-2",
                            tab === type
                              ? "text-emerald-400 border-emerald-500"
                              : "text-zinc-600 border-transparent hover:text-zinc-300",
                          )}
                        >
                          {type === "movies" ? "FILMES" : "SÉRIES"}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                      <Input
                        className="h-16 w-full border-white/5 bg-white/[0.03] pl-14 pr-14 rounded-2xl text-base font-bold text-white placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-emerald-500/30 transition-all backdrop-blur-xl shadow-xl"
                        placeholder="Pesquisar por título ou palavra-chave..."
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                      />
                      {query && (
                        <button
                          onClick={() => onQueryChange("")}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors p-1"
                        >
                          <XIcon className="size-5" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3 h-16">
                      <Button
                        variant="outline"
                        className={cn(
                          "h-full px-8 rounded-2xl border-white/10 bg-white/5 text-zinc-100 font-black text-[11px] tracking-widest uppercase hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all backdrop-blur-xl flex-1 lg:flex-none",
                          activeAdvancedCount > 0 && "text-emerald-400 border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                        )}
                        onClick={() => setIsAdvancedOpen(true)}
                      >
                        <SlidersHorizontal className="mr-3 size-5 text-emerald-500" />
                        FILTRE
                        {activeAdvancedCount > 0 && (
                          <span className="ml-2 size-5 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black">
                            {activeAdvancedCount}
                          </span>
                        )}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 text-emerald-500 backdrop-blur-xl shadow-xl"
                        onClick={() => setIsCommandOpen(true)}
                      >
                        <CommandIcon className="size-6" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-zinc-950/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-3 mr-4">
                        <TrendingUp className={cn("size-4 text-emerald-500", isLoadingList && "animate-pulse")} />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">
                          {isLoadingList ? (
                            <span className="text-emerald-500/80 animate-pulse">BUSCANDO NO CATÁLOGO...</span>
                          ) : (
                            <>{formatNumber(currentData?.total || 0)} {tab === "movies" ? "FILMES" : "SÉRIES"} DISPONÍVEIS</>
                          )}
                        </span>
                      </div>

                      {(selectedGroups.length > 0 || quality !== "all" || legendado !== "all") && (
                        <>
                          <div className="h-4 w-px bg-white/10 mx-2 hidden md:block" />
                          <div className="flex flex-wrap gap-2">
                            {selectedGroups.map(g => (
                              <Badge key={g} variant="tech" className="bg-violet-500/5 text-violet-400 border-violet-500/10 py-1.5 px-4 rounded-xl normal-case font-bold text-[10px]">
                                {sanitizeDisplayTitle(g)}
                              </Badge>
                            ))}
                            {quality !== "all" && (
                              <Badge variant="tech" className="bg-violet-500/5 text-violet-400 border-violet-500/10 py-1.5 px-4 rounded-xl font-bold text-[10px]">
                                {quality}
                              </Badge>
                            )}
                            {legendado !== "all" && (
                              <Badge variant="tech" className="bg-blue-500/5 text-blue-400 border-blue-500/10 py-1.5 px-4 rounded-xl font-bold text-[10px]">
                                {legendado === "yes" ? "Legendado" : "Dublado"}
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {activeAdvancedCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg"
                        onClick={handleResetAdvancedFilters}
                      >
                        REMOVER TODOS OS FILTROS
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 sm:gap-8 min-h-screen">
                  {isLoadingList
                    ? Array.from({ length: 18 }).map((_, i) => (
                      <div key={i} className="space-y-4">
                        <Skeleton className="aspect-[2/3] rounded-[2rem] bg-white/5 border border-white/5" />
                        <div className="space-y-2 px-2">
                          <Skeleton className="h-3 w-16 bg-white/5" />
                          <Skeleton className="h-5 w-full bg-white/5" />
                        </div>
                      </div>
                    ))
                    : visibleItems.map((item: CatalogItem, index: number) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (index % 12) * 0.03, duration: 0.4 }}
                      >
                        <Link
                          href={`/view/${tab}/${item.id}`}
                          className="group relative block"
                        >
                          <div className="relative w-full aspect-[2/3] overflow-hidden rounded-[1.8rem] sm:rounded-[2.2rem] bg-zinc-950 border border-white/5 shadow-2xl transition-all duration-500 group-hover:scale-[1.04] group-hover:border-emerald-500/40 group-hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
                            <SafeImage
                              src={item.posterUrl || item.logoUrl || placeholderImage("poster")}
                              fallbackSrc={placeholderImage("poster")}
                              alt={item.title}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 15vw"
                              className="object-cover opacity-85 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100 pointer-events-none">
                              <div className="size-16 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-[0_0_30px_var(--glow-full)]">
                                <Play className="size-8 fill-current translate-x-1" />
                              </div>
                            </div>

                            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-20">
                              <FavoriteButton
                                type={tab === "movies" ? "movie" : "series"}
                                contentId={item.id}
                                className="size-10 bg-black/40 backdrop-blur-xl border-white/10 hover:bg-emerald-500 hover:text-white"
                              />
                              {"quality" in item && item.quality && (
                                <Badge variant="neon" className="text-[8px] sm:text-[9px] px-2 py-0.5 uppercase font-black">
                                  {item.quality}
                                </Badge>
                              )}
                            </div>

                            <div className="absolute inset-x-0 bottom-0 p-6 space-y-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                              <p className="text-[9px] font-black text-violet-400 uppercase tracking-[0.2em] line-clamp-1 opacity-90">
                                {sanitizeDisplayTitle(item.groupTitle)}
                              </p>
                              <h3 className="line-clamp-2 text-base sm:text-lg font-black text-white leading-tight uppercase italic group-hover:text-emerald-300 transition-colors">
                                {cleanTitleForSearch(item.title)}
                              </h3>
                              {"year" in item && item.year && (
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  {item.year}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-12 pt-24 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_10px_var(--glow-full)]" />
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                      PÁGINA {currentData?.page} DE {currentData?.totalPages}
                    </p>
                  </div>

                  {currentData && currentData.totalPages > 1 && (
                    <div className="flex items-center gap-3 p-1.5 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-xl">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-12 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                      >
                        <ChevronLeft className="size-6" />
                      </Button>

                      <div className="flex gap-1.5 px-2">
                        {buildPagination(page, currentData.totalPages).map((p) => (
                          <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={cn(
                              "size-10 rounded-xl text-[10px] font-black transition-all",
                              page === p
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                                : "text-zinc-500 hover:text-white hover:bg-white/5",
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-12 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500"
                        disabled={page >= currentData.totalPages}
                        onClick={() => onPageChange(page + 1)}
                      >
                        <ChevronRight className="size-6" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-white/10 bg-[#070708]/98 backdrop-blur-[40px] text-zinc-100 sm:max-w-3xl max-h-[90vh] flex flex-col p-0 shadow-[0_0_100px_rgba(0,0,0,1)]"
        >
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_10%,var(--glow-40),transparent_50%)]" />
          </div>

          <DialogHeader className="p-8 sm:p-12 border-b border-white/5 relative z-10 flex flex-row items-center justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic flex items-center gap-5 text-white">
                <SlidersHorizontal className="size-8 sm:size-10 text-emerald-500" />
                FILTRE O CATÁLOGO
              </DialogTitle>
              <DialogDescription className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">
                Ajuste as configurações para encontrar o conteúdo perfeito.
              </DialogDescription>
            </div>

            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="size-12 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-all">
                <XIcon className="size-6" />
                <span className="sr-only">Fechar</span>
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-12 no-scrollbar relative z-10">
            <div className="grid gap-10 sm:grid-cols-2">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                  ORDEM DE EXIBIÇÃO
                </p>
                <Select value={sort} onValueChange={handleSortChange}>
                  <SelectTrigger className="h-16 rounded-2xl border-white/5 bg-white/[0.03] font-black text-xs tracking-widest uppercase focus:ring-emerald-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1115] border-white/10">
                    {sortOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="h-14 font-black text-[10px] tracking-widest uppercase focus:bg-emerald-600 focus:text-white"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                  TIPO DE ÁUDIO
                </p>
                <Select value={legendado} onValueChange={handleLegendadoChange}>
                  <SelectTrigger className="h-16 rounded-2xl border-white/5 bg-white/[0.03] font-black text-xs tracking-widest uppercase focus:ring-emerald-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1115] border-white/10">
                    <SelectItem value="all" className="h-14 font-black text-[10px] tracking-widest uppercase focus:bg-emerald-600">
                      TODOS OS TÍTULOS
                    </SelectItem>
                    <SelectItem value="no" className="h-14 font-black text-[10px] tracking-widest uppercase focus:bg-emerald-600">
                      DUBLADO (PT-BR)
                    </SelectItem>
                    <SelectItem value="yes" className="h-14 font-black text-[10px] tracking-widest uppercase focus:bg-emerald-600">
                      LEGENDADO / ORIGINAL
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                  CATEGORIAS DISPONÍVEIS
                </p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {selectedGroups.length} DE {MAX_GROUP_FILTERS} SELECIONADOS
                </p>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  className={cn(
                    "h-14 rounded-2xl text-[10px] font-black tracking-widest uppercase border transition-all flex items-center justify-center gap-3",
                    selectedGroups.length === 0
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-lg"
                      : "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/20 hover:text-zinc-300",
                  )}
                  onClick={() => handleToggleGroupFilter("all")}
                >
                  {selectedGroups.length === 0 && <Check className="size-4" />}
                  TODAS AS CATEGORIAS
                </button>
                {groups.slice(0, 24).map((g) => {
                  const isSelected = selectedGroups.includes(g.name);
                  return (
                    <button
                      key={g.name}
                      className={cn(
                        "h-14 px-5 rounded-2xl text-[10px] font-black tracking-widest uppercase border transition-all truncate text-left flex items-center justify-between group/cat",
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg"
                          : "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/20 hover:text-zinc-300",
                        !isSelected &&
                        selectedGroups.length >= MAX_GROUP_FILTERS &&
                        "opacity-30 cursor-not-allowed",
                      )}
                      disabled={!isSelected && selectedGroups.length >= MAX_GROUP_FILTERS}
                      onClick={() => handleToggleGroupFilter(g.name)}
                    >
                      <span className="truncate">{sanitizeDisplayTitle(g.name)}</span>
                      {isSelected ? (
                        <Check className="size-4 shrink-0" />
                      ) : (
                        <span className="text-zinc-800 group-hover/cat:text-zinc-600 text-[8px] font-bold">ADD</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12 bg-black/60 border-t border-white/5 flex gap-4 relative z-10">
            <Button
              variant="ghost"
              className="flex-1 h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/5"
              onClick={handleResetAdvancedFilters}
            >
              RESETAR TUDO
            </Button>
            <Button
              className="flex-[2] h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-900 text-white font-black uppercase tracking-[0.2em] text-[10px] hover:from-emerald-500 hover:to-cyan-500 shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all"
              onClick={() => setIsAdvancedOpen(false)}
            >
              CONFIRMAR E FILTRAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SearchCommand
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        groups={groups as GroupCount[]}
        onSelectGroup={handleSelectSingleGroup}
        onSelectTab={onTabChange}
      />
    </main>
  );
}
