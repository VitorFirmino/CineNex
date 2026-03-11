"use client";

import dynamic from "next/dynamic";
import { sanitizeDisplayTitle } from "@shared/utils";
import type { PlayerInterfaceProps } from "./play.types";

const VideoPlayer = dynamic(
  () => import("@components/video-player").then((m) => m.VideoPlayer),
  { ssr: false },
);

export function PlayerInterface({
  url,
  title,
  isHls,
  poster,
  backHref,
  previousEpisode,
  nextEpisode,
  initialPositionSec,
  progressContext,
}: PlayerInterfaceProps) {
  const safeTitle = sanitizeDisplayTitle(title);
  const safePoster = poster || undefined;

  return (
    <main className="fixed inset-0 z-[200] overflow-hidden bg-black">
      <div className="h-full w-full">
        <VideoPlayer
          url={url}
          title={safeTitle}
          isHls={isHls}
          poster={safePoster}
          backHref={backHref}
          variant="full"
          previousEpisode={previousEpisode}
          nextEpisode={nextEpisode}
          initialPositionSec={initialPositionSec}
          progressContext={progressContext}
        />
      </div>
    </main>
  );
}
