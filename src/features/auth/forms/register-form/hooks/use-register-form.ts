'use client';

import { useMemo, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { authApi } from '@infrastructure/api/auth-api';
import { registerSchema, type RegisterFormData } from '@shared/auth/register-schema';
import { translateAuthError } from '@shared/auth/auth-error';
import { AUTH_SAFE_SIGNUP_MESSAGE } from '@shared/auth/auth-messages';

export function useRegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });
  const passwordValue = useWatch({
    control: form.control,
    name: 'password',
  }) ?? '';

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
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 4) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [strength]);

  const strengthText = useMemo(() => {
    if (strength === 0) return '';
    if (strength <= 2) return 'Senha Fraca';
    if (strength <= 4) return 'Senha Média';
    return 'Senha Forte';
  }, [strength]);

  const requirements = [
    { label: '8+ caracteres', met: passwordValue.length >= 8 },
    { label: 'Maiúscula', met: /[A-Z]/.test(passwordValue) },
    { label: 'Minúscula', met: /[a-z]/.test(passwordValue) },
    { label: 'Número', met: /[0-9]/.test(passwordValue) },
    { label: 'Especial', met: /[^A-Za-z0-9]/.test(passwordValue) },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const payload = await authApi.register({
          name: data.name,
          email: data.email.trim().toLowerCase(),
          password: data.password,
          confirmPassword: data.confirmPassword,
        });

        if (payload.sessionCreated) {
          window.dispatchEvent(new Event('auth:changed'));
          window.location.replace('/');
          return;
        }

        const encodedEmail = encodeURIComponent(data.email.trim().toLowerCase());
        const encodedMessage = encodeURIComponent(String(payload.message || AUTH_SAFE_SIGNUP_MESSAGE));
        window.location.replace(
          `/verify-otp?email=${encodedEmail}&message=${encodedMessage}`,
        );
      } catch (error: unknown) {
        if (!isAxiosError(error)) {
          setError(translateAuthError('', 'register'));
          return;
        }

        const payload = error.response?.data || {};
        const apiMessage = String(payload.message || '').trim();
        const rawError = String(payload.error || '').trim();
        setError(apiMessage || translateAuthError(rawError, 'register'));
      }
    });
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
