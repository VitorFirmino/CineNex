import { describe, expect, it } from "vitest";
import { buildCacheControl, getCacheTTL } from "./cache-profiles";

describe("cache-profiles", () => {
  it("should expose the configured ttl for each cache profile", () => {
    expect(getCacheTTL("summary")).toEqual({
      stale: 60,
      revalidate: 120,
      expire: 900,
    });
    expect(getCacheTTL("groups")).toEqual({
      stale: 120,
      revalidate: 300,
      expire: 1800,
    });
  });

  it("should build cache-control headers from the ttl", () => {
    expect(buildCacheControl("movies")).toBe(
      "public, s-maxage=60, stale-while-revalidate=120",
    );
  });

  it("should expose series details ttl separately from the list cache", () => {
    expect(getCacheTTL("seriesDetails")).toEqual({
      stale: 120,
      revalidate: 300,
      expire: 1800,
    });
    expect(buildCacheControl("seriesDetails")).toBe(
      "public, s-maxage=120, stale-while-revalidate=300",
    );
  });
});
