import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const {
  createClientMock,
  getUserMock,
  ensureProfileForUserMock,
  getWatchProgressForContentMock,
  listWatchProgressMock,
  upsertWatchProgressMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  ensureProfileForUserMock: vi.fn(),
  getWatchProgressForContentMock: vi.fn(),
  listWatchProgressMock: vi.fn(),
  upsertWatchProgressMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@services/auth/profile-sync", () => ({
  ensureProfileForUser: ensureProfileForUserMock,
}));

vi.mock("@services/auth/watch-progress-store", () => ({
  getWatchProgressForContent: getWatchProgressForContentMock,
  listWatchProgress: listWatchProgressMock,
  upsertWatchProgress: upsertWatchProgressMock,
}));

describe("auth/watch-progress route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
  });

  it("should return an empty payload for anonymous get requests", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const response = await GET(
      new Request("http://localhost:3000/api/auth/watch-progress"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      items: [],
      item: null,
    });
    expect(listWatchProgressMock).not.toHaveBeenCalled();
  });

  it("should fetch a single watch-progress item when content params are present", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    getWatchProgressForContentMock.mockResolvedValue({
      id: "wp-1",
      contentId: "movie-1",
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/api/auth/watch-progress?contentType=movie&contentId=movie-1",
      ),
    );

    await expect(response.json()).resolves.toEqual({
      item: {
        id: "wp-1",
        contentId: "movie-1",
      },
    });
    expect(getWatchProgressForContentMock).toHaveBeenCalledWith(
      "user-1",
      "movies",
      "movie-1",
    );
  });

  it("should list recent watch-progress items when content params are absent", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    listWatchProgressMock.mockResolvedValue([{ id: "wp-1" }]);

    const response = await GET(
      new Request("http://localhost:3000/api/auth/watch-progress?limit=18"),
    );

    await expect(response.json()).resolves.toEqual({
      items: [{ id: "wp-1" }],
    });
    expect(listWatchProgressMock).toHaveBeenCalledWith("user-1", 18);
  });

  it("should return a safe response for anonymous post requests", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/watch-progress", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      saved: false,
      reason: "unauthorized",
    });
  });

  it("should reject invalid payloads on post", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/watch-progress", {
        method: "POST",
        body: JSON.stringify({
          contentType: "movie",
          contentId: "movie-1",
          playHref: "",
          positionSec: 32,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Parâmetros inválidos",
    });
  });

  it("should ignore aborted body reads on post", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST({
      json: vi.fn().mockRejectedValue(
        Object.assign(new Error("aborted"), { code: "ECONNRESET" }),
      ),
    } as unknown as Request);

    expect(response.status).toBe(204);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should normalize and save valid payloads on post", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "qa.user@example.com",
        },
      },
    });
    upsertWatchProgressMock.mockResolvedValue({
      id: "wp-1",
      contentId: "movie-1",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/watch-progress", {
        method: "POST",
        body: JSON.stringify({
          contentType: "movie",
          contentId: "  movie-1  ",
          playHref: " /play/movies/movie-1 ",
          positionSec: 12,
          durationSec: 100,
          episodeId: "  ",
          title: " Movie title ",
          posterUrl: " https://image.test/poster.jpg ",
          completed: 1,
        }),
      }),
    );

    expect(ensureProfileForUserMock).toHaveBeenCalledWith({
      id: "user-1",
      email: "qa.user@example.com",
    });
    expect(upsertWatchProgressMock).toHaveBeenCalledWith("user-1", {
      contentType: "movies",
      contentId: "movie-1",
      playHref: "/play/movies/movie-1",
      positionSec: 12,
      durationSec: 100,
      episodeId: null,
      title: "Movie title",
      posterUrl: "https://image.test/poster.jpg",
      completed: true,
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      saved: true,
      item: {
        id: "wp-1",
        contentId: "movie-1",
      },
    });
  });
});
