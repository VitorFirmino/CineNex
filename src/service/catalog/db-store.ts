import type {
  CatalogType,
  GroupCount,
  ListQuery,
  MovieItem,
  PaginationResult,
  SeriesIndexItem,
  SeriesItem,
  Summary,
} from "@shared/types/catalog-types";
import type { StreamFallbackOption } from "@shared/types/stream";
import {
  discoverMovies,
  discoverSeries,
  getMovieGenres,
  getTvGenres,
  getTmdbMovieDetails,
  getTmdbSeriesDetails,
  getTmdbSeasonEpisodes,
} from "@services/catalog/tmdb-discover";
import { getDemoVideoUrl } from "@services/catalog/demo-videos";

export type { StreamFallbackOption } from "@shared/types/stream";

export async function getSummary(): Promise<Summary | null> {
  return {
    generatedAt: new Date().toISOString(),
    source: "tmdb",
    totals: {
      movies: 500000,
      series: 150000,
    },
  };
}

export async function refreshSummarySnapshot(): Promise<Summary | null> {
  return getSummary();
}

export async function getGroupCounts(type: CatalogType | "all"): Promise<GroupCount[]> {
  if (type === "series") return getTvGenres();
  if (type === "movies") return getMovieGenres();
  const [movies, series] = await Promise.all([getMovieGenres(), getTvGenres()]);
  const map = new Map<string, number>();
  for (const g of [...movies, ...series]) {
    map.set(g.name, (map.get(g.name) || 0) + g.count);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}

export async function searchMovies(
  query: ListQuery,
): Promise<PaginationResult<MovieItem>> {
  return discoverMovies({
    page: query.page,
    pageSize: query.pageSize,
    genreId: query.group,
    query: query.q,
  });
}

export async function searchSeries(
  query: ListQuery,
): Promise<PaginationResult<SeriesIndexItem>> {
  return discoverSeries({
    page: query.page,
    pageSize: query.pageSize,
    genreId: query.group,
    query: query.q,
  });
}

type SeriesDetailsSummary = SeriesItem & {
  backdropUrl?: string | null;
  overview?: string | null;
  rating?: number | null;
  firstAirDate?: string | null;
  status?: string | null;
  genres?: string | null;
  networks?: string | null;
};

export async function getSeriesDetailsSummary(
  slugOrId: string,
): Promise<SeriesDetailsSummary | null> {
  const tmdbId = parseTmdbId(slugOrId, "tv");
  if (!tmdbId) return null;

  const details = await getTmdbSeriesDetails(tmdbId);
  if (!details) return null;

  return {
    ...details,
    backdropUrl: null,
    overview: null,
    rating: null,
    firstAirDate: null,
    status: null,
    genres: null,
    networks: null,
  };
}

export async function getSeriesDetails(
  slugOrId: string,
): Promise<SeriesItem | null> {
  const tmdbId = parseTmdbId(slugOrId, "tv");
  if (!tmdbId) return null;
  return getTmdbSeriesDetails(tmdbId);
}

export async function getSeriesSeasonEpisodes(
  slugOrId: string,
  seasonNumber: number,
) {
  const tmdbId = parseTmdbId(slugOrId, "tv");
  if (!tmdbId) return [];
  return getTmdbSeasonEpisodes(tmdbId, seasonNumber);
}

function parseEpisodeIdParts(
  episodeId: string,
): { season: number; episode: number } | null {
  const match = episodeId.match(/_s(\d+)_e(\d+)$/);
  if (!match) return null;
  return { season: Number(match[1]), episode: Number(match[2]) };
}

export async function getSeriesEpisode(slugOrId: string, episodeId: string) {
  const tmdbId = parseTmdbId(slugOrId, "tv");
  if (!tmdbId) return null;

  const parts = parseEpisodeIdParts(episodeId);
  if (parts) {
    const episodes = await getTmdbSeasonEpisodes(tmdbId, parts.season);
    return episodes.find((e) => e.id === episodeId) || null;
  }

  const details = await getTmdbSeriesDetails(tmdbId);
  if (!details) return null;
  for (const season of details.seasons) {
    const ep = season.episodes.find((e) => e.id === episodeId);
    if (ep) return ep;
  }
  return null;
}

export async function resolveMovieStreamUrl(
  id: string,
): Promise<string | null> {
  return getDemoVideoUrl(id);
}

export async function resolveSeriesEpisodeStreamUrl(
  slugOrId: string,
  episodeId: string,
): Promise<string | null> {
  void slugOrId;
  return getDemoVideoUrl(episodeId);
}

export async function getMovieStreamAlternatives(
  id: string,
): Promise<StreamFallbackOption[]> {
  const url = getDemoVideoUrl(id);
  return [
    {
      id: `demo-${id}`,
      url,
      quality: "HD",
      label: "Demo",
      rank: 1,
      isCurrent: true,
    },
  ];
}

export async function getSeriesEpisodeStreamAlternatives(
  slugOrId: string,
  episodeId: string,
): Promise<StreamFallbackOption[]> {
  void slugOrId;
  const url = getDemoVideoUrl(episodeId);
  return [
    {
      id: `demo-${episodeId}`,
      url,
      quality: "HD",
      label: "Demo",
      rank: 1,
      isCurrent: true,
    },
  ];
}

export async function getLocalShowcaseSlices() {
  const [launchesResult, seriesResult] = await Promise.all([
    discoverMovies({ page: 1, pageSize: 30 }),
    discoverSeries({ page: 1, pageSize: 30 }),
  ]);

  return {
    launches: launchesResult.items,
    seriesPopular: seriesResult.items,
  };
}

export async function getLocalItemById(
  type: CatalogType,
  id: string,
): Promise<MovieItem | SeriesIndexItem | null> {
  if (type === "movies") {
    const tmdbId = parseTmdbId(id, "movie");
    if (!tmdbId) return null;
    return getTmdbMovieDetails(tmdbId);
  }

  if (type === "series") {
    const tmdbId = parseTmdbId(id, "tv");
    if (!tmdbId) return null;
    const details = await getTmdbSeriesDetails(tmdbId);
    if (!details) return null;
    const { seasons, ...rest } = details;
    void seasons;
    return rest;
  }

  return null;
}

function parseTmdbId(id: string, type: "movie" | "tv"): number | null {
  const prefix = type === "movie" ? "tmdb_movie_" : "tmdb_tv_";
  if (id.startsWith(prefix)) {
    const num = Number(id.slice(prefix.length));
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  if (/^\d+$/.test(id)) {
    const num = Number(id);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  return null;
}
