import { NextRequest, NextResponse } from "next/server";
import { refreshSummarySnapshot } from "@services/catalog/db-store";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const expectedToken = process.env.SUMMARY_REFRESH_TOKEN?.trim();
  if (!expectedToken) return true;

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const headerToken = request.headers.get("x-summary-refresh-token")?.trim();
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();

  return (
    bearer === expectedToken ||
    headerToken === expectedToken ||
    queryToken === expectedToken
  );
}

async function handleRefresh(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }

  const summary = await refreshSummarySnapshot();
  if (!summary) {
    return NextResponse.json(
      { error: "refresh_failed" },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      refreshedAt: new Date().toISOString(),
      totals: summary.totals,
    },
    {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}

export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

export async function POST(request: NextRequest) {
  return handleRefresh(request);
}
