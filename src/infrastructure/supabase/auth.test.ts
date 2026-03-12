import { describe, expect, it, vi } from "vitest";
import { getSafeAuthUser, isRefreshTokenNotFoundError } from "./auth";

describe("supabase auth helper", () => {
  it("should detect the refresh token not found error", () => {
    expect(
      isRefreshTokenNotFoundError({
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token: Refresh Token Not Found",
      }),
    ).toBe(true);
  });

  it("should return the user when getUser succeeds", async () => {
    const user = { id: "user-1", email: "user@example.com" };
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
          error: null,
        }),
      },
    };

    await expect(getSafeAuthUser(supabase)).resolves.toEqual(user);
  });

  it("should treat refresh token failures as signed out", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      auth: {
        getUser: vi.fn().mockRejectedValue({
          code: "refresh_token_not_found",
          message: "Invalid Refresh Token: Refresh Token Not Found",
        }),
        signOut,
      },
    };

    await expect(
      getSafeAuthUser(supabase, { clearInvalidSession: true }),
    ).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("should treat missing auth session errors as signed out", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      auth: {
        getUser: vi.fn().mockRejectedValue({
          name: "AuthSessionMissingError",
          message: "Auth session missing!",
        }),
        signOut,
      },
    };

    await expect(
      getSafeAuthUser(supabase, { clearInvalidSession: true }),
    ).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("should throw unrelated auth errors", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error("unexpected auth failure")),
      },
    };

    await expect(getSafeAuthUser(supabase)).rejects.toThrow(
      "unexpected auth failure",
    );
  });
});
