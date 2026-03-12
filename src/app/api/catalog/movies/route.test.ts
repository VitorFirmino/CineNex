import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const {
  searchMoviesMock,
  buildCacheControlMock,
  buildCatalogStreamPathMock,
  cleanTitleForSearchMock,
} = vi.hoisted(() => ({
  searchMoviesMock: vi.fn(),
  buildCacheControlMock: vi.fn(),
  buildCatalogStreamPathMock: vi.fn(),
  cleanTitleForSearchMock: vi.fn(),
}));

vi.mock("@services/catalog/db-store", () => ({
  searchMovies: searchMoviesMock,
}));

vi.mock("@shared/cache/cache-profiles", () => ({
  buildCacheControl: buildCacheControlMock,
}));

vi.mock("@shared/catalog/catalog-stream", () => ({
  buildCatalogStreamPath: buildCatalogStreamPathMock,
}));

vi.mock("@shared/utils", () => ({
  cleanTitleForSearch: cleanTitleForSearchMock,
}));

describe("catalog/movies route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildCacheControlMock.mockReturnValue("public, s-maxage=60");
    cleanTitleForSearchMock.mockImplementation((value: string) => `clean:${value}`);
    buildCatalogStreamPathMock.mockImplementation(({ id }) => `/api/catalog/stream?type=movies&id=${id}`);
  });

  it("should search movies and normalize response items", async () => {
    searchMoviesMock.mockResolvedValue({
      total: 1,
      page: 2,
      pageSize: 15,
      totalPages: 1,
      items: [
        {
          id: "movie-1",
          title: "Raw Title",
          displayTitle: "Display Title",
          groupTitle: "Action",
          logoUrl: null,
          posterUrl: null,
          url: "legacy",
          quality: "HD",
          codec: null,
          year: 2026,
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/movies?page=2&pageSize=15&q=harry&group=Aventura&sort=year_desc"),
    );

    expect(searchMoviesMock).toHaveBeenCalledWith({
      q: "harry",
      group: "Aventura",
      sort: "year_desc",
      page: 2,
      pageSize: 15,
    });
    
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=60");

    await expect(response.json()).resolves.toEqual({
      total: 1,
      page: 2,
      pageSize: 15,
      totalPages: 1,
      items: [
        expect.objectContaining({
          id: "movie-1",
          title: "clean:Raw Title",
          url: "/api/catalog/stream?type=movies&id=movie-1",
        }),
      ],
    });
  });

  it("should fall back to defaults and use displayTitle when title is missing", async () => {
    searchMoviesMock.mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 24,
      totalPages: 1,
      items: [
        {
          id: "movie-2",
          title: null,
          displayTitle: "Display Only",
          groupTitle: "Drama",
          logoUrl: null,
          posterUrl: null,
          url: "legacy",
          quality: null,
          codec: null,
          year: null,
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/movies?page=0&pageSize=999"),
    );

    expect(searchMoviesMock).toHaveBeenCalledWith({
      q: undefined,
      group: undefined,
      sort: undefined,
      page: 1,
      pageSize: 120,
    });
    expect(cleanTitleForSearchMock).toHaveBeenCalledWith("Display Only");
    await expect(response.json()).resolves.toEqual({
      total: 1,
      page: 1,
      pageSize: 24,
      totalPages: 1,
      items: [
        expect.objectContaining({
          id: "movie-2",
          title: "clean:Display Only",
          url: "/api/catalog/stream?type=movies&id=movie-2",
        }),
      ],
    });
  });
});
