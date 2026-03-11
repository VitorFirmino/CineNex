import { describe, expect, it } from "vitest";
import { normalizeCatalogContentId } from "./content-id";

describe("content-id", () => {
  it("should strip legacy catalog prefixes", () => {
    expect(normalizeCatalogContentId("series-breaking-bad")).toBe("breaking-bad");
    expect(normalizeCatalogContentId("launch-premiere")).toBe("premiere");
    expect(normalizeCatalogContentId("4k-movie")).toBe("movie");
  });

  it("should trim and remove prefixes case-insensitively", () => {
    expect(normalizeCatalogContentId("  SERIES-breaking-bad  ")).toBe("breaking-bad");
  });

  it("should preserve ids without legacy prefixes", () => {
    expect(normalizeCatalogContentId("tmdb_movie_755898")).toBe("tmdb_movie_755898");
  });

  it("should return an empty string for blank values", () => {
    expect(normalizeCatalogContentId("   ")).toBe("");
  });
});
