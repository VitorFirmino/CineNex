import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  catalogApi,
  getCatalogGroups,
  getCatalogMetadata,
  getCatalogStreamOptions,
  getSeriesSeasonEpisodes,
  listCatalog,
} from "./catalog-api";

const { axiosGetMock, cachedGetJsonMock } = vi.hoisted(() => ({
  axiosGetMock: vi.fn(),
  cachedGetJsonMock: vi.fn(),
}));

vi.mock("@infrastructure/http/axios-client", () => ({
  axiosClient: {
    get: axiosGetMock,
  },
}));

vi.mock("@services/api-client", () => ({
  cachedGetJson: cachedGetJsonMock,
}));

describe("catalog-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build a movie catalog request with filters", async () => {
    axiosGetMock.mockResolvedValue({
      data: { items: [] },
    });

    await listCatalog({
      type: "movies",
      query: {
        page: 2,
        pageSize: 20,
        q: "harry",
        groups: ["Aventura", "Drama"],
        quality: "HD",
        codec: "H265",
        yearFrom: 2020,
        yearTo: 2024,
      },
    });

    expect(axiosGetMock).toHaveBeenCalledWith(
      "/api/catalog/movies?page=2&pageSize=20&q=harry&sort=default&legendado=all&hasPoster=&group=Aventura%2CDrama&quality=HD&codec=H265&yearFrom=2020&yearTo=2024",
      { signal: undefined },
    );
  });

  it("should build a series catalog request with minEpisodes", async () => {
    axiosGetMock.mockResolvedValue({
      data: { items: [] },
    });

    await listCatalog({
      type: "series",
      query: {
        minEpisodes: 8,
      },
    });

    expect(axiosGetMock).toHaveBeenCalledWith(
      "/api/catalog/series?page=1&pageSize=15&q=&sort=default&legendado=all&hasPoster=&minEpisodes=8",
      { signal: undefined },
    );
  });

  it("should use cachedGetJson when a cache ttl is provided", async () => {
    cachedGetJsonMock.mockResolvedValue({ items: [] });

    await getCatalogGroups("movies", { cacheTtlMs: 60_000 });

    expect(cachedGetJsonMock).toHaveBeenCalledWith(
      "/api/catalog/groups?type=movies",
      60_000,
      undefined,
    );
  });

  it("should build metadata, season episodes and stream options urls", async () => {
    axiosGetMock.mockResolvedValue({ data: {} });

    await getCatalogMetadata({ type: "movie", title: "Movie", year: 2025, tmdbId: 10 });
    await getSeriesSeasonEpisodes("serie/1", 2);
    await getCatalogStreamOptions({ type: "series", slug: "serie-1", episodeId: "ep-1" });

    expect(axiosGetMock).toHaveBeenNthCalledWith(
      1,
      "/api/catalog/metadata?type=movie&title=Movie&year=2025&tmdbId=10",
      { signal: undefined },
    );
    expect(axiosGetMock).toHaveBeenNthCalledWith(
      2,
      "/api/catalog/series/serie%2F1?season=2",
      { signal: undefined },
    );
    expect(axiosGetMock).toHaveBeenNthCalledWith(
      3,
      "/api/catalog/stream-options?type=series&slug=serie-1&episodeId=ep-1",
      { signal: undefined },
    );
    expect(catalogApi.getCatalogGroups).toBe(getCatalogGroups);
  });
});
