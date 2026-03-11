import { unstable_cache } from "next/cache";
import { getLocalShowcaseSlices } from "@services/catalog/db-store";
import { getCacheTTL } from "@shared/cache/cache-profiles";
import { buildCatalogStreamPath } from "@shared/catalog/catalog-stream";
import { fetchTmdbTrending, fetchTmdbMetadata, hasTmdbCredentials } from "@services/catalog/tmdb";
import { sanitizeDisplayTitle, cleanTitleForSearch } from "@shared/utils";
import type { HomeHighlights } from "@shared/types/highlights-types";

const TMDB_TRENDING_TIMEOUT_MS = Number(process.env.TMDB_TRENDING_TIMEOUT_MS || 1500);
const TMDB_ENRICH_TIMEOUT_MS = Number(process.env.TMDB_ENRICH_TIMEOUT_MS || 1200);
const TMDB_CIRCUIT_FAILURE_THRESHOLD = Number(process.env.TMDB_CIRCUIT_FAILURE_THRESHOLD || 3);
const TMDB_CIRCUIT_OPEN_MS = Number(process.env.TMDB_CIRCUIT_OPEN_MS || 60_000);

let tmdbConsecutiveFailures = 0;
let tmdbCircuitOpenUntil = 0;

function dedupeByTitle<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("tmdb_timeout")), timeoutMs),
  );
  return Promise.race([promise, timeout]);
}

function isTmdbCircuitOpen(): boolean {
  return tmdbCircuitOpenUntil > Date.now();
}

function registerTmdbFailure(): void {
  tmdbConsecutiveFailures += 1;
  if (tmdbConsecutiveFailures >= TMDB_CIRCUIT_FAILURE_THRESHOLD) {
    tmdbCircuitOpenUntil = Date.now() + TMDB_CIRCUIT_OPEN_MS;
  }
}

function registerTmdbSuccess(): void {
  tmdbConsecutiveFailures = 0;
  tmdbCircuitOpenUntil = 0;
}

async function safeFetchTmdbTrending(): Promise<Awaited<ReturnType<typeof fetchTmdbTrending>>> {
  if (!hasTmdbCredentials() || isTmdbCircuitOpen()) return [];
  try {
    const items = await withTimeout(
      fetchTmdbTrending({ language: "pt-BR", limit: 16 }),
      TMDB_TRENDING_TIMEOUT_MS,
    );
    registerTmdbSuccess();
    return items;
  } catch (error) {
    console.error("[highlights-service] Falha ao buscar trending do TMDB.", error);
    registerTmdbFailure();
    return [];
  }
}

async function safeFetchTmdbHeroMetadata(params: { title: string; type: "movie" | "tv" }) {
  if (!hasTmdbCredentials() || isTmdbCircuitOpen()) return null;
  try {
    const enriched = await withTimeout(fetchTmdbMetadata(params), TMDB_ENRICH_TIMEOUT_MS);
    registerTmdbSuccess();
    return enriched;
  } catch (error) {
    console.error("[highlights-service] Falha ao buscar metadata hero do TMDB.", error);
    registerTmdbFailure();
    return null;
  }
}

const getCachedHomeHighlights = unstable_cache(
  async (): Promise<HomeHighlights> => {
    const [local, tmdbRaw] = await Promise.all([
      getLocalShowcaseSlices(),
      safeFetchTmdbTrending(),
    ]);

    const trending = tmdbRaw.map((item) => ({
      id: `tmdb-${item.type}-${item.id}`,
      title: item.title,
      subtitle: item.subtitle,
      description: item.overview,
      imageUrl: item.imageUrl,
      kind: "external" as const,
      externalUrl: item.externalUrl,
      badge: item.type === "tv" ? "Série" : "Filme",
    }));

    const launches = dedupeByTitle(
      local.launches.map((item) => ({
        id: `launch-${item.id}`,
        title: cleanTitleForSearch(item.title || item.displayTitle),
        subtitle: sanitizeDisplayTitle(
          item.year ? `${item.groupTitle} • ${item.year}` : item.groupTitle,
        ),
        description: sanitizeDisplayTitle(`Título em destaque no grupo ${item.groupTitle}.`),
        imageUrl: item.posterUrl || item.logoUrl,
        badge: item.quality || undefined,
        kind: "movies" as const,
        streamUrl: buildCatalogStreamPath({ type: "movies", id: item.id }),
        extension: "mp4",
        quality: item.quality || undefined,
      })),
    ).slice(0, 16);

    const series = dedupeByTitle(
      local.seriesPopular.map((item) => ({
        id: `series-${item.id}`,
        title: cleanTitleForSearch(item.title),
        subtitle: `${item.episodeCount} episódios`,
        description: sanitizeDisplayTitle(`${item.seasonCount} temporada(s) disponíveis no catálogo.`),
        imageUrl: item.posterUrl || item.logoUrl,
        badge: "Série",
        kind: "series" as const,
        seriesSlug: item.slug,
      })),
    ).slice(0, 16);

    let hero = trending[0] || launches[0] || series[0] || null;

    if (hero && hero.kind !== "external") {
      const enriched = await safeFetchTmdbHeroMetadata({
        title: hero.title,
        type: hero.kind === "series" ? "tv" : "movie",
      });
      if (enriched && enriched.backdropUrl) {
        hero = {
          ...hero,
          imageUrl: enriched.backdropUrl,
          description: enriched.overview || hero.description,
        };
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      source: trending.length > 0 ? "catalog-local+tmdb" : "catalog-local",
      hero,
      rows: [
        ...(trending.length > 0
          ? [
              {
                id: "trending",
                title: "Em alta agora",
                caption: "Títulos mais procurados pela comunidade.",
                items: trending,
              },
            ]
          : []),
        {
          id: "launches",
          title: "Filmes Populares",
          caption: "Os filmes mais assistidos no momento.",
          items: launches,
        },
        {
          id: "series-popular",
          title: "Séries para maratonar",
          caption: "Episódios e temporadas para assistir sem parar.",
          items: series,
        },
      ],
    };
  },
  ["home-highlights-v3"],
  { revalidate: getCacheTTL("highlights").stale },
);

export async function getHomeHighlights(): Promise<HomeHighlights> {
  return getCachedHomeHighlights();
}
