import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  pushMock,
  backMock,
  getCatalogGroupsMock,
  listCatalogMock,
  listWatchProgressMock,
  authState,
  pathnameState,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  getCatalogGroupsMock: vi.fn(),
  listCatalogMock: vi.fn(),
  listWatchProgressMock: vi.fn(),
  authState: {
    user: null as { id: string } | null,
  },
  pathnameState: {
    value: "/collection/movies",
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
  }),
  usePathname: () => pathnameState.value,
}));

vi.mock("@hooks/use-auth", () => ({
  useAuth: () => ({
    user: authState.user,
  }),
}));

vi.mock("@infrastructure/api/catalog-api", () => ({
  getCatalogGroups: getCatalogGroupsMock,
  listCatalog: listCatalogMock,
}));

vi.mock("@infrastructure/api/auth-api", () => ({
  authApi: {
    listWatchProgress: listWatchProgressMock,
  },
}));

import {
  buildPagination,
  dedupeCatalogItems,
  resolveExternalHighlightPlayPath,
  placeholderImage,
  resolveExternalHighlightPath,
  resolveHeroImageUrl,
  useCatalogExplorer,
} from "./use-catalog-explorer";
import { useCatalogStore } from "@store/catalog-store";

const DEFAULT_STATE = useCatalogStore.getState();
const HIGHLIGHTS = {
  generatedAt: "2026-03-10T00:00:00.000Z",
  source: "test",
  hero: {
    id: "tmdb-movie-10",
    title: "Hero Movie",
    subtitle: "Filme",
    imageUrl: "https://image.example.com/hero.jpg",
    kind: "movies" as const,
  },
  rows: [
    {
      id: "featured",
      title: "Em destaque",
      items: [
        {
          id: "tmdb-movie-20",
          title: "Featured Movie",
          subtitle: "Filme",
          imageUrl: "https://image.example.com/featured.jpg",
          kind: "movies" as const,
        },
      ],
    },
  ],
};

