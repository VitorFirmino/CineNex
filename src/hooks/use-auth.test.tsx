import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./use-auth";

const {
  pushMock,
  refreshMock,
  subscribeAuthSyncMock,
  storeApi,
} = vi.hoisted(() => {
  const logoutMock = vi.fn().mockResolvedValue(undefined);
  const state = {
    user: null as { id: string } | null,
    loading: true,
    logout: logoutMock,
  };

  const useAuthStore = Object.assign(
    <T,>(selector: (current: typeof state) => T) => selector(state),
    {
      getState: () => state,
    },
  );

  return {
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    subscribeAuthSyncMock: vi.fn(),
    storeApi: {
      state,
      logoutMock,
      useAuthStore,
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@store/auth-store", () => ({
  useAuthStore: storeApi.useAuthStore,
  subscribeAuthSync: subscribeAuthSyncMock,
}));



describe("use-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeApi.state.user = { id: "user-1" };
    storeApi.state.loading = false;
    storeApi.state.logout = storeApi.logoutMock;
    subscribeAuthSyncMock.mockReturnValue(() => undefined);
  });

  it("should subscribe to auth sync on mount", () => {
    const { result } = renderHook(() => useAuth());

    expect(subscribeAuthSyncMock).toHaveBeenCalledTimes(1);
    expect(result.current.user).toEqual({ id: "user-1" });
    expect(result.current.loading).toBe(false);
  });

  it("should logout and redirect to home", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(storeApi.logoutMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("should unsubscribe from auth sync on unmount", () => {
    const unsubscribeMock = vi.fn();
    subscribeAuthSyncMock.mockReturnValue(unsubscribeMock);

    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it("should surface the loading snapshot from the auth store", () => {
    storeApi.state.user = null;
    storeApi.state.loading = true;

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
