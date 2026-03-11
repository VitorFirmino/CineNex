"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type Hls from "hls.js";
import { useRouter } from "next/navigation";
import { useAuth } from "@hooks/use-auth";
import { authApi } from "@infrastructure/api/auth-api";
import { getCatalogStreamOptions } from "@infrastructure/api/catalog-api";
import { usePlayerStore, type PlaybackRate } from "@store/player-store";
import { isAdaptiveStreamUrl } from "@shared/catalog/catalog-stream";
import type { StreamOption, VideoPlayerProps } from "../video-player.types";
import type {
  BrowserTimerId,
  HlsModule,
  IOSFullscreenVideo,
  NavigatorWithConnection,
  NetworkSnapshot,
  NextEpisodeCountdownParams,
  NextEpisodePromptParams,
  PlayVideoSafelyOptions,
  StreamOptionsCacheEntry,
  StreamOptionsRef,
  VendorFullscreenDocument,
  VendorFullscreenElement,
  VideoPlayRequestContext,
  VideoPlayerModuleLoaders,
  WebkitDecodedFrameVideo,
} from "./use-video-player.types";

const STREAM_OPTIONS_CACHE_TTL_MS = 30_000;
const streamOptionsCache = new Map<string, StreamOptionsCacheEntry>();
const streamOptionsInFlight = new Map<string, Promise<StreamOption[]>>();

export async function getStreamOptions(ref: StreamOptionsRef): Promise<StreamOption[]> {
  const cacheKey =
    ref.type === "series"
      ? `${ref.type}:${ref.slug}:${ref.episodeId}`
      : `${ref.type}:${ref.id}`;
  const now = Date.now();
  const cached = streamOptionsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.items;
  }

  const pending = streamOptionsInFlight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    const payload = await getCatalogStreamOptions(
      ref.type === "series"
        ? { type: "series", slug: ref.slug, episodeId: ref.episodeId }
        : { type: ref.type, id: ref.id },
    );
    const items = payload.items || [];
    streamOptionsCache.set(cacheKey, {
      items,
      expiresAt: Date.now() + STREAM_OPTIONS_CACHE_TTL_MS,
    });
    return items;
  })();

  streamOptionsInFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    streamOptionsInFlight.delete(cacheKey);
  }
}

export function resetStreamOptionsCacheForTests(): void {
  streamOptionsCache.clear();
  streamOptionsInFlight.clear();
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function shouldShowNextEpisodePrompt(params: NextEpisodePromptParams): boolean {
  if (!params.nextEpisode || params.nextEpisodeDismissed || params.duration <= 0) {
    return false;
  }

  const remaining = params.duration - params.currentTime;
  return remaining > 0 && remaining <= 30;
}

export function getNextEpisodeCountdownStart(
  params: NextEpisodeCountdownParams,
): number | null {
  if (
    !params.nextEpisode ||
    params.nextEpisodeDismissed ||
    params.hasNavigated ||
    params.duration <= 0
  ) {
    return null;
  }

  const remaining = params.duration - params.currentTime;
  if (remaining <= 0 || remaining > 10) {
    return null;
  }

  return Math.round(remaining);
}

function getDecodedFrameCount(video: HTMLVideoElement): number {
  let decodedFrames = 0;
  if (typeof video.getVideoPlaybackQuality === "function") {
    const quality = video.getVideoPlaybackQuality();
    if (quality && typeof quality.totalVideoFrames === "number") {
      decodedFrames = Math.max(decodedFrames, quality.totalVideoFrames);
    }
  }
  const webkitDecodedFrames = (video as WebkitDecodedFrameVideo).webkitDecodedFrameCount;
  if (typeof webkitDecodedFrames === "number") {
    decodedFrames = Math.max(decodedFrames, webkitDecodedFrames);
  }
  return decodedFrames;
}

function readNetworkSnapshot(): NetworkSnapshot {
  if (typeof navigator === "undefined") return {};
  const connection = (navigator as NavigatorWithConnection).connection;
  if (!connection) return {};
  return {
    effectiveType: typeof connection.effectiveType === "string" ? connection.effectiveType : undefined,
    downlink: typeof connection.downlink === "number" ? connection.downlink : undefined,
    rtt: typeof connection.rtt === "number" ? connection.rtt : undefined,
    saveData: Boolean(connection.saveData),
  };
}

const POOR_NETWORK_TYPES = new Set(["slow-2g", "2g", "3g"]);
const VERY_SLOW_TYPES = new Set(["slow-2g", "2g"]);
const SLOW_TYPE_PENALTY: Record<string, number> = {
  "slow-2g": 22000,
  "2g": 17000,
  "3g": 10000,
};

export function isLikelyPoorNetwork(snapshot: NetworkSnapshot): boolean {
  const type = snapshot.effectiveType || "";
  if (POOR_NETWORK_TYPES.has(type)) return true;
  if (typeof snapshot.downlink === "number" && snapshot.downlink > 0 && snapshot.downlink < 1.8) return true;
  if (typeof snapshot.rtt === "number" && snapshot.rtt > 700) return true;
  if (snapshot.saveData) return true;
  return false;
}

export function getStartupTimeoutMs(snapshot: NetworkSnapshot): number {
  const base = 18000;
  const rttFactor = Math.max(0, snapshot.rtt || 0) * 6;
  const slowTypePenalty = SLOW_TYPE_PENALTY[snapshot.effectiveType ?? ""] ?? 0;
  const saveDataPenalty = snapshot.saveData ? 6000 : 0;
  return Math.min(70000, Math.max(14000, base + rttFactor + slowTypePenalty + saveDataPenalty));
}

export function getBufferWindowMs(snapshot: NetworkSnapshot): number {
  if (VERY_SLOW_TYPES.has(snapshot.effectiveType ?? "")) return 32000;
  if (snapshot.effectiveType === "3g") return 26000;
  if (typeof snapshot.rtt === "number" && snapshot.rtt > 500) return 26000;
  return 22000;
}

function resolveMaxRank(type: string, downlink: number, rtt: number, saveData: boolean): number {
  if (saveData || VERY_SLOW_TYPES.has(type)) return 0;
  if (type === "3g" || (downlink > 0 && downlink < 2) || rtt > 700) return 1;
  if ((downlink > 0 && downlink < 4) || rtt > 450) return 2;
  return Number.POSITIVE_INFINITY;
}

export function getAutoPreferredOptionIndex(
  options: StreamOption[],
  snapshot: NetworkSnapshot,
): number | null {
  if (!options.length) return null;

  const type = snapshot.effectiveType || "";
  const downlink = snapshot.downlink || 0;
  const rtt = snapshot.rtt || 0;
  const maxRank = resolveMaxRank(type, downlink, rtt, snapshot.saveData ?? false);

  let preferred = -1;
  for (let i = options.length - 1; i >= 0; i--) {
    if ((options[i]?.rank || Number.POSITIVE_INFINITY) <= maxRank) {
      preferred = i;
      break;
    }
  }

  if (preferred >= 0) return preferred;
  return 0;
}

export async function shouldEnableAudioOnlyHlsRecovery(
  loadHlsModule: () => Promise<HlsModule> = loadHls,
): Promise<boolean> {
  const hlsModule = await loadHlsModule();
  return hlsModule.default.isSupported();
}

let _hlsPromise: Promise<HlsModule> | null = null;
let _hlsLoaderOverride: (() => Promise<HlsModule>) | null = null;
function loadHls() {
  if (_hlsLoaderOverride) return _hlsLoaderOverride();
  if (!_hlsPromise) _hlsPromise = import("hls.js") as Promise<HlsModule>;
  return _hlsPromise;
}

export function setVideoPlayerModuleLoadersForTests(
  loaders: VideoPlayerModuleLoaders,
): void {
  _hlsLoaderOverride = loaders.hls ?? null;
  _hlsPromise = null;
}

function logVideoPlayerError(context: string, error: unknown) {
  console.error(`[VideoPlayer] ${context}`, error);
}

function isExpectedPlayInterruption(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as { name?: unknown; message?: unknown };
  if (maybeError.name === "AbortError") {
    return true;
  }

  if (typeof maybeError.message !== "string") {
    return false;
  }

  return maybeError.message.includes("play() request was interrupted");
}

function isUnavailableSourceError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "NotSupportedError") {
    return true;
  }

  if (error instanceof Error && error.name === "NotSupportedError") {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as { name?: unknown; message?: unknown };
  if (maybeError.name === "NotSupportedError") {
    return true;
  }

  if (typeof maybeError.message !== "string") {
    return false;
  }

  return maybeError.message.toLowerCase().includes("no supported source");
}

