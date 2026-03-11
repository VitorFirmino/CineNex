import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  createClientMock,
  verifyOtpMock,
  consumeRateLimitMock,
  getClientIpMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  verifyOtpMock: vi.fn(),
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

describe("auth/verify-otp route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIpMock.mockReturnValue("127.0.0.1");
    consumeRateLimitMock.mockReturnValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    createClientMock.mockResolvedValue({
      auth: {
        verifyOtp: verifyOtpMock,
      },
    });
  });

  it("should reject invalid otp payloads", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid",
          token: "123",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Código inválido.",
    });
  });

  it("should reject throttled verification attempts", async () => {
    consumeRateLimitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 30,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: "qa@example.com",
          token: "123456",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
  });

  it("should return a safe invalid token message when provider verification fails", async () => {
    verifyOtpMock.mockResolvedValue({
      error: {
        message: "invalid token",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: "QA@example.com",
          token: "123456",
        }),
      }),
    );

    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: "qa@example.com",
      token: "123456",
      type: "signup",
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "invalid_or_expired_otp",
      message:
        "Código inválido ou expirado. Solicite um novo código e tente novamente.",
    });
  });

  it("should return success when otp verification succeeds", async () => {
    verifyOtpMock.mockResolvedValue({
      error: null,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: "qa@example.com",
          token: "123456",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
    });
  });
});
