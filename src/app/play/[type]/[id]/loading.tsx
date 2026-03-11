import { Skeleton } from "@components/ui/skeleton";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black z-[300] flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-zinc-900/10" />
      <div className="relative flex flex-col items-center gap-10">
        <Skeleton className="size-24 rounded-full bg-white/5 animate-pulse" />
        <div className="flex flex-col items-center gap-3">
           <Skeleton className="h-6 w-48 bg-white/5" />
           <Skeleton className="h-3 w-32 bg-white/5" />
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 flex flex-col gap-6 bg-linear-to-t from-black to-transparent">
        <Skeleton className="h-1.5 w-full rounded-full bg-white/10" />
        <div className="flex items-center gap-6">
           <Skeleton className="size-12 rounded-full bg-white/10" />
           <Skeleton className="size-8 rounded-full bg-white/10" />
           <Skeleton className="h-4 w-24 rounded bg-white/10" />
           <div className="ml-auto flex gap-4">
              <Skeleton className="size-8 rounded-lg bg-white/10" />
              <Skeleton className="size-8 rounded-lg bg-white/10" />
           </div>
        </div>
      </div>
    </div>
  );
}
