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
  const result = await discoverMovies({
    page: query.page,
    pageSize: query.pageSize,
    genreId: query.group,
    query: query.q,
    sort: query.sort,
  });

  return {
    ...result,
    items: sortMovieItems(result.items, query.sort),
  };
}

export async function searchSeries(
  query: ListQuery,
): Promise<PaginationResult<SeriesIndexItem>> {
  const result = await discoverSeries({
    page: query.page,
    pageSize: query.pageSize,
    genreId: query.group,
    query: query.q,
  });

  const items = isEpisodeSort(query.sort)
    ? await hydrateSeriesEpisodeCounts(result.items)
    : result.items;

  return {
    ...result,
    items: sortSeriesItems(items, query.sort),
  };
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

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });
}

function compareNullableNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: "asc" | "desc",
): number {
  const left = typeof a === "number" && Number.isFinite(a) ? a : null;
  const right = typeof b === "number" && Number.isFinite(b) ? b : null;

  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  return direction === "asc" ? left - right : right - left;
}

function stableSort<T>(items: T[], compare: (a: T, b: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => compare(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}

function isEpisodeSort(sort: ListQuery["sort"]): sort is "episodes_asc" | "episodes_desc" {
  return sort === "episodes_asc" || sort === "episodes_desc";
}

async function hydrateSeriesEpisodeCounts(
  items: SeriesIndexItem[],
): Promise<SeriesIndexItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const tmdbId = parseTmdbId(item.id, "tv");
      if (!tmdbId) return item;

      const details = await getTmdbSeriesDetails(tmdbId);
      if (!details) return item;

      return {
        ...item,
        seasonCount: details.seasonCount,
        episodeCount: details.episodeCount,
      };
    }),
  );
}

type ItemCompare<T> = (a: T, b: T) => number;

const movieSortComparers: Partial<Record<NonNullable<ListQuery["sort"]>, ItemCompare<MovieItem>>> = {
  title_asc: (a, b) => compareText(a.title || a.displayTitle, b.title || b.displayTitle),
  title_desc: (a, b) => compareText(b.title || b.displayTitle, a.title || a.displayTitle),
  year_asc: (a, b) =>
    compareNullableNumber(a.year, b.year, "asc") ||
    compareText(a.title || a.displayTitle, b.title || b.displayTitle),
  year_desc: (a, b) =>
    compareNullableNumber(a.year, b.year, "desc") ||
    compareText(a.title || a.displayTitle, b.title || b.displayTitle),
};

function sortMovieItems(
  items: MovieItem[],
  sort: ListQuery["sort"],
): MovieItem[] {
  const compare = sort ? movieSortComparers[sort] : undefined;
  return compare ? stableSort(items, compare) : items;
}

const seriesSortComparers: Partial<Record<NonNullable<ListQuery["sort"]>, ItemCompare<SeriesIndexItem>>> = {
  title_asc: (a, b) => compareText(a.title, b.title),
  title_desc: (a, b) => compareText(b.title, a.title),
  episodes_asc: (a, b) =>
    compareNullableNumber(a.episodeCount, b.episodeCount, "asc") ||
    compareText(a.title, b.title),
  episodes_desc: (a, b) =>
    compareNullableNumber(a.episodeCount, b.episodeCount, "desc") ||
    compareText(a.title, b.title),
};

function sortSeriesItems(
  items: SeriesIndexItem[],
  sort: ListQuery["sort"],
): SeriesIndexItem[] {
  const compare = sort ? seriesSortComparers[sort] : undefined;
  return compare ? stableSort(items, compare) : items;
}
