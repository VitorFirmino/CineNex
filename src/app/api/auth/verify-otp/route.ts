import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@infrastructure/supabase/server";
import {
  consumeRateLimit,
  getClientIp,
} from "@infrastructure/security/rate-limit";

const verifySchema = z.object({
  email: z.string().email(),
  token: z
    .string()
    .min(6)
    .max(8)
    .regex(/^\d{6,8}$/),
});

export async function POST(request: Request) {
  const parsed = verifySchema.safeParse(await request.json().catch((error: unknown) => {
    console.error("[auth/verify-otp] Falha ao interpretar corpo da requisicao.", error);
    return null;
  }));
  if (!parsed.success) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const perIpLimit = consumeRateLimit({
    key: `auth:verify-otp:ip:${clientIp}`,
    limit: 30,
    windowMs: 5 * 60_000,
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
    key: `auth:verify-otp:email:${normalizedEmail}:ip:${clientIp}`,
    limit: 8,
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
  const { token } = parsed.data;
  const { error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: token.trim(),
    type: "signup",
  });

  if (error) {
    return NextResponse.json(
      {
        errorCode: "invalid_or_expired_otp",
        message:
          "Código inválido ou expirado. Solicite um novo código e tente novamente.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
