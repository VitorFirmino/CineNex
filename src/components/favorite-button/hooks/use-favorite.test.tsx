import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFavoritesStore } from "@store/favorites-store";

const pushMock = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { useFavorite } from "./use-favorite";

describe("use-favorite", () => {
  const initialState = useFavoritesStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useFavoritesStore.setState(initialState, true);
  });

  it("should redirect guests to login when toggling favorites", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
    });

    const clearFavoritesMock = vi.fn();
    useFavoritesStore.setState({
      clearFavorites: clearFavoritesMock,
    });

    const { result } = renderHook(() =>
      useFavorite({ type: "movie", contentId: "movie-1" }),
    );

    expect(clearFavoritesMock).toHaveBeenCalled();

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent;

    await act(async () => {
      await result.current.toggleFavorite(event);
    });

    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("should load favorites for authenticated users and toggle them", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
    });

    const loadFavoritesMock = vi.fn().mockResolvedValue(undefined);
    const toggleFavoriteMock = vi.fn().mockResolvedValue(true);
    useFavoritesStore.setState({
      loadFavorites: loadFavoritesMock,
      toggleFavorite: toggleFavoriteMock,
      isFavorited: () => false,
    });

    const onToggle = vi.fn();
    const { result } = renderHook(() =>
      useFavorite({ type: "series", contentId: "series-1", onToggle }),
    );

    expect(loadFavoritesMock).toHaveBeenCalled();

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent;

    await act(async () => {
      await result.current.toggleFavorite(event);
    });

    expect(toggleFavoriteMock).toHaveBeenCalledWith("SERIES", "series-1");
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
