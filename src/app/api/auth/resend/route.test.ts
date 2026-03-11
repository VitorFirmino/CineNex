import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SAFE_RESEND_CONFIRMATION_MESSAGE } from "@shared/auth/auth-messages";

import { POST } from "./route";

const {
  createClientMock,
  resendMock,
  buildAuthCallbackUrlMock,
  consumeRateLimitMock,
  getClientIpMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  resendMock: vi.fn(),
  buildAuthCallbackUrlMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@shared/auth/auth-redirect", () => ({
  buildAuthCallbackUrl: buildAuthCallbackUrlMock,
}));

vi.mock("@infrastructure/security/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  getClientIp: getClientIpMock,
}));

describe("auth/resend route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIpMock.mockReturnValue("127.0.0.1");
    consumeRateLimitMock.mockReturnValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    buildAuthCallbackUrlMock.mockReturnValue(
      "https://app.example.com/auth/callback?next=%2F",
    );
    createClientMock.mockResolvedValue({
      auth: {
        resend: resendMock,
      },
    });
  });

  it("should reject invalid emails", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should reject rate-limited requests", async () => {
    consumeRateLimitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 75,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend", {
        method: "POST",
        body: JSON.stringify({
          email: "qa@example.com",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("75");
  });

  it("should surface provider throttling as 429", async () => {
    resendMock.mockResolvedValue({
      error: {
        message: "Too many requests. Try again in 2 minutes.",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend", {
        method: "POST",
        body: JSON.stringify({
          email: "QA@example.com",
        }),
      }),
    );

    expect(resendMock).toHaveBeenCalledWith({
      type: "signup",
      email: "qa@example.com",
      options: {
        emailRedirectTo: "https://app.example.com/auth/callback?next=%2F",
      },
    });
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many requests. Try again in 2 minutes.",
      errorCode: "too_many_requests",
      message: "Muitas tentativas em pouco tempo. Tente novamente em 120s.",
      retryAfterSeconds: 120,
    });
  });

  it("should return the safe success message", async () => {
    resendMock.mockResolvedValue({
      error: null,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend", {
        method: "POST",
        body: JSON.stringify({
          email: "qa@example.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: AUTH_SAFE_RESEND_CONFIRMATION_MESSAGE,
    });
  });
});
