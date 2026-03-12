import {
  getLocalItemById,
  getSeriesDetailsSummary,
  getSeriesEpisode,
  getSeriesSeasonEpisodes,
  resolveMovieStreamUrl,
  resolveSeriesEpisodeStreamUrl,
} from "@services/catalog/db-store";
import { getWatchProgressForContent } from "@services/auth/watch-progress-store";
import { getSafeAuthUser } from "@infrastructure/supabase/auth";
import { createClient } from "@infrastructure/supabase/server";
import { notFound } from "next/navigation";
import { PlayerInterface } from "./player-interface";
import type { NextEpisodeInfo } from "@components/video-player";
import type { CatalogType, SeriesEpisode } from "@shared/types/catalog-types";
import type { ProgressContext, ResumeProgress } from "@shared/types/progress";
import type { WatchContentType } from "@services/auth/watch-progress-store";
import { isAdaptiveStreamUrl } from "@shared/catalog/catalog-stream";
import type {
  BuildDefaultPlayerStateParams,
  BuildSeriesPlayerStateParams,
  EpisodeContextParams,
  ExternalOnlyItem,
  PlayPageProps,
  PlayableItem,
  PlayerState,
} from "./play.types";

const PROGRESS_TYPES: WatchContentType[] = ["movies", "series"];

function isCatalogType(type: string): type is CatalogType {
  return PROGRESS_TYPES.includes(type as WatchContentType);
}

function isProgressType(type: string): type is WatchContentType {
  return PROGRESS_TYPES.includes(type as WatchContentType);
}

function buildExternalOnlyItem(id: string): ExternalOnlyItem {
  return {
    id,
    title: "Reproduzindo...",
    groupTitle: "TMDB",
    displayTitle: "Reproduzindo...",
    logoUrl: null,
    posterUrl: null,
    url: "",
    quality: null,
    codec: null,
    year: null,
    _externalOnly: true,
  };
}

function resolveSeriesSlug(item: PlayableItem, id: string) {
  if ("slug" in item && typeof item.slug === "string") {
    return item.slug;
  }

  return id;
}

function buildSeriesEpisodeHref(id: string, episodeId: string) {
  return `/play/series/${id}?episodeId=${episodeId}`;
}

function buildMoviePlayHref(id: string) {
  return `/play/movies/${id}`;
}

function shouldResumeMovie(resumeProgress: ResumeProgress | null) {
  if (!resumeProgress) return false;
  if (resumeProgress.completed) return false;
  return resumeProgress.positionSec > 5;
}

function shouldResumeEpisode(
  resumeProgress: ResumeProgress | null,
  episodeId: string,
) {
  if (!resumeProgress) return false;
  if (resumeProgress.completed) return false;
  if (resumeProgress.episodeId !== episodeId) return false;
  return resumeProgress.positionSec > 5;
}

async function resolvePlayableItem(type: string, id: string): Promise<PlayableItem | null> {
  if (!isCatalogType(type)) return null;

  const localItem = await getLocalItemById(type, id);
  if (localItem) return localItem;

  if (!/^\d+$/.test(id)) return null;
  return buildExternalOnlyItem(id);
}

async function loadResumeProgress(
  type: string,
  id: string,
): Promise<ResumeProgress | null> {
  if (!isProgressType(type)) return null;

  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    logContext: "play/page",
  });

  if (!user) return null;

  const saved = await getWatchProgressForContent(user.id, type, id);
  if (!saved) return null;

  return {
    episodeId: saved.episodeId,
    positionSec: saved.positionSec,
    completed: saved.completed,
  };
}

async function resolveSeriesEpisodeId(
  slug: string,
  requestedEpisodeId: string | undefined,
  resumeProgress: ResumeProgress | null,
) {
  if (requestedEpisodeId) return requestedEpisodeId;

  const resumableEpisodeId = resumeProgress?.completed
    ? null
    : resumeProgress?.episodeId ?? null;

  if (resumableEpisodeId) {
    const resumeEpisode = await getSeriesEpisode(slug, resumableEpisodeId);
    if (resumeEpisode) return resumeEpisode.id;
  }

  const summary = await getSeriesDetailsSummary(slug);
  const firstSeasonNumber = summary?.seasons[0]?.seasonNumber || 1;
  const firstSeasonEpisodes = await getSeriesSeasonEpisodes(slug, firstSeasonNumber);
  return firstSeasonEpisodes[0]?.id ?? null;
}