function playVideoSafely(
  video: HTMLVideoElement,
  context: VideoPlayRequestContext,
  options?: PlayVideoSafelyOptions,
): void {
  video.play().catch((error) => {
    if (isExpectedPlayInterruption(error)) {
      return;
    }

    if (isUnavailableSourceError(error)) {
      options?.onSourceUnavailable?.();
      return;
    }

    if (context === "autoplay") {
      console.warn("[VideoPlayer] Autoplay blocked", error);
      return;
    }

    if (context === "hls-manifest") {
      logVideoPlayerError("Falha ao iniciar reproducao apos carregar manifesto HLS.", error);
      return;
    }

    if (context === "keyboard-shortcut") {
      logVideoPlayerError("Falha ao iniciar reproducao pelo atalho de teclado.", error);
      return;
    }

    logVideoPlayerError("Falha ao iniciar reproducao pelo controle principal.", error);
  });
}

function safeDestroyHls(instance: Hls | null) {
  if (!instance) return;
  try {
    instance.destroy();
  } catch (error) {
    logVideoPlayerError("Falha ao destruir instancia do HLS.", error);
  }
}

export function isFullscreenActive(doc: VendorFullscreenDocument, video: IOSFullscreenVideo | null): boolean {
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    video?.webkitDisplayingFullscreen,
  );
}

export function requestFullscreenCompat(
  container: HTMLElement,
  video: IOSFullscreenVideo | null,
): void {
  const target = container as VendorFullscreenElement;

  if (typeof target.requestFullscreen === "function") {
    target.requestFullscreen().catch((error) => {
      logVideoPlayerError("Falha ao entrar em tela cheia.", error);
    });
    return;
  }

  if (typeof target.webkitRequestFullscreen === "function") {
    target.webkitRequestFullscreen();
    return;
  }

  if (typeof target.webkitRequestFullScreen === "function") {
    target.webkitRequestFullScreen();
    return;
  }

  if (typeof target.mozRequestFullScreen === "function") {
    target.mozRequestFullScreen();
    return;
  }

  if (typeof target.msRequestFullscreen === "function") {
    target.msRequestFullscreen();
    return;
  }

  if (video && typeof video.webkitEnterFullscreen === "function") {
    video.webkitEnterFullscreen();
  }
}

