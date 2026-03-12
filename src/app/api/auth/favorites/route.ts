import { prisma } from "@infrastructure/database/prisma";
import { NextResponse } from "next/server";
import { getSafeAuthUser } from "@infrastructure/supabase/auth";
import { createClient } from "@infrastructure/supabase/server";
import { normalizeCatalogContentId } from "@shared/catalog/content-id";
import { getLocalItemById } from "@services/catalog/db-store";
import { ensureProfileForUser } from "@services/auth/profile-sync";

type FavoriteType = "MOVIE" | "SERIES";

function normalizeFavoriteType(raw: string): FavoriteType | null {
  const upper = raw.trim().toUpperCase();
  if (["MOVIE", "MOVIES"].includes(upper)) return "MOVIE";
  if (upper === "SERIES") return "SERIES";
  return null;
}

function legacyVariants(type: FavoriteType): string[] {
  if (type === "MOVIE") return ["MOVIE", "MOVIES"];
  return ["SERIES"];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    clearInvalidSession: true,
    logContext: "auth/favorites",
  });

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { type, contentId } = await request.json();
  const normalizedType =
    typeof type === "string" ? normalizeFavoriteType(type) : null;
  const rawContentId = typeof contentId === "string" ? contentId.trim() : "";
  const normalizedContentId = normalizeCatalogContentId(rawContentId);
  const contentIdVariants = Array.from(
    new Set([rawContentId, normalizedContentId].filter(Boolean)),
  );

  if (!normalizedType || !normalizedContentId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  try {
    await ensureProfileForUser(user);

    const typeVariants = legacyVariants(normalizedType);
    const existing = await prisma.favorite.findFirst({
      where: {
        profileId: user.id,
        contentId: { in: contentIdVariants },
        type: { in: typeVariants },
      },
    });

    if (existing) {
      await prisma.favorite.deleteMany({
        where: {
          profileId: user.id,
          contentId: { in: contentIdVariants },
          type: { in: typeVariants },
        },
      });
      return NextResponse.json({ favorited: false });
    }

    await prisma.favorite.create({
      data: {
        profileId: user.id,
        type: normalizedType,
        contentId: normalizedContentId,
      },
    });
    return NextResponse.json({ favorited: true });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    clearInvalidSession: true,
    logContext: "auth/favorites",
  });

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const favorites = await prisma.favorite.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const uniqueByContent = new Set<string>();
    const normalizedFavorites = favorites.reduce<typeof favorites>((acc, favorite) => {
      const normalizedType = normalizeFavoriteType(favorite.type);
      if (!normalizedType) return acc;

      const normalizedContentId = normalizeCatalogContentId(favorite.contentId);
      if (!normalizedContentId) return acc;

      const key = `${normalizedType}:${normalizedContentId}`;
      if (uniqueByContent.has(key)) return acc;
      uniqueByContent.add(key);
      acc.push({
        ...favorite,
        type: normalizedType,
        contentId: normalizedContentId,
      });
      return acc;
    }, []);

    const movieIds = normalizedFavorites
      .filter((favorite) => favorite.type === "MOVIE")
      .map((favorite) => favorite.contentId);
    const seriesIds = normalizedFavorites
      .filter((favorite) => favorite.type === "SERIES")
      .map((favorite) => favorite.contentId);
    const allIds = Array.from(new Set([...movieIds, ...seriesIds]));
    const detailsMap = new Map<string, Awaited<ReturnType<typeof getLocalItemById>>>();

    await Promise.all(
      allIds.map(async (id) => {
        const type = id.startsWith("tmdb_tv_") ? "series" : "movies";
        const item = await getLocalItemById(type, id);
        detailsMap.set(id, item);
      }),
    );

    const enrichedFavorites = normalizedFavorites.map((favorite) => {
      const catalogItem = detailsMap.get(favorite.contentId);

      return {
        ...favorite,
        posterUrl: catalogItem?.posterUrl || null,
        logoUrl: catalogItem?.logoUrl || null,
      };
    });

    return NextResponse.json({ favorites: enrichedFavorites });
  } catch (error) {
    console.error("Error loading favorites:", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ favorites: [] }, { status: 200 });
  }
}
