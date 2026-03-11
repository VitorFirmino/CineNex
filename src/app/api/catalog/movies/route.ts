import { NextRequest, NextResponse } from "next/server";
import { parseIntParam, getStringParam } from "@shared/http/api-utils";
import { buildCacheControl } from "@shared/cache/cache-profiles";
import { searchMovies } from "@services/catalog/db-store";
import { buildCatalogStreamPath } from "@shared/catalog/catalog-stream";
import { cleanTitleForSearch } from "@shared/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseIntParam(searchParams.get("page"), 1, 1, 100000);
  const pageSize = parseIntParam(searchParams.get("pageSize"), 24, 1, 120);

  const result = await searchMovies({
    q: getStringParam(searchParams.get("q")),
    group: getStringParam(searchParams.get("group")),
    page,
    pageSize,
  });

  return NextResponse.json(
    {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        title: cleanTitleForSearch(item.title || item.displayTitle),
        url: buildCatalogStreamPath({ type: "movies", id: item.id }),
      })),
    },
    {
      headers: {
        "Cache-Control": buildCacheControl("movies"),
      },
    },
  );
}
