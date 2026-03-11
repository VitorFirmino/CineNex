"use client";

import { useEffect, useRef } from "react";
import { createRecoverySession } from "@infrastructure/api/auth-api";

const RECOVERY_LINK_ERROR_MESSAGE =
  "O link de recuperação expirou ou já foi utilizado. Solicite um novo e-mail de recuperação.";
const RECOVERY_SESSION_ERROR_MESSAGE =
  "Não foi possível validar o link de recuperação. Solicite um novo e-mail.";

export function AuthHashRecoveryGuard() {
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasProcessedRef.current) return;

    const rawHash = window.location.hash;
    if (!rawHash || rawHash.length <= 1) return;

    const hashParams = new URLSearchParams(rawHash.slice(1));
    const errorCode = hashParams.get("error_code")?.toLowerCase().trim() || "";
    const error = hashParams.get("error")?.toLowerCase().trim() || "";
    const errorDescription =
      hashParams.get("error_description")?.toLowerCase().trim() || "";
    const type = hashParams.get("type")?.toLowerCase().trim() || "";
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    const cleanPath = `${window.location.pathname}${window.location.search}`;
    const clearHashFromAddressBar = () => {
      window.history.replaceState({}, document.title, cleanPath);
    };

    const looksLikeExpiredRecoveryLink =
      errorCode === "otp_expired"
      || (error === "access_denied" && errorDescription.includes("email link"));

    if (looksLikeExpiredRecoveryLink) {
      hasProcessedRef.current = true;
      clearHashFromAddressBar();
      const target = `/forgot-password?message=${encodeURIComponent(RECOVERY_LINK_ERROR_MESSAGE)}`;
      window.location.replace(target);
      return;
    }

    const isRecoveryPayload =
      type === "recovery" &&
      typeof accessToken === "string" &&
      accessToken.length > 0 &&
      typeof refreshToken === "string" &&
      refreshToken.length > 0;

    if (!isRecoveryPayload) return;

    hasProcessedRef.current = true;
    clearHashFromAddressBar();

    const establishRecoverySession = async () => {
      try {
        await createRecoverySession({
          accessToken,
          refreshToken,
        });

        window.dispatchEvent(new Event("auth:changed"));
        window.location.replace("/reset-password");
      } catch (error) {
        console.error("[auth-hash-recovery-guard] Falha ao estabelecer sessao de recovery.", error);
        const target = `/forgot-password?message=${encodeURIComponent(RECOVERY_SESSION_ERROR_MESSAGE)}`;
        window.location.replace(target);
      }
    };

    void establishRecoverySession();
  }, []);

  return null;
}
