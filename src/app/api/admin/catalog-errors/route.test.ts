import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
  findUniqueMock,
  searchMoviesMock,
  searchSeriesMock,
  getSeriesDetailsSummaryMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  searchMoviesMock: vi.fn(),
  searchSeriesMock: vi.fn(),
  getSeriesDetailsSummaryMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@infrastructure/database/prisma", () => ({
  prisma: {
    profile: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@services/catalog/db-store", () => ({
  searchMovies: searchMoviesMock,
  searchSeries: searchSeriesMock,
  getSeriesDetailsSummary: getSeriesDetailsSummaryMock,
}));

import { GET } from "./route";

describe("admin/catalog-errors route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
    searchMoviesMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
    searchSeriesMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
    getSeriesDetailsSummaryMock.mockResolvedValue(null);
  });

  it("should reject anonymous users", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Não autorizado",
    });
  });

  it("should reject non-admin users", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      role: "USER",
    });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Não autorizado",
    });
  });

  it("should collect missing metadata and broken links from the current catalog services", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "admin-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      role: "ADMIN",
    });
    searchMoviesMock.mockResolvedValue({
      items: [
        {
          id: "tmdb_movie_10",
          title: "Movie without poster",
          displayTitle: "Movie without poster",
          groupTitle: "Drama",
          logoUrl: null,
          posterUrl: null,
          url: "https://demo.invalid/movie.mp4",
          quality: "HD",
          codec: null,
          year: 2025,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
    searchSeriesMock.mockResolvedValue({
      items: [
        {
          id: "tmdb_tv_22",
          slug: "tmdb_tv_22",
          title: "Series without streams",
          groupTitle: "Drama",
          logoUrl: "/poster.jpg",
          posterUrl: "/poster.jpg",
          searchText: "series without streams",
          seasonCount: 1,
          episodeCount: 1,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
    getSeriesDetailsSummaryMock.mockResolvedValue({
      id: "tmdb_tv_22",
      slug: "tmdb_tv_22",
      title: "Series without streams",
      groupTitle: "Drama",
      logoUrl: "/poster.jpg",
      posterUrl: "/poster.jpg",
      searchText: "series without streams",
      seasonCount: 0,
      episodeCount: 0,
      seasons: [],
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveLength(2);
    expect(payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "tmdb_movie_10",
          title: "Movie without poster",
          type: "missing_metadata",
        }),
        expect.objectContaining({
          id: "tmdb_tv_22",
          title: "Series without streams",
          type: "broken_link",
        }),
      ]),
    );
  });

  it("should report the source as unavailable when the catalog provider fails", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "admin-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      role: "ADMIN",
    });
    searchMoviesMock.mockRejectedValue(new Error("tmdb down"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "catalog_movies_source",
          title: "Fonte de filmes indisponível",
          type: "source_unavailable",
        }),
        expect.objectContaining({
          id: "catalog_series_source",
          title: "Fonte de séries indisponível",
          type: "source_unavailable",
        }),
      ]),
    );
  });
});
