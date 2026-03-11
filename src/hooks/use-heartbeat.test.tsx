import { act, renderHook } from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHeartbeat } from "./use-heartbeat";

const { authState, heartbeatMock, syncUserMock } = vi.hoisted(() => ({
  authState: {
    user: { id: "user-1" } as { id: string } | null,
    loading: false,
  },
  heartbeatMock: vi.fn(),
  syncUserMock: vi.fn(),
}));

vi.mock("@hooks/use-auth", () => ({
  useAuth: () => authState,
}));

vi.mock("@store/auth-store", () => ({
  useAuthStore: {
    getState: () => ({
      syncUser: syncUserMock,
    }),
  },
}));

vi.mock("@infrastructure/api/auth-api", () => ({
  authApi: {
    heartbeat: heartbeatMock,
  },
}));


describe("use-heartbeat", () => {
  let visibilityState: DocumentVisibilityState;
  const flushEffects = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    authState.user = { id: "user-1" };
    authState.loading = false;
    visibilityState = "visible";
    syncUserMock.mockResolvedValue(undefined);
    heartbeatMock.mockResolvedValue({ active: true });

    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilityState);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should send a heartbeat on mount when the user is visible and authenticated", async () => {
    renderHook(() => useHeartbeat("movie-1"));

    await flushEffects();

    expect(heartbeatMock).toHaveBeenCalledWith({ currentContent: "movie-1" });
    expect(window.localStorage.getItem("explorer:heartbeat-leader:user-1")).toContain("tabId");
  });

  it("should wait for auth loading to finish before starting the heartbeat flow", async () => {
    authState.loading = true;

    const { rerender } = renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(heartbeatMock).not.toHaveBeenCalled();

    authState.loading = false;
    rerender();
    await flushEffects();

    expect(heartbeatMock).toHaveBeenCalledTimes(1);
  });

  it("should remain idle when there is no authenticated user", async () => {
    authState.user = null;

    const { result } = renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    await act(async () => {
      await result.current.sendHeartbeat("movie-1");
    });

    expect(heartbeatMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("explorer:heartbeat-leader:user-1")).toBeNull();
  });

  it("should skip the heartbeat when another tab already holds the lease", async () => {
    window.localStorage.setItem(
      "explorer:heartbeat-leader:user-1",
      JSON.stringify({
        tabId: "other-tab",
        expiresAt: Date.now() + 60_000,
      }),
    );

    renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(heartbeatMock).not.toHaveBeenCalled();
  });

  it("should trigger a forced auth resync after an unauthorized heartbeat", async () => {
    heartbeatMock.mockRejectedValue(
      new AxiosError("Unauthorized", "401", undefined, undefined, {
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config: {} as never,
        data: {},
      }),
    );

    renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(syncUserMock).toHaveBeenCalledWith(true);
    expect(window.localStorage.getItem("explorer:heartbeat-leader:user-1")).toBeNull();
  });

  it("should log unexpected heartbeat failures without forcing auth resync", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("network down");
    heartbeatMock.mockRejectedValue(error);

    renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(syncUserMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("[heartbeat] Falha ao enviar heartbeat.", error);
  });

  it("should react to visibility changes and recover from invalid lease payloads", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    visibilityState = "hidden";
    window.localStorage.setItem("explorer:heartbeat-leader:user-1", "{invalid");

    renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(heartbeatMock).not.toHaveBeenCalled();

    visibilityState = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    await flushEffects();

    expect(heartbeatMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "[heartbeat] Falha ao interpretar lease do heartbeat.",
      expect.any(SyntaxError),
    );
  });

  it("should prevent overlapping heartbeat requests while one is already in flight", async () => {
    let resolveHeartbeat: (() => void) | undefined;
    visibilityState = "hidden";
    heartbeatMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveHeartbeat = resolve;
        }),
    );

    const { result } = renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    visibilityState = "visible";
    await act(async () => {
      void result.current.sendHeartbeat("movie-1");
      void result.current.sendHeartbeat("movie-1");
      await Promise.resolve();
    });

    expect(heartbeatMock).toHaveBeenCalledTimes(1);

    if (!resolveHeartbeat) {
      throw new Error("Expected heartbeat resolver to be defined.");
    }
    resolveHeartbeat();
    await flushEffects();
  });

  it("should renew the periodic heartbeat while the tab remains visible", async () => {
    renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(heartbeatMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(180_000);
    await flushEffects();

    expect(heartbeatMock).toHaveBeenCalledTimes(2);
  });

  it("should ignore visibility and interval callbacks while the tab is hidden", async () => {
    renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(heartbeatMock).toHaveBeenCalledTimes(1);

    visibilityState = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(180_000);
    await flushEffects();

    expect(heartbeatMock).toHaveBeenCalledTimes(1);
  });

  it("should release the lease on unmount and ignore unrelated storage events", async () => {
    const { result, unmount } = renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(window.localStorage.getItem("explorer:heartbeat-leader:user-1")).toContain("tabId");

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "unrelated-key",
        newValue: JSON.stringify({ tabId: "other-tab", expiresAt: Date.now() + 60_000 }),
      }),
    );

    await act(async () => {
      await result.current.sendHeartbeat("movie-1");
    });

    expect(heartbeatMock).toHaveBeenCalledTimes(2);

    unmount();

    expect(window.localStorage.getItem("explorer:heartbeat-leader:user-1")).toBeNull();
  });

  it("should respect storage lease updates from other tabs before sending a new heartbeat", async () => {
    visibilityState = "hidden";

    const { result } = renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    window.localStorage.setItem(
      "explorer:heartbeat-leader:user-1",
      JSON.stringify({
        tabId: "other-tab",
        expiresAt: Date.now() + 60_000,
      }),
    );
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "explorer:heartbeat-leader:user-1",
        newValue: window.localStorage.getItem("explorer:heartbeat-leader:user-1"),
      }),
    );

    visibilityState = "visible";
    await act(async () => {
      await result.current.sendHeartbeat("movie-1");
    });

    expect(heartbeatMock).not.toHaveBeenCalled();
  });

  it("should fallback to leader mode when lease reads fail unexpectedly", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const getItemSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage unavailable");
      });

    renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    expect(heartbeatMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "[heartbeat] Falha ao disputar lideranca do heartbeat.",
      expect.any(Error),
    );

    getItemSpy.mockRestore();
  });

  it("should log release failures during cleanup without crashing the hook", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unmount } = renderHook(() => useHeartbeat("movie-1"));
    await flushEffects();

    const getItemSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage unavailable");
      });

    expect(() => unmount()).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      "[heartbeat] Falha ao liberar lideranca do heartbeat.",
      expect.any(Error),
    );

    getItemSpy.mockRestore();
  });
});