function buildEpisodeCardTitle(
  prefix: string,
  episode: SeriesEpisode,
) {
  return `${prefix}${episode.episodeNumber} - ${episode.title}`;
}

async function resolvePreviousEpisodeInfo(
  params: EpisodeContextParams,
): Promise<NextEpisodeInfo | null> {
  const { id, slug, summary, seasonEpisodes, currentEpisode, currentEpisodeId } = params;
  const currentEpisodeIndex = seasonEpisodes.findIndex((episode) => episode.id === currentEpisodeId);

  if (currentEpisodeIndex > 0) {
    const previousEpisode = seasonEpisodes[currentEpisodeIndex - 1];
    return {
      id: previousEpisode.id,
      title: buildEpisodeCardTitle("E", previousEpisode),
      href: buildSeriesEpisodeHref(id, previousEpisode.id),
      poster: previousEpisode.posterUrl || previousEpisode.logoUrl,
    };
  }

  if (currentEpisodeIndex !== 0 || !summary) return null;

  const currentSeasonIndex = summary.seasons.findIndex(
    (season) => season.seasonNumber === currentEpisode.seasonNumber,
  );

  if (currentSeasonIndex <= 0) return null;

  const previousSeason = summary.seasons[currentSeasonIndex - 1];
  const previousSeasonEpisodes = await getSeriesSeasonEpisodes(
    slug,
    previousSeason.seasonNumber,
  );

  const previousEpisode = previousSeasonEpisodes.at(-1);

  if (!previousEpisode) return null;

  return {
    id: previousEpisode.id,
    title: buildEpisodeCardTitle(`T${previousSeason.seasonNumber}:E`, previousEpisode),
    href: buildSeriesEpisodeHref(id, previousEpisode.id),
    poster: previousEpisode.posterUrl || previousEpisode.logoUrl,
  };
}

async function resolveNextEpisodeInfo(
  params: EpisodeContextParams,
): Promise<NextEpisodeInfo | null> {
  const { id, slug, summary, seasonEpisodes, currentEpisode, currentEpisodeId } = params;
  const currentEpisodeIndex = seasonEpisodes.findIndex((episode) => episode.id === currentEpisodeId);
  const hasNextEpisodeInSeason =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < seasonEpisodes.length - 1;

  if (hasNextEpisodeInSeason) {
    const nextEpisode = seasonEpisodes[currentEpisodeIndex + 1];
    return {
      id: nextEpisode.id,
      title: buildEpisodeCardTitle("E", nextEpisode),
      href: buildSeriesEpisodeHref(id, nextEpisode.id),
      poster: nextEpisode.posterUrl || nextEpisode.logoUrl,
      isSeasonTransition: false,
      seasonNumber: currentEpisode.seasonNumber,
    };
  }

  if (!summary || currentEpisodeIndex !== seasonEpisodes.length - 1) return null;

  const currentSeasonIndex = summary.seasons.findIndex(
    (season) => season.seasonNumber === currentEpisode.seasonNumber,
  );
  const hasNextSeason =
    currentSeasonIndex >= 0 && currentSeasonIndex < summary.seasons.length - 1;

  if (!hasNextSeason) return null;

  const nextSeason = summary.seasons[currentSeasonIndex + 1];
  const nextSeasonEpisodes = await getSeriesSeasonEpisodes(slug, nextSeason.seasonNumber);
  const nextEpisode = nextSeasonEpisodes[0];
  if (!nextEpisode) return null;

  return {
    id: nextEpisode.id,
    title: buildEpisodeCardTitle(`T${nextSeason.seasonNumber}:E`, nextEpisode),
    href: buildSeriesEpisodeHref(id, nextEpisode.id),
    poster: nextEpisode.posterUrl || nextEpisode.logoUrl,
    isSeasonTransition: true,
    seasonNumber: nextSeason.seasonNumber,
  };
}

