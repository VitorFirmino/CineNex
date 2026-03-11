import { beforeEach, describe, expect, it, vi } from "vitest";

const { meMock, logoutMock } = vi.hoisted(() => ({
  meMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock("@infrastructure/api/auth-api", () => ({
  authApi: {
    me: meMock,
    logout: logoutMock,
  },
}));

type AuthUserSnapshot = {
  id: string;
  email: string;
  email_confirmed_at: null;
  app_metadata: { role: string };
  user_metadata: {
    avatar_url: null;
    picture: null;
    full_name: string;
    name: string;
  };
};

type MeResponse = {
  user: AuthUserSnapshot | null;
};

describe("auth-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T00:00:00.000Z"));
  });

  it("should sync the authenticated user snapshot", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("./auth-store");

    meMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "qa@example.com",
        email_confirmed_at: null,
        app_metadata: { role: "USER" },
        user_metadata: {
          avatar_url: null,
          picture: null,
          full_name: "QA",
          name: "QA",
        },
      },
    });

    await useAuthStore.getState().syncUser(true);

    expect(useAuthStore.getState()).toMatchObject({
      loading: false,
      user: expect.objectContaining({
        id: "user-1",
        email: "qa@example.com",
      }),
    });
  });

  it("should debounce repeated sync requests", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("./auth-store");

    meMock.mockResolvedValue({
      user: null,
    });

    await useAuthStore.getState().syncUser(true);
    await useAuthStore.getState().syncUser();

    expect(meMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_001);
    await useAuthStore.getState().syncUser();
    expect(meMock).toHaveBeenCalledTimes(2);
  });

  it("should clear the user and emit auth:changed on logout", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("./auth-store");

    const authChangedListener = vi.fn();
    window.addEventListener("auth:changed", authChangedListener);
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "qa@example.com",
        email_confirmed_at: null,
        app_metadata: { role: "USER" },
        user_metadata: {
          avatar_url: null,
          picture: null,
          full_name: "QA",
          name: "QA",
        },
      },
      loading: false,
    });

    await useAuthStore.getState().logout();

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      loading: false,
    });
    expect(authChangedListener).toHaveBeenCalledTimes(1);
  });

  it("should recover to a guest snapshot when auth sync fails", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("./auth-store");

    meMock.mockRejectedValue(new Error("network down"));
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "qa@example.com",
        email_confirmed_at: null,
        app_metadata: { role: "USER" },
        user_metadata: {
          avatar_url: null,
          picture: null,
          full_name: "QA",
          name: "QA",
        },
      },
      loading: true,
    });

    await useAuthStore.getState().syncUser(true);

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      loading: false,
    });
  });

  it("should subscribe to auth sync events and stop after the last cleanup", async () => {
    vi.resetModules();
    const { subscribeAuthSync } = await import("./auth-store");

    meMock.mockResolvedValue({
      user: null,
    });

    const unsubscribe = subscribeAuthSync();

    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("auth:changed"));

    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(2);

    unsubscribe();
    vi.advanceTimersByTime(751);
    window.dispatchEvent(new Event("auth:changed"));

    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(2);
  });

  it("should avoid state updates when the snapshot has not changed", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("./auth-store");

    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "qa@example.com",
        email_confirmed_at: null,
        app_metadata: { role: "USER" },
        user_metadata: {
          avatar_url: null,
          picture: null,
          full_name: "QA",
          name: "QA",
        },
      },
      loading: false,
    });

    const before = useAuthStore.getState();
    useAuthStore.getState()._setSnapshot({
      user: {
        id: "user-1",
        email: "qa@example.com",
        email_confirmed_at: null,
        app_metadata: { role: "USER" },
        user_metadata: {
          avatar_url: null,
          picture: null,
          full_name: "QA",
          name: "QA",
        },
      },
      loading: false,
    });

    expect(useAuthStore.getState()).toBe(before);
  });

  it("should reuse the same sync promise for concurrent requests", async () => {
    vi.resetModules();
    const { useAuthStore } = await import("./auth-store");

    let resolveMe: ((value: MeResponse) => void) | undefined;
    meMock.mockImplementation(
      () =>
        new Promise<MeResponse>((resolve) => {
          resolveMe = resolve;
        }),
    );

    const first = useAuthStore.getState().syncUser(true);
    const second = useAuthStore.getState().syncUser(true);

    if (!resolveMe) {
      throw new Error("Expected sync resolver to be defined.");
    }
    resolveMe({ user: null });

    await first;
    await second;

    expect(meMock).toHaveBeenCalledTimes(1);
  });

  it("should sync authenticated users on the periodic interval when visible", async () => {
    vi.resetModules();
    const { subscribeAuthSync, useAuthStore } = await import("./auth-store");
    const visibilityStateSpy = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    const intervalCallbackRef: { current?: () => void } = {};
    const setIntervalSpy = vi
      .spyOn(window, "setInterval")
      .mockImplementation(((callback: TimerHandler) => {
        intervalCallbackRef.current = callback as () => void;
        return 1;
      }) as typeof window.setInterval);

    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "qa@example.com",
        email_confirmed_at: null,
        app_metadata: { role: "USER" },
        user_metadata: {
          avatar_url: null,
          picture: null,
          full_name: "QA",
          name: "QA",
        },
      },
      loading: false,
    });
    const syncedUser = {
      id: "user-1",
      email: "qa@example.com",
      email_confirmed_at: null,
      app_metadata: { role: "USER" },
      user_metadata: {
        avatar_url: null,
        picture: null,
        full_name: "QA",
        name: "QA",
      },
    };
    let resolveInitialSync: ((value: MeResponse) => void) | undefined;
    meMock
      .mockImplementationOnce(
        () =>
          new Promise<MeResponse>((resolve) => {
            resolveInitialSync = resolve;
          }),
      )
      .mockResolvedValue({ user: syncedUser });

    const unsubscribe = subscribeAuthSync();

    if (!resolveInitialSync) {
      throw new Error("Expected initial sync resolver to be defined.");
    }
    resolveInitialSync({ user: syncedUser });
    await Promise.resolve();
    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(180_001);
    const intervalCallback = intervalCallbackRef.current;
    if (!intervalCallback) {
      throw new Error("Expected interval callback to be defined.");
    }
    intervalCallback();
    await Promise.resolve();
    await Promise.resolve();

    expect(meMock).toHaveBeenCalledTimes(2);

    setIntervalSpy.mockRestore();
    visibilityStateSpy.mockRestore();
    unsubscribe();
    vi.advanceTimersByTime(751);
  });

  it("should ignore visibility sync events while the document is hidden", async () => {
    vi.resetModules();
    const { subscribeAuthSync } = await import("./auth-store");

    meMock.mockResolvedValue({ user: null });
    const visibilityStateSpy = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");

    const unsubscribe = subscribeAuthSync();

    await Promise.resolve();
    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    visibilityStateSpy.mockRestore();
    unsubscribe();
    vi.advanceTimersByTime(751);
  });

  it("should resync guest users on focus after the guest throttle window", async () => {
    vi.resetModules();
    const { subscribeAuthSync } = await import("./auth-store");

    meMock.mockResolvedValue({ user: null });
    const visibilityStateSpy = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");

    const unsubscribe = subscribeAuthSync();

    await Promise.resolve();
    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_001);
    window.dispatchEvent(new Event("focus"));
    await Promise.resolve();
    await Promise.resolve();

    expect(meMock).toHaveBeenCalledTimes(2);

    visibilityStateSpy.mockRestore();
    unsubscribe();
    vi.advanceTimersByTime(751);
  });

  it("should keep auth sync active when a new subscriber arrives before the grace timeout", async () => {
    vi.resetModules();
    const { subscribeAuthSync } = await import("./auth-store");

    meMock.mockResolvedValue({ user: null });

    const firstUnsubscribe = subscribeAuthSync();
    await Promise.resolve();
    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    firstUnsubscribe();
    vi.advanceTimersByTime(500);

    const secondUnsubscribe = subscribeAuthSync();
    window.dispatchEvent(new Event("auth:changed"));
    await Promise.resolve();
    await Promise.resolve();

    expect(meMock).toHaveBeenCalledTimes(2);

    secondUnsubscribe();
    vi.advanceTimersByTime(751);
  });

  it("should ignore the cleanup timeout when another subscriber appears before it fires", async () => {
    vi.resetModules();
    const { subscribeAuthSync } = await import("./auth-store");

    meMock.mockResolvedValue({ user: null });

    const firstUnsubscribe = subscribeAuthSync();
    await Promise.resolve();
    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    firstUnsubscribe();
    const secondUnsubscribe = subscribeAuthSync();
    vi.advanceTimersByTime(751);

    window.dispatchEvent(new Event("auth:changed"));
    await Promise.resolve();
    await Promise.resolve();

    expect(meMock).toHaveBeenCalledTimes(2);

    secondUnsubscribe();
    vi.advanceTimersByTime(751);
  });

  it("should keep auth sync active while another subscriber is still mounted", async () => {
    vi.resetModules();
    const { subscribeAuthSync } = await import("./auth-store");

    meMock.mockResolvedValue({ user: null });

    const firstUnsubscribe = subscribeAuthSync();
    const secondUnsubscribe = subscribeAuthSync();
    await Promise.resolve();
    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    firstUnsubscribe();
    window.dispatchEvent(new Event("auth:changed"));
    await Promise.resolve();
    await Promise.resolve();

    expect(meMock).toHaveBeenCalledTimes(2);

    secondUnsubscribe();
    vi.advanceTimersByTime(751);
  });

  it("should stop auth sync immediately when the last unsubscribe runs without a window", async () => {
    vi.resetModules();
    const { subscribeAuthSync } = await import("./auth-store");

    meMock.mockResolvedValue({ user: null });

    const unsubscribe = subscribeAuthSync();
    await Promise.resolve();
    await Promise.resolve();
    expect(meMock).toHaveBeenCalledTimes(1);

    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);

    unsubscribe();

    vi.stubGlobal("window", originalWindow);
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    await Promise.resolve();

    expect(meMock).toHaveBeenCalledTimes(1);
  });

  it("should remove listeners and clear the interval after the last cleanup delay", async () => {
    vi.resetModules();
    const { subscribeAuthSync } = await import("./auth-store");

    meMock.mockResolvedValue({ user: null });
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const unsubscribe = subscribeAuthSync();
    await Promise.resolve();
    await Promise.resolve();

    unsubscribe();
    vi.advanceTimersByTime(751);

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
