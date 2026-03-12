import type { GroupCount, ListQuery, MovieItem, SeriesIndexItem, SeriesItem } from "@shared/types/catalog-types";
import { getDemoVideoUrl } from "@services/catalog/demo-videos";

function getHeaders(): HeadersInit | null {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  if (bearer) {
    return {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json;charset=utf-8",
    };
  }
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  return { "Content-Type": "application/json;charset=utf-8" };
}

function withApiKey(url: URL): URL {
  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey) url.searchParams.set("api_key", apiKey);
  return url;
}

function imageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

async function tmdbFetch<T>(url: URL, revalidate = 3600): Promise<T | null> {
  const headers = getHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(withApiKey(url), {
      headers,
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error("[tmdb-discover] Falha na requisicao ao TMDB.", error);
    return null;
  }
}

const MOVIE_GENRE_ID_TO_NAME: Record<number, string> = {
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  36: "História",
  27: "Terror",
  10402: "Música",
  9648: "Mistério",
  10749: "Romance",
  878: "Ficção Científica",
  10770: "Filme de TV",
  53: "Thriller",
  10752: "Guerra",
  37: "Faroeste",
};

const TV_GENRE_ID_TO_NAME: Record<number, string> = {
  10759: "Ação e Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  10762: "Infantil",
  9648: "Mistério",
  10763: "Notícias",
  10764: "Reality",
  10765: "Sci-Fi e Fantasia",
  10766: "Novela",
  10767: "Talk Show",
  10768: "Guerra e Política",
  37: "Faroeste",
};

const MOVIE_GENRE_NAME_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(MOVIE_GENRE_ID_TO_NAME).map(([id, name]) => [name, id]),
);
const TV_GENRE_NAME_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(TV_GENRE_ID_TO_NAME).map(([id, name]) => [name, id]),
);

const MOVIE_CURATED: GroupCount[] = [
  { name: "Em Alta", count: 999 },
  { name: "Mais Votados", count: 999 },
  { name: "Comédia Romântica", count: 500 },
];

const TV_CURATED: GroupCount[] = [
  { name: "Em Alta", count: 999 },
  { name: "Mais Votados", count: 999 },
];

type GenreFilter =
  | { kind: "trending" }
  | { kind: "top_rated" }
  | { kind: "genres"; withGenres: string }
  | { kind: "none" };

function resolveMovieGenreFilter(value: string): GenreFilter {
  const parts = value.split(",").map((v) => v.trim()).filter(Boolean);

  if (parts.length > 1) {
    if (parts.includes("Em Alta")) return { kind: "trending" };
    if (parts.includes("Mais Votados")) return { kind: "top_rated" };

    const ids: string[] = [];
    for (const part of parts) {
      if (part === "Comédia Romântica") { ids.push("35", "10749"); continue; }
      const id = MOVIE_GENRE_NAME_TO_ID[part];
      if (id) ids.push(id);
      else if (/^\d/.test(part)) ids.push(part);
    }
    return ids.length > 0 ? { kind: "genres", withGenres: ids.join("|") } : { kind: "none" };
  }

  if (value === "Em Alta") return { kind: "trending" };
  if (value === "Mais Votados") return { kind: "top_rated" };
  if (value === "Comédia Romântica") return { kind: "genres", withGenres: "35,10749" };
  const id = MOVIE_GENRE_NAME_TO_ID[value];
  if (id) return { kind: "genres", withGenres: id };
  if (/^\d/.test(value)) return { kind: "genres", withGenres: value };
  return { kind: "none" };
}

