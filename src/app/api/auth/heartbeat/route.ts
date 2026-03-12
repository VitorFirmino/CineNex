import { prisma } from "@infrastructure/database/prisma";
import { NextResponse } from "next/server";
import { getSafeAuthUser } from "@infrastructure/supabase/auth";
import { createClient } from "@infrastructure/supabase/server";
import { ensureProfileForUser } from "@services/auth/profile-sync";
import { Prisma } from "@prisma/client";

const HEARTBEAT_MIN_UPDATE_MS = 90_000;

function isIgnorableBodyReadError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (!(error instanceof Error)) {
    const maybeError = error as { code?: unknown; message?: unknown; name?: unknown } | null;
    return (
      maybeError?.name === "AbortError" ||
      maybeError?.code === "ECONNRESET" ||
      maybeError?.message === "Unexpected end of JSON input" ||
      (typeof maybeError?.message === "string" &&
        maybeError.message.toLowerCase().includes("aborted"))
    );
  }

  const maybeError = error as Error & { code?: unknown };
  return (
    error.name === "AbortError" ||
    maybeError.code === "ECONNRESET" ||
    error.message === "Unexpected end of JSON input" ||
    error.message.toLowerCase().includes("aborted")
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    clearInvalidSession: true,
    logContext: "auth/heartbeat",
  });

  if (!user) {
    return NextResponse.json({ active: false }, { status: 401 });
  }

  const { currentContent } = await request.json().catch((error: unknown) => {
    if (isIgnorableBodyReadError(error)) {
      return {};
    }

    console.error("[auth/heartbeat] Falha ao interpretar corpo da requisicao.", error);
    return {};
  });
  const normalizedContent =
    typeof currentContent === "string" && currentContent.trim().length > 0
      ? currentContent
      : null;
  const now = new Date();
  const staleBefore = new Date(now.getTime() - HEARTBEAT_MIN_UPDATE_MS);

  try {
    try {
      await ensureProfileForUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2028"
      ) {
        console.warn(
          "[auth/heartbeat] Pulando sync de profile por contencao transitoria de transacao.",
          error,
        );
      } else {
        throw error;
      }
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, currentContent: true, lastActive: true },
    });

    if (!existingProfile) {
      return NextResponse.json({ active: true, updated: false });
    }

    const contentUnchanged =
      existingProfile.currentContent === normalizedContent;
    const recentlyUpdated = existingProfile.lastActive >= staleBefore;

    if (contentUnchanged && recentlyUpdated) {
      return NextResponse.json({ active: true, updated: false });
    }

    await prisma.profile.update({
      where: { id: user.id },
      data: {
        lastActive: now,
        currentContent: normalizedContent,
      },
    });

    return NextResponse.json({ active: true, updated: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json(
      { error: "Erro ao registrar atividade" },
      { status: 500 },
    );
  }
}
