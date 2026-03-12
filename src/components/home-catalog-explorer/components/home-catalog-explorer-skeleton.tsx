import { Skeleton } from "@components/ui/skeleton";
import { Sparkles, LayoutGrid } from "lucide-react";
import { HomeHeroSkeleton } from "./home-hero-skeleton";

export function HomeCatalogExplorerSkeleton() {
  return (
    <main className="texture-noise relative min-h-screen overflow-x-clip text-zinc-100 pt-16">
      <section className="relative group/hero overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,var(--glow-15),transparent_45%),radial-gradient(circle_at_80%_0%,var(--glow-secondary-12),transparent_40%)]" />
        <div className="relative mx-auto w-full max-w-[2100px] px-0 pt-2 sm:px-4 sm:pt-6 lg:px-6">
          <div className="relative h-[65vh] min-h-[500px] sm:h-[72vh] sm:min-h-[600px] lg:h-[82vh] lg:min-h-[700px] lg:max-h-[1000px]">
            <HomeHeroSkeleton />
          </div>
        </div>
      </section>

      <div className="relative z-30 mx-auto w-full space-y-24 py-12 sm:py-20">
        <div className="sticky top-20 z-50 flex justify-center px-4">
          <div className="inline-flex p-1.5 bg-black/60 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="relative inline-flex h-12 items-center justify-center rounded-[1.6rem] px-8 sm:px-12 font-black text-[10px] sm:text-xs tracking-widest uppercase text-white">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-900 shadow-[0_4px_20px_rgba(16,185,129,0.4)] rounded-[1.6rem]" />
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="size-3.5 text-emerald-100" />
                DESCOBRIR
              </span>
            </div>
            <div className="relative inline-flex h-12 items-center justify-center rounded-[1.6rem] px-8 sm:px-12 font-black text-[10px] sm:text-xs tracking-widest uppercase text-zinc-500">
              <span className="relative z-10 flex items-center gap-2">
                <LayoutGrid className="size-3.5 text-zinc-600" />
                COLECAO
              </span>
            </div>
          </div>
        </div>

        <section className="space-y-24 pb-20">
          {Array.from({ length: 3 }).map((_, rowIndex) => (
            <section
              key={rowIndex}
              className="relative px-4 xs:px-6 sm:px-12 lg:px-20 space-y-8"
            >
              <div className="space-y-2">
                <Skeleton className="h-8 w-56 rounded-full bg-white/10" />
                <Skeleton className="h-3 w-72 rounded-full bg-white/5" />
              </div>
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 4 }).map((_, cardIndex) => (
                  <Skeleton
                    key={cardIndex}
                    className={
                      rowIndex === 0
                        ? "aspect-video w-[88%] shrink-0 rounded-[2rem] bg-white/5 sm:w-[42%] lg:w-[30%]"
                        : "aspect-[2/3] w-[62%] shrink-0 rounded-[2rem] bg-white/5 xs:w-[46%] sm:w-[31%] lg:w-[19%]"
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