const MOVIES_PAYLOAD = {
  items: [
    {
      id: "movie-b",
      title: "Hero Movie (2025)",
      displayTitle: "Hero Movie",
      groupTitle: "Ação",
      logoUrl: null,
      posterUrl: null,
      url: "/movie-b",
      quality: "HD",
      codec: null,
      year: 2025,
    },
    {
      id: "movie-a",
      title: "Hero Movie",
      displayTitle: "Hero Movie",
      groupTitle: "Ação",
      logoUrl: "/logo.png",
      posterUrl: "/poster.jpg",
      url: "/movie-a",
      quality: "FHD",
      codec: null,
      year: 2025,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

describe("use-catalog-explorer helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useCatalogStore.setState(DEFAULT_STATE, true);
    authState.user = null;
    pathnameState.value = "/collection/movies";
    window.innerWidth = 1400;
    getCatalogGroupsMock.mockResolvedValue({
      items: [{ name: "Ação", count: 10 }],
    });
    listCatalogMock.mockResolvedValue(MOVIES_PAYLOAD);
    listWatchProgressMock.mockResolvedValue({
      items: [],
    });
  });

  afterEach(() => {
    useCatalogStore.setState(DEFAULT_STATE, true);
    vi.useRealTimers();
  });

  it("should build compact pagination around the current page", () => {
    expect(buildPagination(5, 10)).toEqual([1, 3, 4, 5, 6, 7, 10]);
    expect(buildPagination(1, 3)).toEqual([1, 2, 3]);
  });

  it("should dedupe catalog items by keeping the strongest candidate", () => {
    const items = dedupeCatalogItems(
      [
        {
          id: "b",
          title: "Movie (2025)",
          displayTitle: "Movie",
          groupTitle: "Ação",
          logoUrl: null,
          posterUrl: null,
          url: "/movie-b",
          quality: "HD",
          codec: null,
          year: 2025,
        },
        {
          id: "a",
          title: "Movie",
          displayTitle: "Movie",
          groupTitle: "Ação",
          logoUrl: "/logo.png",
          posterUrl: "/poster.jpg",
          url: "/movie-a",
          quality: "FHD",
          codec: null,
          year: 2025,
        },
      ],
      "movies",
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("a");
  });

  it("should resolve hero images and fall back to placeholders", () => {
    expect(resolveHeroImageUrl(null)).toContain("data:image/svg+xml");
    expect(resolveHeroImageUrl("//image.tmdb.org/test.jpg")).toBe(
      "https://image.tmdb.org/test.jpg",
    );
    expect(placeholderImage("poster")).toContain("data:image/svg+xml");
  });

  it("should resolve external highlight paths from ids and metadata", () => {
    expect(
      resolveExternalHighlightPath({
        id: "tmdb-movie-10",
        badge: "",
        subtitle: "",
        externalUrl: "",
      }),
    ).toBe("/view/movies/10");

    expect(
      resolveExternalHighlightPath({
        id: "123",
        badge: "Série",
        subtitle: "Série",
        externalUrl: "https://example.com/tv/123",
      }),
    ).toBe("/view/series/123");
  });

  it("should resolve external highlight play paths for movies and series", () => {
    expect(
      resolveExternalHighlightPlayPath({
        id: "tmdb-movie-10",
        badge: "",
        subtitle: "",
        externalUrl: "",
      }),
    ).toBe("/play/movies/10");

    expect(
      resolveExternalHighlightPlayPath({
        id: "tmdb-tv-111110",
        badge: "Série",
        subtitle: "Série",
        externalUrl: "https://example.com/tv/111110",
      }),
    ).toBe("/play/series/111110?episodeId=tmdb_tv_111110_s1_e1");
  });

  it("should fallback to null when the external highlight cannot be mapped", () => {
    expect(
      resolveExternalHighlightPath({
        id: "custom-highlight",
        badge: "",
        subtitle: "",
        externalUrl: "",
      }),
    ).toBeNull();
  });

  it("should normalize hero placeholders and dedupe series independently from movie years", () => {
    expect(resolveHeroImageUrl(" undefined ")).toContain("data:image/svg+xml");
    expect(resolveHeroImageUrl("N/A")).toContain("data:image/svg+xml");

    const items = dedupeCatalogItems(
      [
        {
          id: "series-b",
          slug: "series-b",
          title: "The Show",
          groupTitle: "Drama",
          posterUrl: null,
          logoUrl: null,
          searchText: "the show",
          seasonCount: 1,
          episodeCount: 8,
        },
        {
          id: "series-a",
          slug: "series-a",
          title: "The Show",
          groupTitle: "Drama",
          posterUrl: "/poster.jpg",
          logoUrl: null,
          searchText: "the show",
          seasonCount: 1,
          episodeCount: 8,
        },
      ],
      "series",
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("series-a");
  });

  it("should load groups, catalog items and recent watch data for authenticated users", async () => {
    authState.user = { id: "user-1" };
    listWatchProgressMock.mockResolvedValue({
      items: [
        {
          id: "recent-1",
          contentType: "movies",
          contentId: "movie-a",
          episodeId: null,
          title: "Recent Movie",
          posterUrl: "/recent.jpg",
          playHref: "/play/movies/movie-a",
          progressPct: 0.35,
          completed: false,
        },
      ],
    });

    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
      }),
    );

    await waitFor(() => {
      expect(result.current.groups).toEqual([{ name: "Ação", count: 10 }]);
    });

    expect(listWatchProgressMock).toHaveBeenCalledWith(18);
    expect(getCatalogGroupsMock).toHaveBeenCalledWith("movies", {
      cacheTtlMs: 600000,
    });
    expect(listCatalogMock).toHaveBeenCalled();
    expect(result.current.discoverRows[0]?.id).toBe("recently-watched");
    expect(result.current.currentData?.items).toHaveLength(2);
    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.visibleItems[0]?.id).toBe("movie-a");
    expect(result.current.activeHero?.id).toBe("tmdb-movie-10");
  });

  it("should expose callbacks for tab, query, page, scrolling and highlight navigation", async () => {
    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
      }),
    );

    await waitFor(() => {
      expect(listCatalogMock).toHaveBeenCalled();
    });

    const scrollIntoViewMock = vi.fn();
    act(() => {
      (result.current.catalogSectionRef as React.MutableRefObject<{ scrollIntoView: typeof scrollIntoViewMock } | null>).current = {
        scrollIntoView: scrollIntoViewMock,
      };
    });

    act(() => {
      result.current.scrollToCatalog();
      result.current.onHighlightClick({
        id: "custom-highlight",
        title: "External",
        subtitle: "Filme",
        imageUrl: null,
        kind: "external",
        externalUrl: "https://example.com/movie/44",
      });
      result.current.onHighlightClick({
        id: "launch-abc123",
        title: "Internal",
        subtitle: "Filme",
        imageUrl: null,
        kind: "movies",
      });
      result.current.onTabChange("series");
      result.current.onPageChange(3);
      result.current.onQueryChange("harry");
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(pushMock).toHaveBeenCalledWith("https://example.com/movie/44");
    expect(pushMock).toHaveBeenCalledWith("/view/movies/abc123");
    expect(pushMock).toHaveBeenCalledWith("/collection/series", { scroll: false });
    expect(useCatalogStore.getState()).toMatchObject({
      tab: "series",
      page: 1,
      query: "harry",
      viewMode: "browse",
    });
  });

  it("should route external highlights to internal catalog views when they can be mapped", async () => {
    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
      }),
    );

    await waitFor(() => {
      expect(listCatalogMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.onHighlightClick({
        id: "123",
        title: "Serie externa",
        subtitle: "Série",
        imageUrl: null,
        kind: "external",
        externalUrl: "https://example.com/tv/123",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/view/series/123");
  });

  it("should react to carousel selection callbacks", async () => {
    const onMock = vi.fn();
    const offMock = vi.fn();
    const selectedScrollSnapMock = vi.fn().mockReturnValue(1);
    const scrollNextMock = vi.fn();

    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
      }),
    );

    await waitFor(() => {
      expect(result.current.heroSlides).toHaveLength(2);
    });

    act(() => {
      result.current.setHeroApi({
        on: onMock,
        off: offMock,
        selectedScrollSnap: selectedScrollSnapMock,
        scrollNext: scrollNextMock,
      } as never);
    });

    await waitFor(() => {
      expect(result.current.heroIndex).toBe(1);
    });

    expect(onMock).toHaveBeenCalledWith("select", expect.any(Function));
    expect(onMock).toHaveBeenCalledWith("reInit", expect.any(Function));
  });

  it("should auto-advance the hero carousel and reset out-of-range indexes", async () => {
    vi.useFakeTimers();
    useCatalogStore.setState({ heroIndex: 8 });

    const scrollNextMock = vi.fn();
    const scrollToMock = vi.fn();

    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
      }),
    );

    expect(result.current.heroSlides).toHaveLength(2);

    act(() => {
      result.current.setHeroApi({
        on: vi.fn(),
        off: vi.fn(),
        selectedScrollSnap: vi.fn().mockReturnValue(0),
        scrollNext: scrollNextMock,
        scrollTo: scrollToMock,
      } as never);
    });

    expect(scrollToMock).toHaveBeenCalledWith(0);

    act(() => {
      vi.advanceTimersByTime(6500);
    });

    expect(scrollNextMock).toHaveBeenCalledTimes(1);
  });

  it("should refetch catalog data when advanced movie filters change", async () => {
    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
      }),
    );

    await waitFor(() => {
      expect(listCatalogMock).toHaveBeenCalled();
    });

    listCatalogMock.mockClear();

    act(() => {
      result.current.filters.onToggleGroupFilter("Aventura");
      result.current.filters.onQualityChange("FHD");
      result.current.filters.setLegendado("yes");
      result.current.filters.setHasPoster("yes");
      result.current.filters.setCodec("H265");
      result.current.filters.setYearFrom("2020");
      result.current.filters.setYearTo("2024");
      result.current.filters.onSortChange("year_desc");
    });

    await waitFor(() => {
      expect(listCatalogMock).toHaveBeenCalledTimes(1);
    });

    expect(listCatalogMock).toHaveBeenLastCalledWith({
      type: "movies",
      query: {
        page: 1,
        pageSize: 20,
        q: "",
        sort: "year_desc",
        groups: ["Aventura"],
        quality: "FHD",
        legendado: "yes",
        hasPoster: true,
        codec: "H265",
        yearFrom: "2020",
        yearTo: "2024",
        minEpisodes: "",
      },
      signal: expect.any(AbortSignal),
      cacheTtlMs: 300_000,
    });
  });

  it("should keep series requests scoped to series filters only", async () => {
    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
        initialTab: "series",
      }),
    );

    await waitFor(() => {
      expect(listCatalogMock).toHaveBeenCalled();
    });

    listCatalogMock.mockClear();

    act(() => {
      result.current.filters.onQualityChange("FHD");
      result.current.filters.setCodec("H265");
      result.current.filters.setYearFrom("2020");
      result.current.filters.setYearTo("2024");
      result.current.filters.setLegendado("yes");
      result.current.filters.setHasPoster("yes");
      result.current.filters.setMinEpisodes("8");
    });

    await waitFor(() => {
      expect(listCatalogMock).toHaveBeenCalledTimes(1);
    });

    expect(listCatalogMock).toHaveBeenLastCalledWith({
      type: "series",
      query: {
        page: 1,
        pageSize: 20,
        q: "",
        sort: "default",
        groups: [],
        quality: undefined,
        legendado: "yes",
        hasPoster: true,
        codec: undefined,
        yearFrom: undefined,
        yearTo: undefined,
        minEpisodes: "8",
      },
      signal: expect.any(AbortSignal),
      cacheTtlMs: 300_000,
    });
  });

  it("should clear stale groups when reloading the categories fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
      }),
    );

    await waitFor(() => {
      expect(result.current.groups).toEqual([{ name: "Ação", count: 10 }]);
    });

    getCatalogGroupsMock.mockRejectedValueOnce(new Error("groups down"));

    act(() => {
      result.current.onTabChange("series");
    });

    await waitFor(() => {
      expect(result.current.groups).toEqual([]);
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[catalog-explorer] Falha ao carregar categorias.",
      expect.any(Error),
    );
  });

  it("should recover safely when loading recent items, groups or catalog fails", async () => {
    authState.user = { id: "user-1" };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getCatalogGroupsMock.mockRejectedValue(new Error("groups down"));
    listCatalogMock.mockRejectedValue(new Error("catalog down"));
    listWatchProgressMock.mockRejectedValue(new Error("recent down"));

    const { result } = renderHook(() =>
      useCatalogExplorer({
        highlights: HIGHLIGHTS,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoadingList).toBe(false);
    });

    expect(result.current.groups).toEqual([]);
    expect(useCatalogStore.getState().recentWatchItems).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(3);
  });
});
