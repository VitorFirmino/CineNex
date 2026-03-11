import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, OPTIONS } from "./route";

const {
  resolveMovieStreamUrlMock,
  resolveSeriesEpisodeStreamUrlMock,
} = vi.hoisted(() => ({
  resolveMovieStreamUrlMock: vi.fn(),
  resolveSeriesEpisodeStreamUrlMock: vi.fn(),
}));

vi.mock("@services/catalog/db-store", () => ({
  resolveMovieStreamUrl: resolveMovieStreamUrlMock,
  resolveSeriesEpisodeStreamUrl: resolveSeriesEpisodeStreamUrlMock,
}));

describe("catalog/stream route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should expose permissive cors headers on options", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("should reject invalid types", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/stream?type=invalid"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_type",
    });
  });

  it("should require series references", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/stream?type=series&slug=serie"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "missing_series_reference",
    });
  });

  it("should require a movie id", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/stream?type=movies"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "missing_item_id",
    });
  });

  it("should return not found when no movie stream exists", async () => {
    resolveMovieStreamUrlMock.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/stream?type=movies&id=movie-1"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "stream_not_found",
    });
  });

  it("should redirect to the resolved movie stream url", async () => {
    resolveMovieStreamUrlMock.mockResolvedValue("https://stream.example.com/movie-source");

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/stream?type=movies&id=movie-1"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://stream.example.com/movie-source",
    );
  });

  it("should redirect to the resolved series stream url", async () => {
    resolveSeriesEpisodeStreamUrlMock.mockResolvedValue(
      "https://stream.example.com/series-source",
    );

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/catalog/stream?type=series&slug=serie-1&episodeId=ep-1",
      ),
    );

    expect(resolveSeriesEpisodeStreamUrlMock).toHaveBeenCalledWith(
      "serie-1",
      "ep-1",
    );
    expect(response.status).toBe(302);
  });
});
