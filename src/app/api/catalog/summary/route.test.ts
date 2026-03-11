import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { buildCacheControlMock, getSummaryMock } = vi.hoisted(() => ({
  buildCacheControlMock: vi.fn(),
  getSummaryMock: vi.fn(),
}));

vi.mock("@shared/cache/cache-profiles", () => ({
  buildCacheControl: buildCacheControlMock,
}));

vi.mock("@services/catalog/db-store", () => ({
  getSummary: getSummaryMock,
}));

describe("catalog/summary route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildCacheControlMock.mockReturnValue("public, max-age=120");
  });

  it("should return the summary with cache headers", async () => {
    getSummaryMock.mockResolvedValue({
      movies: 10,
      series: 5,
    });

    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=120");
    await expect(response.json()).resolves.toEqual({
      movies: 10,
      series: 5,
    });
  });

  it("should request the summary cache profile", async () => {
    getSummaryMock.mockResolvedValue({
      movies: 0,
      series: 0,
    });

    await GET();

    expect(buildCacheControlMock).toHaveBeenCalledWith("summary");
    expect(getSummaryMock).toHaveBeenCalledTimes(1);
  });
});
