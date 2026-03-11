import React from "react";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exitFullscreenCompat,
  formatTime,
  getNextEpisodeCountdownStart,
  getAutoPreferredOptionIndex,
  getBufferWindowMs,
  getStartupTimeoutMs,
  getStreamOptions,
  isLikelyPoorNetwork,
  isFullscreenActive,
  requestFullscreenCompat,
  resetStreamOptionsCacheForTests,
  setVideoPlayerModuleLoadersForTests,
  shouldShowNextEpisodePrompt,
  shouldEnableAudioOnlyHlsRecovery,
  useVideoPlayer,
} from "./use-video-player";
import type { StreamOption, VideoPlayerProps } from "../video-player.types";

const {
  getCatalogStreamOptionsMock,
  pushMock,
  backMock,
  authState,
  saveWatchProgressMock,
  hlsSupportState,
  hlsInstances,
  HlsCtorMock,
} = vi.hoisted(() => {
  const getCatalogStreamOptionsMock = vi.fn();
  const pushMock = vi.fn();
  const backMock = vi.fn();
  const authState = {
    user: null as { id: string } | null,
  };
  const saveWatchProgressMock = vi.fn();
  const hlsSupportState = {
    value: true,
  };
  const hlsInstances = [] as Array<{
    config: Record<string, unknown>;
    handlers: Map<string, (...args: unknown[]) => void>;
    attachMedia: ReturnType<typeof vi.fn>;
    loadSource: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    startLoad: ReturnType<typeof vi.fn>;
    recoverMediaError: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }>;
  class FakeHls {
    static Events = {
      MEDIA_ATTACHED: "MEDIA_ATTACHED",
      MANIFEST_PARSED: "MANIFEST_PARSED",
      ERROR: "ERROR",
    };
    static ErrorTypes = {
      NETWORK_ERROR: "networkError",
      MEDIA_ERROR: "mediaError",
      OTHER_ERROR: "otherError",
    };
    static isSupported = vi.fn(() => hlsSupportState.value);

    config: Record<string, unknown>;
    handlers = new Map<string, (...args: unknown[]) => void>();
    attachMedia = vi.fn();
    loadSource = vi.fn();
    on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      this.handlers.set(event, handler);
    });
    startLoad = vi.fn();
    recoverMediaError = vi.fn();
    destroy = vi.fn();

    constructor(config: Record<string, unknown>) {
      this.config = config;
      hlsInstances.push(this);
    }
  }

  return {
    getCatalogStreamOptionsMock,
    pushMock,
    backMock,
    authState,
    saveWatchProgressMock,
    hlsSupportState,
    hlsInstances,
    HlsCtorMock: FakeHls,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
  }),
}));

vi.mock("@hooks/use-auth", () => ({
  useAuth: () => ({
    user: authState.user,
  }),
}));

vi.mock("@infrastructure/api/catalog-api", () => ({
  getCatalogStreamOptions: getCatalogStreamOptionsMock,
}));

vi.mock("@infrastructure/api/auth-api", () => ({
  authApi: {
    saveWatchProgress: saveWatchProgressMock,
  },
}));

import { usePlayerStore } from "@store/player-store";

let latestPlayer: ReturnType<typeof useVideoPlayer> | null = null;

function PlayerHarness(props: VideoPlayerProps) {
  const player = useVideoPlayer(props);

  React.useLayoutEffect(() => {
    latestPlayer = player;
  }, [player]);

  return React.createElement(
    "div",
    { ref: player.containerRef },
    React.createElement("button", { ref: player.settingsButtonRef, type: "button" }),
    React.createElement("div", { ref: player.settingsPanelRef }),
    React.createElement("video", { ref: player.videoRef, poster: props.poster ?? "" }),
  );
}

function getLatestPlayer() {
  if (!latestPlayer) {
    throw new Error("Player hook not mounted");
  }
  return latestPlayer;
}

