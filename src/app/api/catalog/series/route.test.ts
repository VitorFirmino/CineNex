import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const {
  searchSeriesMock,
  buildCacheControlMock,
  cleanTitleForSearchMock,
} = vi.hoisted(() => ({
  searchSeriesMock: vi.fn(),
  buildCacheControlMock: vi.fn(),
  cleanTitleForSearchMock: vi.fn(),
}));

vi.mock("@services/catalog/db-store", () => ({
  searchSeries: searchSeriesMock,
}));

vi.mock("@shared/cache/cache-profiles", () => ({
  buildCacheControl: buildCacheControlMock,
}));

vi.mock("@shared/utils", () => ({
  cleanTitleForSearch: cleanTitleForSearchMock,
}));

describe("catalog/series route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildCacheControlMock.mockReturnValue("public, s-maxage=60");
    cleanTitleForSearchMock.mockImplementation((value: string) => `clean:${value}`);
  });

  it("should search series and normalize titles", async () => {
    searchSeriesMock.mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 24,
      totalPages: 1,
      items: [
        {
          id: "series-1",
          slug: "series-1",
          title: "Raw Series",
          groupTitle: "Drama",
          logoUrl: null,
          posterUrl: null,
          searchText: "raw series",
          seasonCount: 1,
          episodeCount: 8,
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/series?group=Drama&minEpisodes=8"),
    );

    expect(searchSeriesMock).toHaveBeenCalledWith({
      q: undefined,
      group: "Drama",
      minEpisodes: 8,
      page: 1,
      pageSize: 24,
    });
    await expect(response.json()).resolves.toEqual({
      total: 1,
      page: 1,
      pageSize: 24,
      totalPages: 1,
      items: [
        expect.objectContaining({
          id: "series-1",
          title: "clean:Raw Series",
        }),
      ],
    });
  });

  it("should clamp paging params and normalize minEpisodes to the allowed minimum", async () => {
    searchSeriesMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 120,
      totalPages: 0,
      items: [],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/catalog/series?page=-2&pageSize=999&minEpisodes=0&q=%20%20",
      ),
    );

    expect(searchSeriesMock).toHaveBeenCalledWith({
      q: undefined,
      group: undefined,
      minEpisodes: 1,
      page: 1,
      pageSize: 120,
    });
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=60");
    await expect(response.json()).resolves.toEqual({
      total: 0,
      page: 1,
      pageSize: 120,
      totalPages: 0,
      items: [],
    });
  });
});
