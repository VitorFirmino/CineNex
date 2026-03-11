'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PlaybackRate = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export const PLAYBACK_RATE_OPTIONS: ReadonlyArray<PlaybackRate> = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2,
] as const;

export interface PlayerPreferences {
  readonly volume: number;
  readonly isMuted: boolean;
  readonly playbackRate: PlaybackRate;
}

export interface PlayerActions {
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  applyVolumeChange: (volume: number) => void;
}

export type PlayerSlice = PlayerPreferences & PlayerActions;

const DEFAULT_PREFERENCES: PlayerPreferences = {
  volume: 1,
  isMuted: false,
  playbackRate: 1,
};

export const usePlayerStore = create<PlayerSlice>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,

      setVolume: (volume) => set({ volume: clampVolume(volume) }),

      setIsMuted: (isMuted) => set({ isMuted }),

      setPlaybackRate: (rate) => set({ playbackRate: rate }),

      applyVolumeChange: (volume) => {
        const clamped = clampVolume(volume);
        set({ volume: clamped, isMuted: clamped === 0 });
      },
    }),
    {
      name: 'explorer:player-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PlayerPreferences => ({
        volume: state.volume,
        isMuted: state.isMuted,
        playbackRate: state.playbackRate,
      }),
    },
  ),
);

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}