function resolveTvGenreFilter(value: string): GenreFilter {
  const parts = value.split(",").map((v) => v.trim()).filter(Boolean);

  if (parts.length > 1) {
    if (parts.includes("Em Alta")) return { kind: "trending" };
    if (parts.includes("Mais Votados")) return { kind: "top_rated" };

    const ids: string[] = [];
    for (const part of parts) {
      const id = TV_GENRE_NAME_TO_ID[part];
      if (id) ids.push(id);
      else if (/^\d/.test(part)) ids.push(part);
    }
    return ids.length > 0 ? { kind: "genres", withGenres: ids.join("|") } : { kind: "none" };
  }

  if (value === "Em Alta") return { kind: "trending" };
  if (value === "Mais Votados") return { kind: "top_rated" };
  const id = TV_GENRE_NAME_TO_ID[value];
  if (id) return { kind: "genres", withGenres: id };
  if (/^\d/.test(value)) return { kind: "genres", withGenres: value };
  return { kind: "none" };
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbNetwork {
  name: string;
}

type TmdbMovieResult = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
};

type TmdbSeasonStub = {
  season_number: number;
  episode_count: number;
};

type TmdbTvDetails = {
  id: number;
  name?: string;
  overview?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: TmdbGenre[];
  networks?: TmdbNetwork[];
  status?: string;
  seasons?: TmdbSeasonStub[];
};

type TmdbEpisode = {
  id: number;
  name?: string;
  overview?: string;
  episode_number?: number;
  still_path?: string | null;
  air_date?: string | null;
};

type TmdbSeasonDetails = {
  episodes?: TmdbEpisode[];
};

type TmdbVideoResult = {
  key: string;
  site: string;
  type: string;
  official?: boolean;
};

type TmdbVideosResult = {
  results?: TmdbVideoResult[];
};

type TmdbPageResult = {
  results?: TmdbMovieResult[];
  total_results?: number;
  total_pages?: number;
};

const TMDB_PAGE_SIZE = 20;
const TMDB_MAX_PAGE = 500;

interface DiscoverMoviesParams {
  page?: number;
  pageSize?: number;
  genreId?: string;
  query?: string;
  year?: number;
  sort?: ListQuery["sort"];
}

