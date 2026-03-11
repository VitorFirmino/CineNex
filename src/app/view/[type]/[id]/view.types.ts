import type { EnrichedMetadata } from "@services/catalog/metadata-service";
import type { CatalogItem, CatalogType } from "@shared/types/catalog-types";
import type { getSeriesDetailsSummary } from "@services/catalog/db-store";

export interface ViewDashboardItem extends Record<string, unknown> {
  displayTitle: string;
  title?: string;
  year?: number | string | null;
  posterUrl?: string | null;
  logoUrl?: string | null;
  groupTitle?: string;
  quality?: string | null;
  _externalOnly?: boolean;
}

export interface ViewDashboardSeasonSummary {
  seasonNumber: number;
  episodeCount: number;
}

export interface ViewDashboardSeriesDetails {
  slug?: string;
  seasons: ViewDashboardSeasonSummary[];
}

export interface ViewDashboardProps {
  type: string;
  id: string;
  item: ViewDashboardItem;
  metadata: EnrichedMetadata | null;
  seriesDetails: ViewDashboardSeriesDetails | null;
}

export interface ViewPageParams {
  type: string;
  id: string;
}

export interface ViewPageSearchParams {
  from?: string;
}

export interface ViewPageProps {
  params: Promise<ViewPageParams>;
  searchParams?: Promise<ViewPageSearchParams>;
}

export type ExternalCatalogItem = CatalogItem & {
  _externalOnly?: boolean;
  slug?: string;
};

export type ViewMetadataType = "movie" | "tv";

export interface ViewPageResolvedData {
  item: ExternalCatalogItem | null;
  resolvedId: string;
  metadataType: ViewMetadataType;
  resolvedMetadata: EnrichedMetadata | null;
  seriesDetails: Awaited<ReturnType<typeof getSeriesDetailsSummary>>;
}

export interface BuildSeoDescriptionParams {
  type: CatalogType;
  item: ExternalCatalogItem;
  metadata: EnrichedMetadata | null;
}
