import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
  findUniqueMock,
  queryRawMock,
  fetchMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  queryRawMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@infrastructure/database/prisma", () => ({
  prisma: {
    profile: {
      findUnique: findUniqueMock,
    },
    $queryRaw: queryRawMock,
  },
}));

import { GET } from "./route";

describe("admin/health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
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
      error: "Não autorizado",
    });
  });

  it("should report online services for admin users when dependencies respond", async () => {
    const getSessionMock = vi.fn().mockResolvedValue({ data: { session: null } });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        getSession: getSessionMock,
      },
    });
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
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    fetchMock.mockResolvedValue({
      ok: true,
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.themoviedb.org/3/configuration",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer "),
        }),
      }),
    );
    expect(payload.database.status).toBe("online");
    expect(payload.supabase.status).toBe("online");
    expect(payload.tmdb.status).toBe("online");
  });
});