async function flushPlayerEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setupVideoElement(
  video: HTMLVideoElement,
  overrides?: Partial<{
    paused: boolean;
    currentTime: number;
    duration: number;
    playbackRate: number;
    volume: number;
    muted: boolean;
    decodedFrames: number;
  }>,
) {
  const state = {
    paused: overrides?.paused ?? true,
    currentTime: overrides?.currentTime ?? 0,
    duration: overrides?.duration ?? 0,
    playbackRate: overrides?.playbackRate ?? 1,
    volume: overrides?.volume ?? 1,
    muted: overrides?.muted ?? false,
  };

  Object.defineProperty(video, "paused", {
    configurable: true,
    get: () => state.paused,
    set: (value: boolean) => {
      state.paused = value;
    },
  });
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => state.currentTime,
    set: (value: number) => {
      state.currentTime = value;
    },
  });
  Object.defineProperty(video, "duration", {
    configurable: true,
    get: () => state.duration,
    set: (value: number) => {
      state.duration = value;
    },
  });
  Object.defineProperty(video, "playbackRate", {
    configurable: true,
    get: () => state.playbackRate,
    set: (value: number) => {
      state.playbackRate = value;
    },
  });
  Object.defineProperty(video, "volume", {
    configurable: true,
    get: () => state.volume,
    set: (value: number) => {
      state.volume = value;
    },
  });
  Object.defineProperty(video, "muted", {
    configurable: true,
    get: () => state.muted,
    set: (value: boolean) => {
      state.muted = value;
    },
  });

  Object.defineProperty(video, "play", {
    configurable: true,
    value: vi.fn().mockImplementation(() => {
      state.paused = false;
      return Promise.resolve();
    }),
  });
  Object.defineProperty(video, "pause", {
    configurable: true,
    value: vi.fn().mockImplementation(() => {
      state.paused = true;
    }),
  });
  Object.defineProperty(video, "load", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(video, "getVideoPlaybackQuality", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      totalVideoFrames: overrides?.decodedFrames ?? 0,
    }),
  });

  return state;
}

const streamOptions: StreamOption[] = [
  {
    id: "low",
    url: "https://example.com/low-stream",
    quality: "SD",
    label: "360p",
    rank: 0,
    isCurrent: false,
  },
  {
    id: "mid",
    url: "https://example.com/mid-stream",
    quality: "HD",
    label: "720p",
    rank: 1,
    isCurrent: false,
  },
  {
    id: "high",
    url: "https://example.com/high-stream",
    quality: "FHD",
    label: "1080p",
    rank: 2,
    isCurrent: true,
  },
];

