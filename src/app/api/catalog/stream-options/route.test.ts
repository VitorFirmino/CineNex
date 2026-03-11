import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildCacheControlMock,
  getMovieStreamAlternativesMock,
  getSeriesEpisodeStreamAlternativesMock,
} = vi.hoisted(() => ({
  buildCacheControlMock: vi.fn(),
  getMovieStreamAlternativesMock: vi.fn(),
  getSeriesEpisodeStreamAlternativesMock: vi.fn(),
}));

vi.mock("@shared/cache/cache-profiles", () => ({
  buildCacheControl: buildCacheControlMock,
}));

vi.mock("@services/catalog/db-store", () => ({
  getMovieStreamAlternatives: getMovieStreamAlternativesMock,
  getSeriesEpisodeStreamAlternatives: getSeriesEpisodeStreamAlternativesMock,
}));

import { GET } from "./route";

describe("catalog/stream-options route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildCacheControlMock.mockReturnValue("public, s-maxage=60");
  });

  it("should reject invalid params", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/stream-options?type=movies"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_params",
    });
  });

  it("should return movie stream alternatives", async () => {
    getMovieStreamAlternativesMock.mockResolvedValue([{ id: "a" }]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/stream-options?type=movies&id=movie-1"),
    );

    expect(getMovieStreamAlternativesMock).toHaveBeenCalledWith("movie-1");
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=60");
    await expect(response.json()).resolves.toEqual({
      items: [{ id: "a" }],
      hasAlternatives: false,
    });
  });

  it("should return series stream alternatives", async () => {
    getSeriesEpisodeStreamAlternativesMock.mockResolvedValue([{ id: "b" }]);

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/catalog/stream-options?type=series&slug=serie-1&episodeId=ep-1",
      ),
    );

    expect(getSeriesEpisodeStreamAlternativesMock).toHaveBeenCalledWith(
      "serie-1",
      "ep-1",
    );
    await expect(response.json()).resolves.toEqual({
      items: [{ id: "b" }],
      hasAlternatives: false,
    });
  });
});
