import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const {
  getGroupCountsMock,
  buildCacheControlMock,
  sanitizeDisplayTitleMock,
} = vi.hoisted(() => ({
  getGroupCountsMock: vi.fn(),
  buildCacheControlMock: vi.fn(),
  sanitizeDisplayTitleMock: vi.fn(),
}));

vi.mock("@services/catalog/db-store", () => ({
  getGroupCounts: getGroupCountsMock,
}));

vi.mock("@shared/cache/cache-profiles", () => ({
  buildCacheControl: buildCacheControlMock,
}));

vi.mock("@shared/utils", () => ({
  sanitizeDisplayTitle: sanitizeDisplayTitleMock,
}));

describe("catalog/groups route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildCacheControlMock.mockReturnValue("public, s-maxage=120");
    sanitizeDisplayTitleMock.mockImplementation((value: string) => value.replaceAll("_", " "));
  });

  it("should return sanitized group names and inferred type", async () => {
    getGroupCountsMock.mockResolvedValue([
      { name: "Acao_Aventura", count: 5 },
    ]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/groups?type=movies"),
    );

    expect(getGroupCountsMock).toHaveBeenCalledWith("movies");
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=120");
    await expect(response.json()).resolves.toEqual({
      type: "movies",
      total: 1,
      items: [{ name: "Acao Aventura", count: 5 }],
    });
  });

  it("should fallback to the all catalog type for unknown values", async () => {
    getGroupCountsMock.mockResolvedValue([]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/groups?type=channels"),
    );

    expect(getGroupCountsMock).toHaveBeenCalledWith("all");
    await expect(response.json()).resolves.toEqual({
      type: "all",
      total: 0,
      items: [],
    });
  });
});
