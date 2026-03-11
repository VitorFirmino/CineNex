import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
  findUniqueMock,
  findManyMock,
  countMock,
  updateMock,
  deleteManyMock,
  createAdminClientMock,
  deleteUserMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findManyMock: vi.fn(),
  countMock: vi.fn(),
  updateMock: vi.fn(),
  deleteManyMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  deleteUserMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createAdminClientMock,
}));

vi.mock("@infrastructure/database/prisma", () => ({
  prisma: {
    profile: {
      findUnique: findUniqueMock,
      findMany: findManyMock,
      count: countMock,
      update: updateMock,
      deleteMany: deleteManyMock,
    },
  },
}));

import { DELETE, GET, PATCH } from "./route";

describe("admin/users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
    createAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          deleteUser: deleteUserMock,
        },
      },
    });
  });

  it("should reject non-admin access", async () => {
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

    const response = await GET(new NextRequest("http://localhost:3000/api/admin/users?page=1"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Permissão negada",
    });
  });

  it("should list paginated users for admins", async () => {
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
    findManyMock.mockResolvedValue([{ id: "user-2" }]);
    countMock.mockResolvedValue(1);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/users?page=2&pageSize=10"),
    );

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
    await expect(response.json()).resolves.toEqual({
      users: [{ id: "user-2" }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it("should reject invalid role updates", async () => {
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

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: "user-2",
          role: "INVALID",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should update another user role", async () => {
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
    updateMock.mockResolvedValue({
      id: "user-2",
      role: "ADMIN",
    });

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: "user-2",
          role: "ADMIN",
        }),
      }),
    );

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { role: "ADMIN" },
    });
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "user-2",
        role: "ADMIN",
      },
    });
  });

  it("should refuse to delete the current admin account", async () => {
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

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({
          id: "admin-1",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should delete another user through the admin client", async () => {
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
    deleteUserMock.mockResolvedValue({
      error: null,
    });

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({
          id: "user-2",
        }),
      }),
    );

    expect(deleteUserMock).toHaveBeenCalledWith("user-2");
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: "user-2" },
    });
    await expect(response.json()).resolves.toEqual({
      deleted: true,
    });
  });
});
