import {
  getWatchProgressForContent,
  listWatchProgress,
  upsertWatchProgress,
  type WatchContentType,
} from "@services/auth/watch-progress-store";
import { ensureProfileForUser } from "@services/auth/profile-sync";
import { NextResponse } from "next/server";
import { createClient } from "@infrastructure/supabase/server";

function isAbortedBodyReadError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (!(error instanceof Error)) {
    const maybeError = error as { code?: unknown; message?: unknown; name?: unknown } | null;
    return (
      maybeError?.name === "AbortError" ||
      maybeError?.code === "ECONNRESET" ||
      (typeof maybeError?.message === "string" &&
        maybeError.message.toLowerCase().includes("aborted"))
    );
  }

  const maybeError = error as Error & { code?: unknown };
  return (
    error.name === "AbortError" ||
    maybeError.code === "ECONNRESET" ||
    error.message.toLowerCase().includes("aborted")
  );
}

function normalizeContentType(value: string | null): WatchContentType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["movies", "movie"].includes(normalized)) return "movies";
  if (normalized === "series") return "series";
  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { items: [] as unknown[], item: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { searchParams } = new URL(request.url);
  const contentType = normalizeContentType(searchParams.get("contentType"));
  const contentId = normalizeString(searchParams.get("contentId"));
  const limit = Number(searchParams.get("limit") || 12);

  if (contentType && contentId) {
    const item = await getWatchProgressForContent(
      user.id,
      contentType,
      contentId,
    );
    return NextResponse.json(
      { item },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const items = await listWatchProgress(
    user.id,
    Number.isFinite(limit) ? limit : 12,
  );
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { saved: false, reason: "unauthorized" },
      { status: 200 },
    );
  }

  const payload = await request.json().catch((error: unknown) => {
    if (isAbortedBodyReadError(error)) {
      return null;
    }

    console.error("[auth/watch-progress] Falha ao interpretar corpo da requisicao.", error);
    return {};
  });

  if (payload === null) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const contentType = normalizeContentType(
    normalizeString(payload?.contentType),
  );
  const contentId = normalizeString(payload?.contentId);
  const playHref = normalizeString(payload?.playHref);
  const positionSec = normalizeNumber(payload?.positionSec);
  const durationSec = normalizeNumber(payload?.durationSec);
  const episodeId = normalizeString(payload?.episodeId);
  const title = normalizeString(payload?.title);
  const posterUrl = normalizeString(payload?.posterUrl);
  const completed = Boolean(payload?.completed);

  if (!contentType || !contentId || !playHref || positionSec === null) {
    return NextResponse.json(
      { error: "Parâmetros inválidos" },
      { status: 400 },
    );
  }

  await ensureProfileForUser(user);

  const item = await upsertWatchProgress(user.id, {
    contentType,
    contentId,
    playHref,
    positionSec,
    durationSec,
    episodeId,
    title,
    posterUrl,
    completed,
  });

  return NextResponse.json(
    { saved: Boolean(item), item },
    { headers: { "Cache-Control": "no-store" } },
  );
}
