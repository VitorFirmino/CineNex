type RateBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type ConsumeRateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type GlobalRateLimitState = {
  __authRateLimitStore?: Map<string, RateBucket>;
  __authRateLimitLastSweepAt?: number;
};

const SWEEP_INTERVAL_MS = 60_000;

function getStore() {
  const globalState = globalThis as unknown as GlobalRateLimitState;
  if (!globalState.__authRateLimitStore) {
    globalState.__authRateLimitStore = new Map<string, RateBucket>();
  }

  const now = Date.now();
  const lastSweepAt = globalState.__authRateLimitLastSweepAt || 0;
  if (now - lastSweepAt > SWEEP_INTERVAL_MS) {
    for (const [key, bucket] of globalState.__authRateLimitStore.entries()) {
      if (bucket.resetAt <= now) {
        globalState.__authRateLimitStore.delete(key);
      }
    }
    globalState.__authRateLimitLastSweepAt = now;
  }

  return globalState.__authRateLimitStore;
}

export function consumeRateLimit(input: ConsumeRateLimitInput): RateLimitResult {
  const { key, limit, windowMs } = input;
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      remaining: Math.max(0, limit - 1),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    remaining: Math.max(0, limit - existing.count),
  };
}

export function getClientIp(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}
