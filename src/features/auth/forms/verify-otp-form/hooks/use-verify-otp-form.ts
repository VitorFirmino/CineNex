"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { authApi } from "@infrastructure/api/auth-api";
import { translateAuthError } from "@shared/auth/auth-error";
import { AUTH_SAFE_RESEND_CONFIRMATION_MESSAGE } from "@shared/auth/auth-messages";

const schema = z.object({
  email: z.string().email("E-mail inválido").min(1, "E-mail é obrigatório"),
  token: z
    .string()
    .min(6, "Digite o código com 6 a 8 dígitos")
    .max(8, "Digite o código com 6 a 8 dígitos")
    .regex(/^\d{6,8}$/, "Digite apenas números"),
});

export type VerifyOtpData = z.infer<typeof schema>;
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 8;

export function useVerifyOtpForm() {
  const [isPending, setIsPending] = useState(false);
  const [isResendPending, setIsResendPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const consumedMessageRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prefillEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const infoMessage = useMemo(() => searchParams.get("message"), [searchParams]);

  const form = useForm<VerifyOtpData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail, token: "" },
  });

  const { register, handleSubmit, setValue, formState: { errors } } = form;
  const currentEmail = useWatch({
    control: form.control,
    name: "email",
  }) ?? "";
  const currentToken = useWatch({
    control: form.control,
    name: "token",
  }) ?? "";
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const autoSubmittedTokenRef = useRef("");

  const setNormalizedToken = useCallback(
    (rawValue: string) => {
      const normalized = String(rawValue || "").replace(/\D/g, "").slice(0, OTP_MAX_LENGTH);
      setValue("token", normalized, { shouldValidate: true, shouldDirty: true });
      return normalized;
    },
    [setValue],
  );

  const tokenDigits = useMemo(
    () => Array.from({ length: OTP_MAX_LENGTH }, (_, index) => currentToken?.[index] || ""),
    [currentToken],
  );

  const focusDigit = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(OTP_MAX_LENGTH - 1, index));
    const node = otpRefs.current[clampedIndex];
    if (!node) return;
    node.focus();
    node.select();
  }, []);

  const applyPastedToken = useCallback(
    (startIndex: number, rawValue: string) => {
      const digits = rawValue.replace(/\D/g, "");
      if (!digits) return;
      const nextDigits = [...tokenDigits];
      let targetIndex = startIndex;
      for (const digit of digits) {
        if (targetIndex >= OTP_MAX_LENGTH) break;
        nextDigits[targetIndex] = digit;
        targetIndex += 1;
      }
      const nextToken = setNormalizedToken(nextDigits.join(""));
      if (nextToken.length < OTP_MAX_LENGTH) {
        focusDigit(nextToken.length);
        return;
      }

      otpRefs.current[OTP_MAX_LENGTH - 1]?.blur();
    },
    [focusDigit, setNormalizedToken, tokenDigits],
  );

  const handleDigitChange = useCallback(
    (index: number, rawValue: string) => {
      if (!rawValue) {
        const nextDigits = [...tokenDigits];
        nextDigits[index] = "";
        setNormalizedToken(nextDigits.join(""));
        return;
      }
      applyPastedToken(index, rawValue);
    },
    [applyPastedToken, setNormalizedToken, tokenDigits],
  );

  const handleDigitKeyDown = useCallback(
    (index: number, key: string) => {
      if (key === "Backspace") {
        const nextDigits = [...tokenDigits];
        if (nextDigits[index]) {
          nextDigits[index] = "";
          setNormalizedToken(nextDigits.join(""));
          return;
        }
        if (index > 0) {
          nextDigits[index - 1] = "";
          setNormalizedToken(nextDigits.join(""));
          focusDigit(index - 1);
        }
        return;
      }
      if (key === "ArrowLeft") { if (index > 0) focusDigit(index - 1); return; }
      if (key === "ArrowRight") { if (index < OTP_MAX_LENGTH - 1) focusDigit(index + 1); }
    },
    [focusDigit, setNormalizedToken, tokenDigits],
  );

  const onSubmit = useCallback(async (data: VerifyOtpData) => {
    setIsPending(true);
    setError(null);
    setFeedback(null);

    try {
      await authApi.verifySignupOtp({
        email: data.email.trim().toLowerCase(),
        token: data.token.trim(),
      });
      window.dispatchEvent(new Event("auth:changed"));
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      if (!isAxiosError(error)) {
        setError("Não foi possível validar o código agora.");
        return;
      }

      const payload = (error.response?.data || {}) as {
        message?: string;
        error?: string;
        errorCode?: string;
      };
      const apiMessage = String(payload.message || "").trim();
      const rawError = String(payload.error || payload.errorCode || "").trim();
      setError(apiMessage || translateAuthError(rawError, "verify"));
    } finally {
      setIsPending(false);
    }
  }, [router]);

  const handleResend = async () => {
    const normalizedEmail = currentEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Informe seu e-mail para reenviar o código.");
      return;
    }

    setIsResendPending(true);
    setError(null);
    setFeedback(null);

    try {
      const payload = await authApi.resendSignupConfirmation({ email: normalizedEmail });
      setFeedback(String(payload.message || "") || AUTH_SAFE_RESEND_CONFIRMATION_MESSAGE);
      setResendCooldown(60);
      setNormalizedToken("");
      focusDigit(0);
      autoSubmittedTokenRef.current = "";
    } catch (error: unknown) {
      if (!isAxiosError(error)) {
        setError("Não foi possível reenviar o código agora.");
        return;
      }

      const res = error.response;
      const payload = (res?.data || {}) as { message?: string; error?: string; retryAfterSeconds?: number };
      const apiMessage = String(payload.message || "");
      const retryAfterHeader = Number(res?.headers["retry-after"]);
      const retryAfterFromBody = Number(payload.retryAfterSeconds || 0);
      const retryAfterSeconds =
        Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader
          : retryAfterFromBody;

      if (res?.status === 429 && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        setResendCooldown(retryAfterSeconds);
      }

      setError(apiMessage || translateAuthError(String(payload.error || ""), "verify"));
    } finally {
      setIsResendPending(false);
    }
  };

  useEffect(() => {
    if (prefillEmail) {
      setValue("email", prefillEmail, { shouldValidate: true });
    }
  }, [prefillEmail, setValue]);

  useEffect(() => {
    if (!infoMessage || consumedMessageRef.current) return;
    consumedMessageRef.current = true;
    setFlashMessage(infoMessage);
    const cleanedParams = new URLSearchParams(searchParams.toString());
    cleanedParams.delete("message");
    const cleanedUrl = cleanedParams.toString()
      ? `${pathname}?${cleanedParams.toString()}`
      : pathname;
    router.replace(cleanedUrl, { scroll: false });
  }, [infoMessage, pathname, router, searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const email = currentEmail.trim().toLowerCase();
    const token = currentToken.replace(/\D/g, "");
    if (token.length < OTP_MIN_LENGTH || token.length > OTP_MAX_LENGTH) {
      if (token.length < OTP_MIN_LENGTH) autoSubmittedTokenRef.current = "";
      return;
    }
    const isEmailValid = z.string().email().safeParse(email).success;
    if (!isEmailValid || isPending) return;
    const submitKey = `${email}:${token}`;
    if (autoSubmittedTokenRef.current === submitKey) return;
    autoSubmittedTokenRef.current = submitKey;
    const timer = window.setTimeout(() => {
      handleSubmit(onSubmit)();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [currentEmail, currentToken, handleSubmit, isPending, onSubmit]);

  return {
    register,
    handleSubmit,
    errors,
    onSubmit,
    isPending,
    isResendPending,
    resendCooldown,
    error,
    feedback,
    flashMessage,
    tokenDigits,
    otpRefs,
    handleDigitChange,
    handleDigitKeyDown,
    applyPastedToken,
    handleResend,
    OTP_MAX_LENGTH,
  };
}
