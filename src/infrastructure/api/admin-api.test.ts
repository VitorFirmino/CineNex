import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "./admin-api";

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@infrastructure/http/axios-client", () => ({
  axiosClient: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}));

describe("admin-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build the users listing endpoint", async () => {
    getMock.mockResolvedValue({
      data: { users: [], total: 0, page: 2, pageSize: 50 },
    });

    await adminApi.listAdminUsers(2, 50);

    expect(getMock).toHaveBeenCalledWith("/api/admin/users?page=2&pageSize=50", {
      signal: undefined,
    });
  });

  it("should delegate admin monitoring and maintenance endpoints", async () => {
    getMock
      .mockResolvedValueOnce({ data: { activeUsers: 1, totalUsers: 2, uptimeSeconds: 3, watchingNow: [], topFavorites: [], growth: [], timestamp: "now" } })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { maintenance: true } })
      .mockResolvedValueOnce({
        data: {
          database: { status: "online", latencyMs: 1 },
          supabase: { status: "online", latencyMs: 2 },
          tmdb: { status: "online", latencyMs: 3 },
        },
      });
    postMock
      .mockResolvedValueOnce({ data: { maintenance: false, success: true } })
      .mockResolvedValueOnce({ data: { success: true, message: "sessions" } })
      .mockResolvedValueOnce({ data: { success: true, message: "cache" } });

    await adminApi.getAdminMetrics();
    await adminApi.getCatalogErrors();
    await adminApi.getMaintenanceStatus();
    await adminApi.setMaintenanceStatus(false);
    await adminApi.clearOtherSessions();
    await adminApi.getSystemHealth();
    await adminApi.clearNextDataCache();

    expect(getMock).toHaveBeenNthCalledWith(1, "/api/admin/metrics", {
      signal: undefined,
    });
    expect(getMock).toHaveBeenNthCalledWith(2, "/api/admin/catalog-errors", {
      signal: undefined,
    });
    expect(getMock).toHaveBeenNthCalledWith(3, "/api/admin/maintenance", {
      signal: undefined,
    });
    expect(postMock).toHaveBeenNthCalledWith(1, "/api/admin/maintenance", { enabled: false });
    expect(postMock).toHaveBeenNthCalledWith(2, "/api/admin/sessions");
    expect(getMock).toHaveBeenNthCalledWith(4, "/api/admin/health", {
      signal: undefined,
    });
    expect(postMock).toHaveBeenNthCalledWith(3, "/api/admin/cache");
  });

  it("should build role updates and deletions correctly", async () => {
    patchMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    deleteMock.mockResolvedValue({ data: { deleted: true } });

    await adminApi.updateUserRole("user-1", "ADMIN");
    await adminApi.deleteUser("user-1");

    expect(patchMock).toHaveBeenCalledWith("/api/admin/users", {
      id: "user-1",
      role: "ADMIN",
    });
    expect(deleteMock).toHaveBeenCalledWith("/api/admin/users", {
      data: { id: "user-1" },
    });
  });
});
