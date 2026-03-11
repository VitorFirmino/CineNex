"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Play, Star, ThumbsUp } from "lucide-react";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Skeleton } from "@components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import { cn, sanitizeDisplayTitle, placeholderImage } from "@shared/utils";
import { SafeImage } from "@components/safe-image";
import { FavoriteButton } from "@components/favorite-button";
import {
  getCatalogMetadata,
  getSeriesSeasonEpisodes,
  type CatalogMetadataPayload as MetadataPayload,
  type CatalogSeriesEpisodePayload as SeriesEpisodePayload,
} from "@infrastructure/api/catalog-api";
import { isRequestCanceledError } from "@infrastructure/http/axios-client";
import type { ViewDashboardProps } from "./view.types";

export function ViewDashboard({
  type,
  id,
  item,
  metadata: initialMetadata,
  seriesDetails,
}: ViewDashboardProps) {
  const router = useRouter();

  const [metadata, setMetadata] = useState<MetadataPayload | null>(
    initialMetadata,
  );
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(!initialMetadata);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    seriesDetails?.seasons[0]?.seasonNumber || null,
  );
  const [seasonEpisodes, setSeasonEpisodes] = useState<SeriesEpisodePayload[]>(
    [],
  );
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  const fetchMetadata = useCallback(async (signal?: AbortSignal) => {
    const isPlaceholder = item.displayTitle === "Explorando...";

    if (
      (!initialMetadata || isPlaceholder) &&
      (type === "movies" || type === "series")
    ) {
      setIsLoadingMetadata(true);
      const title = isPlaceholder
        ? ""
        : "title" in item
          ? item.title
          : item.displayTitle;
      const metadataType = type === "series" ? "tv" : "movie";

      const params = new URLSearchParams({ type: metadataType });
      if (title) params.set("title", title);
      if (item.year) params.set("year", String(item.year));
      if (isPlaceholder && /^\d+$/.test(id)) params.set("tmdbId", id);

      try {
        const data = await getCatalogMetadata({
          type: metadataType,
          title: params.get("title") || undefined,
          year: params.get("year"),
          tmdbId: params.get("tmdbId"),
        }, {
          signal,
        });
        if (data.item) setMetadata(data.item);
        if (data.trailerKey) setTrailerKey(data.trailerKey);
      } catch (error: unknown) {
        if (isRequestCanceledError(error)) return;
        console.error("[view-dashboard] Falha ao carregar metadados.", error);
      } finally {
        if (!signal?.aborted) {
          setIsLoadingMetadata(false);
        }
      }
    }
  }, [id, initialMetadata, item, type]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchMetadata(controller.signal);
    return () => controller.abort();
  }, [fetchMetadata]);

  useEffect(() => {
    const externalOnly = Boolean(item._externalOnly);
    if (!externalOnly && (type === "movies" || type === "series")) {
      router.prefetch(`/play/${type}/${id}`);
    }
  }, [type, id, item, router]);

  useEffect(() => {
    if (type !== "series" || !seriesDetails || selectedSeason === null) {
      setSeasonEpisodes([]);
      return;
    }

    const controller = new AbortController();
    const seriesIdentifier = seriesDetails.slug || id;
    setIsLoadingEpisodes(true);

    (async () => {
      try {
        const data = await getSeriesSeasonEpisodes(
          seriesIdentifier,
          selectedSeason,
          {
            signal: controller.signal,
          },
        );
        setSeasonEpisodes(Array.isArray(data.episodes) ? data.episodes : []);
      } catch (error: unknown) {
        if (isRequestCanceledError(error)) return;
        setSeasonEpisodes([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingEpisodes(false);
        }
      }
    })();

    return () => controller.abort();
  }, [id, selectedSeason, seriesDetails, type]);

  const selectedEpisodes = useMemo(() => seasonEpisodes, [seasonEpisodes]);

  const title = sanitizeDisplayTitle(
    metadata?.title || item.title || item.displayTitle,
  );
  const displayYear = metadata?.omdb?.year || metadata?.releaseDate?.slice(0, 4) || item.year;
  const isExternalOnly = Boolean(item._externalOnly);
  const itemGroupTitle =
    typeof item.groupTitle === "string" ? item.groupTitle : "";
  const itemQuality = typeof item.quality === "string" ? item.quality : "";
  const metadataOverview =
    typeof metadata?.overview === "string" ? metadata.overview : "";
  const fallbackOverview = isExternalOnly
    ? "Conteúdo em destaque da fonte externa. Ainda não há stream local vinculado no catálogo."
    : `Assista agora a "${title}". Transmissão disponível em alta definição com sinal estável na categoria ${sanitizeDisplayTitle(itemGroupTitle)}.`;
  const overview = metadataOverview || fallbackOverview;

  const backdrop =
    metadata?.backdropUrl ||
    metadata?.posterUrl ||
    item.posterUrl ||
    item.logoUrl ||
    placeholderImage("backdrop");

  const handlePlay = (episodeId?: string) => {
    if (isExternalOnly) return;
    if (type === "series") {
      const firstAvailableEpisodeId = selectedEpisodes[0]?.id;
      const targetEpisodeId = episodeId || firstAvailableEpisodeId;
      if (targetEpisodeId) {
        router.push(`/play/series/${id}?episodeId=${targetEpisodeId}`);
        return;
      }
      document
        .getElementById("episodes-section")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    router.push(`/play/${type}/${id}`);
  };

  const handleBack = () => {
    if (typeof document === "undefined" || !document.referrer) {
      router.push("/");
      return;
    }

    const ref = document.referrer;
    const origin = window.location.origin;

    if (!ref.startsWith(origin)) {
      router.push("/");
      return;
    }

    const path = ref.replace(origin, "");

    if (path === "/" || path === "/collection/favorites") {
      router.push(path);
      return;
    }

    if (path === "/collection/movies" || path === "/collection/series") {
      router.push(`${path}#catalog`);
      return;
    }

    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative min-h-screen bg-[#141414] text-white overflow-x-hidden pt-12"
    >
      <section className="relative mt-4 w-full h-[75vh] sm:h-[85vh] overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <SafeImage
            src={backdrop}
            fallbackSrc={placeholderImage("backdrop")}
            alt={title}
            fill
            priority
            className="object-cover object-top"
            unoptimized
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-[#141414]/20 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-transparent to-transparent" />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end pb-12 sm:pb-20 px-4 xs:px-6 sm:px-12 lg:px-20 max-w-[1800px] mx-auto pt-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl space-y-6 sm:space-y-8"
          >
            <h1 className="text-4xl xs:text-5xl md:text-5xl lg:text-6xl xl:text-6xl font-black tracking-tighter drop-shadow-2xl uppercase italic leading-[0.9] line-clamp-3">
              {title}
            </h1>

            <p className="text-base md:text-lg font-medium leading-relaxed drop-shadow-md line-clamp-3 text-zinc-200">
              {overview}
            </p>

            <div className="flex items-center gap-3">
              <div className="size-5 sm:size-6 bg-red-600 rounded-sm flex items-center justify-center font-black text-[10px] sm:text-xs">
                TOP
              </div>
              <p className="font-bold text-lg sm:text-xl tracking-tight italic">
                Nº 1 em visualizações hoje
              </p>
            </div>

            <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Button
                size="lg"
                className={cn(
                  "h-12 sm:h-14 px-6 sm:px-10 rounded font-bold text-lg sm:text-xl transition-colors",
                  isExternalOnly
                    ? "bg-zinc-700/80 text-zinc-300 cursor-not-allowed"
                    : "bg-white text-black hover:bg-white/80",
                )}
                disabled={isExternalOnly}
                onClick={() => {
                  handlePlay();
                }}
              >
                <Play className="size-6 sm:size-8 fill-current mr-2 sm:mr-3" />
                {isExternalOnly
                  ? "Sem stream"
                  : type === "series"
                    ? "Episódios"
                    : "Assistir"}
              </Button>

              <div className="flex items-center gap-3 sm:gap-4">
                <FavoriteButton
                  type={type === "movies" ? "movie" : "series"}
                  contentId={id}
                  size="lg"
                  className="h-12 sm:h-14 px-6 sm:px-10 rounded font-bold text-lg sm:text-xl border-none bg-zinc-500/40 text-white hover:bg-zinc-500/60"
                />
              </div>

              <Button
                size="icon"
                variant="outline"
                aria-label="Curtir conteúdo"
                className="size-12 sm:size-14 rounded-full border-2 border-white/40 bg-transparent text-white hover:bg-white/10 hidden xs:flex"
              >
                <ThumbsUp className="size-5 sm:size-6" />
              </Button>
            </div>
          </motion.div>
        </div>

        <button
          aria-label="Voltar"
          onClick={handleBack}
          className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 size-10 sm:size-12 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-all border border-white/10 backdrop-blur-md"
        >
          <ChevronLeft className="size-6 sm:size-8 text-white" />
        </button>
      </section>

      <section className="relative z-10 max-w-[1800px] mx-auto px-4 xs:px-6 sm:px-12 lg:px-20 -mt-10 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-16">
          <div className="space-y-12">
            <div className="flex flex-wrap items-center gap-4 font-bold text-zinc-400">
              {metadata?.imdbRating && metadata.imdbRating !== "N/A" && (
                <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-md border border-amber-500/20">
                  <Star className="size-4 fill-current" />
                  <span>IMDb {metadata.imdbRating}</span>
                </div>
              )}
              {metadata?.rating && !metadata.imdbRating && (
                <span className="text-emerald-400">
                  {Math.round((metadata.rating / 10) * 100)}% relevante
                </span>
              )}
              <span>{displayYear || "2024"}</span>
              {metadata?.runtime && <span>{metadata.runtime} min</span>}
              <Badge
                variant="outline"
                className="border-zinc-500 text-zinc-300 rounded-sm px-1.5 py-0"
              >
                {itemQuality || "HD"}
              </Badge>
              {metadata?.rated && metadata.rated !== "N/A" && (
                <span className="border border-zinc-600 px-2 py-0.5 text-xs text-zinc-300 uppercase">
                  {metadata.rated}
                </span>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-zinc-500 font-black uppercase tracking-widest text-xs">
                Sinopse
              </h3>
              <p className="text-2xl text-zinc-100 leading-relaxed font-normal">
                {metadata?.omdb?.plot &&
                metadata.omdb.plot.length > (metadata?.overview?.length || 0)
                  ? metadata.omdb.plot
                  : metadata?.overview ||
                    (isExternalOnly
                      ? `Este título veio da vitrine externa e ainda não foi mapeado para uma stream local.`
                      : `Este conteúdo faz parte da categoria ${sanitizeDisplayTitle(itemGroupTitle)}. Transmissão disponível em alta definição com sinal estável.`)}
              </p>
              {metadata?.awards && metadata.awards !== "N/A" && (
                <div className="flex items-center gap-3 text-sm text-zinc-400 italic bg-white/5 p-4 rounded-xl border border-white/5">
                  <Star className="size-4 text-amber-500" />
                  <span>{metadata.awards}</span>
                </div>
              )}
            </div>

            {trailerKey && (
              <div className="pt-12 space-y-6 border-t border-zinc-800">
                <h3 className="text-zinc-500 font-black uppercase tracking-widest text-xs">
                  Trailer
                </h3>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerKey}?rel=0&modestbranding=1`}
                    title="Trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            )}

            {type === "series" && (
              <div
                id="episodes-section"
                className="pt-12 space-y-10 border-t border-zinc-800"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                    Episódios
                  </h2>
                  <Select
                    value={String(selectedSeason)}
                    onValueChange={(v) => setSelectedSeason(Number(v))}
                  >
                    <SelectTrigger className="w-full sm:w-64 h-12 rounded bg-zinc-800/80 border-white/5 text-white font-bold transition-all hover:bg-zinc-800">
                      <SelectValue placeholder="Temporada" />
                    </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {seriesDetails?.seasons.map(
                        (s) => (
                          <SelectItem
                            key={s.seasonNumber}
                            value={String(s.seasonNumber)}
                            className="h-12 font-bold focus:bg-emerald-600 focus:text-white"
                          >
                            Temporada {s.seasonNumber}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4">
                  {isLoadingEpisodes ? (
                    <div className="space-y-3">
                      <Skeleton className="h-28 w-full bg-white/5" />
                      <Skeleton className="h-28 w-full bg-white/5" />
                      <Skeleton className="h-28 w-full bg-white/5" />
                    </div>
                  ) : selectedEpisodes.length > 0 ? (
                    selectedEpisodes.map(
                      (ep: SeriesEpisodePayload, idx: number) => (
                        <div
                          key={ep.id}
                          onClick={() => handlePlay(ep.id)}
                          className="group flex items-center gap-6 p-6 rounded-lg bg-transparent hover:bg-zinc-800/50 transition-colors cursor-pointer border-b border-zinc-800 last:border-0"
                        >
                          <div className="text-2xl font-bold text-zinc-500 w-10 text-center group-hover:text-white">
                            {idx + 1}
                          </div>

                          <div className="relative w-40 aspect-video rounded overflow-hidden bg-zinc-900 shrink-0">
                            <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <Play className="size-10 text-white fill-current" />
                            </div>
                            <SafeImage
                              src={ep.posterUrl || ep.logoUrl || backdrop}
                              fallbackSrc={placeholderImage("backdrop")}
                              alt={ep.title}
                              fill
                              className="object-cover opacity-60"
                              unoptimized
                            />
                          </div>

                          <div className="flex-1 space-y-2">
                            <h4 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {sanitizeDisplayTitle(ep.title)}
                            </h4>
                            <p className="text-sm text-zinc-400 line-clamp-2 md:line-clamp-3 leading-relaxed">
                              Episódio {ep.episodeNumber} disponível para
                              transmissão imediata via protocolo seguro.
                              Aproveite a melhor qualidade de imagem.
                            </p>
                          </div>

                          <div className="hidden md:block text-zinc-500 text-sm font-bold">
                            45 min
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl">
                      <p className="text-zinc-500 font-bold italic uppercase tracking-widest">
                        Nenhum episódio encontrado para esta temporada.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-10 pt-4 text-sm leading-relaxed">
            {isLoadingMetadata ? (
              <div className="space-y-10">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-white/5" />
                  <Skeleton className="h-4 w-full bg-white/5" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-white/5" />
                  <Skeleton className="h-4 w-full bg-white/5" />
                  <Skeleton className="h-4 w-2/3 bg-white/5" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-white/5" />
                  <Skeleton className="h-4 w-1/2 bg-white/5" />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 border-l-2 border-emerald-500/30 pl-6 py-2">
                  <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">
                    Ficha Técnica
                  </p>
                  {metadata?.omdb?.director &&
                    metadata.omdb.director !== "N/A" && (
                      <p className="flex flex-col gap-1">
                        <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                          Direção
                        </span>
                        <span className="text-zinc-200 text-base">
                          {metadata.omdb.director}
                        </span>
                      </p>
                    )}
                  <p className="flex flex-col gap-1">
                    <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                      Elenco
                    </span>
                    <span className="text-zinc-200 text-base">
                      {metadata?.omdb?.actors && metadata.omdb.actors !== "N/A"
                        ? metadata.omdb.actors
                        : metadata?.cast && metadata.cast.length > 0
                          ? metadata.cast.join(", ")
                          : "Informação não disponível"}
                    </span>
                  </p>
                  <p className="flex flex-col gap-1">
                    <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                      Gêneros
                    </span>
                    <span className="text-zinc-200 text-base">
                      {metadata?.omdb?.genre && metadata.omdb.genre !== "N/A"
                        ? metadata.omdb.genre
                        : metadata?.genres && metadata.genres.length > 0
                          ? metadata.genres.join(", ")
                          : "Geral"}
                    </span>
                  </p>
                </div>
              </>
            )}
            <div className="space-y-2 border-l-2 border-emerald-500/30 pl-6">
              <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">
                Origem
              </p>
              <p>
                <span className="text-zinc-500 font-bold">Categoria:</span>{" "}
                <span className="text-zinc-300">
                  {sanitizeDisplayTitle(itemGroupTitle)}
                </span>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </motion.main>
  );
}