async function buildSeriesPlayerState(
  params: BuildSeriesPlayerStateParams,
): Promise<PlayerState> {
  const { id, item, episodeId, resumeProgress } = params;
  const slug = resolveSeriesSlug(item, id);
  const resolvedEpisodeId = await resolveSeriesEpisodeId(slug, episodeId, resumeProgress);
  if (!resolvedEpisodeId) notFound();

  const resolvedStreamUrl = await resolveSeriesEpisodeStreamUrl(slug, resolvedEpisodeId);
  const streamUrl =
    resolvedStreamUrl
    || `/api/catalog/stream?type=series&slug=${encodeURIComponent(slug)}&episodeId=${encodeURIComponent(resolvedEpisodeId)}`;
  const progressContext: ProgressContext = {
    contentType: "series",
    contentId: id,
    episodeId: resolvedEpisodeId,
    playHref: buildSeriesEpisodeHref(id, resolvedEpisodeId),
  };

  const episode = await getSeriesEpisode(slug, resolvedEpisodeId);
  if (!episode) {
    return {
      streamUrl,
      title: item.title,
      previousEpisode: null,
      nextEpisode: null,
      progressContext,
    };
  }

  const [seasonEpisodes, summary] = await Promise.all([
    getSeriesSeasonEpisodes(slug, episode.seasonNumber),
    getSeriesDetailsSummary(slug),
  ]);

  const previousEpisode = await resolvePreviousEpisodeInfo({
    id,
    slug,
    summary,
    seasonEpisodes,
    currentEpisode: episode,
    currentEpisodeId: resolvedEpisodeId,
  });

  const nextEpisode = await resolveNextEpisodeInfo({
    id,
    slug,
    summary,
    seasonEpisodes,
    currentEpisode: episode,
    currentEpisodeId: resolvedEpisodeId,
  });

  return {
    streamUrl,
    title: `${item.title} - ${episode.title}`,
    previousEpisode,
    nextEpisode,
    initialPositionSec: shouldResumeEpisode(resumeProgress, resolvedEpisodeId)
      ? resumeProgress?.positionSec
      : undefined,
    progressContext,
  };
}

async function resolveDefaultStreamUrl(type: string, id: string) {
  if (type !== "movies") {
    return `/api/catalog/stream?type=${type}&id=${id}`;
  }

  const resolvedMovieStreamUrl = await resolveMovieStreamUrl(id);
  return resolvedMovieStreamUrl || `/api/catalog/stream?type=${type}&id=${id}`;
}

async function buildDefaultPlayerState(
  params: BuildDefaultPlayerStateParams,
): Promise<PlayerState> {
  const { type, id, title, resumeProgress } = params;
  const streamUrl = await resolveDefaultStreamUrl(type, id);
  const progressContext = type === "movies"
    ? {
      contentType: "movies" as const,
      contentId: id,
      playHref: buildMoviePlayHref(id),
    }
    : undefined;

  return {
    streamUrl,
    title,
    previousEpisode: null,
    nextEpisode: null,
    initialPositionSec: type === "movies" && shouldResumeMovie(resumeProgress)
      ? resumeProgress?.positionSec
      : undefined,
    progressContext,
  };
}

export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  const { type, id } = await params;
  const { episodeId } = await searchParams;
  const item = await resolvePlayableItem(type, id);
  if (!item) notFound();

  const resumeProgress = await loadResumeProgress(type, id);
  if (type === "series") {
    const seriesPlayerState = await buildSeriesPlayerState({
      id,
      item,
      episodeId,
      resumeProgress,
    });

    return (
      <PlayerInterface
        url={seriesPlayerState.streamUrl}
        title={seriesPlayerState.title}
        isHls={isAdaptiveStreamUrl(seriesPlayerState.streamUrl)}
        poster={item.posterUrl || item.logoUrl}
        backHref={`/view/${type}/${id}`}
        previousEpisode={seriesPlayerState.previousEpisode}
        nextEpisode={seriesPlayerState.nextEpisode}
        initialPositionSec={seriesPlayerState.initialPositionSec}
        progressContext={seriesPlayerState.progressContext}
      />
    );
  }

  const defaultPlayerState = await buildDefaultPlayerState({
    type,
    id,
    title: item.title,
    resumeProgress,
  });

  return (
    <PlayerInterface
      url={defaultPlayerState.streamUrl}
      title={defaultPlayerState.title}
      isHls={isAdaptiveStreamUrl(defaultPlayerState.streamUrl)}
      poster={item.posterUrl || item.logoUrl}
      backHref={`/view/${type}/${id}`}
      previousEpisode={defaultPlayerState.previousEpisode}
      nextEpisode={defaultPlayerState.nextEpisode}
      initialPositionSec={defaultPlayerState.initialPositionSec}
      progressContext={defaultPlayerState.progressContext}
    />
  );
}