export function exitFullscreenCompat(
  doc: VendorFullscreenDocument,
  video: IOSFullscreenVideo | null,
): void {
  if (typeof doc.exitFullscreen === "function") {
    doc.exitFullscreen().catch((error) => {
      logVideoPlayerError("Falha ao sair da tela cheia.", error);
    });
    return;
  }

  if (typeof doc.webkitExitFullscreen === "function") {
    doc.webkitExitFullscreen();
    return;
  }

  if (typeof doc.mozCancelFullScreen === "function") {
    doc.mozCancelFullScreen();
    return;
  }

  if (typeof doc.msExitFullscreen === "function") {
    doc.msExitFullscreen();
    return;
  }

  if (video && typeof video.webkitExitFullscreen === "function") {
    video.webkitExitFullscreen();
  }
}

export function useVideoPlayer({
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
  const router = useRouter();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const storedVolume = usePlayerStore((s) => s.volume);
  const storedMuted = usePlayerStore((s) => s.isMuted);
  const storedPlaybackRate = usePlayerStore((s) => s.playbackRate);

  const [isMuted, setIsMuted] = useState(storedMuted);
  const [volume, setVolume] = useState(storedVolume);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(storedPlaybackRate);
  const [activeStreamUrl, setActiveStreamUrl] = useState(url);
  const [streamOptions, setStreamOptions] = useState<StreamOption[]>([]);
  const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);
  const [autoFallbackEnabled, setAutoFallbackEnabled] = useState(true);
  const [forceHlsMode, setForceHlsMode] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState<number | null>(null);
  const [nextEpisodeDismissed, setNextEpisodeDismissed] = useState(false);

  const hideTimer = useRef<BrowserTimerId | null>(null);
  const loadingOverlayTimerRef = useRef<BrowserTimerId | null>(null);
  const isSettingsOpenRef = useRef(false);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const waitingEventsRef = useRef<number[]>([]);
  const lastAutoSwitchAtRef = useRef(0);
  const isPlayingRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const streamOptionsRef = useRef<StreamOption[]>([]);
  const activeOptionIndexRef = useRef<number | null>(null);
  const autoFallbackEnabledRef = useRef(true);
  const forceHlsModeRef = useRef(false);
  const hasPlaybackStartedRef = useRef(false);
  const networkSnapshotRef = useRef<NetworkSnapshot>({});
  const audioOnlyGuardTimerRef = useRef<BrowserTimerId | null>(null);
  const sourceUnavailableTimerRef = useRef<BrowserTimerId | null>(null);
  const nextEpisodeRef = useRef(nextEpisode);
  const nextEpisodeDismissedRef = useRef(false);
  const nextEpisodeCountdownIntervalRef = useRef<BrowserTimerId | null>(null);
  const hasNavigatedRef = useRef(false);
  const initialSeekDoneRef = useRef(false);
  const lastProgressSyncAtRef = useRef(0);
  const lastProgressPositionRef = useRef(0);

  const isHlsStream = forceHlsMode || isAdaptiveStreamUrl(activeStreamUrl) || isHls;
  const activeStreamOption =
    activeOptionIndex !== null ? (streamOptions[activeOptionIndex] || null) : null;
  const hasLowerAlternative =
    activeOptionIndex !== null &&
    activeStreamOption !== null &&
    streamOptions
      .slice(0, activeOptionIndex)
      .some((option) => option.rank < activeStreamOption.rank);
  const volumePercent = Math.round(volume * 100);
  const showPauseOverlay = hasPlaybackStarted && !isPlaying && !isLoading && !error && !timedOut;
  const showTimedOutWarning = timedOut && !isVideoPaused;
  const showPlayerAlert = (Boolean(error) || showTimedOutWarning) && !isAlertDismissed;
  const progressPercent =
    duration > 0
      ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
      : 0;
  const nextEpisodeVisible = shouldShowNextEpisodePrompt({
    nextEpisode,
    nextEpisodeDismissed,
    duration,
    currentTime,
  });

  const clearNextEpisodeCountdownTimer = useCallback(() => {
    if (nextEpisodeCountdownIntervalRef.current) {
      window.clearInterval(nextEpisodeCountdownIntervalRef.current);
      nextEpisodeCountdownIntervalRef.current = null;
    }
  }, []);

  const resetPlaybackForNewUrl = useCallback(() => {
    setCurrentTime(0);
    setDuration(0);
    initialSeekDoneRef.current = false;
    setNextEpisodeDismissed(false);
    nextEpisodeDismissedRef.current = false;
    setNextEpisodeCountdown(null);
    clearNextEpisodeCountdownTimer();
    hasNavigatedRef.current = false;
  }, [clearNextEpisodeCountdownTimer]);

  const resetStreamStateForUrl = useCallback((nextUrl: string) => {
    setActiveStreamUrl(nextUrl);
    setStreamOptions([]);
    streamOptionsRef.current = [];
    setActiveOptionIndex(null);
    activeOptionIndexRef.current = null;
    setAutoFallbackEnabled(true);
    autoFallbackEnabledRef.current = true;
    setForceHlsMode(false);
    forceHlsModeRef.current = false;
    setHasPlaybackStarted(false);
    hasPlaybackStartedRef.current = false;
    waitingEventsRef.current = [];
    lastAutoSwitchAtRef.current = 0;
  }, []);

  const resetPlaybackStateForSourceChange = useCallback(() => {
    setError(null);
    errorRef.current = null;
    setIsLoading(true);
    setIsPlaying(false);
    setIsVideoPaused(true);
    isPlayingRef.current = false;
    setHasPlaybackStarted(false);
    hasPlaybackStartedRef.current = false;
    setTimedOut(false);
    setIsSettingsOpen(false);
    setPlaybackRate(1);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const handleSourceUnavailable = useCallback(() => {
    const unavailableMessage = "A fonte de vídeo não pôde ser carregada.";
    if (sourceUnavailableTimerRef.current) {
      window.clearTimeout(sourceUnavailableTimerRef.current);
    }
    sourceUnavailableTimerRef.current = window.setTimeout(() => {
      sourceUnavailableTimerRef.current = null;
      setTimedOut(false);
      setIsLoading(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsVideoPaused(true);
      errorRef.current = unavailableMessage;
      setError(unavailableMessage);
    }, 0);
  }, []);

  useEffect(() => {
    isSettingsOpenRef.current = isSettingsOpen;
  }, [isSettingsOpen]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    if (error || showTimedOutWarning) {
      const timer = window.setTimeout(() => {
        setIsAlertDismissed(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [error, showTimedOutWarning]);

  useEffect(() => {
    streamOptionsRef.current = streamOptions;
  }, [streamOptions]);

  useEffect(() => {
    activeOptionIndexRef.current = activeOptionIndex;
  }, [activeOptionIndex]);

  useEffect(() => {
    autoFallbackEnabledRef.current = autoFallbackEnabled;
  }, [autoFallbackEnabled]);

  useEffect(() => {
    forceHlsModeRef.current = forceHlsMode;
  }, [forceHlsMode]);

  useEffect(() => {
    networkSnapshotRef.current = readNetworkSnapshot();
    if (typeof navigator === "undefined") return;
    const connection = (navigator as NavigatorWithConnection).connection;
    if (!connection?.addEventListener) return;
    const onChange = () => {
      networkSnapshotRef.current = readNetworkSnapshot();
    };
    connection.addEventListener("change", onChange);
    return () => {
      connection.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (isHlsStream) {
      loadHls().catch((error) => {
        logVideoPlayerError("Falha ao pre-carregar modulo HLS.", error);
      });
    }
  }, [isHlsStream]);

  useEffect(() => { nextEpisodeRef.current = nextEpisode || null; }, [nextEpisode]);
  useEffect(() => { nextEpisodeDismissedRef.current = nextEpisodeDismissed; }, [nextEpisodeDismissed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      resetPlaybackForNewUrl();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [url, resetPlaybackForNewUrl]);

  useEffect(() => {
    const clearCountdown = () => {
      clearNextEpisodeCountdownTimer();
      setNextEpisodeCountdown(null);
    };

    if (!nextEpisodeVisible) {
      clearCountdown();
      return;
    }

    const countdownStart = getNextEpisodeCountdownStart({
      nextEpisode,
      nextEpisodeDismissed,
      hasNavigated: hasNavigatedRef.current,
      duration,
      currentTime,
    });

    if (countdownStart === null) {
      clearCountdown();
      return;
    }

    if (!nextEpisodeCountdownIntervalRef.current) {
      window.setTimeout(() => {
        setNextEpisodeCountdown(countdownStart);
      }, 0);
      nextEpisodeCountdownIntervalRef.current = window.setInterval(() => {
        setNextEpisodeCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearNextEpisodeCountdownTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [
    currentTime,
    duration,
    nextEpisode,
    nextEpisodeDismissed,
    nextEpisodeVisible,
    clearNextEpisodeCountdownTimer,
  ]);

  useEffect(() => {
    if (nextEpisodeCountdown !== 0) return;
    if (!nextEpisodeRef.current) return;
    if (hasNavigatedRef.current || nextEpisodeDismissedRef.current) return;
    hasNavigatedRef.current = true;
    router.push(nextEpisodeRef.current.href);
  }, [nextEpisodeCountdown, router]);

  useEffect(() => {
    return () => {
      clearNextEpisodeCountdownTimer();
    };
  }, [clearNextEpisodeCountdownTimer]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (loadingOverlayTimerRef.current) window.clearTimeout(loadingOverlayTimerRef.current);
      if (audioOnlyGuardTimerRef.current) window.clearTimeout(audioOnlyGuardTimerRef.current);
      if (sourceUnavailableTimerRef.current) window.clearTimeout(sourceUnavailableTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (loadingOverlayTimerRef.current) window.clearTimeout(loadingOverlayTimerRef.current);

    if (isLoading && !error && !timedOut) {
      loadingOverlayTimerRef.current = window.setTimeout(() => {
        setShowLoadingOverlay(true);
      }, 350);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowLoadingOverlay(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoading, error, timedOut, hasPlaybackStarted]);

  const persistWatchProgress = useCallback(
    async (reason: "interval" | "pause" | "ended" | "hidden" | "pagehide") => {
      if (!user || !progressContext) return;
      const video = videoRef.current;
      if (!video || !hasPlaybackStartedRef.current) return;

      const positionSec = Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0;
      if (positionSec < 2) return;

      const now = Date.now();
      const shouldSkipByThrottle =
        reason === "interval" &&
        now - lastProgressSyncAtRef.current < 12_000 &&
        Math.abs(positionSec - lastProgressPositionRef.current) < 4;
      if (shouldSkipByThrottle) return;

      const durationRaw = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
      const completed = Boolean(durationRaw && durationRaw > 0 && positionSec >= durationRaw * 0.97 && positionSec >= 60);

      try {
        await authApi.saveWatchProgress(
          {
            contentType: progressContext.contentType,
            contentId: progressContext.contentId,
            episodeId: progressContext.episodeId || null,
            playHref: progressContext.playHref,
            positionSec,
            durationSec: durationRaw,
            completed,
            title: title || null,
            posterUrl: poster || null,
          },
          {
            keepalive: reason === "hidden" || reason === "pagehide",
          },
        );

        lastProgressSyncAtRef.current = now;
        lastProgressPositionRef.current = positionSec;
      } catch (error) {
        logVideoPlayerError("Falha ao persistir progresso de reproducao.", error);
      }
    },
    [poster, progressContext, title, user],
  );

  useEffect(() => {
    if (!user || !progressContext) return;

    const intervalId = window.setInterval(() => {
      void persistWatchProgress("interval");
    }, 15_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void persistWatchProgress("hidden");
      }
    };

    const onPageHide = () => {
      void persistWatchProgress("pagehide");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [persistWatchProgress, progressContext, user]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (isPlaying && !isSettingsOpenRef.current) setControlsVisible(false);
    }, 4000);
  }, [isPlaying]);

  const switchToLowerStream = useCallback((reason: "waiting" | "timeout" | "network"): boolean => {
      if (!autoFallbackEnabledRef.current) return false;
      const currentIndex = activeOptionIndexRef.current;
      const options = streamOptionsRef.current;
      if (currentIndex === null || currentIndex <= 0) return false;
      const currentOption = options[currentIndex];
      if (!currentOption) return false;

      let nextIndex = -1;
      for (let i = currentIndex - 1; i >= 0; i--) {
        if ((options[i]?.rank || currentOption.rank) < currentOption.rank) {
          nextIndex = i;
          break;
        }
      }
      if (nextIndex < 0 || !options[nextIndex]) return false;

      const now = Date.now();
      const cooldownMs = Math.max(
        5000,
        Math.min(14000, 6000 + (networkSnapshotRef.current.rtt || 0) * 2),
      );
      if (now - lastAutoSwitchAtRef.current < cooldownMs) return false;

      const nextOption = options[nextIndex];
      lastAutoSwitchAtRef.current = now;
      waitingEventsRef.current = [];

      activeOptionIndexRef.current = nextIndex;
      setActiveOptionIndex(nextIndex);
      setForceHlsMode(false);
      forceHlsModeRef.current = false;
      setActiveStreamUrl(nextOption.url);
      setTimedOut(false);
      setIsLoading(true);

      const byReason =
        reason === "timeout"
          ? "O stream demorou para iniciar."
          : reason === "network"
            ? "Instabilidade de rede detectada."
            : "Buffering frequente detectado.";
      const autoMessage = `${byReason} Ajustando para ${nextOption.label}.`;
      errorRef.current = autoMessage;
      setError(autoMessage);
      return true;
    }, []);

  const selectStreamOption = useCallback((nextIndex: number, mode: "manual" | "auto" = "manual") => {
      const options = streamOptionsRef.current;
      const nextOption = options[nextIndex];
      if (!nextOption) return;
      if (activeOptionIndexRef.current === nextIndex) return;

      activeOptionIndexRef.current = nextIndex;
      setActiveOptionIndex(nextIndex);
      const keepAuto = mode === "auto";
      setAutoFallbackEnabled(keepAuto);
      autoFallbackEnabledRef.current = keepAuto;
      setForceHlsMode(false);
      forceHlsModeRef.current = false;
      waitingEventsRef.current = [];
      lastAutoSwitchAtRef.current = Date.now();
      setTimedOut(false);
      errorRef.current = null;
      setError(null);
      setIsLoading(true);
      setActiveStreamUrl(nextOption.url);
    }, []);

  const enableAutoQuality = useCallback(() => {
      const options = streamOptionsRef.current;
      setAutoFallbackEnabled(true);
      autoFallbackEnabledRef.current = true;
      if (!options.length) return;

      const preferred = getAutoPreferredOptionIndex(options, networkSnapshotRef.current);
      if (preferred === null) return;
      if (preferred === activeOptionIndexRef.current) return;
      selectStreamOption(preferred, "auto");
    }, [selectStreamOption]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      resetStreamStateForUrl(url);
    }, 0);
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const parsed = new URL(url, window.location.origin);
        const type = parsed.searchParams.get("type");
        if (!type) return;

        let ref: StreamOptionsRef | null = null;
        if (type === "movies") {
          const id = parsed.searchParams.get("id");
          if (!id) return;
          ref = { type, id };
        } else if (type === "series") {
          const slug = parsed.searchParams.get("slug");
          const episodeId = parsed.searchParams.get("episodeId");
          if (!slug || !episodeId) return;
          ref = { type: "series", slug, episodeId };
        }

        if (!ref) return;

        const items = await getStreamOptions(ref);
        if (!items.length || cancelled) return;

        const currentIdx = items.findIndex((item) => item.isCurrent);
        const preferredIdx =
          autoFallbackEnabledRef.current
            ? getAutoPreferredOptionIndex(items, networkSnapshotRef.current)
            : null;
        const idx = preferredIdx ?? (currentIdx >= 0 ? currentIdx : null);

        setStreamOptions(items);
        streamOptionsRef.current = items;
        setActiveOptionIndex(idx);
        activeOptionIndexRef.current = idx;

        if (
          idx !== null &&
          currentIdx >= 0 &&
          idx !== currentIdx &&
          items[idx] &&
          autoFallbackEnabledRef.current
        ) {
          setForceHlsMode(false);
          forceHlsModeRef.current = false;
          waitingEventsRef.current = [];
          setTimedOut(false);
          setIsLoading(true);
          setActiveStreamUrl(items[idx].url);
        }
      } catch (error) {
        logVideoPlayerError("Falha ao carregar opcoes de stream para fallback automatico.", error);
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
      window.clearTimeout(resetTimer);
    };
  }, [url, resetStreamStateForUrl]);

  const initDirectPlay = useCallback((video: HTMLVideoElement, targetUrl: string) => {
    const { volume: savedVolume, isMuted: savedMuted } = usePlayerStore.getState();
    video.volume = savedVolume;
    video.muted = savedMuted;
    video.src = targetUrl;
    video.load();
    if (variant === "full") {
      playVideoSafely(video, "autoplay", {
        onSourceUnavailable: handleSourceUnavailable,
      });
    }
  }, [handleSourceUnavailable, variant]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      safeDestroyHls(hlsRef.current);
      hlsRef.current = null;
    }
    let mounted = true;
    const resetTimer = window.setTimeout(() => {
      if (mounted) {
        resetPlaybackStateForSourceChange();
      }
    }, 0);

    const syncVideoInfo = () => {
      if (!mounted) return;
      setPlaybackRate((video.playbackRate || 1) as PlaybackRate);
    };

    const markPlaybackStarted = () => {
      if (!mounted || hasPlaybackStartedRef.current) return;
      if (video.hasAttribute("poster")) video.removeAttribute("poster");
      setHasPlaybackStarted(true);
      hasPlaybackStartedRef.current = true;
      setTimedOut(false);
    };

    const clearAudioOnlyGuard = () => {
      if (audioOnlyGuardTimerRef.current) {
        window.clearTimeout(audioOnlyGuardTimerRef.current);
        audioOnlyGuardTimerRef.current = null;
      }
    };
    const scheduleAudioOnlyGuard = () => {
      clearAudioOnlyGuard();
      audioOnlyGuardTimerRef.current = window.setTimeout(async () => {
        if (!mounted) return;
        if (!isPlayingRef.current || video.paused) return;
        if (video.currentTime < 1.5) return;
        const decodedFrames = getDecodedFrameCount(video);
        if (decodedFrames > 0) return;

        if (!forceHlsModeRef.current) {
          try {
            const canEnableHlsRecovery = await shouldEnableAudioOnlyHlsRecovery();
            if (!mounted) return;
            if (canEnableHlsRecovery) {
              const compatibilityMessage = "Compatibilidade automática ativada para restaurar o vídeo.";
              errorRef.current = compatibilityMessage;
              setError(compatibilityMessage);
              setForceHlsMode(true);
              forceHlsModeRef.current = true;
              setTimedOut(false);
              setIsLoading(true);
              return;
            }
          } catch (error) {
            logVideoPlayerError("Falha ao carregar HLS dinamicamente para compatibilidade automatica.", error);
          }
        }

        const switched = switchToLowerStream("network");
        if (switched) return;

        const missingVideoMessage = "Stream com áudio sem vídeo detectado. Tente outra fonte.";
        video.pause();
        setIsPlaying(false);
        isPlayingRef.current = false;
        setIsVideoPaused(true);
        errorRef.current = missingVideoMessage;
        setError(missingVideoMessage);
      }, 6000);
    };

    const onPlaying = () => {
      if (mounted) {
        markPlaybackStarted();
        setIsPlaying(true);
        setIsVideoPaused(false);
        isPlayingRef.current = true;
        setTimedOut(false);
        setIsLoading(false);
        syncVideoInfo();
        scheduleAudioOnlyGuard();
      }
    };
    const onPause   = () => {
      if (mounted) {
        clearAudioOnlyGuard();
        setIsPlaying(false);
        setIsVideoPaused(true);
        isPlayingRef.current = false;
        setTimedOut(false);
        waitingEventsRef.current = [];
        void persistWatchProgress("pause");
      }
    };
    const onWaiting = () => {
      if (!mounted) return;
      if (!hasPlaybackStartedRef.current) {
        setIsLoading(true);
      }
      if (!hasPlaybackStartedRef.current) return;
      if (!isPlayingRef.current) return;
      if (video.currentTime < 10) return;
      if (video.paused || document.hidden) return;

      const networkSnapshot = networkSnapshotRef.current;
      const poorNetwork = isLikelyPoorNetwork(networkSnapshot);
      const baseWindowMs = getBufferWindowMs(networkSnapshot);
      const bufferWindowMs = baseWindowMs;
      const triggerCount = poorNetwork ? 3 : 6;

      const now = Date.now();
      waitingEventsRef.current = waitingEventsRef.current.filter((ts) => now - ts < bufferWindowMs);
      waitingEventsRef.current.push(now);
      if (waitingEventsRef.current.length >= triggerCount) {
        switchToLowerStream("waiting");
      }
    };
    const onCanPlay = () => {
      if (mounted) {
        setIsLoading(false);
        syncVideoInfo();
        if (getDecodedFrameCount(video) > 0) {
          clearAudioOnlyGuard();
        }
      }
    };
    const onTimeUpdate = () => {
      if (!mounted) return;
      setCurrentTime(video.currentTime);
      if (video.currentTime > 0.05) {
        markPlaybackStarted();
      }
      if (getDecodedFrameCount(video) > 0) {
        clearAudioOnlyGuard();
      }
    };
    const onDurationChange = () => { if (mounted) setDuration(video.duration); };
    const onLoadedMetadata = () => {
      syncVideoInfo();
      if (
        !initialSeekDoneRef.current &&
        typeof initialPositionSec === "number" &&
        initialPositionSec > 5 &&
        Number.isFinite(video.duration) &&
        video.duration > 0 &&
        initialPositionSec < video.duration - 5
      ) {
        video.currentTime = initialPositionSec;
        setCurrentTime(initialPositionSec);
        initialSeekDoneRef.current = true;
      }
      if (getDecodedFrameCount(video) > 0) {
        clearAudioOnlyGuard();
      }
    };
    const onRateChange = () => { if (mounted) setPlaybackRate((video.playbackRate || 1) as PlaybackRate); };

    const onVideoError = () => {
      if (mounted) {
        const err = video.error;
        if (err?.code === 4) {
          if (!forceHlsModeRef.current) {
            void loadHls()
              .then((hlsModule) => {
                if (!mounted) return;
                const HlsCtor = hlsModule.default;
                if (HlsCtor.isSupported() && !forceHlsModeRef.current) {
                  setForceHlsMode(true);
                  forceHlsModeRef.current = true;
                  setTimedOut(false);
                  setIsLoading(true);
                  errorRef.current = null;
                  setError(null);
                  return;
                }
                const switched = switchToLowerStream("network");
                if (switched) return;
                const errorMessage = "Erro 4: Formato não suportado pelo navegador";
                errorRef.current = errorMessage;
                setError(errorMessage);
              })
              .catch((error: unknown) => {
                logVideoPlayerError("Falha ao carregar HLS apos erro nativo de video.", error);
                if (!mounted) return;
                const switched = switchToLowerStream("network");
                if (switched) return;
                const errorMessage = "Erro 4: Formato não suportado pelo navegador";
                errorRef.current = errorMessage;
                setError(errorMessage);
              });
            return;
          }

          const switched = switchToLowerStream("network");
          if (switched) return;
        }

        let msg = "Erro desconhecido";
        if (err?.code === 1) msg = "Abordado pelo usuário";
        if (err?.code === 2) msg = "Erro de rede";
        if (err?.code === 3) msg = "Erro de decodificação";
        if (err?.code === 4) msg = "Formato não suportado pelo navegador";
        console.warn("[VideoPlayer] Native video error:", err?.code, err?.message);
        const errorMessage = `Erro ${err?.code || ""}: ${msg}`;
        errorRef.current = errorMessage;
        setError(errorMessage);
      }
    };

    const onEnded = () => {
      void persistWatchProgress("ended");
      if (mounted && nextEpisodeRef.current && !hasNavigatedRef.current && !nextEpisodeDismissedRef.current) {
        hasNavigatedRef.current = true;
        router.push(nextEpisodeRef.current.href);
      }
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause",   onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ratechange", onRateChange);
    video.addEventListener("error", onVideoError);
    video.addEventListener("ended", onEnded);

    const startupTimeoutMs = getStartupTimeoutMs(networkSnapshotRef.current);
    const timeoutTimer = window.setTimeout(() => {
      if (!mounted || hasPlaybackStartedRef.current || isPlayingRef.current || errorRef.current) return;
      if (video.paused || document.hidden) return;
      const switched = switchToLowerStream("timeout");
      if (switched) return;

      if (isLikelyPoorNetwork(networkSnapshotRef.current)) {
        setTimedOut(true);
      } else {
        const timeoutMessage = "A fonte de vídeo demorou a responder.";
        errorRef.current = timeoutMessage;
        setError(timeoutMessage);
      }
    }, startupTimeoutMs);

    if (isHlsStream) {
      void loadHls()
        .then((hlsModule) => {
          if (!mounted) return;
          const HlsCtor = hlsModule.default;
          if (!HlsCtor.isSupported()) {
            initDirectPlay(video, activeStreamUrl);
            return;
          }

          const hls = new HlsCtor({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 15,
            maxMaxBufferLength: 30,
            startLevel: -1,
            abrEwmaDefaultEstimate: 8_000_000,
            manifestLoadPolicy: {
              default: {
                maxTimeToFirstByteMs: 10_000,
                maxLoadTimeMs: 10_000,
                timeoutRetry: { maxNumRetry: 3, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
                errorRetry: { maxNumRetry: 3, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
              },
            },
            playlistLoadPolicy: {
              default: {
                maxTimeToFirstByteMs: 10_000,
                maxLoadTimeMs: 10_000,
                timeoutRetry: { maxNumRetry: 3, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
                errorRetry: { maxNumRetry: 3, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
              },
            },
            fragLoadPolicy: {
              default: {
                maxTimeToFirstByteMs: 20_000,
                maxLoadTimeMs: 20_000,
                timeoutRetry: { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
                errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
              },
            },
          });
          hlsRef.current = hls;
          hls.attachMedia(video);
          hls.on(HlsCtor.Events.MEDIA_ATTACHED, () => hls.loadSource(activeStreamUrl));
          hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
            if (mounted) {
              if (variant === "full") {
                playVideoSafely(video, "hls-manifest", {
                  onSourceUnavailable: handleSourceUnavailable,
                });
              }
            }
          });
          hls.on(HlsCtor.Events.ERROR, (_, data) => {
            if (!mounted) return;
            if (data.fatal) {
              console.warn("[VideoPlayer] HLS fatal error:", data.details);
              const details = String(data.details || "").toLowerCase();
              const hasManifestParsingFailure =
                details.includes("manifestparsingerror") ||
                details.includes("manifestincompatiblecodecs");
              if (data.type === HlsCtor.ErrorTypes.NETWORK_ERROR) {
                if (hasManifestParsingFailure) {
                  safeDestroyHls(hls);
                  initDirectPlay(video, activeStreamUrl);
                  return;
                }
                const switched = switchToLowerStream("network");
                if (!switched) hls.startLoad();
              } else if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
              } else {
                safeDestroyHls(hls);
                initDirectPlay(video, activeStreamUrl);
              }
            }
          });
        })
        .catch((error: unknown) => {
          logVideoPlayerError("Falha ao carregar modulo HLS para reproducao.", error);
          if (!mounted) return;
          initDirectPlay(video, activeStreamUrl);
        });
    } else {
      initDirectPlay(video, activeStreamUrl);
    }

    return () => {
      mounted = false;
      window.clearTimeout(resetTimer);
      clearAudioOnlyGuard();
      window.clearTimeout(timeoutTimer);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause",   onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ratechange", onRateChange);
      video.removeEventListener("error", onVideoError);
      video.removeEventListener("ended", onEnded);
      if (hlsRef.current) {
        safeDestroyHls(hlsRef.current);
        hlsRef.current = null;
      }
    };
  }, [
    activeStreamUrl,
    retryKey,
    isHlsStream,
    variant,
    initDirectPlay,
    switchToLowerStream,
    persistWatchProgress,
    initialPositionSec,
    router,
    handleSourceUnavailable,
    resetPlaybackStateForSourceChange,
  ]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!isSettingsOpen) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (settingsPanelRef.current?.contains(target)) return;
      if (settingsButtonRef.current?.contains(target)) return;
      setIsSettingsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isSettingsOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        !!target &&
        (target.isContentEditable ||
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT");
      if (isEditable) return;

      if (event.key === "Escape" && isSettingsOpenRef.current) {
        setIsSettingsOpen(false);
        return;
      }

      if (event.key === " " || event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (video.paused) {
          playVideoSafely(video, "keyboard-shortcut", {
            onSourceUnavailable: handleSourceUnavailable,
          });
        } else {
          video.pause();
        }
        showControls();
        return;
      }

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        video.muted = !video.muted;
        setIsMuted(video.muted);
        if (!video.muted && video.volume === 0) {
          video.volume = 0.5;
          setVolume(0.5);
          usePlayerStore.getState().applyVolumeChange(0.5);
        } else {
          const vol = video.muted ? 0 : video.volume;
          setVolume(vol);
          usePlayerStore.getState().setIsMuted(video.muted);
          usePlayerStore.getState().setVolume(vol);
        }
        showControls();
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        const container = containerRef.current;
        const video = videoRef.current as IOSFullscreenVideo | null;
        if (!container) return;
        const fullscreenDoc = document as VendorFullscreenDocument;
        if (isFullscreenActive(fullscreenDoc, video)) {
          exitFullscreenCompat(fullscreenDoc, video);
        } else {
          requestFullscreenCompat(container, video);
        }
        showControls();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        video.muted = false;
        const next = Math.min(1, video.volume + 0.05);
        video.volume = next;
        setVolume(next);
        setIsMuted(false);
        usePlayerStore.getState().applyVolumeChange(next);
        showControls();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = Math.max(0, video.volume - 0.05);
        video.volume = next;
        video.muted = next === 0;
        setVolume(next);
        setIsMuted(next === 0);
        usePlayerStore.getState().applyVolumeChange(next);
        showControls();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const next = Math.max(0, video.currentTime - 5);
        video.currentTime = next;
        setCurrentTime(next);
        showControls();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = Math.min(video.duration || 0, video.currentTime + 5);
        video.currentTime = next;
        setCurrentTime(next);
        showControls();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSourceUnavailable, showControls]);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      playVideoSafely(v, "main-control", {
        onSourceUnavailable: handleSourceUnavailable,
      });
    } else {
      v.pause();
    }
  }, [handleSourceUnavailable]);

  const onSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const time = parseFloat(e.target.value);
    v.currentTime = time;
    setCurrentTime(time);
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    const safeRate = rate as PlaybackRate;
    setPlaybackRate(safeRate);
    usePlayerStore.getState().setPlaybackRate(safeRate);
  }, []);

  const onVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
    usePlayerStore.getState().applyVolumeChange(val);
  }, []);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
    const nextVolume = v.muted ? 0 : (v.volume || 1);
    setVolume(nextVolume);
    usePlayerStore.getState().setIsMuted(v.muted);
    usePlayerStore.getState().setVolume(nextVolume);
  }, []);

  const toggleFs = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const container = containerRef.current;
    const video = videoRef.current as IOSFullscreenVideo | null;
    if (!container) return;
    const fullscreenDoc = document as VendorFullscreenDocument;
    if (isFullscreenActive(fullscreenDoc, video)) {
      exitFullscreenCompat(fullscreenDoc, video);
    } else {
      requestFullscreenCompat(container, video);
    }
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    showControls();
    const target = e.target as HTMLElement;
    if (target.closest("[data-player-no-toggle='true']")) return;
    togglePlay();
  }, [showControls, togglePlay]);

  const handleRetry = useCallback(() => {
    setTimedOut(false);
    errorRef.current = null;
    setError(null);
    setRetryKey((k) => k + 1);
  }, []);

  const handleDismissAlert = useCallback(() => {
    setIsAlertDismissed(true);
  }, []);

  const handleNextEpisodeDismiss = useCallback(() => {
    setNextEpisodeDismissed(true);
    nextEpisodeDismissedRef.current = true;
    if (nextEpisodeCountdownIntervalRef.current) {
      window.clearInterval(nextEpisodeCountdownIntervalRef.current);
      nextEpisodeCountdownIntervalRef.current = null;
    }
  }, []);

  const handleNextEpisodeNavigate = useCallback(() => {
    if (!nextEpisodeRef.current) return;
    hasNavigatedRef.current = true;
    router.push(nextEpisodeRef.current.href);
  }, [router]);

  const handlePreviousEpisodeNavigate = useCallback(() => {
    if (!previousEpisode) return;
    hasNavigatedRef.current = true;
    router.push(previousEpisode.href);
  }, [previousEpisode, router]);

  const handleBack = useCallback(() => {
    if (backHref && backHref.trim().length > 0) {
      router.push(backHref);
      return;
    }
    router.back();
  }, [backHref, router]);

  const handleSettingsToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettingsOpen((prev) => !prev);
    showControls();
  }, [showControls]);

  return {
    videoRef,
    containerRef,
    settingsPanelRef,
    settingsButtonRef,
    isPlaying,
    isLoading,
    showLoadingOverlay,
    isMuted,
    volume,
    currentTime,
    duration,
    error,
    timedOut,
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
  };
}
