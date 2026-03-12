import { describe, expect, it, vi } from "vitest";

const {
  discoverMoviesMock,
  discoverSeriesMock,
  getTmdbSeriesDetailsMock,
} = vi.hoisted(() => ({
  discoverMoviesMock: vi.fn(),
  discoverSeriesMock: vi.fn(),
  getTmdbSeriesDetailsMock: vi.fn(),
}));

vi.mock("@services/catalog/tmdb-discover", () => ({
  discoverMovies: discoverMoviesMock,
  discoverSeries: discoverSeriesMock,
  getMovieGenres: vi.fn(),
  getTvGenres: vi.fn(),
  getTmdbMovieDetails: vi.fn(),
  getTmdbSeriesDetails: getTmdbSeriesDetailsMock,
  getTmdbSeasonEpisodes: vi.fn(),
}));

vi.mock("@services/catalog/demo-videos", () => ({
  getDemoVideoUrl: vi.fn(),
}));

import { searchMovies, searchSeries } from "./db-store";

describe("catalog db-store sorting", () => {
  it("should sort movies by the selected display order", async () => {
    discoverMoviesMock.mockResolvedValue({
      total: 3,
      page: 1,
      pageSize: 3,
      totalPages: 1,
      items: [
        {
          id: "movie-1",
          title: "Zulu",
          displayTitle: "Zulu",
          groupTitle: "Ação",
          logoUrl: null,
          posterUrl: null,
          url: "/movie-1",
          quality: "HD",
          codec: null,
          year: 2020,
        },
        {
          id: "movie-2",
          title: "Alpha",
          displayTitle: "Alpha",
          groupTitle: "Drama",
          logoUrl: null,
          posterUrl: null,
          url: "/movie-2",
          quality: "HD",
          codec: null,
          year: 2024,
        },
        {
          id: "movie-3",
          title: "Bravo",
          displayTitle: "Bravo",
          groupTitle: "Drama",
          logoUrl: null,
          posterUrl: null,
          url: "/movie-3",
          quality: "HD",
          codec: null,
          year: 2022,
        },
      ],
    });

    const byTitle = await searchMovies({ sort: "title_asc", page: 1, pageSize: 3 });
    expect(byTitle.items.map((item) => item.title)).toEqual(["Alpha", "Bravo", "Zulu"]);

    const byYear = await searchMovies({ sort: "year_desc", page: 1, pageSize: 3 });
    expect(byYear.items.map((item) => item.title)).toEqual(["Alpha", "Bravo", "Zulu"]);
  });

  it("should sort series by title and episode count", async () => {
    discoverSeriesMock.mockResolvedValue({
      total: 3,
      page: 1,
      pageSize: 3,
      totalPages: 1,
      items: [
        {
          id: "tmdb_tv_1",
          slug: "tmdb_tv_1",
          title: "Gamma",
          groupTitle: "Drama",
          logoUrl: null,
          posterUrl: null,
          searchText: "gamma",
          seasonCount: 1,
          episodeCount: 5,
        },
        {
          id: "tmdb_tv_2",
          slug: "tmdb_tv_2",
          title: "Alpha",
          groupTitle: "Drama",
          logoUrl: null,
          posterUrl: null,
          searchText: "alpha",
          seasonCount: 1,
          episodeCount: 5,
        },
        {
          id: "tmdb_tv_3",
          slug: "tmdb_tv_3",
          title: "Beta",
          groupTitle: "Drama",
          logoUrl: null,
          posterUrl: null,
          searchText: "beta",
          seasonCount: 1,
          episodeCount: 5,
        },
      ],
    });

    getTmdbSeriesDetailsMock.mockImplementation(async (tmdbId: number) => {
      const episodeCounts = new Map<number, number>([
        [1, 8],
        [2, 24],
        [3, 12],
      ]);

      const episodeCount = episodeCounts.get(tmdbId) ?? 5;

      return {
        id: `tmdb_tv_${tmdbId}`,
        slug: `tmdb_tv_${tmdbId}`,
        title: `Series ${tmdbId}`,
        groupTitle: "Drama",
        logoUrl: null,
        posterUrl: null,
        searchText: `series ${tmdbId}`,
        seasonCount: 1,
        episodeCount,
        seasons: [],
      };
    });

    const byTitle = await searchSeries({ sort: "title_desc", page: 1, pageSize: 3 });
    expect(byTitle.items.map((item) => item.title)).toEqual(["Gamma", "Beta", "Alpha"]);

    const byEpisodes = await searchSeries({ sort: "episodes_desc", page: 1, pageSize: 3 });
    expect(byEpisodes.items.map((item) => item.title)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(getTmdbSeriesDetailsMock).toHaveBeenCalledTimes(3);
  });
});
