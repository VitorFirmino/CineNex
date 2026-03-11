'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@hooks/use-auth';
import { useFavoritesStore, type FavoriteContentType } from '@store/favorites-store';

interface UseFavoriteProps {
  type: 'movie' | 'series';
  contentId: string;
  onToggle?: (favorited: boolean) => void;
}

function toContentType(type: 'movie' | 'series'): FavoriteContentType {
  return type === 'movie' ? 'MOVIE' : 'SERIES';
}

export function useFavorite({ type, contentId, onToggle }: UseFavoriteProps) {
  const { user } = useAuth();
  const router = useRouter();
  const contentType = toContentType(type);

  const isFavorited = useFavoritesStore((s) => s.isFavorited(contentType, contentId));

  useEffect(() => {
    if (!user) {
      useFavoritesStore.getState().clearFavorites();
      return;
    }

    void useFavoritesStore.getState().loadFavorites();
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const favorited = await useFavoritesStore.getState().toggleFavorite(contentType, contentId);
      onToggle?.(favorited);
    } catch (error) {
      console.error('[use-favorite] Falha ao alternar favorito.', error);
    }
  };

  return { isFavorited, isLoading: false, toggleFavorite };
}
