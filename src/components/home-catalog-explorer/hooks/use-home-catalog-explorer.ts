"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@hooks/use-auth";
import { authApi } from "@infrastructure/api/auth-api";
import { isRequestCanceledError } from "@infrastructure/http/axios-client";
import type { HighlightItem, HighlightRow, HomeHighlights } from "@shared/types/highlights-types";
import type { RecentWatchItem } from "../../catalog-explorer/hooks/use-catalog-explorer";

export function useHomeCatalogExplorer(highlights: HomeHighlights) {
  const { user } = useAuth();
  const [recentWatchItems, setRecentWatchItems] = useState<ReadonlyArray<RecentWatchItem>>([]);

  const heroSlides = useMemo(() => {
    const merged = [highlights.hero, ...highlights.rows.flatMap((row) => row.items)].filter(
      (item): item is HighlightItem => Boolean(item),
    );

    const seen = new Set<string>();
    return merged
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 12);
  }, [highlights]);

  const recentWatchRow = useMemo<HighlightRow | null>(() => {
    if (!user || recentWatchItems.length === 0) return null;

    const items: HighlightItem[] = recentWatchItems.map((item) => ({
      id: `resume-${item.contentType}-${item.contentId}${item.episodeId ? `-${item.episodeId}` : ""}`,
      title: item.title || "Título indisponível",
      subtitle: item.completed ? "Assistido recentemente" : "Continue de onde parou",
      imageUrl: item.posterUrl,
      badge: item.completed
        ? "RECENTE"
        : item.progressPct !== null
          ? `${Math.round(item.progressPct * 100)}%`
          : "RETOMAR",
      kind: "external",
      externalUrl: item.playHref,
    }));

    return {
      id: "recently-watched",
      title: "Últimos Assistidos",
      caption: "Retome rapidamente sua sessão",
      items,
    };
  }, [recentWatchItems, user]);

  const discoverRows = useMemo(
    () => (recentWatchRow ? [recentWatchRow, ...highlights.rows] : highlights.rows),
    [highlights.rows, recentWatchRow],
  );

  useEffect(() => {
    if (!user) {
      setRecentWatchItems([]);
      return;
    }

    const controller = new AbortController();

    const loadRecentWatchItems = async () => {
      try {
        const payload = await authApi.listWatchProgress(18, {
          signal: controller.signal,
        });
        const items = Array.isArray(payload.items) ? payload.items : [];
        setRecentWatchItems(
          items.filter((item) => item.contentType === "movies" || item.contentType === "series"),
        );
      } catch (error: unknown) {
        if (isRequestCanceledError(error)) return;
        console.error("[home-catalog-explorer] Falha ao carregar historico recente.", error);
        setRecentWatchItems([]);
      }
    };

    void loadRecentWatchItems();
    return () => controller.abort();
  }, [user]);

  return {
    discoverRows,
    heroSlides,
  };
}
