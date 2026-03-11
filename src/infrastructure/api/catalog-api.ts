import { axiosClient } from "@infrastructure/http/axios-client";
import { cachedGetJson } from "@services/api-client";
import type {
  CatalogItem,
  CatalogType,
  GroupCount,
  PaginationResult,
} from "@shared/types/catalog-types";
import type { StreamFallbackOption } from "@shared/types/stream";

export type CatalogMetadataPayload = {
  title?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
  backdropUrl?: string | null;
  posterUrl?: string | null;
  imdbRating?: string | null;
  rating?: number | null;
  runtime?: number | string | null;
  rated?: string | null;
  awards?: string | null;
  cast?: string[] | null;
  genres?: string[] | null;
  omdb?: {
    year?: string | null;
    plot?: string | null;
    director?: string | null;
    actors?: string | null;
    genre?: string | null;
  } | null;
};

export type CatalogMetadataQuery = {
  type: "movie" | "tv";
  title?: string;
  year?: string | number | null;
  tmdbId?: string | number | null;
};

export type CatalogSeriesEpisodePayload = {
  id: string;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  posterUrl?: string | null;
  logoUrl?: string | null;
};

type RequestOptions = {
  signal?: AbortSignal;
  cacheTtlMs?: number;
};

type CatalogListRequest = {
  type: CatalogType;
  query: {
    page?: number;
    pageSize?: number;
    q?: string;
    group?: string;
    groups?: string[];
    quality?: string;
    codec?: string;
    legendado?: "all" | "yes" | "no";
    hasPoster?: boolean;
    yearFrom?: string | number;
    yearTo?: string | number;
    minEpisodes?: string | number;
    sort?: string;
  };
} & RequestOptions;

export type CatalogStreamOptionsRef =
  | { type: "movies"; id: string }
  | { type: "series"; slug: string; episodeId: string };

export type CatalogStreamOptionsResponse = {
  items?: StreamFallbackOption[];
  hasAlternatives?: boolean;
};

async function getJson<T>(url: string, options?: RequestOptions): Promise<T> {
  const ttl = options?.cacheTtlMs || 0;
  if (ttl > 0) {
    return cachedGetJson<T>(url, ttl, options?.signal);
  }
  const response = await axiosClient.get<T>(url, { signal: options?.signal });
  return response.data;
}

export const getCatalogGroups = async (
  type: CatalogType | "all",
  options?: RequestOptions,
) => {
  const params = new URLSearchParams({ type });
  return getJson<{ items: GroupCount[] }>(`/api/catalog/groups?${params.toString()}`, options);
};

export const listCatalog = async <T extends CatalogItem>({
  type,
  query,
  signal,
  cacheTtlMs,
}: CatalogListRequest) => {
  const params = new URLSearchParams({
    page: String(query.page || 1),
    pageSize: String(query.pageSize || 15),
    q: query.q || "",
    sort: query.sort || "default",
    legendado: query.legendado || "all",
    hasPoster: query.hasPoster ? "true" : "",
  });

  if (query.groups && query.groups.length > 0) {
    params.set("group", query.groups.join(","));
  } else if (query.group) {
    params.set("group", query.group);
  }

  if (type !== "series") {
    if (query.quality && query.quality !== "all") params.set("quality", query.quality);
    if (query.codec && query.codec !== "all") params.set("codec", query.codec);
    if (query.yearFrom) params.set("yearFrom", String(query.yearFrom));
    if (query.yearTo) params.set("yearTo", String(query.yearTo));
  } else if (query.minEpisodes) {
    params.set("minEpisodes", String(query.minEpisodes));
  }

  return getJson<PaginationResult<T>>(
    `/api/catalog/${type}?${params.toString()}`,
    { signal, cacheTtlMs },
  );
};

export const getCatalogMetadata = async (
  query: CatalogMetadataQuery,
  options?: RequestOptions,
) => {
  const params = new URLSearchParams({ type: query.type });
  if (query.title) params.set("title", query.title);
  if (query.year) params.set("year", String(query.year));
  if (query.tmdbId) params.set("tmdbId", String(query.tmdbId));

  return getJson<{ item?: CatalogMetadataPayload; trailerKey?: string | null }>(
    `/api/catalog/metadata?${params.toString()}`,
    options,
  );
};

export const getSeriesSeasonEpisodes = async (
  seriesIdentifier: string,
  season: number,
  options?: RequestOptions,
) => {
  const encoded = encodeURIComponent(seriesIdentifier);
  const url = `/api/catalog/series/${encoded}?season=${season}`;
  return getJson<{ episodes?: CatalogSeriesEpisodePayload[] }>(url, options);
};

export const getCatalogStreamOptions = async (
  ref: CatalogStreamOptionsRef,
  options?: RequestOptions,
) => {
  const query =
    ref.type === "series"
      ? `type=series&slug=${encodeURIComponent(ref.slug)}&episodeId=${encodeURIComponent(ref.episodeId)}`
      : `type=${encodeURIComponent(ref.type)}&id=${encodeURIComponent(ref.id)}`;

  return getJson<CatalogStreamOptionsResponse>(`/api/catalog/stream-options?${query}`, options);
};

export const catalogApi = {
  getCatalogGroups,
  listCatalog,
  getCatalogMetadata,
  getSeriesSeasonEpisodes,
  getCatalogStreamOptions,
};
