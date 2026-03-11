import { prisma } from "@infrastructure/database/prisma";
import { COMPLETION_THRESHOLD, MIN_POSITION_SEC } from "@shared/constants";

export type WatchContentType = "movies" | "series";

type WatchProgressRow = {
  id: string;
  profileId: string;
  contentType: string;
  contentId: string;
  episodeId: string | null;
  title: string | null;
  posterUrl: string | null;
  playHref: string;
  positionSec: number;
  durationSec: number | null;
  progressPct: number | null;
  completed: boolean;
  lastWatchedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type WatchProgressRecord = {
  id: string;
  profileId: string;
  contentType: WatchContentType;
  contentId: string;
  episodeId: string | null;
  title: string | null;
  posterUrl: string | null;
  playHref: string;
  positionSec: number;
  durationSec: number | null;
  progressPct: number | null;
  completed: boolean;
  lastWatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type UpsertWatchProgressInput = {
  contentType: WatchContentType;
  contentId: string;
  episodeId?: string | null;
  title?: string | null;
  posterUrl?: string | null;
  playHref: string;
  positionSec: number;
  durationSec?: number | null;
  completed?: boolean;
};

let watchProgressTableState: "unknown" | "ready" | "unavailable" = "unknown";
let watchProgressEnsurePromise: Promise<boolean> | null = null;

function createWatchProgressId(): string {
  return `wp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return 0;
  return value;
}

function normalizeWatchProgressRow(row: WatchProgressRow | undefined): WatchProgressRecord | null {
  if (!row) return null;
  const contentType = row.contentType === "movies" || row.contentType === "series"
    ? row.contentType
    : null;
  if (!contentType) return null;

  return {
    id: row.id,
    profileId: row.profileId,
    contentType,
    contentId: row.contentId,
    episodeId: row.episodeId,
    title: row.title,
    posterUrl: row.posterUrl,
    playHref: row.playHref,
    positionSec: Number(row.positionSec) || 0,
    durationSec: row.durationSec === null ? null : Number(row.durationSec) || 0,
    progressPct: row.progressPct === null ? null : Number(row.progressPct) || 0,
    completed: Boolean(row.completed),
    lastWatchedAt: new Date(row.lastWatchedAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

async function ensureWatchProgressTable(): Promise<boolean> {
  if (watchProgressTableState === "ready") return true;
  if (watchProgressTableState === "unavailable") return false;
  if (watchProgressEnsurePromise) return watchProgressEnsurePromise;

  watchProgressEnsurePromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WatchProgress" (
          "id" TEXT NOT NULL,
          "profileId" TEXT NOT NULL,
          "contentType" TEXT NOT NULL,
          "contentId" TEXT NOT NULL,
          "episodeId" TEXT,
          "title" TEXT,
          "posterUrl" TEXT,
          "playHref" TEXT NOT NULL,
          "positionSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "durationSec" DOUBLE PRECISION,
          "progressPct" DOUBLE PRECISION,
          "completed" BOOLEAN NOT NULL DEFAULT false,
          "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "WatchProgress_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "WatchProgress_profile_fkey"
            FOREIGN KEY ("profileId")
            REFERENCES "Profile"("id")
            ON DELETE CASCADE
        );
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "WatchProgress"
        ADD COLUMN IF NOT EXISTS "title" TEXT,
        ADD COLUMN IF NOT EXISTS "posterUrl" TEXT,
        ADD COLUMN IF NOT EXISTS "playHref" TEXT,
        ADD COLUMN IF NOT EXISTS "positionSec" DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS "durationSec" DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS "lastWatchedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "progressPct" DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS "completed" BOOLEAN;
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE "WatchProgress"
        SET
          "playHref" = COALESCE("playHref", ''),
          "positionSec" = COALESCE("positionSec", 0),
          "completed" = COALESCE("completed", false),
          "lastWatchedAt" = COALESCE("lastWatchedAt", "updatedAt", "createdAt", CURRENT_TIMESTAMP),
          "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
          "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
        WHERE
          "playHref" IS NULL
          OR "positionSec" IS NULL
          OR "completed" IS NULL
          OR "lastWatchedAt" IS NULL
          OR "createdAt" IS NULL
          OR "updatedAt" IS NULL;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "WatchProgress"
        ALTER COLUMN "playHref" SET DEFAULT '',
        ALTER COLUMN "playHref" SET NOT NULL,
        ALTER COLUMN "positionSec" SET DEFAULT 0,
        ALTER COLUMN "positionSec" SET NOT NULL,
        ALTER COLUMN "completed" SET DEFAULT false,
        ALTER COLUMN "completed" SET NOT NULL,
        ALTER COLUMN "lastWatchedAt" SET DEFAULT CURRENT_TIMESTAMP,
        ALTER COLUMN "lastWatchedAt" SET NOT NULL,
        ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
        ALTER COLUMN "createdAt" SET NOT NULL,
        ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
        ALTER COLUMN "updatedAt" SET NOT NULL;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "WatchProgress_profile_content_unique"
          ON "WatchProgress" ("profileId", "contentType", "contentId");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "WatchProgress_profile_lastWatchedAt_idx"
          ON "WatchProgress" ("profileId", "lastWatchedAt" DESC);
      `);
      watchProgressTableState = "ready";
      return true;
    } catch (error) {
      console.error("[watch-progress-store] Falha ao garantir tabela WatchProgress.", error);
      watchProgressTableState = "unavailable";
      return false;
    } finally {
      watchProgressEnsurePromise = null;
    }
  })();

  return watchProgressEnsurePromise;
}