interface DiscoverMoviesResult {
  items: MovieItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface DiscoverSeriesParams {
  page?: number;
  pageSize?: number;
  genreId?: string;
  query?: string;
}

interface DiscoverSeriesResult {
  items: SeriesIndexItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function movieIdFromTmdb(tmdbId: number): string {
  return `tmdb_movie_${tmdbId}`;
}

function tvIdFromTmdb(tmdbId: number): string {
  return `tmdb_tv_${tmdbId}`;
}

function normalizeRequestedPage(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

function normalizeRequestedPageSize(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function resolveReachableTotal(data: TmdbPageResult | null): {
  total: number;
  totalPages: number;
} {
  const rawTotal = data?.total_results ?? 0;
  const rawTotalPages = data?.total_pages ?? 0;
  const reachableTmdbPages = Math.max(0, Math.min(rawTotalPages, TMDB_MAX_PAGE));
  const reachableTotal = Math.min(rawTotal, reachableTmdbPages * TMDB_PAGE_SIZE);

  return {
    total: reachableTotal,
    totalPages: reachableTotal > 0 ? Math.ceil(reachableTotal / TMDB_PAGE_SIZE) : 0,
  };
}

async function fetchTmdbCatalogWindow(
  page: number,
  pageSize: number,
  buildPageUrl: (tmdbPage: number) => URL,
  revalidate: number,
): Promise<{
  page: number;
  total: number;
  totalPages: number;
  results: TmdbMovieResult[];
}> {
  const loadWindow = async (uiPage: number) => {
    const startIndex = (uiPage - 1) * pageSize;
    const endIndex = startIndex + pageSize - 1;
    const firstTmdbPage = Math.min(
      TMDB_MAX_PAGE,
      Math.floor(startIndex / TMDB_PAGE_SIZE) + 1,
    );
    const lastTmdbPage = Math.min(
      TMDB_MAX_PAGE,
      Math.floor(endIndex / TMDB_PAGE_SIZE) + 1,
    );
    const tmdbPages = Array.from(
      { length: lastTmdbPage - firstTmdbPage + 1 },
      (_, index) => firstTmdbPage + index,
    );
    const payloads = await Promise.all(
      tmdbPages.map((tmdbPage) => tmdbFetch<TmdbPageResult>(buildPageUrl(tmdbPage), revalidate)),
    );
    const metadata = payloads.find((payload) => payload !== null) ?? null;
    const reachable = resolveReachableTotal(metadata);
    const totalPages =
      reachable.total > 0 ? Math.ceil(reachable.total / pageSize) : 0;
    const combinedResults = payloads.flatMap((payload) => payload?.results ?? []);
    const offsetWithinCombined =
      startIndex - ((firstTmdbPage - 1) * TMDB_PAGE_SIZE);

    return {
      total: reachable.total,
      totalPages,
      results: combinedResults.slice(
        offsetWithinCombined,
        offsetWithinCombined + pageSize,
      ),
    };
  };

  const requestedPage = normalizeRequestedPage(page);
  const initialWindow = await loadWindow(requestedPage);
  const effectivePage =
    initialWindow.totalPages > 0
      ? Math.min(requestedPage, initialWindow.totalPages)
      : 1;

  if (effectivePage === requestedPage) {
    return {
      page: effectivePage,
      total: initialWindow.total,
      totalPages: initialWindow.totalPages,
      results: initialWindow.results,
    };
  }

  const clampedWindow = await loadWindow(effectivePage);
  return {
    page: effectivePage,
    total: clampedWindow.total,
    totalPages: clampedWindow.totalPages,
    results: clampedWindow.results,
  };
}

function primaryMovieGenre(genreIds?: number[]): string {
  if (!genreIds?.length) return "Filme";
  return MOVIE_GENRE_ID_TO_NAME[genreIds[0]] || "Filme";
}

function primaryTvGenre(genreIds?: number[], genres?: TmdbGenre[]): string {
  if (genres?.length) {
    return TV_GENRE_ID_TO_NAME[genres[0].id] || genres[0].name || "Série";
  }
  if (genreIds?.length) {
    return TV_GENRE_ID_TO_NAME[genreIds[0]] || "Série";
  }
  return "Série";
}

type PageUrlBuilder = (tmdbPage: number) => URL;
type ResolvedUrlConfig = { buildPageUrl: PageUrlBuilder; revalidate: number };

function resolveMovieDiscoverSort(sort?: ListQuery["sort"]): string {
  if (sort === "year_asc") return "primary_release_date.asc";
  if (sort === "year_desc") return "primary_release_date.desc";
  return "popularity.desc";
}

function resolveMoviePageUrl(params: DiscoverMoviesParams): ResolvedUrlConfig {
  if (params.query) {
    return {
      revalidate: 1800,
      buildPageUrl: (tmdbPage) => {
        const url = new URL("https://api.themoviedb.org/3/search/movie");
        url.searchParams.set("query", params.query!);
        url.searchParams.set("language", "pt-BR");
        url.searchParams.set("page", String(tmdbPage));
        return url;
      },
    };
  }

  if (params.genreId) {
    const filter = resolveMovieGenreFilter(params.genreId);

    if (filter.kind === "trending") {
      return {
        revalidate: 1800,
        buildPageUrl: (tmdbPage) => {
          const url = new URL("https://api.themoviedb.org/3/trending/movie/week");
          url.searchParams.set("language", "pt-BR");
          url.searchParams.set("page", String(tmdbPage));
          return url;
        },
      };
    }

    if (filter.kind === "top_rated") {
      return {
        revalidate: 3600,
        buildPageUrl: (tmdbPage) => {
          const url = new URL("https://api.themoviedb.org/3/movie/top_rated");
          url.searchParams.set("language", "pt-BR");
          url.searchParams.set("page", String(tmdbPage));
          return url;
        },
      };
    }

    return {
      revalidate: 3600,
      buildPageUrl: (tmdbPage) => {
        const url = new URL("https://api.themoviedb.org/3/discover/movie");
        url.searchParams.set("language", "pt-BR");
        url.searchParams.set("sort_by", resolveMovieDiscoverSort(params.sort));
        url.searchParams.set("page", String(tmdbPage));
        url.searchParams.set("include_adult", "false");
        if (filter.kind === "genres") url.searchParams.set("with_genres", filter.withGenres);
        if (params.year) url.searchParams.set("primary_release_year", String(params.year));
        return url;
      },
    };
  }

  return {
    revalidate: 3600,
    buildPageUrl: (tmdbPage) => {
      const url = new URL("https://api.themoviedb.org/3/discover/movie");
      url.searchParams.set("language", "pt-BR");
      url.searchParams.set("sort_by", resolveMovieDiscoverSort(params.sort));
      url.searchParams.set("page", String(tmdbPage));
      url.searchParams.set("include_adult", "false");
      if (params.year) url.searchParams.set("primary_release_year", String(params.year));
      return url;
    },
  };
}

function resolveTvPageUrl(params: DiscoverSeriesParams): ResolvedUrlConfig {
  if (params.query) {
    return {
      revalidate: 1800,
      buildPageUrl: (tmdbPage) => {
        const url = new URL("https://api.themoviedb.org/3/search/tv");
        url.searchParams.set("query", params.query!);
        url.searchParams.set("language", "pt-BR");
        url.searchParams.set("page", String(tmdbPage));
        return url;
      },
    };
  }

  if (params.genreId) {
    const filter = resolveTvGenreFilter(params.genreId);

    if (filter.kind === "trending") {
      return {
        revalidate: 1800,
        buildPageUrl: (tmdbPage) => {
          const url = new URL("https://api.themoviedb.org/3/trending/tv/week");
          url.searchParams.set("language", "pt-BR");
          url.searchParams.set("page", String(tmdbPage));
          return url;
        },
      };
    }

    if (filter.kind === "top_rated") {
      return {
        revalidate: 3600,
        buildPageUrl: (tmdbPage) => {
          const url = new URL("https://api.themoviedb.org/3/tv/top_rated");
          url.searchParams.set("language", "pt-BR");
          url.searchParams.set("page", String(tmdbPage));
          return url;
        },
      };
    }

    return {
      revalidate: 3600,
      buildPageUrl: (tmdbPage) => {
        const url = new URL("https://api.themoviedb.org/3/discover/tv");
        url.searchParams.set("language", "pt-BR");
        url.searchParams.set("sort_by", "popularity.desc");
        url.searchParams.set("page", String(tmdbPage));
        if (filter.kind === "genres") url.searchParams.set("with_genres", filter.withGenres);
        return url;
      },
    };
  }

  return {
    revalidate: 3600,
    buildPageUrl: (tmdbPage) => {
      const url = new URL("https://api.themoviedb.org/3/discover/tv");
      url.searchParams.set("language", "pt-BR");
      url.searchParams.set("sort_by", "popularity.desc");
      url.searchParams.set("page", String(tmdbPage));
      return url;
    },
  };
}

export async function discoverMovies(
  params: DiscoverMoviesParams,
): Promise<DiscoverMoviesResult> {
  const requestedPage = normalizeRequestedPage(params.page);
  const pageSize = normalizeRequestedPageSize(params.pageSize, 24);
  const { buildPageUrl, revalidate } = resolveMoviePageUrl(params);

  const { page, results, total, totalPages } = await fetchTmdbCatalogWindow(
    requestedPage,
    pageSize,
    buildPageUrl,
    revalidate,
  );

  const items: MovieItem[] = results.slice(0, pageSize).map((r) => {
    const id = movieIdFromTmdb(r.id);
    const title = r.title || r.name || "Sem título";
    const year = r.release_date ? Number(r.release_date.slice(0, 4)) : null;
    return {
      id,
      title,
      displayTitle: title,
      groupTitle: primaryMovieGenre(r.genre_ids),
      logoUrl: imageUrl(r.poster_path, "w342"),
      posterUrl: imageUrl(r.poster_path, "w500"),
      url: getDemoVideoUrl(id),
      quality: "HD",
      codec: null,
      year,
    };
  });

  return { items, total, page, pageSize, totalPages };
}

export async function discoverSeries(
  params: DiscoverSeriesParams,
): Promise<DiscoverSeriesResult> {
  const requestedPage = normalizeRequestedPage(params.page);
  const pageSize = normalizeRequestedPageSize(params.pageSize, 24);
  const { buildPageUrl, revalidate } = resolveTvPageUrl(params);

  const { page, results, total, totalPages } = await fetchTmdbCatalogWindow(
    requestedPage,
    pageSize,
    buildPageUrl,
    revalidate,
  );

  const items: SeriesIndexItem[] = results.slice(0, pageSize).map((r) => {
    const tmdbId = r.id;
    const id = tvIdFromTmdb(tmdbId);
    const title = r.name || r.title || "Sem título";
    return {
      id,
      slug: id,
      title,
      groupTitle: primaryTvGenre(r.genre_ids),
      logoUrl: imageUrl(r.poster_path, "w342"),
      posterUrl: imageUrl(r.poster_path, "w500"),
      searchText: title.toLowerCase(),
      seasonCount: 1,
      episodeCount: 5,
    };
  });

  return { items, total, page, pageSize, totalPages };
}

export async function getMovieGenres(): Promise<GroupCount[]> {
  const genres = Object.values(MOVIE_GENRE_ID_TO_NAME).map((name) => ({ name, count: 100 }));
  return [...MOVIE_CURATED, ...genres];
}

export async function getTvGenres(): Promise<GroupCount[]> {
  const genres = Object.values(TV_GENRE_ID_TO_NAME).map((name) => ({ name, count: 100 }));
  return [...TV_CURATED, ...genres];
}

export async function getTmdbSeriesDetails(tmdbId: number): Promise<SeriesItem | null> {
  const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`);
  url.searchParams.set("language", "pt-BR");
  const data = await tmdbFetch<TmdbTvDetails>(url, 3600);
  if (!data) return null;

  const id = tvIdFromTmdb(tmdbId);
  const title = data.name || "Sem título";
  const groupTitle = primaryTvGenre(undefined, data.genres);
  const seasonStubs = (data.seasons || []).filter((s) => s.season_number > 0);
  const usedSeasons = seasonStubs.length > 0 ? seasonStubs : [{ season_number: 1, episode_count: 5 }];

  const seasons = usedSeasons.map((s) => ({
    seasonNumber: s.season_number,
    episodeCount: s.episode_count || 5,
    episodes: Array.from({ length: s.episode_count || 5 }, (_, i) => {
      const epNum = i + 1;
      const episodeId = `${id}_s${s.season_number}_e${epNum}`;
      return {
        id: episodeId,
        title: `Episódio ${epNum}`,
        displayTitle: `${title} S${s.season_number}E${epNum}`,
        groupTitle,
        logoUrl: imageUrl(data.poster_path, "w342"),
        posterUrl: imageUrl(data.poster_path, "w500"),
        url: getDemoVideoUrl(episodeId),
        quality: "HD",
        codec: null,
        year: data.first_air_date ? Number(data.first_air_date.slice(0, 4)) : null,
        seasonNumber: s.season_number,
        episodeNumber: epNum,
      };
    }),
  }));

  return {
    id,
    slug: id,
    title,
    groupTitle,
    logoUrl: imageUrl(data.poster_path, "w342"),
    posterUrl: imageUrl(data.poster_path, "w500"),
    searchText: title.toLowerCase(),
    seasonCount: usedSeasons.length,
    episodeCount: usedSeasons.reduce((acc, s) => acc + (s.episode_count || 5), 0),
    seasons,
  };
}

export async function getTmdbSeasonEpisodes(
  tmdbTvId: number,
  seasonNumber: number,
): Promise<import("@shared/types/catalog-types").SeriesEpisode[]> {
  const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbTvId}/season/${seasonNumber}`);
  url.searchParams.set("language", "pt-BR");
  const data = await tmdbFetch<TmdbSeasonDetails>(url, 3600);

  const id = tvIdFromTmdb(tmdbTvId);
  const rawEpisodes = data?.episodes || [];

  if (rawEpisodes.length === 0) {
    return Array.from({ length: 5 }, (_, i) => {
      const epNum = i + 1;
      const episodeId = `${id}_s${seasonNumber}_e${epNum}`;
      return {
        id: episodeId,
        title: `Episódio ${epNum}`,
        displayTitle: `S${seasonNumber}E${epNum}`,
        groupTitle: "Episódio",
        logoUrl: null,
        posterUrl: null,
        url: getDemoVideoUrl(episodeId),
        quality: "HD",
        codec: null,
        year: null,
        seasonNumber,
        episodeNumber: epNum,
      };
    });
  }

  return rawEpisodes.map((ep) => {
    const epNum = ep.episode_number ?? 0;
    const episodeId = `${id}_s${seasonNumber}_e${epNum}`;
    const title = ep.name || `Episódio ${epNum}`;
    return {
      id: episodeId,
      title,
      displayTitle: `S${seasonNumber}E${epNum} — ${title}`,
      groupTitle: "Episódio",
      logoUrl: imageUrl(ep.still_path, "w300"),
      posterUrl: imageUrl(ep.still_path, "w500"),
      url: getDemoVideoUrl(episodeId),
      quality: "HD",
      codec: null,
      year: ep.air_date ? Number(ep.air_date.slice(0, 4)) : null,
      seasonNumber,
      episodeNumber: epNum,
    };
  });
}

export async function getTmdbMovieDetails(tmdbId: number): Promise<MovieItem | null> {
  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
  url.searchParams.set("language", "pt-BR");
  const data = await tmdbFetch<TmdbMovieResult>(url, 3600);
  if (!data) return null;

  const id = movieIdFromTmdb(tmdbId);
  const title = data.title || data.name || "Sem título";
  const year = data.release_date ? Number(data.release_date.slice(0, 4)) : null;
  const primaryGenreId = data.genres?.[0]?.id ?? data.genre_ids?.[0];
  const groupTitle = primaryGenreId
    ? (MOVIE_GENRE_ID_TO_NAME[primaryGenreId] || data.genres?.[0]?.name || "Filme")
    : "Filme";

  return {
    id,
    title,
    displayTitle: title,
    groupTitle,
    logoUrl: imageUrl(data.poster_path, "w342"),
    posterUrl: imageUrl(data.poster_path, "w500"),
    url: getDemoVideoUrl(id),
    quality: "HD",
    codec: null,
    year,
  };
}

export async function getTmdbVideoKey(
  tmdbId: number,
  type: "movie" | "tv",
): Promise<string | null> {
  const url = new URL(`https://api.themoviedb.org/3/${type}/${tmdbId}/videos`);
  url.searchParams.set("language", "pt-BR");
  const data = await tmdbFetch<TmdbVideosResult>(url, 3600);
  const results = data?.results || [];

  const trailer =
    results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
    results.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    results.find((v) => v.site === "YouTube");

  if (!trailer) {
    const urlEn = new URL(`https://api.themoviedb.org/3/${type}/${tmdbId}/videos`);
    urlEn.searchParams.set("language", "en-US");
    const dataEn = await tmdbFetch<TmdbVideosResult>(urlEn, 3600);
    const resultsEn = dataEn?.results || [];
    const trailerEn =
      resultsEn.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
      resultsEn.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
      resultsEn.find((v) => v.site === "YouTube");
    return trailerEn?.key || null;
  }

  return trailer.key;
}
