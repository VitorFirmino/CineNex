export type HighlightKind = "movies" | "series" | "external";

export type HighlightItem = {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  imageUrl: string | null;
  badge?: string;
  kind: HighlightKind;
  streamUrl?: string;
  seriesSlug?: string;
  externalUrl?: string;
  extension?: string;
  quality?: string;
};

export type HighlightRow = {
  id: string;
  title: string;
  caption?: string;
  items: HighlightItem[];
};

export type HomeHighlights = {
  generatedAt: string;
  source: string;
  hero: HighlightItem | null;
  rows: HighlightRow[];
};
