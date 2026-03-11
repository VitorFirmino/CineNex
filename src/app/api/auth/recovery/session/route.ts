import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@infrastructure/supabase/server";
import {
  consumeRateLimit,
  getClientIp,
} from "@infrastructure/security/rate-limit";

const recoverySessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

const RECOVERY_SESSION_WINDOW_MS = 5 * 60_000;

export async function POST(request: Request) {
  const parsed = recoverySessionSchema.safeParse(
    await request.json().catch((error: unknown) => {
      console.error("[auth/recovery-session] Falha ao interpretar corpo da requisicao.", error);
      return null;
    }),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Recovery session payload inválido." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const clientIp = getClientIp(request);
  const rateLimit = consumeRateLimit({
    key: `auth:recovery-session:ip:${clientIp}`,
    limit: 20,
    windowMs: RECOVERY_SESSION_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Muitas tentativas em pouco tempo. Tente novamente em ${rateLimit.retryAfterSeconds}s.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: parsed.data.accessToken,
    refresh_token: parsed.data.refreshToken,
  });

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      {
        error:
          "Sessão de recuperação inválida ou expirada. Solicite um novo e-mail.",
      },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    { success: true },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
