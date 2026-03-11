import { NextRequest, NextResponse } from "next/server";
import { buildCacheControl } from "@shared/cache/cache-profiles";
import { getGroupCounts } from "@services/catalog/db-store";
import { sanitizeDisplayTitle } from "@shared/utils";
import type { CatalogType } from "@shared/types/catalog-types";

function parseType(value: string | null): CatalogType | "all" {
  if (value === "movies") return "movies";
  if (value === "series") return "series";
  return "all";
}

export async function GET(request: NextRequest) {
  const type = parseType(request.nextUrl.searchParams.get("type"));
  const groups = await getGroupCounts(type);
  const sanitized = groups.map((g) => ({
    ...g,
    name: sanitizeDisplayTitle(g.name),
  }));

  return NextResponse.json(
    {
      type,
      total: sanitized.length,
      items: sanitized,
    },
    {
      headers: {
        "Cache-Control": buildCacheControl("groups"),
      },
    },
  );
}
