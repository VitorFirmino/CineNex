import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AUTH_SAFE_RECOVERY_MESSAGE } from "@shared/auth/auth-messages";
import { resolveAuthOrigin } from "@shared/auth/auth-redirect";
import {
  consumeRateLimit,
  getClientIp,
} from "@infrastructure/security/rate-limit";

const forgotSchema = z.object({
  email: z.string().email(),
});

const FORGOT_RATE_LIMIT_WINDOW_MS = 5 * 60_000;
const PROVIDER_FALLBACK_MIN_SECONDS = 45;
const PROVIDER_FALLBACK_MAX_SECONDS = 600;
const PROVIDER_BACKOFF_TTL_MS = 30 * 60_000;

type ProviderBackoffBucket = {
  attempts: number;
  expiresAt: number;
};

type GlobalProviderBackoffState = {
  __authForgotProviderBackoffStore?: Map<string, ProviderBackoffBucket>;
};

function getProviderBackoffStore() {
  const globalState = globalThis as unknown as GlobalProviderBackoffState;
  if (!globalState.__authForgotProviderBackoffStore) {
    globalState.__authForgotProviderBackoffStore = new Map();
  }
  return globalState.__authForgotProviderBackoffStore;
}

function consumeProviderRetryAfterSeconds(email: string) {
  const now = Date.now();
  const store = getProviderBackoffStore();
  const current = store.get(email);

  const attempts =
    current && current.expiresAt > now ? current.attempts + 1 : 1;
  store.set(email, {
    attempts,
    expiresAt: now + PROVIDER_BACKOFF_TTL_MS,
  });

  const exponential = PROVIDER_FALLBACK_MIN_SECONDS * 2 ** (attempts - 1);
  return Math.min(PROVIDER_FALLBACK_MAX_SECONDS, exponential);
}

function clearProviderRetryAfter(email: string) {
  getProviderBackoffStore().delete(email);
}

function extractRetryAfterSeconds(rawMessage: string) {
  const normalized = rawMessage.toLowerCase();

  const secondsMatch = normalized.match(
    /(\d+)\s*(second|seconds|segundo|segundos|sec|secs)\b/i,
  );
  if (secondsMatch) {
    const asNumber = Number(secondsMatch[1]);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
  }

  const minutesMatch = normalized.match(
    /(\d+)\s*(minute|minutes|minuto|minutos|min|mins)\b/i,
  );
  if (minutesMatch) {
    const asNumber = Number(minutesMatch[1]);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber * 60;
  }

  const hoursMatch = normalized.match(
    /(\d+)\s*(hour|hours|hora|horas|hr|hrs)\b/i,
  );
  if (hoursMatch) {
    const asNumber = Number(hoursMatch[1]);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber * 3600;
  }

  const mmssMatch = normalized.match(/\b(\d{1,2}):(\d{2})\b/);
  if (mmssMatch) {
    const minutes = Number(mmssMatch[1]);
    const seconds = Number(mmssMatch[2]);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      const total = minutes * 60 + seconds;
      if (total > 0) return total;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const parsed = forgotSchema.safeParse(await request.json().catch((error: unknown) => {
    console.error("[auth/forgot-password] Falha ao interpretar corpo da requisicao.", error);
    return null;
  }));
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "invalid_email", message: "E-mail inválido." },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);
  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const perIpLimit = consumeRateLimit({
    key: `auth:forgot:ip:${clientIp}`,
    limit: 8,
    windowMs: FORGOT_RATE_LIMIT_WINDOW_MS,
  });
  if (!perIpLimit.allowed) {
    return NextResponse.json(
      {
        errorCode: "too_many_requests",
        message: `Muitas tentativas em pouco tempo. Tente novamente em ${perIpLimit.retryAfterSeconds}s.`,
        retryAfterSeconds: perIpLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(perIpLimit.retryAfterSeconds),
        },
      },
    );
  }

  const perEmailLimit = consumeRateLimit({
    key: `auth:forgot:email:${normalizedEmail}:ip:${clientIp}`,
    limit: 3,
    windowMs: FORGOT_RATE_LIMIT_WINDOW_MS,
  });
  if (!perEmailLimit.allowed) {
    return NextResponse.json(
      {
        errorCode: "too_many_requests",
        message: `Muitas tentativas em pouco tempo. Tente novamente em ${perEmailLimit.retryAfterSeconds}s.`,
        retryAfterSeconds: perEmailLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(perEmailLimit.retryAfterSeconds),
        },
      },
    );
  }

  let redirectTo: string;
  try {
    redirectTo = new URL("/reset-password", resolveAuthOrigin(request)).toString();
  } catch (error) {
    console.error("[auth/forgot-password] Falha ao montar redirect de recuperacao.", error);
    return NextResponse.json(
      {
        errorCode: "forgot_password_failed",
        message:
          "Não foi possível processar sua solicitação agora. Tente novamente.",
      },
      { status: 500 },
    );
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
      },
    },
  );

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    const normalized = error.message.toLowerCase();
    const providerRateLimitMessage =
      normalized.includes("too many requests") ||
      normalized.includes("for security purposes") ||
      normalized.includes("only request this after");

    if (normalized.includes("email rate limit exceeded")) {
      const retryAfterSeconds =
        extractRetryAfterSeconds(error.message) ||
        consumeProviderRetryAfterSeconds(normalizedEmail);
      return NextResponse.json(
        {
          error: error.message,
          errorCode: "email_rate_limit_exceeded",
          message:
            "Limite de envio de e-mails atingido no provedor. Aguarde alguns minutos e tente novamente.",
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
          },
        },
      );
    }

    if (providerRateLimitMessage) {
      const retryAfterSeconds =
        extractRetryAfterSeconds(error.message) ||
        consumeProviderRetryAfterSeconds(normalizedEmail);
      return NextResponse.json(
        {
          error: error.message,
          errorCode: "too_many_requests",
          message: `Muitas tentativas em pouco tempo. Tente novamente em ${retryAfterSeconds}s.`,
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
          },
        },
      );
    }

    return NextResponse.json(
      {
        error: error.message,
        errorCode: "forgot_password_failed",
        message:
          "Não foi possível processar sua solicitação agora. Tente novamente.",
      },
      { status: 400 },
    );
  }

  clearProviderRetryAfter(normalizedEmail);

  return NextResponse.json({
    success: true,
    message: AUTH_SAFE_RECOVERY_MESSAGE,
  });
}
