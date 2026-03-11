import { NextResponse } from "next/server";
import { buildCacheControl } from "@shared/cache/cache-profiles";
import { getSummary } from "@services/catalog/db-store";

export async function GET() {
  const summary = await getSummary();
  return NextResponse.json(summary, {
    headers: {
      "Cache-Control": buildCacheControl("summary"),
    },
  });
}
