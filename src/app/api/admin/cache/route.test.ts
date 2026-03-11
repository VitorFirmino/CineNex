import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  createClientMock,
  getUserMock,
  findUniqueMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  revalidatePathMock: vi.fn(),
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

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

describe("admin/cache route", () => {
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

    const response = await POST();

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

    const response = await POST();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Não autorizado",
    });
  });

  it("should revalidate cache for admin users", async () => {
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

    const response = await POST();

    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    expect(response.status).toBe(200);
  });
});
