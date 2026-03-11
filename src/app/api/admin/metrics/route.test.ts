import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const {
  createClientMock,
  getUserMock,
  findUniqueMock,
  profileCountMock,
  profileGroupByMock,
  favoriteGroupByMock,
  profileFindManyMock,
  fetchTmdbMetadataByIdMock,
  uptimeMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  profileCountMock: vi.fn(),
  profileGroupByMock: vi.fn(),
  favoriteGroupByMock: vi.fn(),
  profileFindManyMock: vi.fn(),
  fetchTmdbMetadataByIdMock: vi.fn(),
  uptimeMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@infrastructure/database/prisma", () => ({
  prisma: {
    profile: {
      findUnique: findUniqueMock,
      count: profileCountMock,
      groupBy: profileGroupByMock,
      findMany: profileFindManyMock,
    },
    favorite: {
      groupBy: favoriteGroupByMock,
    },
  },
}));

vi.mock("@services/catalog/tmdb", () => ({
  fetchTmdbMetadataById: fetchTmdbMetadataByIdMock,
}));

vi.mock("node:os", () => ({
  uptime: uptimeMock,
  default: {
    uptime: uptimeMock,
  },
}));

describe("admin/metrics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uptimeMock.mockReturnValue(7200);
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
  });

  it("should reject anonymous users", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Não autorizado",
    });
  });

  it("should reject non-admin users", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      role: "USER",
    });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Permissão negada",
    });
  });

  it("should return aggregated metrics for admin users", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "admin-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      role: "ADMIN",
    });
    profileCountMock
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(10);
    profileGroupByMock.mockResolvedValue([
      {
        currentContent: "A Guerra dos Mundos",
        _count: {
          _all: 3,
        },
      },
    ]);
    favoriteGroupByMock.mockResolvedValue([
      {
        type: "MOVIE",
        contentId: "tmdb_movie_10",
        _count: {
          _all: 4,
        },
      },
      {
        type: "SERIES",
        contentId: "legacy_series_id",
        _count: {
          _all: 2,
        },
      },
    ]);
    profileFindManyMock.mockResolvedValue([
      { createdAt: new Date("2026-03-09T00:00:00.000Z") },
      { createdAt: new Date("2026-03-09T12:00:00.000Z") },
      { createdAt: new Date("2026-03-10T00:00:00.000Z") },
    ]);
    fetchTmdbMetadataByIdMock.mockResolvedValue({
      title: "TMDB Title",
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.activeUsers).toBe(2);
    expect(payload.totalUsers).toBe(10);
    expect(payload.uptimeSeconds).toBe(7200);
    expect(payload.watchingNow).toEqual([
      {
        content: "A Guerra dos Mundos",
        count: 3,
      },
    ]);
    expect(payload.topFavorites).toEqual([
      {
        type: "MOVIE",
        id: "TMDB Title",
        count: 4,
      },
      {
        type: "SERIES",
        id: "legacy_series_id",
        count: 2,
      },
    ]);
    expect(fetchTmdbMetadataByIdMock).toHaveBeenCalledWith({
      tmdbId: 10,
      type: "movie",
    });
    expect(payload.growth).toEqual(
      expect.arrayContaining([
        { date: "2026-03-09", users: 2 },
        { date: "2026-03-10", users: 1 },
      ]),
    );
    expect(typeof payload.timestamp).toBe("string");
  });
});
