import type { MetadataRoute } from "next";
import { getLocalShowcaseSlices } from "@services/catalog/db-store";

interface SitemapEntryConfig {
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  lastModified?: Date;
}

const DEFAULT_SITE_ORIGIN = "http://localhost:3000";
const MAX_DYNAMIC_DETAIL_ENTRIES = 24;

function resolveSiteOrigin(): string {
  const candidate =
    process.env.AUTH_REDIRECT_BASE_URL?.trim() ||
    process.env.PAGE_URL?.trim() ||
    DEFAULT_SITE_ORIGIN;

  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch (error) {
    console.error("[sitemap] Falha ao normalizar origem do sitemap.", error);
    return DEFAULT_SITE_ORIGIN;
  }
}

function createSitemapEntry(
  siteOrigin: string,
  config: SitemapEntryConfig,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteOrigin}${config.path}`,
    lastModified: config.lastModified || new Date(),
    changeFrequency: config.changeFrequency,
    priority: config.priority,
  };
}

function createStaticEntries(siteOrigin: string): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    createSitemapEntry(siteOrigin, {
      path: "/",
      priority: 1,
      changeFrequency: "daily",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/collection",
      priority: 0.9,
      changeFrequency: "daily",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/collection/movies",
      priority: 0.9,
      changeFrequency: "daily",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/collection/series",
      priority: 0.9,
      changeFrequency: "daily",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/login",
      priority: 0.5,
      changeFrequency: "monthly",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/register",
      priority: 0.5,
      changeFrequency: "monthly",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/forgot-password",
      priority: 0.4,
      changeFrequency: "monthly",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/cookies",
      priority: 0.3,
      changeFrequency: "yearly",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/privacy",
      priority: 0.3,
      changeFrequency: "yearly",
      lastModified: now,
    }),
    createSitemapEntry(siteOrigin, {
      path: "/terms",
      priority: 0.3,
      changeFrequency: "yearly",
      lastModified: now,
    }),
  ];
}

function createDetailEntries(
  siteOrigin: string,
  entries: Array<{ type: "movies" | "series"; id: string }>,
): MetadataRoute.Sitemap {
  return entries.map((entry) =>
    createSitemapEntry(siteOrigin, {
      path: `/view/${entry.type}/${entry.id}`,
      priority: 0.8,
      changeFrequency: "weekly",
    }),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = resolveSiteOrigin();
  const staticEntries = createStaticEntries(siteOrigin);

  try {
    const showcase = await getLocalShowcaseSlices();
    const movieEntries = showcase.launches
      .slice(0, MAX_DYNAMIC_DETAIL_ENTRIES)
      .map((item) => ({ type: "movies" as const, id: item.id }));
    const seriesEntries = showcase.seriesPopular
      .slice(0, MAX_DYNAMIC_DETAIL_ENTRIES)
      .map((item) => ({ type: "series" as const, id: item.id }));

    return [
      ...staticEntries,
      ...createDetailEntries(siteOrigin, [...movieEntries, ...seriesEntries]),
    ];
  } catch (error) {
    console.error("[sitemap] Falha ao carregar entradas dinâmicas do catálogo.", error);
    return staticEntries;
  }
}
