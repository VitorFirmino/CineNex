"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { authApi } from "@infrastructure/api/auth-api";
import { translateAuthError } from "@shared/auth/auth-error";
import { AUTH_SAFE_RECOVERY_MESSAGE } from "@shared/auth/auth-messages";

const schema = z.object({
  email: z.string().email("E-mail inválido").min(1, "E-mail é obrigatório"),
});

export type ForgotPasswordData = z.infer<typeof schema>;

function getProgressiveCooldownSeconds(attemptCount: number) {
  const safeCount = Math.max(1, attemptCount);
  return Math.min(300, 30 * (2 ** (safeCount - 1)));
}

export function useForgotPasswordForm() {
  const [isPending, setIsPending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [resendAttemptCount, setResendAttemptCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const form = useForm<ForgotPasswordData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const message = searchParams.get("message");
    if (!message) return;

    setFeedback(message);

    const cleanedParams = new URLSearchParams(searchParams.toString());
    cleanedParams.delete("message");
    const cleanedUrl = cleanedParams.toString()
      ? `${pathname}?${cleanedParams.toString()}`
      : pathname;
    router.replace(cleanedUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsPending(true);
    setError(null);
    setFeedback(null);

    try {
      const payload = await authApi.requestPasswordRecovery({
        email: data.email.trim().toLowerCase(),
      });
      const safeMessage = String(payload.message || AUTH_SAFE_RECOVERY_MESSAGE);
      const nextAttemptCount = resendAttemptCount + 1;
      setResendAttemptCount(nextAttemptCount);
      const progressiveCooldown = getProgressiveCooldownSeconds(nextAttemptCount);
      setCooldownSeconds(progressiveCooldown);
      setFeedback(`${safeMessage} Aguarde ${progressiveCooldown}s para reenviar.`);
    } catch (error: unknown) {
      if (!isAxiosError(error)) {
        setError("Não foi possível enviar o link de recuperação.");
        return;
      }

      const res = error.response;
      const payload = (res?.data || {}) as {
        message?: string;
        error?: string;
        errorCode?: string;
        retryAfterSeconds?: number;
      };
      const apiMessage = String(payload.message || "");
      const rawError = String(payload.error || "");

      if (res?.status !== 429) {
        setError(apiMessage || translateAuthError(rawError, "reset"));
        return;
      }

      const retryAfterHeader = Number(res.headers["retry-after"]);
      const retryAfterFromBody = Number(payload.retryAfterSeconds || 0);
      const retryAfterSeconds =
        Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader
          : retryAfterFromBody;
      const normalized =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 300;
      const rateLimitCode = String(payload.errorCode || "").toLowerCase();
      setCooldownSeconds(Math.min(normalized, 300));
      setError(
        apiMessage ||
          (rateLimitCode === "email_rate_limit_exceeded"
            ? "Limite de envio de e-mails atingido. Aguarde alguns minutos e tente novamente."
            : `Muitas tentativas em pouco tempo. Tente novamente em ${normalized}s.`),
      );
    } finally {
      setIsPending(false);
    }
  };

  return { form, isPending, cooldownSeconds, error, feedback, onSubmit };
}
