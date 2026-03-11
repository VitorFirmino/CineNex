import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const {
  createClientMock,
  getUserMock,
  ensureProfileForUserMock,
  findFirstMock,
  deleteManyMock,
  createMock,
  findManyMock,
  getLocalItemByIdMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  ensureProfileForUserMock: vi.fn(),
  findFirstMock: vi.fn(),
  deleteManyMock: vi.fn(),
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  getLocalItemByIdMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@services/auth/profile-sync", () => ({
  ensureProfileForUser: ensureProfileForUserMock,
}));

vi.mock("@infrastructure/database/prisma", () => ({
  prisma: {
    favorite: {
      findFirst: findFirstMock,
      deleteMany: deleteManyMock,
      create: createMock,
      findMany: findManyMock,
    },
  },
}));

vi.mock("@services/catalog/db-store", () => ({
  getLocalItemById: getLocalItemByIdMock,
}));

describe("auth/favorites route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
  });

  it("should reject anonymous users on get", async () => {
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

  it("should reject invalid favorite payloads on post", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/favorites", {
        method: "POST",
        body: JSON.stringify({
          type: "unknown",
          contentId: " ",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Parâmetros inválidos",
    });
  });

  it("should remove an existing favorite when the item is already favorited", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findFirstMock.mockResolvedValue({
      id: "fav-1",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/favorites", {
        method: "POST",
        body: JSON.stringify({
          type: "movies",
          contentId: " launch-tmdb_movie_10 ",
        }),
      }),
    );

    expect(ensureProfileForUserMock).toHaveBeenCalled();
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        profileId: "user-1",
        contentId: { in: ["launch-tmdb_movie_10", "tmdb_movie_10"] },
        type: { in: ["MOVIE", "MOVIES"] },
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      favorited: false,
    });
  });

  it("should create a new favorite when no existing record is found", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findFirstMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/auth/favorites", {
        method: "POST",
        body: JSON.stringify({
          type: "series",
          contentId: " series-tmdb_tv_22 ",
        }),
      }),
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        profileId: "user-1",
        type: "SERIES",
        contentId: "tmdb_tv_22",
      },
    });
    await expect(response.json()).resolves.toEqual({
      favorited: true,
    });
  });

  it("should deduplicate favorites and enrich them with local catalog details", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findManyMock.mockResolvedValue([
      {
        id: "fav-1",
        type: "MOVIE",
        contentId: "launch-tmdb_movie_10",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
      },
      {
        id: "fav-2",
        type: "MOVIES",
        contentId: "tmdb_movie_10",
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
      },
      {
        id: "fav-3",
        type: "SERIES",
        contentId: "tmdb_tv_22",
        createdAt: new Date("2026-03-08T00:00:00.000Z"),
      },
    ]);
    getLocalItemByIdMock.mockImplementation(async (type: string, id: string) => ({
      posterUrl: `https://image.test/${type}/${id}.jpg`,
      logoUrl: `https://image.test/${type}/${id}.png`,
    }));

    const response = await GET();
    const payload = await response.json();

    expect(payload.favorites).toHaveLength(2);
    expect(payload.favorites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentId: "tmdb_movie_10",
          type: "MOVIE",
          posterUrl: "https://image.test/movies/tmdb_movie_10.jpg",
        }),
        expect.objectContaining({
          contentId: "tmdb_tv_22",
          type: "SERIES",
          posterUrl: "https://image.test/series/tmdb_tv_22.jpg",
        }),
      ]),
    );
  });
});
