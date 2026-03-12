import { Skeleton } from "@components/ui/skeleton";

export function HomeHeroSkeleton() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl sm:rounded-[3rem] border border-white/10 bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(34,197,94,0.12),transparent_28%),linear-gradient(180deg,rgba(10,10,10,0.35)_0%,rgba(10,10,10,0.82)_72%,rgba(10,10,10,1)_100%)]" />

      <Skeleton className="absolute inset-0 rounded-none bg-white/[0.04]" />

      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto w-full max-w-[1800px] px-6 py-12 sm:px-12 sm:py-20 lg:px-20">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 backdrop-blur-3xl">
              <div className="size-2 rounded-full bg-emerald-500/80" />
              <Skeleton className="h-3 w-32 rounded-full bg-emerald-200/15" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-12 w-[78%] rounded-2xl bg-white/10 sm:h-20" />
              <Skeleton className="h-12 w-[58%] rounded-2xl bg-white/8 sm:h-20" />
              <Skeleton className="h-5 w-[70%] rounded-full bg-white/8" />
              <Skeleton className="h-5 w-[52%] rounded-full bg-white/8" />
            </div>

            <div className="flex gap-4 pt-4">
              <Skeleton className="h-16 w-48 rounded-2xl bg-white/15" />
              <Skeleton className="h-16 w-40 rounded-2xl bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 sm:hidden">
        <Skeleton className="h-1 w-8 rounded-full bg-emerald-300/40" />
        <Skeleton className="h-1 w-2 rounded-full bg-white/20" />
        <Skeleton className="h-1 w-2 rounded-full bg-white/20" />
      </div>
    </div>
  );
}