export async function upsertWatchProgress(
  profileId: string,
  input: UpsertWatchProgressInput,
): Promise<WatchProgressRecord | null> {
  const tableReady = await ensureWatchProgressTable();
  if (!tableReady) return null;

  const normalizedProfileId = profileId.trim();
  const normalizedContentId = input.contentId.trim();
  const normalizedPlayHref = input.playHref.trim();
  if (!normalizedProfileId || !normalizedContentId || !normalizedPlayHref) return null;

  const positionSec = normalizePositiveNumber(input.positionSec);
  if (positionSec === null) return null;

  const rawDuration = normalizePositiveNumber(input.durationSec || null);
  const durationSec = rawDuration !== null && rawDuration > 0 ? rawDuration : null;
  const progressPct = durationSec ? Math.max(0, Math.min(1, positionSec / durationSec)) : null;
  const completedByProgress = Boolean(progressPct !== null && progressPct >= COMPLETION_THRESHOLD && positionSec >= MIN_POSITION_SEC);
  const completed = Boolean(input.completed || completedByProgress);
  const episodeId = typeof input.episodeId === "string" && input.episodeId.trim().length > 0
    ? input.episodeId.trim()
    : null;
  const title = typeof input.title === "string" && input.title.trim().length > 0
    ? input.title.trim()
    : null;
  const posterUrl = typeof input.posterUrl === "string" && input.posterUrl.trim().length > 0
    ? input.posterUrl.trim()
    : null;
  const now = new Date();
  const rowId = createWatchProgressId();

  const rows = await prisma.$queryRaw<WatchProgressRow[]>`
    INSERT INTO "WatchProgress" (
      "id",
      "profileId",
      "contentType",
      "contentId",
      "episodeId",
      "title",
      "posterUrl",
      "playHref",
      "positionSec",
      "durationSec",
      "progressPct",
      "completed",
      "lastWatchedAt",
      "updatedAt"
    )
    VALUES (
      ${rowId},
      ${normalizedProfileId},
      ${input.contentType},
      ${normalizedContentId},
      ${episodeId},
      ${title},
      ${posterUrl},
      ${normalizedPlayHref},
      ${positionSec},
      ${durationSec},
      ${progressPct},
      ${completed},
      ${now},
      ${now}
    )
    ON CONFLICT ("profileId", "contentType", "contentId")
    DO UPDATE SET
      "episodeId" = EXCLUDED."episodeId",
      "title" = EXCLUDED."title",
      "posterUrl" = EXCLUDED."posterUrl",
      "playHref" = EXCLUDED."playHref",
      "positionSec" = EXCLUDED."positionSec",
      "durationSec" = EXCLUDED."durationSec",
      "progressPct" = EXCLUDED."progressPct",
      "completed" = EXCLUDED."completed",
      "lastWatchedAt" = EXCLUDED."lastWatchedAt",
      "updatedAt" = EXCLUDED."updatedAt"
    RETURNING
      "id",
      "profileId",
      "contentType",
      "contentId",
      "episodeId",
      "title",
      "posterUrl",
      "playHref",
      "positionSec",
      "durationSec",
      "progressPct",
      "completed",
      "lastWatchedAt",
      "createdAt",
      "updatedAt"
  `;

  return normalizeWatchProgressRow(rows[0]);
}

export async function getWatchProgressForContent(
  profileId: string,
  contentType: WatchContentType,
  contentId: string,
): Promise<WatchProgressRecord | null> {
  const tableReady = await ensureWatchProgressTable();
  if (!tableReady) return null;

  const normalizedProfileId = profileId.trim();
  const normalizedContentId = contentId.trim();
  if (!normalizedProfileId || !normalizedContentId) return null;

  const rows = await prisma.$queryRaw<WatchProgressRow[]>`
    SELECT
      "id",
      "profileId",
      "contentType",
      "contentId",
      "episodeId",
      "title",
      "posterUrl",
      "playHref",
      "positionSec",
      "durationSec",
      "progressPct",
      "completed",
      "lastWatchedAt",
      "createdAt",
      "updatedAt"
    FROM "WatchProgress"
    WHERE
      "profileId" = ${normalizedProfileId}
      AND "contentType" = ${contentType}
      AND "contentId" = ${normalizedContentId}
    LIMIT 1
  `;

  return normalizeWatchProgressRow(rows[0] as WatchProgressRow);
}

export async function listWatchProgress(
  profileId: string,
  limit = 20,
): Promise<WatchProgressRecord[]> {
  const tableReady = await ensureWatchProgressTable();
  if (!tableReady) return [];

  const normalizedProfileId = profileId.trim();
  if (!normalizedProfileId) return [];
  const normalizedLimit = Math.max(1, Math.min(60, Math.floor(limit)));

  const rows = await prisma.$queryRaw<WatchProgressRow[]>`
    SELECT
      "id",
      "profileId",
      "contentType",
      "contentId",
      "episodeId",
      "title",
      "posterUrl",
      "playHref",
      "positionSec",
      "durationSec",
      "progressPct",
      "completed",
      "lastWatchedAt",
      "createdAt",
      "updatedAt"
    FROM "WatchProgress"
    WHERE "profileId" = ${normalizedProfileId}
    ORDER BY "lastWatchedAt" DESC
    LIMIT ${normalizedLimit}
  `;

  return rows
    .map((row) => normalizeWatchProgressRow(row))
    .filter((row): row is WatchProgressRecord => row !== null);
}
