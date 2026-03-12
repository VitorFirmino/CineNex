"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { LayoutGrid, Sparkles } from "lucide-react";
import { HomeHeroSkeleton } from "./components/home-hero-skeleton";
import { useHomeCatalogExplorer } from "./hooks/use-home-catalog-explorer";
import type { HomeCatalogExplorerProps } from "./types";

const HomeHeroInteractive = dynamic(
  () => import("./components/home-hero-interactive").then((m) => m.HomeHeroInteractive),
  {
    loading: () => <HomeHeroSkeleton />,
  },
);

const DeferredHomeHighlightRow = dynamic(
  () => import("./components/home-deferred-highlight-row").then((m) => m.HomeDeferredHighlightRow),
);

export function HomeCatalogExplorer({ highlights }: HomeCatalogExplorerProps) {
  const catalogSectionRef = useRef<HTMLDivElement | null>(null);
  const { discoverRows, heroSlides } = useHomeCatalogExplorer(highlights);

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
                  <p className="text-zinc-500 font-bold tracking-[0.3em] uppercase">Preparando Catálogo...</p>
                </div>
              </div>
            ) : (
              <HomeHeroInteractive slides={heroSlides} />
            )}
          </div>
        </div>
      </section>

      <div ref={catalogSectionRef} className="relative z-30 mx-auto w-full space-y-24 py-12 sm:py-20" id="catalog">
        <div className="sticky top-20 z-50 flex justify-center px-4">
          <div className="inline-flex p-1.5 bg-black/60 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <Link
              href="/"
              scroll={false}
              className="relative inline-flex h-12 items-center justify-center rounded-[1.6rem] px-8 sm:px-12 font-black text-[10px] sm:text-xs tracking-widest uppercase transition-all duration-500 overflow-hidden text-white"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-900 shadow-[0_4px_20px_rgba(16,185,129,0.4)]" />
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="size-3.5 text-emerald-100" />
                DESCOBRIR
              </span>
            </Link>
            <Link
              href="/collection/movies"
              scroll={false}
              className="relative inline-flex h-12 items-center justify-center rounded-[1.6rem] px-8 sm:px-12 font-black text-[10px] sm:text-xs tracking-widest uppercase transition-all duration-500 overflow-hidden text-zinc-500 hover:text-zinc-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                <LayoutGrid className="size-3.5 text-zinc-600" />
                COLEÇÃO
              </span>
            </Link>
          </div>
        </div>

        <section className="space-y-24 pb-20">
          {discoverRows.map((row, rowIndex) => (
            <DeferredHomeHighlightRow key={row.id} row={row} rowIndex={rowIndex} />
          ))}
        </section>
      </div>
    </main>
  );
}
