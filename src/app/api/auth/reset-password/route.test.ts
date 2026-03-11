import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  createClientMock,
  getUserMock,
  updateUserMock,
  signOutMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  updateUserMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

describe("auth/reset-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        updateUser: updateUserMock,
        signOut: signOutMock,
      },
    });
  });

  it("should reject invalid password payloads", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          password: "123",
          confirmPassword: "321",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Dados de senha inválidos.",
    });
  });

  it("should reject missing auth sessions", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          password: "Senha@123",
          confirmPassword: "Senha@123",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Auth session missing",
    });
  });

  it("should return provider errors from updateUser", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    updateUserMock.mockResolvedValue({
      error: {
        message: "new password should be different",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          password: "Senha@123",
          confirmPassword: "Senha@123",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "new password should be different",
    });
  });

  it("should return 500 when global sign-out fails", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    updateUserMock.mockResolvedValue({
      error: null,
    });
    signOutMock.mockResolvedValue({
      error: {
        message: "sign out failed",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          password: "Senha@123",
          confirmPassword: "Senha@123",
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "sign out failed",
    });
  });

  it("should update the password and close previous sessions", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    updateUserMock.mockResolvedValue({
      error: null,
    });
    signOutMock.mockResolvedValue({
      error: null,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          password: "Senha@123",
          confirmPassword: "Senha@123",
        }),
      }),
    );

    expect(updateUserMock).toHaveBeenCalledWith({
      password: "Senha@123",
    });
    expect(signOutMock).toHaveBeenCalledWith({
      scope: "global",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Senha atualizada. Todas as sessões anteriores foram encerradas.",
    });
  });
});
