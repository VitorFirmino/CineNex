import { beforeEach, describe, expect, it } from "vitest";
import { PLAYBACK_RATE_OPTIONS, usePlayerStore } from "./player-store";

describe("player-store", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlayerStore.setState({
      volume: 1,
      isMuted: false,
      playbackRate: 1,
    });
  });

  it("should expose the supported playback rates", () => {
    expect(PLAYBACK_RATE_OPTIONS).toEqual([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  });

  it("should clamp volume changes", () => {
    usePlayerStore.getState().setVolume(5);
    expect(usePlayerStore.getState().volume).toBe(1);

    usePlayerStore.getState().setVolume(-2);
    expect(usePlayerStore.getState().volume).toBe(0);
  });

  it("should mute automatically when applying zero volume", () => {
    usePlayerStore.getState().applyVolumeChange(0);
    expect(usePlayerStore.getState()).toMatchObject({
      volume: 0,
      isMuted: true,
    });

    usePlayerStore.getState().applyVolumeChange(0.6);
    expect(usePlayerStore.getState()).toMatchObject({
      volume: 0.6,
      isMuted: false,
    });
  });

  it("should update playback rate directly", () => {
    usePlayerStore.getState().setPlaybackRate(1.5);
    expect(usePlayerStore.getState().playbackRate).toBe(1.5);
  });
});
