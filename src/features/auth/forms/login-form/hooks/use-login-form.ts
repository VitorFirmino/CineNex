"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { authApi } from "@infrastructure/api/auth-api";
import { loginSchema, type LoginFormData } from "@shared/auth/auth-schema";
import { translateAuthError } from "@shared/auth/auth-error";
import { AUTH_SAFE_RESEND_CONFIRMATION_MESSAGE } from "@shared/auth/auth-messages";

export function useLoginForm() {
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResendPending, setIsResendPending] = useState(false);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consumedMessageRef = useRef(false);
  const infoMessage = useMemo(() => searchParams.get("message"), [searchParams]);
  const nextPath = useMemo(() => {
    const candidate = searchParams.get("next");
    if (!candidate) return "/";
    return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
  }, [searchParams]);

  const form = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });
  const currentEmail = useWatch({
    control: form.control,
    name: "email",
  }) ?? "";

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

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setResendFeedback(null);
    setFlashMessage(null);
    setCanResendConfirmation(false);
    setIsPending(true);

    try {
      await authApi.login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      await authApi.me().catch(() => null);
      window.dispatchEvent(new Event("auth:changed"));
      window.location.replace(nextPath);
    } catch (error: unknown) {
      if (!isAxiosError(error)) {
        setError("Não foi possível entrar agora. Tente novamente.");
        return;
      }

      const rawError = String(error.response?.data?.error || "");
      setCanResendConfirmation(rawError.toLowerCase().includes("email not confirmed"));
      setError(translateAuthError(rawError, "login"));
    } finally {
      setIsPending(false);
    }
  };

  const handleResendConfirmation = async () => {
    const email = form.getValues("email").trim().toLowerCase();
    if (!email) {
      setError("Informe seu e-mail para reenviar a confirmação.");
      return;
    }

    setIsResendPending(true);
    setError(null);
    setResendFeedback(null);

    try {
      const payload = await authApi.resendSignupConfirmation({ email });
      setResendFeedback(String(payload.message || "") || AUTH_SAFE_RESEND_CONFIRMATION_MESSAGE);
    } catch (error: unknown) {
      if (!isAxiosError(error)) {
        setError("Não foi possível reenviar o e-mail agora.");
        return;
      }

      const payload = error.response?.data || {};
      const apiMessage = String(payload.message || "");
      setError(apiMessage || translateAuthError(String(payload.error || ""), "login"));
    } finally {
      setIsResendPending(false);
    }
  };

  const startGoogleLogin = async () => {
    setError(null);
    setResendFeedback(null);
    setFlashMessage(null);
    setCanResendConfirmation(false);
    setIsGooglePending(true);

    try {
      const oauthUrl = new URL("/api/auth/oauth/google", window.location.origin);
      if (nextPath !== "/") {
        oauthUrl.searchParams.set("next", nextPath);
      }
      window.location.assign(oauthUrl.toString());
    } catch (error: unknown) {
      console.error("[use-login-form] Falha ao iniciar login com Google.", error);
      setError("Não foi possível iniciar o login com Google. Tente novamente.");
      setIsGooglePending(false);
    }
  };

  return {
    form,
    currentEmail,
    isPending,
    isGooglePending,
    showPassword,
    setShowPassword,
    isResendPending,
    canResendConfirmation,
    resendFeedback,
    flashMessage,
    error,
    onSubmit,
    startGoogleLogin,
    handleResendConfirmation,
  };
}
