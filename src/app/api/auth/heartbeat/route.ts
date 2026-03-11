import { prisma } from "@infrastructure/database/prisma";
import { NextResponse } from "next/server";
import { createClient } from "@infrastructure/supabase/server";
import { ensureProfileForUser } from "@services/auth/profile-sync";

const HEARTBEAT_MIN_UPDATE_MS = 90_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ active: false }, { status: 401 });
  }

  const { currentContent } = await request.json().catch((error: unknown) => {
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
    await ensureProfileForUser(user);

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
