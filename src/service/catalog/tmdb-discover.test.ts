import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { discoverMovies } from "./tmdb-discover";

const fetchMock = vi.fn();
const ORIGINAL_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const ORIGINAL_API_KEY = process.env.TMDB_API_KEY;

function buildMovieResult(id: number) {
  return {
    id,
    title: `Movie ${id}`,
    release_date: "2026-01-01",
    poster_path: null,
    genre_ids: [28],
  };
}

function buildOkResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}

describe("tmdb-discover pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    process.env.TMDB_BEARER_TOKEN = "test-token";
    delete process.env.TMDB_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (typeof ORIGINAL_BEARER_TOKEN === "undefined") delete process.env.TMDB_BEARER_TOKEN;
    else process.env.TMDB_BEARER_TOKEN = ORIGINAL_BEARER_TOKEN;

    if (typeof ORIGINAL_API_KEY === "undefined") delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = ORIGINAL_API_KEY;
  });

  it("should stitch adjacent TMDB pages for catalog page boundaries", async () => {
    fetchMock.mockImplementation(async (input: URL | string) => {
      const url = new URL(String(input));
      const page = Number(url.searchParams.get("page") ?? "1");

      if (page === 1) {
        return buildOkResponse({
          total_results: 40,
          total_pages: 2,
          results: Array.from({ length: 20 }, (_, index) => buildMovieResult(index + 1)),
        });
      }

      return buildOkResponse({
        total_results: 40,
        total_pages: 2,
        results: Array.from({ length: 20 }, (_, index) => buildMovieResult(index + 21)),
      });
    });

    const result = await discoverMovies({ page: 2, pageSize: 15 });

    expect(result.page).toBe(2);
    expect(result.total).toBe(40);
    expect(result.totalPages).toBe(3);
    expect(result.items).toHaveLength(15);
    expect(result.items[0]?.id).toBe("tmdb_movie_16");
    expect(result.items.at(-1)?.id).toBe("tmdb_movie_30");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const requestedPages = fetchMock.mock.calls.map(([input]) =>
      new URL(String(input)).searchParams.get("page"),
    );
    expect(requestedPages).toEqual(["1", "2"]);
  });

  it("should clamp unreachable overflow pages to the last TMDB-backed page", async () => {
    fetchMock.mockImplementation(async () =>
      buildOkResponse({
        total_results: 1_234_567,
        total_pages: 500,
        results: Array.from({ length: 20 }, (_, index) => buildMovieResult(index + 9981)),
      }),
    );

    const result = await discoverMovies({ page: 61_758, pageSize: 15 });

    expect(result.page).toBe(667);
    expect(result.total).toBe(10_000);
    expect(result.totalPages).toBe(667);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]?.id).toBe("tmdb_movie_9991");
    expect(result.items.at(-1)?.id).toBe("tmdb_movie_10000");

    const requestedPages = fetchMock.mock.calls.map(([input]) =>
      new URL(String(input)).searchParams.get("page"),
    );
    expect(requestedPages.every((page) => page === "500")).toBe(true);
  });
});
