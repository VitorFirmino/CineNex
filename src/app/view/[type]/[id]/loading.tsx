import { Skeleton } from "@components/ui/skeleton";

export default function Loading() {
  return (
    <div className="relative min-h-screen bg-[#141414] text-white overflow-x-hidden pt-12">
      <section className="relative w-full min-h-[600px] sm:min-h-[85vh] bg-zinc-900/20 flex flex-col">
        <div className="relative flex-1 flex flex-col justify-end pb-12 sm:pb-20 px-4 xs:px-6 sm:px-12 lg:px-20 max-w-[1800px] mx-auto pt-32 sm:pt-40 space-y-6 sm:space-y-8">
          <Skeleton className="h-16 xs:h-24 md:h-32 lg:h-48 w-3/4 bg-white/5" />
          <Skeleton className="h-20 w-full max-w-2xl bg-white/5" />
          <div className="flex flex-wrap gap-4 pt-4">
            <Skeleton className="h-14 w-44 rounded bg-white/5" />
            <Skeleton className="h-14 w-44 rounded bg-white/5" />
            <Skeleton className="size-14 rounded-full bg-white/5" />
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-[1800px] mx-auto px-4 xs:px-6 sm:px-12 lg:px-20 -mt-10 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-16">
          <div className="space-y-12">
            <div className="flex gap-4">
              <Skeleton className="h-8 w-24 bg-white/5" />
              <Skeleton className="h-8 w-16 bg-white/5" />
              <Skeleton className="h-8 w-20 bg-white/5" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-4 w-20 bg-white/5" />
              <Skeleton className="h-32 w-full bg-white/5" />
            </div>
          </div>
          <aside className="space-y-10 pt-4">
            <div className="space-y-4 border-l-2 border-white/5 pl-6 py-2">
              <Skeleton className="h-4 w-24 bg-white/5" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-white/5" />
                <Skeleton className="h-4 w-2/3 bg-white/5" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
