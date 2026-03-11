import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@infrastructure/supabase/server";
import { AUTH_SAFE_SIGNUP_MESSAGE } from "@shared/auth/auth-messages";
import { buildAuthCallbackUrl } from "@shared/auth/auth-redirect";
import {
  consumeRateLimit,
  getClientIp,
} from "@infrastructure/security/rate-limit";

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  });

const DISCLOSE_EXISTING_USER =
  process.env.AUTH_DISCLOSE_EXISTING_USER === "true";
const DEFAULT_RETRY_AFTER_SECONDS = 300;
const REGISTER_RATE_LIMIT_WINDOW_MS = 5 * 60_000;

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
  const parsed = registerSchema.safeParse(
    await request.json().catch((error: unknown) => {
      console.error("[auth/register] Falha ao interpretar corpo da requisicao.", error);
      return null;
    }),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados de cadastro inválidos." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { name, email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const clientIp = getClientIp(request);

  const perIpLimit = consumeRateLimit({
    key: `auth:register:ip:${clientIp}`,
    limit: 8,
    windowMs: REGISTER_RATE_LIMIT_WINDOW_MS,
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
    key: `auth:register:email:${normalizedEmail}:ip:${clientIp}`,
    limit: 3,
    windowMs: REGISTER_RATE_LIMIT_WINDOW_MS,
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

  let data: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.signUp>>["error"];

  try {
    ({ data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: buildAuthCallbackUrl(request, "/"),
        data: {
          full_name: name.trim(),
        },
      },
    }));
  } catch (error) {
    console.error("[auth/register] supabase signUp request failed", {
      email: normalizedEmail,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        errorCode: "supabase_unreachable",
        message:
          "Não foi possível conectar ao Supabase agora. Verifique sua conexão e tente novamente.",
      },
      { status: 503 },
    );
  }

  if (error) {
    const normalizedError = error.message.toLowerCase();
    const errorStatus =
      typeof (error as { status?: unknown }).status === "number"
        ? Number((error as { status?: unknown }).status)
        : null;
    const providerRateLimitMessage =
      normalizedError.includes("too many requests") ||
      normalizedError.includes("email rate limit exceeded") ||
      normalizedError.includes("for security purposes") ||
      normalizedError.includes("only request this after");
    const emailDeliveryFailure =
      normalizedError.includes("error sending confirmation email") ||
      normalizedError.includes("smtp");
    const isExistingUserError = normalizedError.includes(
      "user already registered",
    );
    if (isExistingUserError && !DISCLOSE_EXISTING_USER) {
      return NextResponse.json({
        success: true,
        sessionCreated: false,
        message: AUTH_SAFE_SIGNUP_MESSAGE,
      });
    }

    if (providerRateLimitMessage) {
      const retryAfterSeconds = extractRetryAfterSeconds(error.message);
      return NextResponse.json(
        {
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

    if (emailDeliveryFailure || (errorStatus !== null && errorStatus >= 500)) {
      return NextResponse.json(
        {
          errorCode: "email_delivery_failed",
          message:
            "Falha ao enviar o e-mail de confirmação. Verifique as configurações de SMTP no Supabase e tente novamente.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        errorCode: "register_failed",
        message:
          "Não foi possível processar seu cadastro agora. Tente novamente.",
      },
      { status: 400 },
    );
  }

  if (
    !data.session &&
    Array.isArray(data.user?.identities) &&
    data.user.identities.length === 0
  ) {
    if (DISCLOSE_EXISTING_USER) {
      return NextResponse.json(
        { error: "user already registered" },
        { status: 409 },
      );
    }
    return NextResponse.json({
      success: true,
      sessionCreated: false,
      message: AUTH_SAFE_SIGNUP_MESSAGE,
    });
  }

  return NextResponse.json({
    success: true,
    sessionCreated: Boolean(data.session),
    message: AUTH_SAFE_SIGNUP_MESSAGE,
  });
}
