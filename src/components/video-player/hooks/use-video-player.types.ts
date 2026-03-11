import type Hls from "hls.js";
import type { NextEpisodeInfo, StreamOption } from "../video-player.types";

export type StreamOptionsRef =
  | { type: "movies"; id: string }
  | { type: "series"; slug: string; episodeId: string };

export type NetworkSnapshot = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

export interface StreamOptionsCacheEntry {
  expiresAt: number;
  items: StreamOption[];
}

export interface NextEpisodePromptParams {
  nextEpisode?: NextEpisodeInfo | null;
  nextEpisodeDismissed: boolean;
  duration: number;
  currentTime: number;
}

export interface NextEpisodeCountdownParams extends NextEpisodePromptParams {
  hasNavigated: boolean;
}

export interface NavigatorConnection extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener(type: "change", listener: EventListener): void;
  removeEventListener(type: "change", listener: EventListener): void;
}

export interface NavigatorWithConnection extends Navigator {
  connection?: NavigatorConnection;
}

export type HlsModule = {
  default: typeof Hls;
};

export interface VideoPlayerModuleLoaders {
  hls?: (() => Promise<HlsModule>) | null;
}

export type BrowserTimerId = number;

export type VideoPlayRequestContext =
  | "autoplay"
  | "hls-manifest"
  | "keyboard-shortcut"
  | "main-control";

export interface PlayVideoSafelyOptions {
  onSourceUnavailable?: () => void;
}

export type WebkitDecodedFrameVideo = HTMLVideoElement & {
  webkitDecodedFrameCount?: number;
};

export type VendorFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozFullScreenElement?: Element | null;
  mozCancelFullScreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
};

export type VendorFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export type IOSFullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};
