'use client';

import { create } from 'zustand';
import { authApi } from '@infrastructure/api/auth-api';

export type FavoriteContentType = 'MOVIE' | 'SERIES';

type FavoriteKey = `${FavoriteContentType}:${string}`;

function toKey(type: FavoriteContentType, contentId: string): FavoriteKey {
  return `${type}:${contentId}`;
}

let loadPromise: Promise<void> | null = null;

export interface FavoritesState {
  readonly keys: ReadonlySet<FavoriteKey>;
  readonly isLoaded: boolean;
}

export interface FavoritesActions {
  loadFavorites: () => Promise<void>;
  clearFavorites: () => void;
  toggleFavorite: (type: FavoriteContentType, contentId: string) => Promise<boolean>;
  isFavorited: (type: FavoriteContentType, contentId: string) => boolean;
}

export type FavoritesSlice = FavoritesState & FavoritesActions;

export const useFavoritesStore = create<FavoritesSlice>()((set, get) => ({
  keys: new Set<FavoriteKey>(),
  isLoaded: false,

  async loadFavorites(): Promise<void> {
    if (get().isLoaded) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const data = await authApi.getFavorites();
        const favorites = data.favorites ?? [];
        const keys = new Set<FavoriteKey>(
          favorites.map((f) => toKey(f.type as FavoriteContentType, f.contentId)),
        );
        set({ keys, isLoaded: true });
      } catch {
        set({ keys: new Set<FavoriteKey>(), isLoaded: true });
      } finally {
        loadPromise = null;
      }
    })();

    return loadPromise;
  },

  clearFavorites(): void {
    loadPromise = null;
    set({ keys: new Set<FavoriteKey>(), isLoaded: false });
  },

  async toggleFavorite(type, contentId): Promise<boolean> {
    const key = toKey(type, contentId);
    const { keys } = get();

    const wasIn = keys.has(key);
    const nextKeys = new Set(keys);
    if (wasIn) nextKeys.delete(key);
    else nextKeys.add(key);
    set({ keys: nextKeys });

    try {
      const data = await authApi.toggleFavorite({ type, contentId });
      const now = data.favorited;

      const reconciled = new Set(get().keys);
      if (now) reconciled.add(key);
      else reconciled.delete(key);
      set({ keys: reconciled });

      return now;
    } catch {
      const reverted = new Set(get().keys);
      if (wasIn) reverted.add(key);
      else reverted.delete(key);
      set({ keys: reverted });
      throw new Error('Falha ao alternar favorito');
    }
  },

  isFavorited(type, contentId): boolean {
    return get().keys.has(toKey(type, contentId));
  },
}));
