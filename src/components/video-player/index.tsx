"use client";

import {
  AlertCircle, Play, Pause,
  Volume2, VolumeX, Maximize, RefreshCw,
  ChevronLeft, Settings2, X, SkipBack, SkipForward
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVideoPlayer } from "./hooks/use-video-player";
import type { VideoPlayerProps } from "./video-player.types";
import { SafeImage } from "@components/safe-image";

export type {
  NextEpisodeInfo,
  VideoPlayerProps,
  VideoProgressContext,
} from "./video-player.types";

const NEXT_EPISODE_POSTER_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='320'%3E%3Crect width='100%25' height='100%25' fill='%23090f1a'/%3E%3Ctext x='50%25' y='50%25' fill='%2394a3b8' font-size='28' text-anchor='middle' dominant-baseline='middle' font-family='Arial,sans-serif'%3EPr%C3%B3ximo epis%C3%B3dio%3C/text%3E%3C/svg%3E";

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
}

export function VideoPlayer({
  url,
  poster,
  title,
  isHls,
  variant = "dashboard",
  backHref,
  previousEpisode,
  nextEpisode,
  initialPositionSec,
  progressContext,
}: VideoPlayerProps) {
  const {
    videoRef,
    containerRef,
    settingsPanelRef,
    settingsButtonRef,
    isPlaying,
    showLoadingOverlay,
    isMuted,
    volume,
    currentTime,
    duration,
    error,
    controlsVisible,
    isSettingsOpen,
    playbackRate,
    streamOptions,
    activeOptionIndex,
    autoFallbackEnabled,
    hasPlaybackStarted,
    nextEpisodeVisible,
    nextEpisodeCountdown,
    nextEpisodeDismissed,
    hasLowerAlternative,
    volumePercent,
    showPauseOverlay,
    showTimedOutWarning,
    showPlayerAlert,
    progressPercent,
    showControls,
    togglePlay,
    onSeek,
    changePlaybackRate,
    onVolumeChange,
    toggleMute,
    toggleFs,
    handleContainerClick,
    handleRetry,
    handleDismissAlert,
    handleNextEpisodeDismiss,
    handleNextEpisodeNavigate,
    handlePreviousEpisodeNavigate,
    handleBack,
    handleSettingsToggle,
    selectStreamOption,
    enableAutoQuality,
  } = useVideoPlayer({
    url,
    poster,
    title,
    isHls,
    variant,
    backHref,
    previousEpisode,
    nextEpisode,
    initialPositionSec,
    progressContext,
  });

  if (variant === "dashboard") {
    return (
      <div className="bg-black group relative overflow-hidden w-full aspect-video rounded-3xl border border-white/10 shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          poster={hasPlaybackStarted ? undefined : poster}
          playsInline
          muted
          preload="metadata"
        />
        <AnimatePresence>
          {!isPlaying && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all cursor-pointer"
              onClick={togglePlay}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                className="size-24 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center backdrop-blur-xl transition-transform"
              >
                <div className="size-16 rounded-full bg-emerald-600 flex items-center justify-center shadow-[0_0_30px_var(--glow-60)]">
                  <Play className="size-8 text-white fill-current ml-1" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden group/player select-none focus:outline-none"
      onMouseMove={showControls}
      onClick={handleContainerClick}
      onDoubleClick={toggleFs}
      onPointerDown={() => containerRef.current?.focus()}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={hasPlaybackStarted ? undefined : poster}
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
      />

      <motion.div
        initial={false}
        animate={{ opacity: controlsVisible || !isPlaying ? 1 : 0 }}
        className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-transparent to-black/80 pointer-events-none transition-opacity duration-700"
      />

      <AnimatePresence mode="wait">
        {showLoadingOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none"
          >
            <div className="relative flex flex-col items-center">
              <div className="relative size-24">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#10b98100_10%,#10b981_100%)] p-[2px] [mask:radial-gradient(farthest-side,#0000_calc(100%-3px),#000_0)]"
                  style={{ filter: "drop-shadow(0 0 12px var(--brand-hex))" }}
                />

                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 p-4"
                >
                  <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_var(--brand-hex)]" />
                </motion.div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [0.8, 1.2, 0.8],
                      opacity: [0.2, 0.6, 0.2]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="size-10 rounded-full bg-emerald-500/30 blur-md"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-1.5 h-4 items-center">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [4, 16, 4],
                      backgroundColor: ["var(--glow-20)", "var(--glow-full)", "var(--glow-20)"]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut"
                    }}
                    className="w-1 rounded-full"
                    style={{ boxShadow: "0 0 8px var(--glow-40)" }}
                  />
                ))}
              </div>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-[11px] font-black uppercase tracking-[0.6em] text-emerald-400 drop-shadow-[0_0_8px_var(--glow-50)]"
              >
                Carregando...
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPauseOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[4px] cursor-pointer"
            onClick={togglePlay}
          >
            <motion.div
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative group/play-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl"
                />
                <div className="size-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md transition-transform duration-500 group-hover/play-center:scale-110">
                  <Play className="size-10 text-white fill-white ml-1.5" />
                </div>
              </div>

              <div className="mt-6">
                <span className="text-white/50 text-[11px] font-black uppercase tracking-[0.6em]">Pausado</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPlayerAlert && (
        <div className="absolute top-24 inset-x-0 z-50 flex justify-center px-6 pointer-events-none" data-player-no-toggle="true">
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl pointer-events-auto">
            <AlertCircle className="size-4 text-amber-500" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase text-amber-500">{showTimedOutWarning ? "Sinal Fraco" : "Erro no Player"}</span>
              <span className="text-xs text-white/80">
                {error ||
                  (hasLowerAlternative
                    ? "Conexão instável. Tentando reduzir automaticamente para uma fonte mais leve."
                    : "O vídeo está demorando muito para responder e não há qualidade menor disponível.")}
              </span>
            </div>
            <button
              aria-label="Recarregar player"
              onClick={handleRetry}
              className="ml-4 size-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="size-3 text-white" />
            </button>
            <button
              aria-label="Fechar aviso do player"
              onClick={handleDismissAlert}
              className="size-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="size-3 text-white" />
            </button>
          </div>
        </div>
      )}

      <motion.div
        initial={false}
        animate={{
          y: controlsVisible || !isPlaying ? 0 : -100,
          opacity: controlsVisible || !isPlaying ? 1 : 0
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 inset-x-0 z-40 p-6 sm:p-10 flex items-center gap-4 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
      >
          <div className="flex items-center gap-4 pointer-events-auto" data-player-no-toggle="true">
          <button
            aria-label="Voltar"
            onClick={handleBack}
            className="size-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-xl border border-white/10 transition-all active:scale-90"
          >
            <ChevronLeft className="size-7" />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-white font-black text-xl sm:text-2xl tracking-tighter leading-none drop-shadow-2xl truncate max-w-[200px] xs:max-w-[300px] sm:max-w-md">
              {title || "Reproduzindo"}
            </h1>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          y: controlsVisible || !isPlaying ? 0 : 100,
          opacity: controlsVisible || !isPlaying ? 1 : 0
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 inset-x-0 z-40 p-6 sm:p-10 flex flex-col gap-6 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
      >
        <div className="pointer-events-auto flex flex-col gap-6" data-player-no-toggle="true">
          <div className="group/progress relative w-full h-1.5 flex items-center cursor-pointer">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={onSeek}
              step="0.1"
              className="absolute inset-0 w-full h-6 -top-2.5 opacity-0 cursor-pointer z-10"
            />
            <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden h-full group-hover/progress:h-2 transition-all">
              <div
                className="h-full bg-emerald-600 shadow-[0_0_15px_var(--glow-60)] transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <div className="flex flex-wrap items-center gap-4 sm:gap-8">
              <button
                aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                onClick={togglePlay}
                className="size-12 sm:size-14 flex items-center justify-center rounded-full bg-emerald-600 text-white hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_var(--glow-50)]"
              >
                {isPlaying ? <Pause className="size-6 sm:size-7 fill-current" /> : <Play className="size-6 sm:size-7 fill-current ml-1" />}
              </button>

              <div className="flex items-center gap-3 sm:gap-4">
                <button aria-label={isMuted ? "Ativar som" : "Silenciar"} onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                  {isMuted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
                </button>
                <div className="relative group/volume w-24 sm:w-32 h-1.5 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={onVolumeChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white group-hover/volume:bg-emerald-400 transition-colors"
                      style={{ width: `${volumePercent}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs text-white/60 font-mono min-w-[32px] text-right">
                  {volumePercent}%
                </span>
              </div>

              <TimeDisplay currentTime={currentTime} duration={duration} />
            </div>

            <div className="flex items-center gap-2 sm:gap-5 ml-auto" data-player-no-toggle="true">
              {(previousEpisode || nextEpisode) && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    aria-label="Episódio anterior"
                    onClick={handlePreviousEpisodeNavigate}
                    disabled={!previousEpisode}
                    className="h-10 px-3 sm:px-4 flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 text-white/90 enabled:hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <SkipBack className="size-4" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-wide">Anterior</span>
                  </button>
                  <button
                    aria-label="Próximo episódio"
                    onClick={handleNextEpisodeNavigate}
                    disabled={!nextEpisode}
                    className="h-10 px-3 sm:px-4 flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 text-white/90 enabled:hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <SkipForward className="size-4" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-wide">Próximo</span>
                  </button>
                </div>
              )}

              <div className="relative">
                <button
                  ref={settingsButtonRef}
                  aria-label={isSettingsOpen ? "Fechar configurações do player" : "Abrir configurações do player"}
                  className={`size-10 flex items-center justify-center rounded-full transition-all ${isSettingsOpen ? "bg-emerald-600 text-white shadow-[0_0_15px_var(--glow-40)]" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                  onClick={handleSettingsToggle}
                  aria-expanded={isSettingsOpen}
                >
                  <Settings2 className="size-6" />
                </button>

                <AnimatePresence>
                  {isSettingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10, x: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10, x: 20 }}
                      ref={settingsPanelRef}
                      data-player-no-toggle="true"
                      className="absolute right-0 bottom-14 w-80 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 overflow-hidden pointer-events-auto"
                    >
                      <div className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-4">
                        Configurações do Player
                      </div>

                      <div className="space-y-4">
                        {streamOptions.length > 1 && (
                          <div>
                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter mb-2">
                              Qualidade da Transmissão
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                enableAutoQuality();
                              }}
                              className={`w-full rounded-lg py-2 mb-2 text-[11px] font-bold transition-all ${
                                autoFallbackEnabled
                                  ? "bg-emerald-600 text-white shadow-[0_0_10px_var(--glow-30)]"
                                  : "bg-white/5 text-white/60 hover:bg-white/10"
                              }`}
                            >
                              Automático
                            </button>
                            <div className="grid grid-cols-2 gap-1">
                              {streamOptions.map((option, idx) => (
                                <button
                                  key={`${option.id}:${option.label}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectStreamOption(idx, "manual");
                                  }}
                                  className={`rounded-lg py-2 px-2 text-[11px] font-bold transition-all ${
                                    activeOptionIndex === idx
                                      ? "bg-emerald-600 text-white shadow-[0_0_10px_var(--glow-30)]"
                                      : "bg-white/5 text-white/60 hover:bg-white/10"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                            <p className="mt-2 text-[10px] text-white/45">
                              {autoFallbackEnabled
                                ? "Ajuste automático conforme a rede."
                                : "Qualidade fixa selecionada."}
                            </p>
                          </div>
                        )}

                        <div>
                          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter mb-2">
                            Velocidade de Reprodução
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  changePlaybackRate(rate);
                                }}
                                className={`rounded-lg py-2 text-[11px] font-bold transition-all ${
                                  playbackRate === rate
                                    ? "bg-emerald-600 text-white shadow-[0_0_10px_var(--glow-30)]"
                                    : "bg-white/5 text-white/60 hover:bg-white/10"
                                }`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                aria-label="Alternar tela cheia"
                onClick={toggleFs}
                className="size-10 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <Maximize className="size-6" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {nextEpisodeVisible && !nextEpisodeDismissed && nextEpisode && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-28 sm:bottom-36 right-6 sm:right-10 z-50 w-72 sm:w-80"
            data-player-no-toggle="true"
          >
            <div className="rounded-2xl bg-zinc-900/95 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
              {nextEpisode.poster && (
                <div className="relative h-28 w-full overflow-hidden">
                  <SafeImage
                    src={nextEpisode.poster}
                    fallbackSrc={NEXT_EPISODE_POSTER_FALLBACK}
                    alt={nextEpisode.title}
                    fill
                    sizes="320px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 to-transparent" />
                </div>
              )}

              <div className="p-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  {nextEpisode.isSeasonTransition ? "Próxima Temporada" : "Próximo Episódio"}
                </span>
                <p className="mt-1 text-sm font-bold text-white leading-tight line-clamp-2">
                  {nextEpisode.title}
                </p>
                {nextEpisode.isSeasonTransition && nextEpisode.seasonNumber && (
                  <p className="mt-1 text-xs text-zinc-300 leading-snug">
                    Fim da temporada atual. Continuando na temporada {nextEpisode.seasonNumber}.
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={handleNextEpisodeNavigate}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-white text-black text-sm font-black transition-all hover:bg-white/90 active:scale-95"
                  >
                    <SkipForward className="size-4 fill-current" />
                    {nextEpisodeCountdown !== null
                      ? nextEpisode.isSeasonTransition && nextEpisode.seasonNumber
                        ? `Temporada ${nextEpisode.seasonNumber} em ${nextEpisodeCountdown}s`
                        : `Reproduzir em ${nextEpisodeCountdown}s`
                      : nextEpisode.isSeasonTransition
                        ? "Próxima temporada"
                        : "Próximo"}
                  </button>

                  <button
                    aria-label="Cancelar próximo episódio"
                    onClick={handleNextEpisodeDismiss}
                    className="size-10 flex items-center justify-center rounded-xl bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {nextEpisodeCountdown !== null && (
                  <div className="mt-3 w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full origin-left"
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: nextEpisodeCountdown / 10 }}
                      transition={{ duration: 0.9, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimeDisplay({ currentTime, duration }: TimeDisplayProps) {
  function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <span className="text-white/40 font-mono text-xs sm:text-sm tracking-tighter">
      <span className="text-white font-bold">{formatTime(currentTime)}</span>
      <span className="mx-1.5">/</span>
      {formatTime(duration)}
    </span>
  );
}
