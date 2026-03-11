import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();
const pathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => pathnameMock(),
}));

vi.mock("@hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { useSiteHeader } from "./use-site-header";

describe("use-site-header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should expose immersive route and admin state", () => {
    pathnameMock.mockReturnValue("/play/movies/movie-1");
    mockUseAuth.mockReturnValue({
      user: {
        app_metadata: {
          role: "ADMIN",
        },
      },
      loading: false,
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useSiteHeader());

    expect(result.current.isImmersiveRoute).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isMobileMenuOpen).toBe(false);
  });

  it("should prefer the server auth snapshot while the client auth store is loading", () => {
    pathnameMock.mockReturnValue("/");
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      logout: vi.fn(),
    });

    const { result } = renderHook(() =>
      useSiteHeader({
        initialUser: {
          id: "user-1",
          email: "admin@example.com",
          email_confirmed_at: null,
          app_metadata: {
            role: "ADMIN",
          },
          user_metadata: {
            avatar_url: null,
            picture: null,
            full_name: "Admin",
            name: "Admin",
          },
        },
      }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.user?.id).toBe("user-1");
    expect(result.current.isAdmin).toBe(true);
  });

  it("should close the mobile menu on logout", async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);

    pathnameMock.mockReturnValue("/");
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: logoutMock,
    });

    const { result } = renderHook(() => useSiteHeader());

    act(() => {
      result.current.setIsMobileMenuOpen(true);
    });

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(result.current.isMobileMenuOpen).toBe(false);
    expect(logoutMock).toHaveBeenCalled();
  });
});
