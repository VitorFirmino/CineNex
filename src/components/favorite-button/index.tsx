'use client';

import { Heart } from 'lucide-react';
import { Button } from '@components/ui/button';
import { cn } from '@shared/utils';
import { useFavorite } from './hooks/use-favorite';

interface FavoriteButtonProps {
  type: 'movie' | 'series';
  contentId: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onToggle?: (favorited: boolean) => void;
}

export function FavoriteButton({ type, contentId, className, size = 'icon', onToggle }: FavoriteButtonProps) {
  const { isFavorited, isLoading, toggleFavorite } = useFavorite({ type, contentId, onToggle });

  const favoriteActionLabel = isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos';

  return (
    <Button
      variant="ghost"
      size={size}
      aria-label={favoriteActionLabel}
      onClick={toggleFavorite}
      disabled={isLoading}
      className={cn(
        "rounded-full transition-all duration-300 gap-3",
        isFavorited
          ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/20"
          : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border-white/10",
        "border backdrop-blur-md",
        size === 'lg' && "px-8 py-4 h-auto text-lg font-bold rounded-xl",
        className
      )}
    >
      <Heart className={cn("size-5", isFavorited && "fill-current animate-heart-pop")} />
      {size === 'lg' && (
        <span>{isFavorited ? 'Na Minha Lista' : 'Minha Lista'}</span>
      )}
    </Button>
  );
}