describe("use-video-player helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStreamOptionsCacheForTests();
    authState.user = null;
    latestPlayer = null;
    hlsSupportState.value = true;
    hlsInstances.length = 0;
    setVideoPlayerModuleLoadersForTests({
      hls: async () => ({ default: HlsCtorMock as never }),
    });
    usePlayerStore.setState({
      volume: 1,
      isMuted: false,
      playbackRate: 1,
    });
  });

  it("should format times consistently", () => {
    expect(formatTime(NaN)).toBe("00:00");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(3665)).toBe("1:01:05");
  });

  it("should detect poor network conditions", () => {
    expect(isLikelyPoorNetwork({ effectiveType: "3g" })).toBe(true);
    expect(isLikelyPoorNetwork({ downlink: 1.2 })).toBe(true);
    expect(isLikelyPoorNetwork({ rtt: 900 })).toBe(true);
    expect(isLikelyPoorNetwork({ saveData: true })).toBe(true);
    expect(isLikelyPoorNetwork({ effectiveType: "4g", downlink: 10, rtt: 80 })).toBe(false);
  });

  it("should scale startup timeout by network quality", () => {
    expect(
      getStartupTimeoutMs({ effectiveType: "4g", rtt: 50 }),
    ).toBeGreaterThanOrEqual(18_000);
    expect(
      getStartupTimeoutMs({ effectiveType: "2g", rtt: 800, saveData: true }),
    ).toBeGreaterThan(18_000);
  });

  it("should widen the buffer window on poor connections", () => {
    expect(getBufferWindowMs({ effectiveType: "2g" })).toBe(32_000);
    expect(getBufferWindowMs({ effectiveType: "3g" })).toBe(26_000);
    expect(getBufferWindowMs({ effectiveType: "4g", rtt: 100 })).toBe(22_000);
  });

  it("should pick the safest stream option for slow networks", () => {
    expect(
      getAutoPreferredOptionIndex(streamOptions, {
        effectiveType: "2g",
      }),
    ).toBe(0);
    expect(
      getAutoPreferredOptionIndex(streamOptions, {
        effectiveType: "3g",
        downlink: 1.5,
      }),
    ).toBe(1);
    expect(
      getAutoPreferredOptionIndex(streamOptions, {
        effectiveType: "4g",
        downlink: 10,
        rtt: 80,
      }),
    ).toBe(2);
  });

  it("should cache and dedupe in-flight stream option requests", async () => {
    type StreamOptionsResponse = { items: StreamOption[] };
    let resolveRequest: ((value: StreamOptionsResponse) => void) | undefined;
    getCatalogStreamOptionsMock.mockImplementation(
      () =>
        new Promise<StreamOptionsResponse>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const first = getStreamOptions({ type: "movies", id: "movie-1" });
    const second = getStreamOptions({ type: "movies", id: "movie-1" });

    expect(resolveRequest).toBeDefined();
    resolveRequest?.({ items: streamOptions });

    await expect(first).resolves.toEqual(streamOptions);
    await expect(second).resolves.toEqual(streamOptions);
    expect(getCatalogStreamOptionsMock).toHaveBeenCalledTimes(1);

    await expect(getStreamOptions({ type: "movies", id: "movie-1" })).resolves.toEqual(
      streamOptions,
    );
    expect(getCatalogStreamOptionsMock).toHaveBeenCalledTimes(1);
  });

  it("should detect when hls recovery is available for audio-only playback", async () => {
    await expect(
      shouldEnableAudioOnlyHlsRecovery(async () => ({
        default: {
          isSupported: () => true,
        } as never,
      })),
    ).resolves.toBe(true);

    await expect(
      shouldEnableAudioOnlyHlsRecovery(async () => ({
        default: {
          isSupported: () => false,
        } as never,
      })),
    ).resolves.toBe(false);
  });

  it("should compute when the next episode prompt should be visible", () => {
    expect(
      shouldShowNextEpisodePrompt({
        nextEpisode: {
          id: "ep-2",
          title: "Episode 2",
          href: "/play/series/show/ep-2",
        },
        nextEpisodeDismissed: false,
        duration: 100,
        currentTime: 75,
      }),
    ).toBe(true);

    expect(
      shouldShowNextEpisodePrompt({
        nextEpisode: {
          id: "ep-2",
          title: "Episode 2",
          href: "/play/series/show/ep-2",
        },
        nextEpisodeDismissed: true,
        duration: 100,
        currentTime: 95,
      }),
    ).toBe(false);

    expect(
      shouldShowNextEpisodePrompt({
        nextEpisode: null,
        nextEpisodeDismissed: false,
        duration: 100,
        currentTime: 95,
      }),
    ).toBe(false);
  });

  it("should compute when the next episode countdown should start", () => {
    expect(
      getNextEpisodeCountdownStart({
        nextEpisode: {
          id: "ep-2",
          title: "Episode 2",
          href: "/play/series/show/ep-2",
        },
        nextEpisodeDismissed: false,
        hasNavigated: false,
        duration: 100,
        currentTime: 94.6,
      }),
    ).toBe(5);

    expect(
      getNextEpisodeCountdownStart({
        nextEpisode: {
          id: "ep-2",
          title: "Episode 2",
          href: "/play/series/show/ep-2",
        },
        nextEpisodeDismissed: false,
        hasNavigated: true,
        duration: 100,
        currentTime: 95,
      }),
    ).toBeNull();

    expect(
      getNextEpisodeCountdownStart({
        nextEpisode: {
          id: "ep-2",
          title: "Episode 2",
          href: "/play/series/show/ep-2",
        },
        nextEpisodeDismissed: false,
        hasNavigated: false,
        duration: 100,
        currentTime: 80,
      }),
    ).toBeNull();
  });

  it("should use fullscreen compatibility helpers across vendor implementations", async () => {
    const standardTarget = {
      requestFullscreen: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLElement;
    const standardDoc = {
      fullscreenElement: standardTarget,
      exitFullscreen: vi.fn().mockResolvedValue(undefined),
    } as unknown as Document;

    requestFullscreenCompat(standardTarget, null);
    await Promise.resolve();
    expect((standardTarget as HTMLElement & { requestFullscreen: ReturnType<typeof vi.fn> }).requestFullscreen).toHaveBeenCalledTimes(1);
    expect(isFullscreenActive(standardDoc as never, null)).toBe(true);

    exitFullscreenCompat(standardDoc as never, null);
    await Promise.resolve();
    expect((standardDoc as Document & { exitFullscreen: ReturnType<typeof vi.fn> }).exitFullscreen).toHaveBeenCalledTimes(1);

    const webkitTarget = {
      webkitRequestFullscreen: vi.fn(),
    } as unknown as HTMLElement;
    const iosVideo = {
      webkitEnterFullscreen: vi.fn(),
      webkitExitFullscreen: vi.fn(),
      webkitDisplayingFullscreen: true,
    } as unknown as HTMLVideoElement;
    const webkitDoc = {
      webkitExitFullscreen: vi.fn(),
    } as unknown as Document;

    requestFullscreenCompat(webkitTarget, iosVideo as never);
    expect(
      (webkitTarget as HTMLElement & { webkitRequestFullscreen: ReturnType<typeof vi.fn> }).webkitRequestFullscreen,
    ).toHaveBeenCalledTimes(1);
    expect(isFullscreenActive({} as never, iosVideo as never)).toBe(true);

    exitFullscreenCompat(webkitDoc as never, iosVideo as never);
    expect(
      (webkitDoc as Document & { webkitExitFullscreen: ReturnType<typeof vi.fn> }).webkitExitFullscreen,
    ).toHaveBeenCalledTimes(1);
  });

  it("should toggle the settings panel from the public callback", () => {
    const { result } = renderHook(() =>
      useVideoPlayer({
        url: "https://stream.example.com/video.mp4",
      }),
    );

    act(() => {
      result.current.handleSettingsToggle({
        stopPropagation: vi.fn(),
      } as never);
    });

    expect(result.current.isSettingsOpen).toBe(true);

    act(() => {
      result.current.handleSettingsToggle({
        stopPropagation: vi.fn(),
      } as never);
    });

    expect(result.current.isSettingsOpen).toBe(false);
  });

  it("should control playback, seek, volume and fullscreen through the public callbacks", async () => {
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);

    const fakeVideo = document.createElement("video");
    const videoState = setupVideoElement(fakeVideo, {
      paused: true,
      currentTime: 12,
      duration: 120,
      playbackRate: 1,
      volume: 0.8,
      muted: false,
    });
    const playMock = vi.mocked(fakeVideo.play).mockImplementation(() => {
      videoState.paused = false;
      return Promise.resolve();
    });
    const pauseMock = vi.mocked(fakeVideo.pause).mockImplementation(() => {
      videoState.paused = true;
    });

    const container = document.createElement("div");
    Object.defineProperty(container, "requestFullscreen", {
      configurable: true,
      value: requestFullscreenMock,
    });

    const { result } = renderHook(() =>
      useVideoPlayer({
        url: "https://stream.example.com/video.mp4",
      }),
    );

    act(() => {
      result.current.videoRef.current = fakeVideo;
      result.current.containerRef.current = container;
    });

    await act(async () => {
      result.current.togglePlay();
    });
    act(() => {
      videoState.paused = false;
      result.current.togglePlay();
      result.current.onSeek({
        target: { value: "33" },
      } as never);
      result.current.changePlaybackRate(1.5);
      result.current.onVolumeChange({
        target: { value: "0.3" },
      } as never);
      result.current.toggleMute();
      result.current.toggleFs();
      result.current.handleContainerClick({
        target: { closest: () => null },
        stopPropagation: vi.fn(),
      } as never);
    });

    expect(playMock).toHaveBeenCalled();
    expect(pauseMock).toHaveBeenCalled();
    expect(fakeVideo.currentTime).toBe(33);
    expect(fakeVideo.playbackRate).toBe(1.5);
    expect(fakeVideo.volume).toBe(0);
    expect(fakeVideo.muted).toBe(true);
    expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
    expect(usePlayerStore.getState()).toMatchObject({
      volume: 0,
      isMuted: true,
      playbackRate: 1.5,
    });
  });

  it("should navigate using back and episode handlers", () => {
    const { result } = renderHook(() =>
      useVideoPlayer({
        url: "https://stream.example.com/video.mp4",
        backHref: "/collection/movies",
        previousEpisode: {
          id: "ep-1",
          title: "Ep 1",
          href: "/play/series/show/ep-1",
        },
        nextEpisode: {
          id: "ep-3",
          title: "Ep 3",
          href: "/play/series/show/ep-3",
        },
      }),
    );

    act(() => {
      result.current.handlePreviousEpisodeNavigate();
      result.current.handleNextEpisodeNavigate();
      result.current.handleBack();
    });

    expect(pushMock).toHaveBeenCalledWith("/play/series/show/ep-1");
    expect(pushMock).toHaveBeenCalledWith("/play/series/show/ep-3");
    expect(pushMock).toHaveBeenCalledWith("/collection/movies");

    const noBackHref = renderHook(() =>
      useVideoPlayer({
        url: "https://stream.example.com/video.mp4",
      }),
    );

    act(() => {
      noBackHref.result.current.handleBack();
    });

    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it("should react to media events, apply the initial seek and navigate on ended", () => {
    vi.useFakeTimers();

    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
        poster: "/poster.jpg",
        initialPositionSec: 30,
        nextEpisode: {
          id: "ep-2",
          title: "Episode 2",
          href: "/play/series/show/ep-2",
        },
      }),
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 0,
      duration: 120,
      playbackRate: 1.25,
      decodedFrames: 10,
    });

    act(() => {
      video.dispatchEvent(new Event("durationchange"));
      video.dispatchEvent(new Event("loadedmetadata"));
      video.dispatchEvent(new Event("playing"));
    });

    expect(getLatestPlayer().hasPlaybackStarted).toBe(true);
    expect(getLatestPlayer().isPlaying).toBe(true);
    expect(getLatestPlayer().playbackRate).toBe(1.25);
    expect(getLatestPlayer().currentTime).toBe(30);

    act(() => {
      video.currentTime = 111;
      video.dispatchEvent(new Event("timeupdate"));
    });

    expect(getLatestPlayer().currentTime).toBe(111);
    expect(getLatestPlayer().duration).toBe(120);

    act(() => {
      video.dispatchEvent(new Event("pause"));
    });

    expect(getLatestPlayer().isPlaying).toBe(false);
    expect(getLatestPlayer().showPauseOverlay).toBe(true);

    act(() => {
      video.dispatchEvent(new Event("ended"));
    });

    expect(pushMock).toHaveBeenCalledWith("/play/series/show/ep-2");
    vi.useRealTimers();
  });

  it("should persist progress on pause, hidden and pagehide for authenticated users", async () => {
    authState.user = { id: "user-1" };
    const visibilitySpy = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");

    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
        title: "Movie",
        poster: "/poster.jpg",
        progressContext: {
          contentType: "movies",
          contentId: "movie-1",
          playHref: "/play/movies/movie-1",
        },
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 40,
      duration: 100,
      decodedFrames: 10,
    });

    act(() => {
      video.dispatchEvent(new Event("playing"));
      video.dispatchEvent(new Event("pause"));
    });

    expect(saveWatchProgressMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        contentId: "movie-1",
        positionSec: 40,
        durationSec: 100,
        completed: false,
        title: "Movie",
        posterUrl: "/poster.jpg",
      }),
      { keepalive: false },
    );

    visibilitySpy.mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(saveWatchProgressMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        contentId: "movie-1",
      }),
      { keepalive: true },
    );
    expect(saveWatchProgressMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        contentId: "movie-1",
      }),
      { keepalive: true },
    );

    visibilitySpy.mockRestore();
  });

  it("should persist completion when playback ends for authenticated users", () => {
    authState.user = { id: "user-1" };

    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
        title: "Movie",
        poster: "/poster.jpg",
        progressContext: {
          contentType: "movies",
          contentId: "movie-1",
          playHref: "/play/movies/movie-1",
        },
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 98,
      duration: 100,
      decodedFrames: 10,
    });

    act(() => {
      video.dispatchEvent(new Event("playing"));
      video.dispatchEvent(new Event("ended"));
    });

    expect(saveWatchProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: "movie-1",
        positionSec: 98,
        durationSec: 100,
        completed: true,
      }),
      { keepalive: false },
    );
  });

  it("should throttle watch progress syncs triggered by the interval", async () => {
    authState.user = { id: "user-1" };
    let intervalCallback: (() => void) | null = null;
    const setIntervalMock = ((callback: TimerHandler) => {
      intervalCallback = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as unknown as typeof window.setInterval;
    const setIntervalSpy = vi
      .spyOn(window, "setInterval")
      .mockImplementation(setIntervalMock);

    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
        title: "Movie",
        poster: "/poster.jpg",
        progressContext: {
          contentType: "movies",
          contentId: "movie-1",
          playHref: "/play/movies/movie-1",
        },
      }),
    );
    const video = view.container.querySelector("video");
    if (!video || !intervalCallback) {
      throw new Error("Expected player interval setup");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 40,
      duration: 100,
      decodedFrames: 10,
    });

    act(() => {
      video.dispatchEvent(new Event("playing"));
    });

    await act(async () => {
      intervalCallback?.();
      await Promise.resolve();
    });
    await act(async () => {
      intervalCallback?.();
      await Promise.resolve();
    });

    expect(saveWatchProgressMock).toHaveBeenCalledTimes(1);
    expect(saveWatchProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: "movie-1",
        positionSec: 40,
      }),
      { keepalive: false },
    );

    setIntervalSpy.mockRestore();
  });

  it("should expose native video errors and clear them on retry", () => {
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 12,
      duration: 100,
    });

    Object.defineProperty(video, "error", {
      configurable: true,
      value: {
        code: 2,
        message: "network error",
      },
    });

    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    expect(getLatestPlayer().error).toBe("Erro 2: Erro de rede");

    act(() => {
      getLatestPlayer().handleRetry();
    });

    expect(getLatestPlayer().error).toBeNull();
    expect(getLatestPlayer().timedOut).toBe(false);
  });

  it("should react to keyboard shortcuts and close settings on outside pointer down", () => {
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
      }),
    );
    const video = view.container.querySelector("video");
    const container = view.container.querySelector("div");
    if (!video || !container) {
      throw new Error("Expected player elements");
    }

    setupVideoElement(video, {
      paused: true,
      currentTime: 12,
      duration: 100,
      volume: 0.4,
      muted: false,
    });

    Object.defineProperty(container, "requestFullscreen", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    act(() => {
      getLatestPlayer().handleSettingsToggle({
        stopPropagation: vi.fn(),
      } as never);
    });

    expect(getLatestPlayer().isSettingsOpen).toBe(true);

    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
        }),
      );
    });

    expect(getLatestPlayer().isSettingsOpen).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "m", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));
    });

    expect(video.muted).toBe(false);
    expect(video.volume).toBeGreaterThan(0.4);
    expect(video.currentTime).toBe(12);
    expect(
      (container as HTMLDivElement & { requestFullscreen: ReturnType<typeof vi.fn> }).requestFullscreen,
    ).toHaveBeenCalledTimes(1);
  });

  it("should ignore editable targets and handle escape, space and k shortcuts", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    const editableInput = document.createElement("input");
    view.container.appendChild(editableInput);

    const videoState = setupVideoElement(video, {
      paused: true,
      currentTime: 12,
      duration: 100,
      volume: 0.4,
      muted: false,
    });
    const playMock = vi
      .mocked(video.play)
      .mockRejectedValueOnce(new Error("shortcut blocked"))
      .mockImplementation(() => {
        videoState.paused = false;
        return Promise.resolve();
      });

    act(() => {
      getLatestPlayer().handleSettingsToggle({
        stopPropagation: vi.fn(),
      } as never);
    });

    expect(getLatestPlayer().isSettingsOpen).toBe(true);

    act(() => {
      editableInput.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "m",
          bubbles: true,
          cancelable: true,
        }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(video.muted).toBe(false);
    expect(getLatestPlayer().isSettingsOpen).toBe(false);

    const playEvent = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      window.dispatchEvent(playEvent);
    });
    await flushPlayerEffects();

    expect(playEvent.defaultPrevented).toBe(true);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "[VideoPlayer] Falha ao iniciar reproducao pelo atalho de teclado.",
      expect.any(Error),
    );

    videoState.paused = false;

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(video.pause).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it("should exit fullscreen when fullscreen is already active", () => {
    const exitFullscreenMock = vi.fn().mockResolvedValue(undefined);
    const fullscreenElement = document.createElement("div");
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: fullscreenElement,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreenMock,
    });

    const { result } = renderHook(() =>
      useVideoPlayer({
        url: "https://stream.example.com/video.mp4",
      }),
    );

    act(() => {
      result.current.containerRef.current = fullscreenElement as HTMLDivElement;
      result.current.videoRef.current = document.createElement("video");
      result.current.toggleFs();
    });

    expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
  });

  it("should show the delayed loading overlay and timeout state on stalled playback", () => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: {
        effectiveType: "2g",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 0,
      duration: 120,
      decodedFrames: 0,
    });

    act(() => {
      vi.advanceTimersByTime(351);
    });

    expect(getLatestPlayer().showLoadingOverlay).toBe(true);

    act(() => {
      vi.advanceTimersByTime(35_001);
    });

    expect(getLatestPlayer().timedOut).toBe(true);
    expect(getLatestPlayer().showTimedOutWarning).toBe(false);

    act(() => {
      getLatestPlayer().handleRetry();
    });

    expect(getLatestPlayer().timedOut).toBe(false);
    vi.useRealTimers();
  });

  it("should show a timeout error message instead of timedOut on healthy networks", () => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: {
        effectiveType: "4g",
        downlink: 20,
        rtt: 50,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 0,
      duration: 120,
      decodedFrames: 0,
    });

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(getLatestPlayer().timedOut).toBe(false);
    expect(getLatestPlayer().error).toBe("A fonte de vídeo demorou a responder.");
    vi.useRealTimers();
  });

  it("should load stream options and switch between auto and manual quality", async () => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: {
        effectiveType: "2g",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    getCatalogStreamOptionsMock.mockResolvedValue({
      items: streamOptions,
    });

    render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/watch?type=movies&id=movie-1",
      }),
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });
    await flushPlayerEffects();

    expect(getCatalogStreamOptionsMock).toHaveBeenCalledWith({
      type: "movies",
      id: "movie-1",
    });
    expect(getLatestPlayer().streamOptions).toEqual(streamOptions);
    expect(getLatestPlayer().activeOptionIndex).toBe(0);
    expect(getLatestPlayer().autoFallbackEnabled).toBe(true);

    act(() => {
      getLatestPlayer().selectStreamOption(2);
    });

    expect(getLatestPlayer().activeOptionIndex).toBe(2);
    expect(getLatestPlayer().autoFallbackEnabled).toBe(false);

    act(() => {
      getLatestPlayer().enableAutoQuality();
    });

    expect(getLatestPlayer().activeOptionIndex).toBe(0);
    expect(getLatestPlayer().autoFallbackEnabled).toBe(true);
    vi.useRealTimers();
  });

  it("should downgrade the stream after repeated waiting events", async () => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: {
        effectiveType: "4g",
        rtt: 80,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    getCatalogStreamOptionsMock.mockResolvedValue({
      items: streamOptions,
    });

    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/watch?type=movies&id=movie-1",
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 20,
      duration: 120,
      decodedFrames: 10,
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });
    await flushPlayerEffects();

    expect(getLatestPlayer().activeOptionIndex).toBe(2);

    act(() => {
      video.dispatchEvent(new Event("playing"));
      for (let i = 0; i < 6; i++) {
        video.dispatchEvent(new Event("waiting"));
      }
    });
    await flushPlayerEffects();

    expect(getLatestPlayer().activeOptionIndex).toBe(1);
    expect(getLatestPlayer().error).toBe("Buffering frequente detectado. Ajustando para 720p.");
    expect(getLatestPlayer().isLoading).toBe(true);
    vi.useRealTimers();
  });

  it("should dismiss alerts and next episode prompts from public callbacks", () => {
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
        nextEpisode: {
          id: "ep-2",
          title: "Episode 2",
          href: "/play/series/show/ep-2",
        },
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 12,
      duration: 100,
    });

    Object.defineProperty(video, "error", {
      configurable: true,
      value: {
        code: 2,
        message: "network error",
      },
    });

    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    expect(getLatestPlayer().showPlayerAlert).toBe(true);

    act(() => {
      getLatestPlayer().handleDismissAlert();
      getLatestPlayer().handleNextEpisodeDismiss();
    });

    expect(getLatestPlayer().showPlayerAlert).toBe(false);
    expect(getLatestPlayer().nextEpisodeDismissed).toBe(true);
  });

  it("should bootstrap hls playback and recover from fatal hls errors", async () => {
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/live-stream",
        isHls: true,
        variant: "full",
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: true,
      currentTime: 0,
      duration: 100,
      decodedFrames: 0,
    });

    await flushPlayerEffects();

    const hls = hlsInstances[0];

    act(() => {
      hls.handlers.get(HlsCtorMock.Events.MEDIA_ATTACHED)?.();
    });
    expect(hls.loadSource).toHaveBeenCalledWith("https://stream.example.com/live-stream");

    await act(async () => {
      hls.handlers.get(HlsCtorMock.Events.MANIFEST_PARSED)?.();
      await Promise.resolve();
    });

    act(() => {
      hls.handlers.get(HlsCtorMock.Events.ERROR)?.({}, {
        fatal: true,
        type: HlsCtorMock.ErrorTypes.NETWORK_ERROR,
        details: "manifestParsingError",
      });
    });
    expect(hls.destroy).toHaveBeenCalledTimes(1);
  });

  it("should destroy the hls instance on unmount", async () => {
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/live-stream",
        isHls: true,
      }),
    );

    await flushPlayerEffects();

    const hls = hlsInstances[0];
    view.unmount();

    expect(hls.destroy).toHaveBeenCalledTimes(1);
  });

  it("should destroy the previous hls instance when the source changes", async () => {
    const initialInstances = hlsInstances.length;
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/first-stream",
        isHls: true,
      }),
    );

    await flushPlayerEffects();

    const firstHls = hlsInstances[0];

    view.rerender(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/second-stream",
        isHls: true,
      }),
    );
    await flushPlayerEffects();

    expect(firstHls.destroy).toHaveBeenCalledTimes(1);
    expect(hlsInstances.length).toBeGreaterThan(initialInstances + 1);
    expect(hlsInstances.at(-1)).not.toBe(firstHls);
  });

  it("should fall back to direct playback when hls support is unavailable", async () => {
    hlsSupportState.value = false;

    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/live-stream",
        isHls: true,
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: true,
      currentTime: 0,
      duration: 100,
    });

    await flushPlayerEffects();

    expect(hlsInstances).toHaveLength(0);
    expect(video.load).toHaveBeenCalled();
  });

  it("should switch to hls mode after a native format error 4", async () => {
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/video.mp4",
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: false,
      currentTime: 12,
      duration: 100,
      decodedFrames: 0,
    });

    Object.defineProperty(video, "error", {
      configurable: true,
      value: {
        code: 4,
        message: "unsupported format",
      },
    });

    act(() => {
      video.dispatchEvent(new Event("error"));
    });
    await flushPlayerEffects();

    expect(getLatestPlayer().error).toBeNull();
    expect(getLatestPlayer().isLoading).toBe(true);
    expect(hlsInstances).toHaveLength(1);
  });

  it("should warn when direct autoplay is blocked in full mode", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const blockedError = new DOMException("autoplay blocked", "NotAllowedError");
    const fakeVideo = {
      play: vi.fn().mockRejectedValue(blockedError),
      pause: vi.fn(),
      load: vi.fn(),
      volume: 1,
      muted: false,
      currentTime: 0,
      duration: 100,
      playbackRate: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hasAttribute: vi.fn().mockReturnValue(false),
      removeAttribute: vi.fn(),
      getVideoPlaybackQuality: vi.fn().mockReturnValue({ totalVideoFrames: 0 }),
    } as unknown as HTMLVideoElement;

    const { result } = renderHook(() =>
      useVideoPlayer({
        url: "https://stream.example.com/video.mp4",
        variant: "full",
      }),
    );

    act(() => {
      result.current.videoRef.current = fakeVideo;
      result.current.handleRetry();
    });
    await flushPlayerEffects();

    expect(warnSpy).toHaveBeenCalledWith("[VideoPlayer] Autoplay blocked", expect.anything());
    warnSpy.mockRestore();
  });

  it("should surface an explicit error when the next source is unsupported", async () => {
    const fakeVideo = {
      play: vi.fn().mockRejectedValue(
        new DOMException(
          "Failed to load because no supported source was found.",
          "NotSupportedError",
        ),
      ),
      pause: vi.fn(),
      load: vi.fn(),
      volume: 1,
      muted: false,
      currentTime: 0,
      duration: 100,
      playbackRate: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hasAttribute: vi.fn().mockReturnValue(false),
      removeAttribute: vi.fn(),
      getVideoPlaybackQuality: vi.fn().mockReturnValue({ totalVideoFrames: 0 }),
    } as unknown as HTMLVideoElement;

    const { result } = renderHook(() =>
      useVideoPlayer({
        url: "https://stream.example.com/video.mp4",
        variant: "full",
      }),
    );

    act(() => {
      result.current.videoRef.current = fakeVideo;
      result.current.handleRetry();
    });
    await waitFor(() => {
      expect(result.current.error).toBe("A fonte de vídeo não pôde ser carregada.");
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it("should ignore abort errors during direct autoplay", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const abortError = new DOMException(
      "The play() request was interrupted by a call to pause().",
      "AbortError",
    );
    const fakeVideo = {
      play: vi.fn().mockRejectedValue(abortError),
      pause: vi.fn(),
      load: vi.fn(),
      volume: 1,
      muted: false,
      currentTime: 0,
      duration: 100,
      playbackRate: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hasAttribute: vi.fn().mockReturnValue(false),
      removeAttribute: vi.fn(),
      getVideoPlaybackQuality: vi.fn().mockReturnValue({ totalVideoFrames: 0 }),
    } as unknown as HTMLVideoElement;

    const { result } = renderHook(() =>
      useVideoPlayer({
        url: "https://stream.example.com/video.mp4",
        variant: "full",
      }),
    );

    act(() => {
      result.current.videoRef.current = fakeVideo;
      result.current.handleRetry();
    });
    await flushPlayerEffects();

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("should ignore abort errors after the hls manifest is parsed", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(
      React.createElement(PlayerHarness, {
        url: "https://stream.example.com/live-stream",
        isHls: true,
        variant: "full",
      }),
    );
    const video = view.container.querySelector("video");
    if (!video) {
      throw new Error("Expected video element");
    }

    setupVideoElement(video, {
      paused: true,
      currentTime: 0,
      duration: 100,
      decodedFrames: 0,
    });

    const abortError = new DOMException(
      "The play() request was interrupted by a call to pause().",
      "AbortError",
    );
    Object.defineProperty(video, "play", {
      configurable: true,
      value: vi.fn().mockRejectedValue(abortError),
    });

    await flushPlayerEffects();

    const hls = hlsInstances[0];

    await act(async () => {
      hls.handlers.get(HlsCtorMock.Events.MANIFEST_PARSED)?.();
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalledWith(
      "[VideoPlayer] Falha ao iniciar reproducao apos carregar manifesto HLS.",
      expect.anything(),
    );
    errorSpy.mockRestore();
  });
});
