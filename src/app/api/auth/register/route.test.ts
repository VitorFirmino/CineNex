import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SAFE_SIGNUP_MESSAGE } from "@shared/auth/auth-messages";

import { POST } from "./route";

const {
  createClientMock,
  signUpMock,
  buildAuthCallbackUrlMock,
  consumeRateLimitMock,
  getClientIpMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  signUpMock: vi.fn(),
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

describe("auth/register route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, AUTH_DISCLOSE_EXISTING_USER: "false" };
    createClientMock.mockResolvedValue({
      auth: {
        signUp: signUpMock,
      },
    });
    buildAuthCallbackUrlMock.mockReturnValue("https://app.example.com/auth/callback");
    getClientIpMock.mockReturnValue("127.0.0.1");
    consumeRateLimitMock.mockReturnValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("should reject invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "A",
          email: "invalid",
          password: "123",
          confirmPassword: "456",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Dados de cadastro inválidos.",
    });
  });

  it("should reject requests blocked by the ip rate limit", async () => {
    consumeRateLimitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 120,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "QA User",
          email: "qa@example.com",
          password: "Senha@123",
          confirmPassword: "Senha@123",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    await expect(response.json()).resolves.toEqual({
      errorCode: "too_many_requests",
      message: "Muitas tentativas em pouco tempo. Tente novamente em 120s.",
      retryAfterSeconds: 120,
    });
  });

  it("should hide existing-user responses when disclosure is disabled", async () => {
    signUpMock.mockResolvedValue({
      data: {
        session: null,
        user: {
          identities: [],
        },
      },
      error: null,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "QA User",
          email: "qa@example.com",
          password: "Senha@123",
          confirmPassword: "Senha@123",
        }),
      }),
    );

    expect(signUpMock).toHaveBeenCalledWith({
      email: "qa@example.com",
      password: "Senha@123",
      options: {
        emailRedirectTo: "https://app.example.com/auth/callback",
        data: {
          full_name: "QA User",
        },
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sessionCreated: false,
      message: AUTH_SAFE_SIGNUP_MESSAGE,
    });
  });

  it("should surface provider rate-limit responses as 429", async () => {
    signUpMock.mockResolvedValue({
      data: {
        session: null,
        user: null,
      },
      error: {
        message: "Too many requests. Only request this after 60 seconds.",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "QA User",
          email: "qa@example.com",
          password: "Senha@123",
          confirmPassword: "Senha@123",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    await expect(response.json()).resolves.toEqual({
      errorCode: "too_many_requests",
      message: "Muitas tentativas em pouco tempo. Tente novamente em 60s.",
      retryAfterSeconds: 60,
    });
  });

  it("should return 503 when the provider is unreachable", async () => {
    signUpMock.mockRejectedValue(new Error("network down"));

    const response = await POST(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "QA User",
          email: "qa@example.com",
          password: "Senha@123",
          confirmPassword: "Senha@123",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      errorCode: "supabase_unreachable",
      message:
        "Não foi possível conectar ao Supabase agora. Verifique sua conexão e tente novamente.",
    });
  });
});
