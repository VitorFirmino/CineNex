'use client';

import { useEffect, useState } from 'react';
import { Heart, Loader2, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SafeImage } from '@components/safe-image';
import { Badge } from '@components/ui/badge';
import { FavoriteButton } from '@components/favorite-button';
import { useAuth } from '@hooks/use-auth';
import { FuturisticBackground } from '@components/backgrounds/futuristic-background';
import { authApi } from '@infrastructure/api/auth-api';
import { isRequestCanceledError } from '@infrastructure/http/axios-client';
import { normalizeCatalogContentId } from '@shared/catalog/content-id';
import { placeholderImage } from '@shared/utils';

interface FavoriteItem {
  id: string;
  type: string;
  contentId: string;
  posterUrl?: string | null;
  logoUrl?: string | null;
}

function toBaseFavoriteType(type: FavoriteItem["type"]): 'movie' | 'series' {
  if (['MOVIE', 'MOVIES'].includes(type.toUpperCase())) return 'movie';
  return 'series';
}

function toCatalogType(type: FavoriteItem["type"]): 'movies' | 'series' {
  return toBaseFavoriteType(type) === 'movie' ? 'movies' : 'series';
}

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const load = async () => {
      try {
        const data = await authApi.getFavorites({ signal: controller.signal });
        setFavorites(data.favorites || []);
      } catch (error) {
        if (isRequestCanceledError(error)) return;
        console.error(error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="size-12 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 text-center">
        <Heart className="size-16 text-zinc-800 mb-6" />
        <h1 className="text-3xl font-black text-white uppercase italic mb-4">Acesso Restrito</h1>
        <p className="text-zinc-500 max-w-md mb-8">Faça login para salvar seus conteúdos favoritos e acessá-los de qualquer dispositivo.</p>
        <Link href="/login" className="px-8 py-4 bg-emerald-600 rounded-full font-black text-white hover:bg-emerald-700 transition-all">ENTRAR AGORA</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative p-8 pt-32">
      <FuturisticBackground />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-6 py-2 backdrop-blur-xl">
            <Heart className="size-4 text-emerald-500 fill-emerald-500" />
            <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">Minha Coleção Privada</span>
          </div>
          <h1 className="text-6xl font-black sm:text-8xl headline-neo uppercase italic tracking-tighter">
            Favoritos
          </h1>
        </header>

        {favorites.length === 0 ? (
          <div className="py-24 text-center space-y-6">
            <div className="size-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto opacity-50">
              <Heart className="size-10 text-zinc-600" />
            </div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest">Sua lista está vazia</p>
            <Link href="/" className="text-emerald-400 font-black hover:underline uppercase text-sm tracking-widest">Explorar Catálogo</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {favorites.map((fav, i) => {
              const normalizedContentId = normalizeCatalogContentId(fav.contentId);

              return (
                <motion.div
                  key={fav.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="group relative block rounded-3xl overflow-hidden bg-zinc-950 border border-white/5 aspect-2/3">
                    <SafeImage
                      src={fav.posterUrl || fav.logoUrl || placeholderImage("poster")}
                      fallbackSrc={placeholderImage("poster")}
                      alt="Favorito"
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-all duration-500"
                    />

                    <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />

                    <div className="absolute top-4 right-4 z-20">
                      <FavoriteButton
                        type={toBaseFavoriteType(fav.type)}
                        contentId={normalizedContentId}
                        onToggle={(favorited) => {
                          if (!favorited) {
                            setFavorites((prev) => prev.filter((item) => item.id !== fav.id));
                          }
                        }}
                      />
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-6 space-y-4">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-black/40 border-white/10 text-zinc-400">
                          {fav.type}
                        </Badge>
                      </div>

                      <Link
                        href={`/view/${toCatalogType(fav.type)}/${normalizedContentId}?from=favorites`}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all"
                      >
                        <Play className="size-4 fill-current" /> Assistir
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
