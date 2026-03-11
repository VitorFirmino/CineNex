import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  createClientMock,
  getUserMock,
  ensureProfileForUserMock,
  findUniqueMock,
  updateMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  ensureProfileForUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@services/auth/profile-sync", () => ({
  ensureProfileForUser: ensureProfileForUserMock,
}));

vi.mock("@infrastructure/database/prisma", () => ({
  prisma: {
    profile: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}));

describe("auth/heartbeat route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const response = await POST(
      new Request("http://localhost:3000/api/auth/heartbeat", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      active: false,
    });
  });

  it("should avoid updating recently refreshed identical content", async () => {
    const now = new Date();
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      currentContent: "Movie 1",
      lastActive: now,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/heartbeat", {
        method: "POST",
        body: JSON.stringify({ currentContent: "Movie 1" }),
      }),
    );

    expect(updateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      active: true,
      updated: false,
    });
  });

  it("should update stale profiles or changed content", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      currentContent: "Old Movie",
      lastActive: new Date(Date.now() - 200_000),
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/heartbeat", {
        method: "POST",
        body: JSON.stringify({ currentContent: "New Movie" }),
      }),
    );

    expect(ensureProfileForUserMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        currentContent: "New Movie",
      }),
    });
    await expect(response.json()).resolves.toEqual({
      active: true,
      updated: true,
    });
  });

  it("should return an active no-op response when the ensured profile is still missing", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/auth/heartbeat", {
        method: "POST",
        body: JSON.stringify({ currentContent: "Movie 1" }),
      }),
    );

    expect(ensureProfileForUserMock).toHaveBeenCalledWith({ id: "user-1" });
    expect(updateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      active: true,
      updated: false,
    });
  });

  it("should tolerate invalid request bodies and normalize blank content", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      currentContent: "Movie 1",
      lastActive: new Date(Date.now() - 200_000),
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/heartbeat", {
        method: "POST",
        body: "{invalid",
      }),
    );

    expect(errorSpy).toHaveBeenCalledWith(
      "[auth/heartbeat] Falha ao interpretar corpo da requisicao.",
      expect.any(Error),
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        currentContent: null,
      }),
    });
    await expect(response.json()).resolves.toEqual({
      active: true,
      updated: true,
    });
  });

  it("should return a server error when the heartbeat persistence fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    ensureProfileForUserMock.mockRejectedValue(new Error("db offline"));

    const response = await POST(
      new Request("http://localhost:3000/api/auth/heartbeat", {
        method: "POST",
        body: JSON.stringify({ currentContent: "Movie 1" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(errorSpy).toHaveBeenCalledWith("Heartbeat error:", expect.any(Error));
    await expect(response.json()).resolves.toEqual({
      error: "Erro ao registrar atividade",
    });
  });
});
