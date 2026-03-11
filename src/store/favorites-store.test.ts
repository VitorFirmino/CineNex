import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFavoritesStore } from "./favorites-store";

const { getFavoritesMock, toggleFavoriteMock } = vi.hoisted(() => ({
  getFavoritesMock: vi.fn(),
  toggleFavoriteMock: vi.fn(),
}));

vi.mock("@infrastructure/api/auth-api", () => ({
  authApi: {
    getFavorites: getFavoritesMock,
    toggleFavorite: toggleFavoriteMock,
  },
}));

describe("favorites-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFavoritesStore.setState({
      keys: new Set(),
      isLoaded: false,
    });
  });

  it("should load favorites only once and normalize keys", async () => {
    getFavoritesMock.mockResolvedValue({
      favorites: [
        { type: "MOVIE", contentId: "movie-1" },
        { type: "SERIES", contentId: "series-1" },
      ],
    });

    await useFavoritesStore.getState().loadFavorites();
    await useFavoritesStore.getState().loadFavorites();

    expect(getFavoritesMock).toHaveBeenCalledTimes(1);
    expect(useFavoritesStore.getState().isFavorited("MOVIE", "movie-1")).toBe(true);
    expect(useFavoritesStore.getState().isFavorited("SERIES", "series-1")).toBe(true);
  });

  it("should clear favorites and reset loaded state", () => {
    useFavoritesStore.setState({
      keys: new Set(["MOVIE:movie-1"]),
      isLoaded: true,
    });

    useFavoritesStore.getState().clearFavorites();

    expect(useFavoritesStore.getState()).toMatchObject({
      keys: new Set(),
      isLoaded: false,
    });
  });

  it("should reconcile optimistic toggle success", async () => {
    toggleFavoriteMock.mockResolvedValue({
      favorited: true,
    });

    await expect(
      useFavoritesStore.getState().toggleFavorite("MOVIE", "movie-1"),
    ).resolves.toBe(true);

    expect(useFavoritesStore.getState().isFavorited("MOVIE", "movie-1")).toBe(true);
  });

  it("should rollback optimistic toggle failures", async () => {
    useFavoritesStore.setState({
      keys: new Set(["MOVIE:movie-1"]),
      isLoaded: true,
    });
    toggleFavoriteMock.mockRejectedValue(new Error("failed"));

    await expect(
      useFavoritesStore.getState().toggleFavorite("MOVIE", "movie-1"),
    ).rejects.toThrow("Falha ao alternar favorito");

    expect(useFavoritesStore.getState().isFavorited("MOVIE", "movie-1")).toBe(true);
  });
});
