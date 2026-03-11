import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogExplorer } from "@components/catalog-explorer";
import type { CatalogType } from "@shared/types/catalog-types";
import { getHomeHighlights } from "@services/catalog/highlights-service";

interface Props {
  params: Promise<{
    type: string;
  }>;
}

interface CollectionSeoEntry {
  label: string;
  description: string;
}

const COLLECTION_SEO: Record<CatalogType, CollectionSeoEntry> = {
  movies: {
    label: "Filmes",
    description:
      "Explore a coleção de filmes do CineNex com filtros por gênero, busca rápida e páginas com detalhes completos para escolher o que assistir.",
  },
  series: {
    label: "Séries",
    description:
      "Explore a coleção de séries do CineNex com temporadas, episódios, filtros inteligentes e descoberta rápida por título e categoria.",
  },
};

const CATALOG_TYPES = ["movies", "series"] as const satisfies readonly CatalogType[];

function isCatalogType(value: string): value is CatalogType {
  return CATALOG_TYPES.includes(value as CatalogType);
}

export function generateStaticParams() {
  return [{ type: "movies" }, { type: "series" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;

  if (!isCatalogType(type)) {
    return {
      title: "Coleção | CineNex",
      description: "Explore o catálogo.",
    };
  }

  const section = COLLECTION_SEO[type];
  const title = `${section.label} | CineNex`;

  return {
    title,
    description: section.description,
    alternates: { canonical: `/collection/${type}` },
    openGraph: {
      title,
      description: section.description,
      url: `/collection/${type}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: section.description,
    },
  };
}

export default async function CollectionTypePage({ params }: Props) {
  const { type } = await params;
  if (!isCatalogType(type)) notFound();

  const highlights = await getHomeHighlights();
  return (
    <CatalogExplorer
      key={`collection-${type}`}
      highlights={highlights}
      initialTab={type}
      initialViewMode="browse"
    />
  );
}
