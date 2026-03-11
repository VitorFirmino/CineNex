export type FavoriteRecord = {
  id: string;
  type: string;
  contentId: string;
  createdAt?: string;
  posterUrl?: string | null;
  logoUrl?: string | null;
};

export type FavoritesResponse = {
  favorites?: FavoriteRecord[];
};
