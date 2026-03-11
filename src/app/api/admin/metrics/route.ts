import { uptime as getSystemUptime } from "node:os";
import { prisma } from "@infrastructure/database/prisma";
import { NextResponse } from "next/server";
import { createClient } from "@infrastructure/supabase/server";
import { fetchTmdbMetadataById } from "@services/catalog/tmdb";

type WatchingNowGroup = {
  currentContent: string | null;
  _count: { _all: number };
};

type TopFavoriteGroup = {
  type: string;
  contentId: string;
  _count: { _all: number };
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
  }

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [activeUsers, totalUsers, watchingNow, topFavorites, recentProfiles] =
      await Promise.all([
        prisma.profile.count({ where: { lastActive: { gte: fiveMinutesAgo } } }),
        prisma.profile.count(),
        prisma.profile.groupBy({
          by: ["currentContent"],
          _count: { _all: true },
          where: {
            lastActive: { gte: fiveMinutesAgo },
            currentContent: { not: null },
          },
          orderBy: { _count: { currentContent: "desc" } },
          take: 5,
        }),
        prisma.favorite.groupBy({
          by: ["type", "contentId"],
          _count: { _all: true },
          orderBy: { _count: { contentId: "desc" } },
          take: 5,
        }),
        prisma.profile.findMany({
          where: { createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

    const growthMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      growthMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const p of recentProfiles) {
      const day = p.createdAt.toISOString().slice(0, 10);
      if (day in growthMap) growthMap[day]++;
    }
    const growth = Object.entries(growthMap).map(([date, users]) => ({ date, users }));

    return NextResponse.json({
      activeUsers,
      totalUsers,
      uptimeSeconds: Math.floor(getSystemUptime()),
      watchingNow: watchingNow.map((w: WatchingNowGroup) => ({
        content: w.currentContent,
        count: w._count._all,
      })),
      topFavorites: await Promise.all(
        topFavorites.map(async (f: TopFavoriteGroup) => {
          let title = f.contentId;
          try {
            if (f.contentId.startsWith("tmdb_")) {
              const idStr = f.contentId.split("_").pop();
              if (idStr) {
                const typeForTmdb = f.type.toUpperCase() === "SERIES" ? "tv" : "movie";
                const meta = await fetchTmdbMetadataById({
                  tmdbId: parseInt(idStr, 10),
                  type: typeForTmdb,
                });
                if (meta?.title) {
                  title = meta.title;
                }
              }
            }
          } catch (error) {
            console.error("[admin/metrics] Falha ao enriquecer favorito com TMDB.", error);
          }
          return {
            type: f.type,
            id: title,
            count: f._count._all,
          };
        })
      ),
      growth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching admin metrics:", error);
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
