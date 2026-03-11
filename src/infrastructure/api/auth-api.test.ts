import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "./auth-api";

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("@infrastructure/http/axios-client", () => ({
  axiosClient: {
    post: postMock,
    get: getMock,
  },
}));

describe("auth-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delegate the auth lifecycle endpoints to the expected routes", async () => {
    postMock
      .mockResolvedValueOnce({ data: { message: "registered" } })
      .mockResolvedValueOnce({ data: { message: "logged" } })
      .mockResolvedValueOnce({ data: { message: "resent" } })
      .mockResolvedValueOnce({ data: { message: "verified" } })
      .mockResolvedValueOnce({ data: { message: "recovery" } })
      .mockResolvedValueOnce({ data: { message: "reset" } })
      .mockResolvedValueOnce({ data: { message: "session" } })
      .mockResolvedValueOnce({ data: { message: "logout" } })
      .mockResolvedValueOnce({ data: { active: true } })
      .mockResolvedValueOnce({ data: { favorited: true } });
    getMock.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });

    await expect(
      authApi.register({
        name: "Tester",
        email: "tester@example.com",
        password: "Tester123.",
        confirmPassword: "Tester123.",
      }),
    ).resolves.toEqual({ message: "registered" });
    await expect(
      authApi.login({
        email: "tester@example.com",
        password: "Tester123.",
      }),
    ).resolves.toEqual({ message: "logged" });
    await expect(
      authApi.resendSignupConfirmation({
        email: "tester@example.com",
      }),
    ).resolves.toEqual({ message: "resent" });
    await expect(
      authApi.verifySignupOtp({
        email: "tester@example.com",
        token: "123456",
      }),
    ).resolves.toEqual({ message: "verified" });
    await expect(
      authApi.requestPasswordRecovery({
        email: "tester@example.com",
      }),
    ).resolves.toEqual({ message: "recovery" });
    await expect(
      authApi.resetPassword({
        password: "Tester123.",
        confirmPassword: "Tester123.",
      }),
    ).resolves.toEqual({ message: "reset" });
    await expect(
      authApi.createRecoverySession({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      }),
    ).resolves.toEqual({ message: "session" });
    await expect(authApi.me()).resolves.toEqual({ user: { id: "user-1" } });
    await expect(authApi.logout()).resolves.toEqual({ message: "logout" });
    await expect(authApi.heartbeat({ currentContent: "movie-1" })).resolves.toEqual({
      active: true,
    });
    await expect(
      authApi.toggleFavorite({
        type: "movies",
        contentId: "movie-1",
      }),
    ).resolves.toEqual({ favorited: true });

    expect(postMock).toHaveBeenNthCalledWith(1, "/api/auth/register", {
      name: "Tester",
      email: "tester@example.com",
      password: "Tester123.",
      confirmPassword: "Tester123.",
    });
    expect(postMock).toHaveBeenNthCalledWith(2, "/api/auth/login", {
      email: "tester@example.com",
      password: "Tester123.",
    });
    expect(postMock).toHaveBeenNthCalledWith(3, "/api/auth/resend", {
      email: "tester@example.com",
    });
    expect(postMock).toHaveBeenNthCalledWith(4, "/api/auth/verify-otp", {
      email: "tester@example.com",
      token: "123456",
    });
    expect(postMock).toHaveBeenNthCalledWith(5, "/api/auth/forgot-password", {
      email: "tester@example.com",
    });
    expect(postMock).toHaveBeenNthCalledWith(6, "/api/auth/reset-password", {
      password: "Tester123.",
      confirmPassword: "Tester123.",
    });
    expect(postMock).toHaveBeenNthCalledWith(7, "/api/auth/recovery/session", {
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(getMock).toHaveBeenCalledWith("/api/auth/me", {
      signal: undefined,
    });
    expect(postMock).toHaveBeenNthCalledWith(8, "/api/auth/logout");
    expect(postMock).toHaveBeenNthCalledWith(9, "/api/auth/heartbeat", {
      currentContent: "movie-1",
    });
    expect(postMock).toHaveBeenNthCalledWith(10, "/api/auth/favorites", {
      type: "movies",
      contentId: "movie-1",
    });
  });

  it("should return an empty favorites list on unauthorized errors", async () => {
    getMock.mockRejectedValue(
      new AxiosError("Unauthorized", "401", undefined, undefined, {
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config: {} as never,
        data: {},
      }),
    );

    await expect(authApi.getFavorites()).resolves.toEqual({
      favorites: [],
    });
    expect(getMock).toHaveBeenCalledWith("/api/auth/favorites", {
      signal: undefined,
    });
  });

  it("should return the favorite payload when the request succeeds", async () => {
    getMock.mockResolvedValue({
      data: {
        favorites: [
          {
            type: "movies",
            contentId: "movie-1",
          },
        ],
      },
    });

    await expect(authApi.getFavorites()).resolves.toEqual({
      favorites: [
        {
          type: "movies",
          contentId: "movie-1",
        },
      ],
    });
    expect(getMock).toHaveBeenCalledWith("/api/auth/favorites", {
      signal: undefined,
    });
  });

  it("should rethrow favorite lookup failures that are not unauthorized", async () => {
    const error = new AxiosError("Server error", "500", undefined, undefined, {
      status: 500,
      statusText: "Server error",
      headers: {},
      config: {} as never,
      data: {},
    });
    getMock.mockRejectedValue(error);

    await expect(authApi.getFavorites()).rejects.toBe(error);
    expect(getMock).toHaveBeenCalledWith("/api/auth/favorites", {
      signal: undefined,
    });
  });

  it("should use fetch with keepalive when saving watch progress in unload scenarios", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ saved: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      authApi.saveWatchProgress(
        {
          contentType: "movies",
          contentId: "movie-1",
          playHref: "/play/movies/movie-1",
          positionSec: 10,
        },
        { keepalive: true },
      ),
    ).resolves.toEqual({ saved: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/watch-progress",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
      }),
    );
  });

  it("should fallback to a safe payload when keepalive json parsing fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockRejectedValue(new Error("invalid json")),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      authApi.saveWatchProgress(
        {
          contentType: "series",
          contentId: "series-1",
          playHref: "/play/series/series-1",
          positionSec: 15,
        },
        { keepalive: true },
      ),
    ).resolves.toEqual({ saved: false });

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("should use axios for regular watch progress saves", async () => {
    postMock.mockResolvedValue({
      data: { saved: true },
    });

    await expect(
      authApi.saveWatchProgress({
        contentType: "movies",
        contentId: "movie-1",
        playHref: "/play/movies/movie-1",
        positionSec: 10,
      }),
    ).resolves.toEqual({ saved: true });

    expect(postMock).toHaveBeenCalledWith("/api/auth/watch-progress", {
      contentType: "movies",
      contentId: "movie-1",
      playHref: "/play/movies/movie-1",
      positionSec: 10,
    });
  });

  it("should build the watch progress read endpoints correctly", async () => {
    getMock
      .mockResolvedValueOnce({ data: { items: [] } })
      .mockResolvedValueOnce({ data: { item: null } });

    await expect(authApi.listWatchProgress(24)).resolves.toEqual({ items: [] });
    await expect(authApi.getWatchProgress("series", "series-1")).resolves.toEqual({
      item: null,
    });

    expect(getMock).toHaveBeenNthCalledWith(
      1,
      "/api/auth/watch-progress?limit=24",
      {
        signal: undefined,
      },
    );
    expect(getMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/watch-progress?contentType=series&contentId=series-1",
      {
        signal: undefined,
      },
    );
  });

  it("should use the default watch progress limit when none is provided", async () => {
    getMock.mockResolvedValueOnce({ data: { items: [] } });

    await expect(authApi.listWatchProgress()).resolves.toEqual({ items: [] });

    expect(getMock).toHaveBeenCalledWith("/api/auth/watch-progress?limit=12", {
      signal: undefined,
    });
  });

  it("should send keepalive watch progress requests with the expected fetch payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ saved: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await authApi.saveWatchProgress(
      {
        contentType: "movies",
        contentId: "movie-1",
        playHref: "/play/movies/movie-1",
        positionSec: 42,
      },
      { keepalive: true },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/watch-progress",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "movies",
          contentId: "movie-1",
          playHref: "/play/movies/movie-1",
          positionSec: 42,
        }),
      }),
    );
  });
});
