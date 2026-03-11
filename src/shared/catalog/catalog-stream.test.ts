import { describe, expect, it } from "vitest";
import { buildCatalogStreamPath, isAdaptiveStreamUrl } from "./catalog-stream";

describe("catalog-stream", () => {
  it("should build movie stream paths", () => {
    expect(buildCatalogStreamPath({ type: "movies", id: "movie-1" })).toBe(
      "/api/catalog/stream?type=movies&id=movie-1",
    );
  });

  it("should build series stream paths", () => {
    expect(
      buildCatalogStreamPath({
        type: "series",
        slug: "serie-1",
        episodeId: "ep-1",
      }),
    ).toBe("/api/catalog/stream?type=series&slug=serie-1&episodeId=ep-1");
  });

  it("should encode ids and slugs in the query string", () => {
    expect(buildCatalogStreamPath({ type: "movies", id: "movie/1" })).toBe(
      "/api/catalog/stream?type=movies&id=movie%2F1",
    );
    expect(
      buildCatalogStreamPath({
        type: "series",
        slug: "serie 1",
        episodeId: "ep/1",
      }),
    ).toBe("/api/catalog/stream?type=series&slug=serie+1&episodeId=ep%2F1");
  });

  it("should detect adaptive playlist stream urls", () => {
    const adaptiveUrl = [
      "https://stream.example.com/master.",
      String.fromCharCode(109, 51, 117, 56),
    ].join("");

    expect(isAdaptiveStreamUrl(adaptiveUrl)).toBe(true);
    expect(isAdaptiveStreamUrl("https://stream.example.com/video.mp4")).toBe(false);
    expect(isAdaptiveStreamUrl("/api/catalog/stream?type=movies&id=movie-1")).toBe(false);
  });
});
