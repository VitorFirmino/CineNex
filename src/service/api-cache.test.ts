import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("api-cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should record misses for missing entries", async () => {
    const apiCache = await import("./api-cache");

    expect(apiCache.cacheGet("movies")).toBeNull();
    expect(apiCache.cacheStats()).toEqual({
      entries: 0,
      hits: 0,
      misses: 1,
    });
  });

  it("should persist and restore cached entries from local storage", async () => {
    const initialModule = await import("./api-cache");

    initialModule.cacheSet("summary", { total: 42 }, 60_000);

    vi.resetModules();

    const restoredModule = await import("./api-cache");

    expect(restoredModule.cacheGet("summary")).toEqual({ total: 42 });
    expect(restoredModule.cacheStats()).toEqual({
      entries: 1,
      hits: 1,
      misses: 0,
    });
  });

  it("should expire entries after the configured ttl", async () => {
    const apiCache = await import("./api-cache");

    apiCache.cacheSet("groups", ["acao"], 1_000);
    vi.advanceTimersByTime(1_001);

    expect(apiCache.cacheGet("groups")).toBeNull();
    expect(apiCache.cacheStats()).toEqual({
      entries: 0,
      hits: 0,
      misses: 1,
    });
  });

  it("should notify listeners and reset counters when the cache is cleared", async () => {
    const apiCache = await import("./api-cache");
    const listener = vi.fn();
    const unsubscribe = apiCache.cacheSubscribe(listener);

    apiCache.cacheSet("movies", [{ id: "movie-1" }], 60_000);
    apiCache.cacheGet("movies");
    apiCache.cacheClear();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(apiCache.cacheGetVersion()).toBe(1);
    expect(apiCache.cacheStats()).toEqual({
      entries: 0,
      hits: 0,
      misses: 0,
    });

    unsubscribe();
  });
});
