import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SAFE_RECOVERY_MESSAGE } from "@shared/auth/auth-messages";
import { POST } from "./route";

const {
  createSupabaseClientMock,
  resetPasswordForEmailMock,
  resolveAuthOriginMock,
  consumeRateLimitMock,
  getClientIpMock,
} = vi.hoisted(() => ({
  createSupabaseClientMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  resolveAuthOriginMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createSupabaseClientMock,
}));

vi.mock("@shared/auth/auth-redirect", () => ({
  resolveAuthOrigin: resolveAuthOriginMock,
}));

vi.mock("@infrastructure/security/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  getClientIp: getClientIpMock,
}));

describe("auth/forgot-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIpMock.mockReturnValue("127.0.0.1");
    consumeRateLimitMock.mockReturnValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    resolveAuthOriginMock.mockReturnValue("https://app.example.com");
    createSupabaseClientMock.mockReturnValue({
      auth: {
        resetPasswordForEmail: resetPasswordForEmailMock,
      },
    });
  });

  it("should reject invalid emails", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "invalid" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "invalid_email",
      message: "E-mail inválido.",
    });
  });

  it("should reject malformed request bodies", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: "{invalid",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "invalid_email",
      message: "E-mail inválido.",
    });
  });

  it("should reject requests blocked by rate limit", async () => {
    consumeRateLimitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 90,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "qa@example.com" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
  });

  it("should reject requests blocked by the per-email rate limit", async () => {
    consumeRateLimitMock
      .mockReturnValueOnce({
        allowed: true,
        retryAfterSeconds: 0,
      })
      .mockReturnValueOnce({
        allowed: false,
        retryAfterSeconds: 45,
      });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "qa@example.com" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    await expect(response.json()).resolves.toEqual({
      errorCode: "too_many_requests",
      message: "Muitas tentativas em pouco tempo. Tente novamente em 45s.",
      retryAfterSeconds: 45,
    });
  });

  it("should expose provider email rate limit safely", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: {
        message: "Email rate limit exceeded. Try again in 2 minutes.",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "qa@example.com" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    await expect(response.json()).resolves.toEqual({
      error: "Email rate limit exceeded. Try again in 2 minutes.",
      errorCode: "email_rate_limit_exceeded",
      message:
        "Limite de envio de e-mails atingido no provedor. Aguarde alguns minutos e tente novamente.",
      retryAfterSeconds: 120,
    });
  });

  it("should map generic provider throttling messages to the safe error payload", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: {
        message: "For security purposes, you can only request this after 01:30.",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "qa@example.com" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
    await expect(response.json()).resolves.toEqual({
      error: "For security purposes, you can only request this after 01:30.",
      errorCode: "too_many_requests",
      message: "Muitas tentativas em pouco tempo. Tente novamente em 90s.",
      retryAfterSeconds: 90,
    });
  });

  it("should use a safe fallback when redirect resolution fails", async () => {
    resolveAuthOriginMock.mockImplementation(() => {
      throw new Error("bad origin");
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "qa@example.com" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      errorCode: "forgot_password_failed",
      message: "Não foi possível processar sua solicitação agora. Tente novamente.",
    });
  });

  it("should return a generic provider failure safely", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: {
        message: "provider failed",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "qa@example.com" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "provider failed",
      errorCode: "forgot_password_failed",
      message: "Não foi possível processar sua solicitação agora. Tente novamente.",
    });
  });

  it("should return the safe success message", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: null,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "QA@example.com" }),
      }),
    );

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith("qa@example.com", {
      redirectTo: "https://app.example.com/reset-password",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: AUTH_SAFE_RECOVERY_MESSAGE,
    });
  });
});
