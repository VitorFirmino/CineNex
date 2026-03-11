import { NextRequest, NextResponse } from "next/server";
import { getStringParam } from "@shared/http/api-utils";
import { buildCacheControl } from "@shared/cache/cache-profiles";
import {
  getMovieStreamAlternatives,
  getSeriesEpisodeStreamAlternatives,
  type StreamFallbackOption,
} from "@services/catalog/db-store";

function parseType(value: string | null): "movies" | "series" | null {
  if (value === "movies") return "movies";
  if (value === "series") return "series";
  return null;
}

export async function GET(request: NextRequest) {
  const type = parseType(request.nextUrl.searchParams.get("type"));
  let items: StreamFallbackOption[] = [];

  if (type === "series") {
    const slug = getStringParam(request.nextUrl.searchParams.get("slug"));
    const episodeId = getStringParam(request.nextUrl.searchParams.get("episodeId"));

    if (!slug || !episodeId) {
      return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }

    items = await getSeriesEpisodeStreamAlternatives(slug, episodeId);
  } else {
    const id = getStringParam(request.nextUrl.searchParams.get("id"));

    if (!type || !id) {
      return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }

    items = await getMovieStreamAlternatives(id);
  }

  return NextResponse.json(
    {
      items,
      hasAlternatives: false,
    },
    {
      headers: {
        "Cache-Control": buildCacheControl("movies"),
      },
    },
  );
}
