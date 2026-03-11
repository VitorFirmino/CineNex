"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { authApi } from "@infrastructure/api/auth-api";
import { translateAuthError } from "@shared/auth/auth-error";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
      .regex(/[0-9]/, "Deve conter pelo menos um número")
      .regex(/[^A-Za-z0-9]/, "Deve conter pelo menos um caractere especial"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ResetPasswordData = z.infer<typeof schema>;

export function useResetPasswordForm() {
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<ResetPasswordData>({ resolver: zodResolver(schema) });
  const passwordValue = useWatch({
    control: form.control,
    name: "password",
  }) ?? "";

  const strength = useMemo(() => {
    let score = 0;
    if (passwordValue.length >= 8) score++;
    if (/[A-Z]/.test(passwordValue)) score++;
    if (/[a-z]/.test(passwordValue)) score++;
    if (/[0-9]/.test(passwordValue)) score++;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score++;
    return score;
  }, [passwordValue]);

  const strengthColor = useMemo(() => {
    if (strength <= 2) return "bg-red-500";
    if (strength <= 4) return "bg-amber-500";
    return "bg-emerald-500";
  }, [strength]);

  const strengthText = useMemo(() => {
    if (strength === 0) return "";
    if (strength <= 2) return "Senha Fraca";
    if (strength <= 4) return "Senha Média";
    return "Senha Forte";
  }, [strength]);

  const requirements = [
    { label: "8+ caracteres", met: passwordValue.length >= 8 },
    { label: "Maiúscula", met: /[A-Z]/.test(passwordValue) },
    { label: "Minúscula", met: /[a-z]/.test(passwordValue) },
    { label: "Número", met: /[0-9]/.test(passwordValue) },
    { label: "Especial", met: /[^A-Za-z0-9]/.test(passwordValue) },
  ];

  const onSubmit = async (data: ResetPasswordData) => {
    setIsPending(true);
    setError(null);

    try {
      const payload = await authApi.resetPassword({
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      const message = String(
        payload.message || "Senha atualizada. Todas as sessões anteriores foram encerradas.",
      );
      window.dispatchEvent(new Event("auth:changed"));
      router.push(`/login?message=${encodeURIComponent(message)}`);
      router.refresh();
    } catch (error: unknown) {
      if (!isAxiosError(error)) {
        setError("Não foi possível atualizar sua senha.");
        return;
      }

      setError(translateAuthError(String(error.response?.data?.error || ""), "reset"));
    } finally {
      setIsPending(false);
    }
  };

  return {
    form,
    isPending,
    showPassword,
    setShowPassword,
    error,
    passwordValue,
    strength,
    strengthColor,
    strengthText,
    requirements,
    onSubmit,
  };
}
