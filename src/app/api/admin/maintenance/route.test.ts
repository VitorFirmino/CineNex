import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const {
  createClientMock,
  getUserMock,
  findUniqueMock,
  getMaintenanceStateMock,
  setMaintenanceStateMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  getMaintenanceStateMock: vi.fn(),
  setMaintenanceStateMock: vi.fn(),
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

vi.mock("@lib/maintenance", () => ({
  getMaintenanceState: getMaintenanceStateMock,
  setMaintenanceState: setMaintenanceStateMock,
}));


describe("admin/maintenance route", () => {
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

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Não autorizado",
    });
  });

  it("should return the maintenance flag for admin users", async () => {
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
    getMaintenanceStateMock.mockResolvedValue(true);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      maintenance: true,
    });
  });

  it("should reject invalid payloads on post", async () => {
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

    const response = await POST(
      new Request("http://localhost:3000/api/admin/maintenance", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("should update the maintenance flag for admin users", async () => {
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
    setMaintenanceStateMock.mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost:3000/api/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({
          enabled: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      maintenance: true,
      success: true,
    });
    expect(setMaintenanceStateMock).toHaveBeenCalledWith(true);
  });

  it("should return 500 when reading the maintenance flag fails", async () => {
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
    getMaintenanceStateMock.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Falha ao carregar estado da manutenção",
    });
  });

  it("should return 500 when persisting the maintenance flag fails", async () => {
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
    setMaintenanceStateMock.mockRejectedValue(new Error("db down"));

    const response = await POST(
      new Request("http://localhost:3000/api/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({
          enabled: true,
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Falha ao persistir modo de manutenção",
    });
  });
});
