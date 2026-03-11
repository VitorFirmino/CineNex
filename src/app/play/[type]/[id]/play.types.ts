import type { NextEpisodeInfo, VideoProgressContext } from "@components/video-player";
import type { CatalogType, SeriesEpisode } from "@shared/types/catalog-types";
import type { ProgressContext, ResumeProgress } from "@shared/types/progress";
import type { getLocalItemById, getSeriesDetailsSummary } from "@services/catalog/db-store";

export interface PlayRouteParams {
  type: string;
  id: string;
}

export interface PlayRouteSearchParams {
  episodeId?: string;
}

export interface PlayPageProps {
  params: Promise<PlayRouteParams>;
  searchParams: Promise<PlayRouteSearchParams>;
}

export type LocalCatalogItem = NonNullable<Awaited<ReturnType<typeof getLocalItemById>>>;
export type SeriesSummary = Awaited<ReturnType<typeof getSeriesDetailsSummary>>;

export type ExternalOnlyItem = {
  id: string;
  title: string;
  groupTitle: string;
  displayTitle: string;
  logoUrl: null;
  posterUrl: null;
  url: string;
  quality: null;
  codec: null;
  year: null;
  _externalOnly: true;
};

export type PlayableItem = LocalCatalogItem | ExternalOnlyItem;

export type PlayerState = {
  streamUrl: string;
  title: string;
  previousEpisode: NextEpisodeInfo | null;
  nextEpisode: NextEpisodeInfo | null;
  initialPositionSec?: number;
  progressContext?: ProgressContext;
};

export interface EpisodeContextParams {
  id: string;
  slug: string;
  summary: SeriesSummary;
  seasonEpisodes: SeriesEpisode[];
  currentEpisode: SeriesEpisode;
  currentEpisodeId: string;
}

export interface BuildSeriesPlayerStateParams {
  id: string;
  item: PlayableItem;
  episodeId?: string;
  resumeProgress: ResumeProgress | null;
}

export interface BuildDefaultPlayerStateParams {
  type: string;
  id: string;
  title: string;
  resumeProgress: ResumeProgress | null;
}

export interface PlayerInterfaceProps {
  url: string;
  title: string;
  isHls: boolean;
  poster?: string | null;
  backHref?: string;
  previousEpisode?: NextEpisodeInfo | null;
  nextEpisode?: NextEpisodeInfo | null;
  initialPositionSec?: number;
  progressContext?: VideoProgressContext;
}

export type { CatalogType };
