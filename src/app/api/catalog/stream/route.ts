import { NextRequest, NextResponse } from "next/server";
import { getStringParam } from "@shared/http/api-utils";
import {
  resolveMovieStreamUrl,
  resolveSeriesEpisodeStreamUrl,
} from "@services/catalog/db-store";

function parseType(value: string | null): "movies" | "series" | null {
  if (value === "movies") return "movies";
  if (value === "series") return "series";
  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const type = parseType(searchParams.get("type"));
  if (!type) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  let targetUrl: string | null = null;

  if (type === "series") {
    const slug = getStringParam(searchParams.get("slug"));
    const episodeId = getStringParam(searchParams.get("episodeId"));

    if (!slug || !episodeId) {
      return NextResponse.json({ error: "missing_series_reference" }, { status: 400 });
    }

    targetUrl = await resolveSeriesEpisodeStreamUrl(slug, episodeId);
  } else {
    const id = getStringParam(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "missing_item_id" }, { status: 400 });
    }
    targetUrl = await resolveMovieStreamUrl(id);
  }

  if (!targetUrl) {
    return NextResponse.json({ error: "stream_not_found" }, { status: 404 });
  }

  return NextResponse.redirect(targetUrl, { status: 302 });
}
