import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { createClientMock, getUserMock, findUniqueMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@infrastructure/database/prisma", () => ({
  prisma: {
    profile: {
      findUnique: findUniqueMock,
    },
  },
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
  });

  it("should return an anonymous payload when no user is authenticated", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      user: null,
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("should return the authenticated user enriched with profile role", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "qa.user@example.com",
          email_confirmed_at: "2026-03-10T00:00:00.000Z",
          user_metadata: {
            avatar_url: "https://example.com/avatar.png",
            full_name: "QA User",
            name: "QA",
            picture: "https://example.com/picture.png",
          },
        },
      },
    });
    findUniqueMock.mockResolvedValue({
      role: "admin",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "user-123",
        email: "qa.user@example.com",
        app_metadata: {
          role: "admin",
        },
        user_metadata: {
          avatar_url: "https://example.com/avatar.png",
          picture: "https://example.com/picture.png",
          full_name: "QA User",
          name: "QA",
        },
        email_confirmed_at: "2026-03-10T00:00:00.000Z",
      },
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        id: "user-123",
      },
      select: {
        role: true,
      },
    });
  });
});
