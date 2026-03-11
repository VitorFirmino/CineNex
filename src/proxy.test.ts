// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerClientMock,
  getUserMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: getUserMock,
      },
    });
  });

  it("should bypass the auth callback path", async () => {
    const { proxy } = await import("./proxy");

    const response = await proxy(
      new NextRequest("http://localhost:3000/auth/callback?code=123"),
    );

    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("should redirect authenticated users away from login", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: { id: "user-1" },
      },
    });

    const { proxy } = await import("./proxy");

    const response = await proxy(new NextRequest("http://localhost:3000/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("should redirect guests from protected pages to login with next", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const { proxy } = await import("./proxy");

    const response = await proxy(new NextRequest("http://localhost:3000/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fadmin",
    );
  });
});
