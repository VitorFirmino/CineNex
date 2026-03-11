import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  createClientMock,
  getUserMock,
  findUniqueMock,
} = vi.hoisted(() => ({
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

describe("admin/sessions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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

    const response = await POST();

    expect(response.status).toBe(401);
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

    const response = await POST();

    expect(response.status).toBe(403);
  });

  it("should resolve successfully for admin users", async () => {
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

    const promise = POST();
    await vi.advanceTimersByTimeAsync(1500);
    const response = await promise;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Todas as sessões ativas encerradas com sucesso.",
    });
  });
});
