import { beforeEach, describe, expect, it, vi } from "vitest";

import { consumeRateLimit, getClientIp } from "./rate-limit";

type GlobalRateLimitState = typeof globalThis & {
  __authRateLimitStore?: Map<string, { count: number; resetAt: number }>;
  __authRateLimitLastSweepAt?: number;
};

function resetRateLimitStore() {
  const globalState = globalThis as GlobalRateLimitState;
  delete globalState.__authRateLimitStore;
  delete globalState.__authRateLimitLastSweepAt;
}

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    resetRateLimitStore();
  });

  it("should allow requests until the limit is reached", () => {
    const first = consumeRateLimit({
      key: "login:127.0.0.1",
      limit: 2,
      windowMs: 30_000,
    });
    const second = consumeRateLimit({
      key: "login:127.0.0.1",
      limit: 2,
      windowMs: 30_000,
    });
    const third = consumeRateLimit({
      key: "login:127.0.0.1",
      limit: 2,
      windowMs: 30_000,
    });

    expect(first).toEqual({
      allowed: true,
      retryAfterSeconds: 30,
      remaining: 1,
    });
    expect(second).toEqual({
      allowed: true,
      retryAfterSeconds: 30,
      remaining: 0,
    });
    expect(third).toEqual({
      allowed: false,
      retryAfterSeconds: 30,
      remaining: 0,
    });
  });

  it("should reset the bucket after the window expires", () => {
    consumeRateLimit({
      key: "otp:user@example.com",
      limit: 1,
      windowMs: 10_000,
    });

    vi.advanceTimersByTime(10_001);

    const nextAttempt = consumeRateLimit({
      key: "otp:user@example.com",
      limit: 1,
      windowMs: 10_000,
    });

    expect(nextAttempt).toEqual({
      allowed: true,
      retryAfterSeconds: 10,
      remaining: 0,
    });
  });

  it("should resolve the client ip from forwarded headers", () => {
    const forwarded = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "198.51.100.4, 203.0.113.9",
      },
    });
    const realIp = new Request("http://localhost", {
      headers: {
        "x-real-ip": "198.51.100.12",
      },
    });
    const unknown = new Request("http://localhost");

    expect(getClientIp(forwarded)).toBe("198.51.100.4");
    expect(getClientIp(realIp)).toBe("198.51.100.12");
    expect(getClientIp(unknown)).toBe("unknown");
  });
});
