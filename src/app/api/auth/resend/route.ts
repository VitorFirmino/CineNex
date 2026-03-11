import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@infrastructure/supabase/server";
import { AUTH_SAFE_RESEND_CONFIRMATION_MESSAGE } from "@shared/auth/auth-messages";
import { buildAuthCallbackUrl } from "@shared/auth/auth-redirect";
import {
  consumeRateLimit,
  getClientIp,
} from "@infrastructure/security/rate-limit";

const resendSchema = z.object({
  email: z.string().email(),
});

const DEFAULT_RETRY_AFTER_SECONDS = 300;

function extractRetryAfterSeconds(rawMessage: string) {
  const normalized = rawMessage.toLowerCase();
  const directMatch = normalized.match(
    /(\d+)\s*(second|seconds|segundo|segundos|minute|minutes|minuto|minutos)\b/i,
  );
  if (!directMatch) return DEFAULT_RETRY_AFTER_SECONDS;

  const value = Number(directMatch[1]);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_RETRY_AFTER_SECONDS;
  return directMatch[2].startsWith("min") || directMatch[2].startsWith("minute")
    ? value * 60
    : value;
}

export async function POST(request: Request) {
  const parsed = resendSchema.safeParse(await request.json().catch((error: unknown) => {
    console.error("[auth/resend] Falha ao interpretar corpo da requisicao.", error);
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
    key: `auth:resend:ip:${clientIp}`,
    limit: 20,
    windowMs: 10 * 60_000,
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
    key: `auth:resend:email:${normalizedEmail}:ip:${clientIp}`,
    limit: 5,
    windowMs: 10 * 60_000,
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(request, "/"),
    },
  });

  if (error) {
    const normalized = error.message.toLowerCase();
    const providerRateLimitMessage =
      normalized.includes("too many requests") ||
      normalized.includes("email rate limit exceeded") ||
      normalized.includes("for security purposes") ||
      normalized.includes("only request this after");
    if (providerRateLimitMessage) {
      const retryAfterSeconds = extractRetryAfterSeconds(error.message);
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
        errorCode: "resend_failed",
        message:
          "Não foi possível processar sua solicitação agora. Tente novamente.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: AUTH_SAFE_RESEND_CONFIRMATION_MESSAGE,
  });
}
