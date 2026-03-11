import { NextResponse } from "next/server";
import { createClient } from "@infrastructure/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureProfileForUser } from "@services/auth/profile-sync";

function normalizeNextPath(raw: string | null): string {
  const value = String(raw || "").trim();
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function normalizeOtpType(raw: string | null): EmailOtpType | null {
  const value = String(raw || "").trim().toLowerCase();
  if (
    value === "signup" ||
    value === "recovery" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "email_change" ||
    value === "email"
  ) {
    return value as EmailOtpType;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const otpType = normalizeOtpType(searchParams.get("type"));
  const next = normalizeNextPath(searchParams.get("next"));
  const isRecoveryFlow = next === "/reset-password";
  const supabase = await createClient();

  if (code || (tokenHash && otpType) || (token && otpType && email)) {
    const authResult = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType!,
          })
        : await supabase.auth.verifyOtp({
            email: email!,
            token: token!,
            type: otpType!,
          });

    if (!authResult.error && authResult.data.user) {
      await ensureProfileForUser(authResult.data.user);

      const successTarget = new URL(next, origin);
      const response = NextResponse.redirect(successTarget);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    if (authResult.error) {
      console.error("[auth/callback] recovery/login callback failed", {
        next,
        hasCode: Boolean(code),
        hasTokenHash: Boolean(tokenHash),
        hasToken: Boolean(token),
        hasEmail: Boolean(email),
        otpType,
        error: authResult.error.message,
      });
    }
  }

  if (isRecoveryFlow) {
    const failedRecoveryTarget = new URL(
      `/forgot-password?message=${encodeURIComponent(
        "O link de recuperação expirou ou já foi utilizado. Solicite um novo e-mail.",
      )}`,
      origin,
    );
    const response = NextResponse.redirect(failedRecoveryTarget);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const fallbackTarget = new URL(
    "/login?message=Link expirado ou inválido. Tente novamente.",
    origin,
  );
  const response = NextResponse.redirect(fallbackTarget);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
