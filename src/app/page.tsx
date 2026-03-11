import type { Metadata } from "next";
import { CatalogExplorer } from "@components/catalog-explorer";
import { getHomeHighlights } from "@services/catalog/highlights-service";

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
  return (
    <main className="relative min-h-screen">
      <div className="bg-main-gradient" />
      <CatalogExplorer
        key="discover-home"
        highlights={highlights}
        initialTab="movies"
        initialViewMode="discover"
      />
    </main>
  );
}
