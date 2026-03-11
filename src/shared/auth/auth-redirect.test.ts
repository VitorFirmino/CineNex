import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthCallbackUrl,
  resolveAuthOrigin,
} from "./auth-redirect";

function createRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

describe("auth-redirect", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should prefer the configured forwarded origin", () => {
    vi.stubEnv("AUTH_REDIRECT_BASE_URL", "https://app.example.com");

    const request = createRequest("https://internal.service.local/api/auth/login", {
      host: "internal.service.local",
      "x-forwarded-host": "app.example.com",
      "x-forwarded-proto": "https",
    });

    expect(resolveAuthOrigin(request)).toBe("https://app.example.com");
  });

  it("should allow loopback origins in development when no base url is configured", () => {
    vi.stubEnv("AUTH_REDIRECT_BASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");

    const request = createRequest("http://127.0.0.1:3001/api/auth/login");

    expect(resolveAuthOrigin(request)).toBe("http://127.0.0.1:3001");
  });

  it("should include a safe next path in the callback url", () => {
    vi.stubEnv("AUTH_REDIRECT_BASE_URL", "https://app.example.com");

    const request = createRequest("https://app.example.com/api/auth/login");

    expect(buildAuthCallbackUrl(request, "/collection/favorites")).toBe(
      "https://app.example.com/auth/callback?next=%2Fcollection%2Ffavorites",
    );
  });

  it("should ignore an unsafe next path in the callback url", () => {
    vi.stubEnv("AUTH_REDIRECT_BASE_URL", "https://app.example.com");

    const request = createRequest("https://app.example.com/api/auth/login");

    expect(buildAuthCallbackUrl(request, "//evil.example.com")).toBe(
      "https://app.example.com/auth/callback",
    );
  });

  it("should throw in production when no origin is configured", () => {
    vi.stubEnv("AUTH_REDIRECT_BASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");

    const request = createRequest("https://internal.service.local/api/auth/login");

    expect(() => resolveAuthOrigin(request)).toThrow(
      "Auth redirect origin is not configured. Set AUTH_REDIRECT_BASE_URL.",
    );
  });
});
