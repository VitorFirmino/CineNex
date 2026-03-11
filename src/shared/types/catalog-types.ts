export type CatalogType = "movies" | "series";

export type CatalogBaseItem = {
  id: string;
  displayTitle: string;
  groupTitle: string;
  logoUrl: string | null;
  posterUrl: string | null;
  url: string;
  quality: string | null;
  codec: string | null;
  year: number | null;
};

export type MovieItem = CatalogBaseItem & {
  title: string;
};

export type SeriesEpisode = CatalogBaseItem & {
  title: string;
  seasonNumber: number;
  episodeNumber: number;
};

export type SeriesSeason = {
  seasonNumber: number;
  episodeCount: number;
  episodes: SeriesEpisode[];
};

export type SeriesItem = {
  id: string;
  slug: string;
  title: string;
  groupTitle: string;
  logoUrl: string | null;
  posterUrl: string | null;
  searchText: string;
  seasonCount: number;
  episodeCount: number;
  seasons: SeriesSeason[];
};

export type SeriesIndexItem = Omit<SeriesItem, "seasons">;

export type CatalogItem = MovieItem | SeriesIndexItem;

export type Summary = {
  generatedAt: string;
  source: string;
  totals: {
    movies: number;
    series: number;
  };
};

export type GroupCount = {
  name: string;
  count: number;
};

export type PaginationResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ListQuery = {
  q?: string;
  group?: string;
  groups?: string[];
  page?: number;
  pageSize?: number;
  minEpisodes?: number;
  sort?:
    | "default"
    | "title_asc"
    | "title_desc"
    | "year_desc"
    | "year_asc"
    | "episodes_desc"
    | "episodes_asc";
};
