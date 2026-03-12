"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@components/ui/carousel";
import { SafeImage } from "@components/safe-image";
import { cn, sanitizeDisplayTitle } from "@shared/utils";
import { ChevronLeft, ChevronRight, Info, Play } from "lucide-react";
import type { HighlightItem } from "@shared/types/highlights-types";
import {
  placeholderImage,
  resolveExternalHighlightPath,
  resolveExternalHighlightPlayPath,
} from "../../catalog-explorer/hooks/use-catalog-explorer";

interface HomeHeroInteractiveProps {
  slides: HighlightItem[];
  initialIndex?: number;
}

export function HomeHeroInteractive({
  slides,
  initialIndex = 0,
}: HomeHeroInteractiveProps) {
  const router = useRouter();
  const [heroApi, setHeroApi] = useState<CarouselApi>();
  const [heroIndex, setHeroIndex] = useState(initialIndex);

  const activeHero = slides[heroIndex] || slides[0] || null;
  const activeHeroSubtitle =
    activeHero?.subtitle || "Catálogo atualizado com destaque automático e curadoria contínua.";

  useEffect(() => {
    if (!heroApi) return;
    const onSelect = () => setHeroIndex(heroApi.selectedScrollSnap());
    heroApi.on("select", onSelect);
    heroApi.on("reInit", onSelect);
    heroApi.scrollTo(initialIndex, true);
    onSelect();
    return () => {
      heroApi.off("select", onSelect);
      heroApi.off("reInit", onSelect);
    };
  }, [heroApi, initialIndex]);

  useEffect(() => {
    if (!heroApi || slides.length <= 1) return;
    const timer = setInterval(() => heroApi.scrollNext(), 6500);
    return () => clearInterval(timer);
  }, [heroApi, slides.length]);

  const navigateToPlay = () => {
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
  };

  const navigateToInfo = () => {
    if (!activeHero) return;
    if (activeHero.kind === "external" && !activeHero.streamUrl && activeHero.externalUrl) {
      const externalPath = resolveExternalHighlightPath(activeHero);
      if (externalPath) router.push(externalPath);
      else router.push(activeHero.externalUrl);
      return;
    }
    const realId = activeHero.id.replace(/^(launch|4k|series)-/, "");
    router.push(`/view/${activeHero.kind}/${realId}`);
  };

  const desktopDots = useMemo(
    () =>
      slides.map((slide, index) => (
        <button
          key={slide.id}
          type="button"
          aria-label={`Ir para o destaque ${index + 1}: ${sanitizeDisplayTitle(slide.title || "Catálogo")}`}
          aria-current={index === heroIndex ? "true" : undefined}
          className={cn(
            "h-1.5 rounded-full transition-all duration-700",
            index === heroIndex
              ? "w-16 bg-emerald-400 shadow-[0_0_20px_var(--glow-full)]"
              : "w-3 bg-white/30 hover:bg-white/50",
          )}
          onClick={() => heroApi?.scrollTo(index)}
        />
      )),
    [heroApi, heroIndex, slides],
  );

  return (
    <>
      <Carousel setApi={setHeroApi} opts={{ loop: true }} className="h-full [&_[data-slot=carousel-content]]:h-full">
        <CarouselContent className="-ml-0 h-full">
          {slides.map((slide, index) => {
            const isActive = index === heroIndex;
            const eagerLoadSlide = index === 0;

            return (
              <CarouselItem key={slide.id} className="h-full pl-0 relative overflow-hidden">
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
                      "object-cover object-center ease-out transition-opacity duration-300 sm:transition-all sm:duration-[10000ms]",
                      isActive ? "scale-100 opacity-100 sm:scale-[1.08]" : "scale-100 opacity-60",
                    )}
                  />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

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
          {slides.map((_, index) => (
            <span
              key={`mobile-dot-${index}`}
              className={cn(
                "h-1 rounded-full transition-all duration-700",
                index === heroIndex
                  ? "w-8 bg-emerald-400 shadow-[0_0_20px_var(--glow-full)]"
                  : "w-2 bg-white/30",
              )}
            />
          ))}
        </div>
        <div className="hidden items-center gap-3 sm:flex">{desktopDots}</div>
      </div>

      <div className="absolute inset-0 flex items-end z-20 pointer-events-none">
        <div className="mx-auto w-full max-w-[1800px] px-6 py-12 sm:px-12 sm:py-20 lg:px-20 mt-auto">
          <div className="pointer-events-auto max-w-4xl space-y-8">
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
                onClick={navigateToPlay}
              >
                <Play className="size-6 fill-current mr-4" />
                ASSISTIR AGORA
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-16 px-10 rounded-2xl border-white/10 bg-black/40 text-white font-black text-sm sm:text-base hover:bg-white/10 backdrop-blur-3xl transition-all active:scale-95"
                onClick={navigateToInfo}
              >
                <Info className="size-6 mr-4" />
                MAIS INFO
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
