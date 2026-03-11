import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { createClientMock, signInWithPasswordMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));


describe("auth/login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: signInWithPasswordMock,
      },
    });
  });

  it("should reject invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          password: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Dados de login inválidos.",
    });
  });

  it("should forward provider errors as unauthorized", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: {
        message: "Invalid login credentials",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "USER@Example.com",
          password: "Senha@123",
        }),
      }),
    );

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "Senha@123",
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid login credentials",
    });
  });

  it("should return success for valid credentials", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: null,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "Senha@123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
    });
  });
});
