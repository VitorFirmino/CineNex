import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { createClientMock, signOutMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@infrastructure/supabase/server", () => ({
  createClient: createClientMock,
}));

describe("auth/logout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        signOut: signOutMock,
      },
    });
  });

  it("should return 500 when sign out fails", async () => {
    signOutMock.mockResolvedValue({
      error: {
        message: "failed",
      },
    });

    const response = await POST();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Não foi possível encerrar a sessão.",
    });
  });

  it("should return success when sign out succeeds", async () => {
    signOutMock.mockResolvedValue({
      error: null,
    });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
    });
  });
});
