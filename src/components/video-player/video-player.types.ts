export type NextEpisodeInfo = {
  id: string;
  title: string;
  href: string;
  poster?: string | null;
  isSeasonTransition?: boolean;
  seasonNumber?: number | null;
};

export interface VideoProgressContext {
  contentType: "movies" | "series";
  contentId: string;
  episodeId?: string | null;
  playHref: string;
}

export interface VideoPlayerProps {
  url: string;
  poster?: string;
  title?: string;
  isHls?: boolean;
  variant?: "dashboard" | "full";
  backHref?: string;
  previousEpisode?: NextEpisodeInfo | null;
  nextEpisode?: NextEpisodeInfo | null;
  initialPositionSec?: number;
  progressContext?: VideoProgressContext;
}

export type StreamOption = {
  id: string;
  url: string;
  quality: string | null;
  label: string;
  rank: number;
  isCurrent: boolean;
};
