import type { User } from "@supabase/supabase-js";

type SupabaseAuthLike = {
  auth: {
    getUser: () => Promise<{
      data: { user: User | null };
      error: unknown;
    }>;
    signOut?: () => Promise<unknown>;
  };
};

type GetSafeAuthUserOptions = {
  clearInvalidSession?: boolean;
  logContext?: string;
};

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : null;
}

function getErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const maybeMessage = (error as { message?: unknown }).message;
  return typeof maybeMessage === "string" ? maybeMessage : null;
}

export function isRefreshTokenNotFoundError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code === "refresh_token_not_found") return true;

  const message = getErrorMessage(error)?.toLowerCase() ?? "";
  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("auth session missing")
  );
}

async function clearInvalidSessionIfPossible(supabase: SupabaseAuthLike) {
  if (typeof supabase.auth.signOut !== "function") return;

  try {
    await supabase.auth.signOut();
  } catch (error) {
    if (!isRefreshTokenNotFoundError(error)) {
      console.error("[supabase/auth] Falha ao limpar sessão inválida.", error);
    }
  }
}

export async function getSafeAuthUser(
  supabase: SupabaseAuthLike,
  options: GetSafeAuthUserOptions = {},
): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (isRefreshTokenNotFoundError(error)) {
        if (options.logContext) {
          console.warn(
            `[${options.logContext}] Sessão inválida detectada. Tratando usuário como deslogado.`,
          );
        }
        if (options.clearInvalidSession) {
          await clearInvalidSessionIfPossible(supabase);
        }
        return null;
      }

      throw error;
    }

    return data.user;
  } catch (error) {
    if (isRefreshTokenNotFoundError(error)) {
      if (options.logContext) {
        console.warn(
          `[${options.logContext}] Refresh token ausente/inválido. Tratando usuário como deslogado.`,
        );
      }
      if (options.clearInvalidSession) {
        await clearInvalidSessionIfPossible(supabase);
      }
      return null;
    }

    throw error;
  }
}
