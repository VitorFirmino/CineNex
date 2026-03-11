import { Skeleton } from "@components/ui/skeleton";

export default function Loading() {
  return (
    <main className="texture-noise relative min-h-screen overflow-x-clip text-zinc-100">
      <section className="relative group/hero overflow-hidden border-b border-white/10">
        <div className="relative mx-auto w-full max-w-[2100px] px-0 pt-2 sm:px-4 sm:pt-6 lg:px-6">
          <div className="relative h-[58vh] min-h-[480px] sm:h-[66vh] sm:min-h-[560px] lg:h-[74vh] lg:min-h-[640px] lg:max-h-[920px] overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-zinc-900/20">
            <div className="absolute inset-0 flex items-end">
              <div className="mx-auto w-full max-w-[1800px] px-6 pb-10 sm:px-12 sm:pb-14 lg:px-20 space-y-7">
                <Skeleton className="h-8 w-48 rounded-full bg-white/5" />
                <div className="space-y-4">
                  <Skeleton className="h-16 sm:h-24 lg:h-32 w-2/3 bg-white/5" />
                  <Skeleton className="h-6 w-full max-w-2xl bg-white/5" />
                </div>
                <div className="flex gap-4 pt-2">
                  <Skeleton className="h-14 w-40 rounded-full bg-white/5" />
                  <Skeleton className="h-14 w-40 rounded-full bg-white/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-30 mx-auto w-full max-w-[1800px] space-y-32 px-6 py-24 sm:px-12 lg:px-20 -mt-12 sm:-mt-16">
        <div className="flex justify-center">
          <Skeleton className="h-16 w-80 rounded-full bg-white/5" />
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <section key={i} className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64 bg-white/5" />
                <Skeleton className="h-3 w-40 bg-white/5" />
              </div>
            </div>
            <div className="flex gap-6 overflow-hidden">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="aspect-[2/3] w-[70%] xs:w-full max-w-[280px] shrink-0 rounded-[2.5rem] bg-white/5" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
