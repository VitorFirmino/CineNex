import {
  getLocalItemById,
  getSeriesDetailsSummary,
} from "@services/catalog/db-store";
import {
  fetchEnrichedMetadata,
  fetchEnrichedMetadataByTmdbId,
} from "@services/catalog/metadata-service";
import { sanitizeDisplayTitle, cleanTitleForSearch } from "@shared/utils";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { ViewDashboard } from "./view-dashboard";
import { CatalogType } from "@shared/types/catalog-types";
import type {
  BuildSeoDescriptionParams,
  ExternalCatalogItem,
  ViewMetadataType,
  ViewPageProps,
  ViewPageResolvedData,
} from "./view.types";

function isLikelyCatalogDatabaseId(id: string): boolean {
  return /^[a-z][a-z0-9]{20,40}$/i.test(id);
}

function extractTmdbId(id: string): number | null {
  const m = id.match(/^tmdb_(?:movie|tv)_(\d+)$/);
  if (m) return Number(m[1]);
  if (/^\d+$/.test(id)) return Number(id);
  return null;
}

function truncateSeoDescription(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const truncated = normalized.slice(0, maxLength - 1);
  const safeEnd = truncated.lastIndexOf(" ");
  if (safeEnd < 80) return `${truncated.trim()}…`;
  return `${truncated.slice(0, safeEnd).trim()}…`;
}

function buildSeoDescription({
  type,
  item,
  metadata,
}: BuildSeoDescriptionParams): string {
  const overview = metadata?.overview?.trim();
  if (overview) {
    return truncateSeoDescription(overview);
  }

  const title = sanitizeDisplayTitle(item.title);
  const label = type === "movies" ? "filme" : "série";
  const year = "year" in item && item.year ? String(item.year) : null;
  const genre = typeof item.groupTitle === "string" ? sanitizeDisplayTitle(item.groupTitle) : null;
  const details = [genre, year].filter(Boolean).join(", ");

  if (details) {
    return `Saiba mais sobre ${title}, ${label} em destaque no CineNex. Confira sinopse, detalhes e opções para assistir ${details}.`;
  }

  return `Saiba mais sobre ${title} no CineNex. Confira sinopse, detalhes e opções para assistir ${type === "movies" ? "ao filme" : "à série"}.`;
}

async function resolveViewPageData(
  type: CatalogType,
  id: string,
): Promise<ViewPageResolvedData> {
  let item = await getLocalItemById(type, id) as ExternalCatalogItem | null;
  const resolvedId = id;

  if (!item && /^\d+$/.test(id) && (type === "movies" || type === "series")) {
    item = {
      id,
      title: "Explorando...",
      groupTitle: "Destaque",
      displayTitle: "Explorando...",
      logoUrl: null,
      posterUrl: null,
      url: "",
      quality: null,
      codec: null,
      year: null,
      _externalOnly: true,
    };
  }

  const metadataType: ViewMetadataType = type === "series" ? "tv" : "movie";
  if (!item) {
    return {
      item: null,
      resolvedId,
      metadataType,
      resolvedMetadata: null,
      seriesDetails: null,
    };
  }

  const title = item.title;
  const year = "year" in item ? item.year ?? null : null;
  const seriesSlug = type === "series" && item.slug ? item.slug : resolvedId;
  const seriesDetails = type === "series"
    ? await getSeriesDetailsSummary(seriesSlug)
    : null;
  const tmdbId = extractTmdbId(resolvedId);

  const resolvedMetadata = await (() => {
    if (tmdbId && tmdbId > 0) {
      return fetchEnrichedMetadataByTmdbId({ tmdbId, type: metadataType });
    }

    return fetchEnrichedMetadata({
      title: title === "Explorando..." ? "" : cleanTitleForSearch(title),
      type: metadataType,
      year: year || undefined,
    });
  })();

  return {
    item,
    resolvedId,
    metadataType,
    resolvedMetadata,
    seriesDetails,
  };
}

export async function generateMetadata({ params }: ViewPageProps): Promise<Metadata> {
  const { type, id } = await params;
  if (type !== "movies" && type !== "series") {
    return {
      title: "CineNex",
      description: "Explore filmes e séries no CineNex.",
    };
  }

  const { item, resolvedId, resolvedMetadata } = await resolveViewPageData(type, id);
  if (!item) return { title: "CineNex" };

  const title = `${sanitizeDisplayTitle(item.title)} | CineNex`;
  const description = buildSeoDescription({
    type,
    item,
    metadata: resolvedMetadata,
  });
  const imageUrl = resolvedMetadata?.backdropUrl || resolvedMetadata?.posterUrl || item.posterUrl || item.logoUrl || null;
  const url = `/view/${type}/${resolvedId}`;
  const openGraphType = type === "movies" ? "video.movie" : "website";

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: openGraphType,
      images: imageUrl ? [{ url: imageUrl, alt: sanitizeDisplayTitle(item.title) }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function ViewPage({ params, searchParams }: ViewPageProps) {
  const { type, id } = await params;
  if (type !== "movies" && type !== "series") notFound();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const fromFavorites = resolvedSearchParams?.from === "favorites";
  const likelyDatabaseId = isLikelyCatalogDatabaseId(id);
  const {
    item,
    resolvedId,
    resolvedMetadata,
    seriesDetails,
  } = await resolveViewPageData(type, id);

  if (!item && (fromFavorites || likelyDatabaseId)) {
    redirect("/collection/favorites?missing=1");
  }

  if (!item) notFound();

  const viewItem = {
    ...item,
    displayTitle: item.title,
  };

  return (
    <ViewDashboard
      type={type}
      id={resolvedId}
      item={viewItem}
      metadata={resolvedMetadata}
      seriesDetails={seriesDetails}
    />
  );
}
