import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchEnrichedMetadata,
  fetchEnrichedMetadataByTmdbId,
  getCachedMetadata
} from "./metadata-service";

const {
  fetchTmdbMetadataMock,
  fetchTmdbMetadataByIdMock,
} = vi.hoisted(() => ({
  fetchTmdbMetadataMock: vi.fn(),
  fetchTmdbMetadataByIdMock: vi.fn(),
}));

vi.mock("./tmdb", () => ({
  fetchTmdbMetadata: fetchTmdbMetadataMock,
  fetchTmdbMetadataById: fetchTmdbMetadataByIdMock,
}));

describe("metadata-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should cache metadata fetched by tmdb id", async () => {
    fetchTmdbMetadataByIdMock.mockResolvedValue({
      tmdbId: 42,
      title: "Movie",
    });

    const first = await fetchEnrichedMetadataByTmdbId({
      tmdbId: 42,
      type: "movie",
    });
    const second = await fetchEnrichedMetadataByTmdbId({
      tmdbId: 42,
      type: "movie",
    });

    expect(first).toEqual({ tmdbId: 42, title: "Movie" });
    expect(second).toEqual({ tmdbId: 42, title: "Movie" });
    expect(fetchTmdbMetadataByIdMock).toHaveBeenCalledTimes(1);
  });

  it("should retry with a shortened title when the first lookup misses", async () => {
    fetchTmdbMetadataMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        tmdbId: 99,
        title: "Cidade de Deus",
      });


    const result = await fetchEnrichedMetadata({
      title: "Cidade de Deus Versao Estendida",
      type: "movie",
      year: 2002,
    });

    expect(fetchTmdbMetadataMock).toHaveBeenNthCalledWith(1, {
      title: "Cidade de Deus Versao Estendida",
      type: "movie",
      year: 2002,
    });
    expect(fetchTmdbMetadataMock).toHaveBeenNthCalledWith(2, {
      title: "Cidade de Deus",
      type: "movie",
      year: 2002,
    });
    expect(result).toEqual({
      tmdbId: 99,
      title: "Cidade de Deus",
    });
  });

  it("should expose cached metadata using the normalized title", async () => {
    fetchTmdbMetadataMock.mockResolvedValue({
      tmdbId: 7,
      title: "Matrix",
    });


    await fetchEnrichedMetadata({
      title: "1999 - Matrix (1999) [1080p]",
      type: "movie",
      year: 1999,
    });

    expect(
      getCachedMetadata("Matrix 1999", "movie", 1999),
    ).toEqual({
      tmdbId: 7,
      title: "Matrix",
    });
  });
});
