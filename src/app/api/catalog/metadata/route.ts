import { NextRequest, NextResponse } from "next/server";
import {
  fetchEnrichedMetadata,
  fetchEnrichedMetadataByTmdbId,
  EnrichedMetadata,
} from "@services/catalog/metadata-service";
import { getTmdbVideoKey } from "@services/catalog/tmdb-discover";
import { cleanTitleForSearch } from "@shared/utils";

const metadataCache = new Map<string, EnrichedMetadata | null>();

function buildCacheKey(params: {
  title: string;
  type: "movie" | "tv";
  year?: number;
}): string {
  return `${params.type}::${params.title.toLowerCase()}::${params.year || ""}`;
}

export async function GET(request: NextRequest) {
  const title = (request.nextUrl.searchParams.get("title") || "").trim();
  const tmdbId = request.nextUrl.searchParams.get("tmdbId");
  const type =
    request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  const yearRaw = request.nextUrl.searchParams.get("year");
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;
  const noCache = request.nextUrl.searchParams.get("nocache") === "true";

  if (!title && !tmdbId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const cleanedTitle = title ? cleanTitleForSearch(title) : `id-${tmdbId}`;
  const cacheKey = tmdbId
    ? `tmdb-id-${type}-${tmdbId}`
    : buildCacheKey({ title: cleanedTitle, type, year });

  if (!noCache && metadataCache.has(cacheKey)) {
    const cached = metadataCache.get(cacheKey);
    return NextResponse.json({ fromCache: true, item: cached, trailerKey: null });
  }

  try {
    let item: EnrichedMetadata | null = null;
    let resolvedTmdbId: number | null = null;

    if (tmdbId) {
      const numericTmdbId = Number.parseInt(tmdbId, 10);
      if (!Number.isNaN(numericTmdbId) && numericTmdbId > 0) {
        resolvedTmdbId = numericTmdbId;
        item = await fetchEnrichedMetadataByTmdbId({ tmdbId: numericTmdbId, type });
      }
    } else {
      item = await fetchEnrichedMetadata({ title: cleanedTitle, type, year });
      if (item?.tmdbId) resolvedTmdbId = item.tmdbId;
    }

    let trailerKey: string | null = null;
    if (resolvedTmdbId) {
      trailerKey = await getTmdbVideoKey(resolvedTmdbId, type);
    }

    metadataCache.set(cacheKey, item);
    return NextResponse.json({ fromCache: false, item, trailerKey });
  } catch (error) {
    console.error("[catalog/metadata] Falha ao buscar metadata enriquecida.", error);
    return NextResponse.json({
      fromCache: false,
      item: null,
      trailerKey: null,
      reason: "service_unavailable",
    });
  }
}
