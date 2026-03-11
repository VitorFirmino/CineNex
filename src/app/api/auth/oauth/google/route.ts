import { NextResponse } from "next/server";
import { createClient } from "@infrastructure/supabase/server";
import { buildAuthCallbackUrl } from "@shared/auth/auth-redirect";

function normalizeNextPath(raw: string | null): string | undefined {
  const value = String(raw || "").trim();
  if (!value || value === "/") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildAuthCallbackUrl(request, nextPath),
    },
  });

  if (error || !data.url) {
    const fallbackUrl = new URL("/login", requestUrl.origin);
    if (nextPath) {
      fallbackUrl.searchParams.set("next", nextPath);
    }
    fallbackUrl.searchParams.set(
      "message",
      "Não foi possível iniciar o login com Google. Tente novamente.",
    );

    const response = NextResponse.redirect(fallbackUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = NextResponse.redirect(data.url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
