import { fetchTmdbMetadata, fetchTmdbMetadataById } from "./tmdb";
import type { TmdbMetadata } from "./tmdb";
import type { OmdbMetadata } from "./omdb";
import { cleanTitleForSearch } from "@shared/utils";

export type EnrichedMetadata = TmdbMetadata & {
  omdb?: OmdbMetadata;
  imdbRating?: string;
  imdbId?: string;
  awards?: string;
  director?: string;
  writer?: string;
  rated?: string;
};

const metadataCache = new Map<string, EnrichedMetadata | null>();

function buildCacheKey(title: string, type: string, year?: number | null): string {
  return `${type}::${title.toLowerCase()}::${year || ""}`;
}

export async function fetchEnrichedMetadataByTmdbId(params: {
  tmdbId: number;
  type: "movie" | "tv";
}): Promise<EnrichedMetadata | null> {
  const cacheKey = `tmdb-id::${params.type}::${params.tmdbId}`;
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey) || null;
  }

  const tmdb = await fetchTmdbMetadataById({
    tmdbId: params.tmdbId,
    type: params.type,
  });

  metadataCache.set(cacheKey, tmdb);
  return tmdb;
}

export async function fetchEnrichedMetadata(params: {
  title: string;
  type: "movie" | "tv";
  year?: number | null;
}): Promise<EnrichedMetadata | null> {
  const cleanedTitle = cleanTitleForSearch(params.title);
  const cacheKey = buildCacheKey(cleanedTitle, params.type, params.year);

  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey) || null;
  }

  const tmdb = await fetchTmdbMetadata({
    title: cleanedTitle,
    type: params.type,
    year: params.year,
  });

  if (!tmdb && cleanedTitle.split(" ").length > 3) {
    const fallbackTitle = cleanedTitle.split(" ").slice(0, 3).join(" ");
    const tmdb2 = await fetchTmdbMetadata({ title: fallbackTitle, type: params.type, year: params.year });
    if (tmdb2) {
      metadataCache.set(cacheKey, tmdb2);
      return tmdb2;
    }
  }

  metadataCache.set(cacheKey, tmdb);
  return tmdb;
}

export function getCachedMetadata(title: string, type: string, year?: number | null): EnrichedMetadata | null {
  const cleaned = cleanTitleForSearch(title);
  return metadataCache.get(buildCacheKey(cleaned, type, year)) || null;
}
