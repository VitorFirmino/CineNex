import { NextResponse } from "next/server";
import { buildCacheControl } from "@shared/cache/cache-profiles";
import { getSeriesDetailsSummary, getSeriesSeasonEpisodes } from "@services/catalog/db-store";
import { buildCatalogStreamPath } from "@shared/catalog/catalog-stream";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const seasonQuery = url.searchParams.get("season");
  const seasonNumber = seasonQuery ? Number(seasonQuery) : NaN;

  const data = await getSeriesDetailsSummary(slug);
  if (!data) {
    return NextResponse.json({ error: "series_not_found" }, { status: 404 });
  }

  if (Number.isFinite(seasonNumber) && seasonNumber > 0) {
    const episodes = await getSeriesSeasonEpisodes(slug, seasonNumber);
    return NextResponse.json(
      {
        id: data.id,
        slug: data.slug,
        seasonNumber: Math.floor(seasonNumber),
        episodes: episodes.map((episode) => ({
          id: episode.id,
          title: episode.title,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          posterUrl: episode.posterUrl,
          logoUrl: episode.logoUrl,
          extension: "mp4",
          url: buildCatalogStreamPath({
            type: "series",
            slug: data.slug,
            episodeId: episode.id,
          }),
        })),
      },
      {
        headers: {
          "Cache-Control": buildCacheControl("seriesDetails"),
        },
      },
    );
  }

  const slim = {
    id: data.id,
    slug: data.slug,
    title: data.title,
    groupTitle: data.groupTitle,
    posterUrl: data.posterUrl,
    backdropUrl: data.backdropUrl || null,
    overview: data.overview || null,
    rating: data.rating || null,
    firstAirDate: data.firstAirDate || null,
    status: data.status || null,
    genres: null,
    networks: null,
    seasonCount: data.seasonCount,
    episodeCount: data.episodeCount,
    seasons: data.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      episodeCount: season.episodeCount,
    })),
  };

  return NextResponse.json(slim, {
    headers: {
      "Cache-Control": buildCacheControl("seriesDetails"),
    },
  });
}
