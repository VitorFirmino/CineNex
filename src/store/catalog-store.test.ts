import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_GROUP_FILTERS,
  MOVIES_SORT_OPTIONS,
  SERIES_SORT_OPTIONS,
  selectActiveAdvancedCount,
  selectCurrentData,
  selectFilters,
  selectSortOptions,
  useCatalogStore,
} from "./catalog-store";
import type {
  MovieItem,
  PaginationResult,
  SeriesIndexItem,
} from "@shared/types/catalog-types";

function createMovieItem(): MovieItem {
  return {
    id: "movie-1",
    title: "Movie",
    displayTitle: "Movie",
    groupTitle: "Action",
    logoUrl: null,
    posterUrl: null,
    url: "/stream/movie-1",
    quality: "HD",
    codec: null,
    year: 2024,
  };
}

function createSeriesItem(): SeriesIndexItem {
  return {
    id: "series-1",
    slug: "series-1",
    title: "Series",
    groupTitle: "Drama",
    logoUrl: null,
    posterUrl: null,
    searchText: "series",
    seasonCount: 1,
    episodeCount: 10,
  };
}

const DEFAULT_STATE = useCatalogStore.getState();

describe("catalog-store", () => {
  beforeEach(() => {
    useCatalogStore.setState(DEFAULT_STATE, true);
  });

  afterEach(() => {
    useCatalogStore.setState(DEFAULT_STATE, true);
  });

  it("should toggle groups and enforce the maximum number of filters", () => {
    const store = useCatalogStore.getState();

    for (let index = 0; index < MAX_GROUP_FILTERS; index += 1) {
      store.onToggleGroupFilter(`group-${index}`);
    }

    expect(useCatalogStore.getState().selectedGroups).toHaveLength(MAX_GROUP_FILTERS);

    store.onToggleGroupFilter("overflow-group");
    expect(useCatalogStore.getState().selectedGroups).not.toContain("overflow-group");

    store.onToggleGroupFilter("group-1");
    expect(useCatalogStore.getState().selectedGroups).not.toContain("group-1");
  });

  it("should clear groups when all is toggled", () => {
    useCatalogStore.setState({
      selectedGroups: ["Aventura", "Drama"],
      page: 3,
      isLoadingList: false,
    });

    useCatalogStore.getState().onToggleGroupFilter("all");

    expect(useCatalogStore.getState()).toMatchObject({
      selectedGroups: [],
      page: 1,
      isLoadingList: true,
    });
  });

  it("should reset advanced filters and preserve the advanced dialog state", () => {
    useCatalogStore.setState({
      selectedGroups: ["Aventura"],
      legendado: "yes",
      hasPoster: "yes",
      codec: "H265",
      yearFrom: "2020",
      yearTo: "2024",
      minEpisodes: "10",
      sort: "year_desc",
      isAdvancedOpen: true,
      page: 4,
      isLoadingList: false,
    });

    useCatalogStore.getState().resetAdvancedFilters();

    expect(useCatalogStore.getState()).toMatchObject({
      selectedGroups: [],
      legendado: "all",
      hasPoster: "all",
      codec: "all",
      yearFrom: "",
      yearTo: "",
      minEpisodes: "",
      sort: "default",
      isAdvancedOpen: true,
      page: 1,
      isLoadingList: true,
    });
  });

  it("should change the query and switch to browse mode", () => {
    useCatalogStore.getState().setQuery("harry");

    expect(useCatalogStore.getState()).toMatchObject({
      query: "harry",
      viewMode: "browse",
      page: 1,
      isLoadingList: true,
    });
  });

  it("should expose the right sort options and active advanced count per tab", () => {
    useCatalogStore.setState({
      tab: "movies",
      selectedGroups: ["Aventura", "Drama"],
      legendado: "yes",
      hasPoster: "yes",
      codec: "H265",
      yearFrom: "2020",
      yearTo: "2024",
      sort: "year_desc",
    });

    expect(selectSortOptions(useCatalogStore.getState())).toEqual(MOVIES_SORT_OPTIONS);
    expect(selectActiveAdvancedCount(useCatalogStore.getState())).toBe(8);

    useCatalogStore.setState({
      tab: "series",
      codec: "all",
      yearFrom: "",
      yearTo: "",
      minEpisodes: "8",
    });

    expect(selectSortOptions(useCatalogStore.getState())).toEqual(SERIES_SORT_OPTIONS);
    expect(selectActiveAdvancedCount(useCatalogStore.getState())).toBe(6);
  });

  it("should ignore page changes while a change is already in progress", () => {
    useCatalogStore.setState({
      isChangingPage: true,
      page: 2,
      isLoadingList: false,
    });

    useCatalogStore.getState().changePage(5);
    expect(useCatalogStore.getState().page).toBe(2);

    useCatalogStore.setState({
      isChangingPage: false,
    });
    useCatalogStore.getState().changePage(5);

    expect(useCatalogStore.getState()).toMatchObject({
      page: 5,
      isChangingPage: true,
      isLoadingList: true,
    });
  });

  it("should select a single group and reset the pagination state", () => {
    useCatalogStore.setState({
      selectedGroups: ["Drama"],
      page: 3,
      isLoadingList: false,
    });

    useCatalogStore.getState().onSelectSingleGroup("Aventura");

    expect(useCatalogStore.getState()).toMatchObject({
      selectedGroups: ["Aventura"],
      page: 1,
      isLoadingList: true,
    });

    useCatalogStore.getState().onSelectSingleGroup("all");
    expect(useCatalogStore.getState().selectedGroups).toEqual([]);
  });

  it("should expose the current filters and active dataset through selectors", () => {
    const moviesData: PaginationResult<MovieItem> = {
      items: [createMovieItem()],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    };
    const seriesData: PaginationResult<SeriesIndexItem> = {
      items: [createSeriesItem()],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    };

    useCatalogStore.setState({
      tab: "movies",
      quality: "HD",
      legendado: "yes",
      moviesData,
      seriesData,
    });

    expect(selectFilters(useCatalogStore.getState())).toMatchObject({
      quality: "HD",
      legendado: "yes",
    });
    expect(selectCurrentData(useCatalogStore.getState())).toEqual(moviesData);

    useCatalogStore.setState({
      tab: "series",
    });

    expect(selectCurrentData(useCatalogStore.getState())).toEqual(seriesData);
  });

  it("should update browse state setters and page reset helpers", () => {
    useCatalogStore.getState().setViewMode("browse");
    useCatalogStore.getState().setIsCommandOpen(true);
    useCatalogStore.getState().setPage(4);
    useCatalogStore.getState().setPageSize(20);
    useCatalogStore.getState().setGroups([{ name: "Ação", count: 10 }]);
    useCatalogStore.getState().setIsLoadingList(false);
    useCatalogStore.getState().setIsChangingPage(true);
    useCatalogStore.getState().setHeroIndex(2);
    useCatalogStore.getState().setRecentWatchItems([
      {
        id: "recent-1",
        contentType: "movies",
        contentId: "movie-1",
        episodeId: null,
        title: "Movie",
        posterUrl: null,
        playHref: "/play/movies/movie-1",
        progressPct: 0.5,
        completed: false,
      },
    ]);
    useCatalogStore.getState().resetPageAndLoading();

    expect(useCatalogStore.getState()).toMatchObject({
      viewMode: "browse",
      isCommandOpen: true,
      page: 1,
      pageSize: 20,
      groups: [{ name: "Ação", count: 10 }],
      isLoadingList: true,
      isChangingPage: true,
      heroIndex: 2,
      recentWatchItems: [
        expect.objectContaining({
          id: "recent-1",
        }),
      ],
    });
  });
});
