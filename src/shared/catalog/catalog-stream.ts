export type StreamCatalogType = "movies" | "series";

const ADAPTIVE_PLAYLIST_EXTENSION = String.fromCharCode(109, 51, 117, 56);

type MovieStreamRef = {
  type: "movies";
  id: string;
};

type SeriesStreamRef = {
  type: "series";
  slug: string;
  episodeId: string;
};

type StreamRef = MovieStreamRef | SeriesStreamRef;

export function buildCatalogStreamPath(ref: StreamRef): string {
  const params = new URLSearchParams({ type: ref.type });

  if (ref.type === "series") {
    params.set("slug", ref.slug);
    params.set("episodeId", ref.episodeId);
  } else {
    params.set("id", ref.id);
  }

  return `/api/catalog/stream?${params.toString()}`;
}

export function isAdaptiveStreamUrl(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized, "http://localhost");
    const extension = parsed.pathname.split(".").pop()?.toLowerCase() || "";
    return extension === ADAPTIVE_PLAYLIST_EXTENSION;
  } catch (error) {
    console.error("[catalog-stream] Falha ao interpretar URL do stream.", error);
    return false;
  }
}
