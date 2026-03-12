import ReactDOM from "react-dom";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getImageProps } from "next/image";
import { HomeCatalogExplorerSkeleton } from "@components/home-catalog-explorer/components/home-catalog-explorer-skeleton";
import { getHomeHighlights } from "@services/catalog/highlights-service";

const HomeCatalogExplorer = dynamic(
  () => import("@components/home-catalog-explorer").then((m) => m.HomeCatalogExplorer),
  {
    loading: () => <HomeCatalogExplorerSkeleton />,
  },
);

export const metadata: Metadata = {
  title: "CineNex | Filmes e Séries para Assistir Online",
  description:
    "Descubra filmes e séries no CineNex com vitrine em destaque, navegação cinematográfica e páginas completas com sinopse, elenco e opções para assistir.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CineNex | Filmes e Séries para Assistir Online",
    description:
      "Explore a home do CineNex com destaques de filmes e séries, descoberta rápida e experiência visual cinematográfica.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CineNex | Filmes e Séries para Assistir Online",
    description:
      "Explore destaques, descubra novos títulos e encontre filmes e séries para assistir no CineNex.",
  },
};

export default async function Home() {
  const highlights = await getHomeHighlights();
  const heroImageUrl =
    highlights.hero?.imageUrl ?? highlights.rows[0]?.items[0]?.imageUrl ?? null;

  if (heroImageUrl) {
    const { props } = getImageProps({
      src: heroImageUrl,
      alt: highlights.hero?.title ?? "Destaque do CineNex",
      width: 1280,
      height: 720,
      sizes: "100vw",
      quality: 75,
    });

    ReactDOM.preload(props.src, {
      as: "image",
      imageSrcSet: props.srcSet,
      imageSizes: props.sizes,
      fetchPriority: "high",
    });
  }

  return (
    <main className="relative min-h-screen">
      <div className="bg-main-gradient" />
      <HomeCatalogExplorer highlights={highlights} />
    </main>
  );
}
