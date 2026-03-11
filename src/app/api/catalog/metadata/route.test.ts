import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const {
  fetchEnrichedMetadataMock,
  fetchEnrichedMetadataByTmdbIdMock,
  getTmdbVideoKeyMock,
  cleanTitleForSearchMock,
} = vi.hoisted(() => ({
  fetchEnrichedMetadataMock: vi.fn(),
  fetchEnrichedMetadataByTmdbIdMock: vi.fn(),
  getTmdbVideoKeyMock: vi.fn(),
  cleanTitleForSearchMock: vi.fn(),
}));

vi.mock("@services/catalog/metadata-service", () => ({
  fetchEnrichedMetadata: fetchEnrichedMetadataMock,
  fetchEnrichedMetadataByTmdbId: fetchEnrichedMetadataByTmdbIdMock,
}));

vi.mock("@services/catalog/tmdb-discover", () => ({
  getTmdbVideoKey: getTmdbVideoKeyMock,
}));

vi.mock("@shared/utils", () => ({
  cleanTitleForSearch: cleanTitleForSearchMock,
}));

describe("catalog/metadata route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    cleanTitleForSearchMock.mockImplementation((value: string) => `clean:${value}`);
  });

  it("should reject missing params", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/catalog/metadata"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "missing_params",
    });
  });

  it("should fetch metadata by title and use cache on the second call", async () => {
    fetchEnrichedMetadataMock.mockResolvedValue({
      tmdbId: 10,
      title: "Movie",
    });
    getTmdbVideoKeyMock.mockResolvedValue("trailer-key");

    const request = new NextRequest(
      "http://localhost:3000/api/catalog/metadata?title=Movie&type=movie&year=2025",
    );

    const first = await GET(request);
    const second = await GET(request);

    await expect(first.json()).resolves.toEqual({
      fromCache: false,
      item: {
        tmdbId: 10,
        title: "Movie",
      },
      trailerKey: "trailer-key",
    });
    await expect(second.json()).resolves.toEqual({
      fromCache: true,
      item: {
        tmdbId: 10,
        title: "Movie",
      },
      trailerKey: null,
    });
  });

  it("should fetch metadata by tmdb id and fallback safely on service failure", async () => {
    fetchEnrichedMetadataByTmdbIdMock.mockRejectedValue(new Error("tmdb down"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/metadata?tmdbId=20&type=tv"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      fromCache: false,
      item: null,
      trailerKey: null,
      reason: "service_unavailable",
    });
  });
});
