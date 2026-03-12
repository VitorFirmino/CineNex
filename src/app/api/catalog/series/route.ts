import { NextRequest, NextResponse } from "next/server";
import { parseIntParam, getStringParam, parseOptionalIntParam } from "@shared/http/api-utils";
import { buildCacheControl } from "@shared/cache/cache-profiles";
import { searchSeries } from "@services/catalog/db-store";
import { cleanTitleForSearch } from "@shared/utils";

const SORT_VALUES = {
  default: true,
  title_asc: true,
  title_desc: true,
  year_desc: true,
  year_asc: true,
  episodes_desc: true,
  episodes_asc: true,
} as const;

type SortValue = keyof typeof SORT_VALUES;

function parseSort(value: string | undefined): SortValue | undefined {
  return value && value in SORT_VALUES ? (value as SortValue) : undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseIntParam(searchParams.get("page"), 1, 1, 100000);
  const pageSize = parseIntParam(searchParams.get("pageSize"), 24, 1, 120);
  const sort = parseSort(getStringParam(searchParams.get("sort")));

  const result = await searchSeries({
    q: getStringParam(searchParams.get("q")),
    group: getStringParam(searchParams.get("group")),
    minEpisodes: parseOptionalIntParam(searchParams.get("minEpisodes"), 1, 100000),
    sort,
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
