import { NextRequest, NextResponse } from "next/server";
import { parseIntParam, getStringParam, parseOptionalIntParam } from "@shared/http/api-utils";
import { buildCacheControl } from "@shared/cache/cache-profiles";
import { searchSeries } from "@services/catalog/db-store";
import { cleanTitleForSearch } from "@shared/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseIntParam(searchParams.get("page"), 1, 1, 100000);
  const pageSize = parseIntParam(searchParams.get("pageSize"), 24, 1, 120);

  const result = await searchSeries({
    q: getStringParam(searchParams.get("q")),
    group: getStringParam(searchParams.get("group")),
    minEpisodes: parseOptionalIntParam(searchParams.get("minEpisodes"), 1, 100000),
    page,
    pageSize,
  });

  return NextResponse.json(
    {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        title: cleanTitleForSearch(item.title),
      })),
    },
    {
      headers: {
        "Cache-Control": buildCacheControl("series"),
      },
    },
  );
}
