export type StreamKind = "movies" | "series";

export type StreamFallbackOption = {
  id: string;
  url: string;
  quality: string | null;
  label: string;
  rank: number;
  isCurrent: boolean;
};
