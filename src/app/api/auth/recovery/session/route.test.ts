import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  createClientMock,
  setSessionMock,
  consumeRateLimitMock,
  getClientIpMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  setSessionMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@infrastructure/security/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  getClientIp: getClientIpMock,
}));

describe("auth/recovery/session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIpMock.mockReturnValue("127.0.0.1");
    consumeRateLimitMock.mockReturnValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    createClientMock.mockResolvedValue({
      auth: {
        setSession: setSessionMock,
      },
    });
  });

  it("should reject invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/recovery/session", {
        method: "POST",
        body: JSON.stringify({
          accessToken: "",
          refreshToken: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("should reject throttled requests", async () => {
    consumeRateLimitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 55,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/recovery/session", {
        method: "POST",
        body: JSON.stringify({
          accessToken: "atk",
          refreshToken: "rtk",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("55");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("should reject invalid or expired recovery sessions", async () => {
    setSessionMock.mockResolvedValue({
      data: {
        session: null,
        user: null,
      },
      error: {
        message: "invalid",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/recovery/session", {
        method: "POST",
        body: JSON.stringify({
          accessToken: "atk",
          refreshToken: "rtk",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("should set the recovery session successfully", async () => {
    setSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "atk",
        },
        user: {
          id: "user-1",
        },
      },
      error: null,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/recovery/session", {
        method: "POST",
        body: JSON.stringify({
          accessToken: "atk",
          refreshToken: "rtk",
        }),
      }),
    );

    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: "atk",
      refresh_token: "rtk",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      success: true,
    });
  });
});
