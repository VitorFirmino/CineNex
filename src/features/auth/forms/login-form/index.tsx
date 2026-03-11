"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Alert, AlertDescription } from "@components/ui/alert";
import { useLoginForm } from "./hooks/use-login-form";

export function LoginForm() {
  const {
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
  } = useLoginForm();
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">
          Bem-vindo
        </h1>
        <p className="text-zinc-400 text-sm">
          Entre com seu e-mail e senha para acessar.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {(resendFeedback || flashMessage) && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-300">
              <AlertDescription>{resendFeedback || flashMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Button
          type="button"
          variant="outline"
          disabled={isGooglePending}
          onClick={startGoogleLogin}
          className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white py-6 rounded-xl"
        >
          <span className="inline-flex items-center">
            <svg
              aria-hidden="true"
              className="mr-2 h-4 w-4"
              viewBox="0 0 24 24"
            >
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 3.2 14.5 2.3 12 2.3 6.8 2.3 2.6 6.5 2.6 11.7S6.8 21.1 12 21.1c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3z"
              />
              <path
                fill="#34A853"
                d="M2.6 11.7c0 1.7.4 3.2 1.3 4.6l3.1-2.4c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2L3.9 7.1C3 8.5 2.6 10 2.6 11.7z"
              />
              <path
                fill="#FBBC05"
                d="M12 21.1c2.5 0 4.5-.8 6-2.2l-2.9-2.3c-.8.5-1.8.9-3.1.9-2.5 0-4.6-1.7-5.4-4l-3.1 2.4c1.6 3.1 4.8 5.2 8.5 5.2z"
              />
              <path
                fill="#4285F4"
                d="M18 18.9c2.1-1.9 3.1-4.7 3.1-7.9 0-.5-.1-.9-.1-1.3H12v3.9h5.4c-.2 1.1-.8 2.1-1.7 2.9z"
              />
            </svg>
            {isGooglePending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar com Google"}
          </span>
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.24em] text-zinc-500">
            <span className="bg-zinc-950 px-3">ou com e-mail</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative text-zinc-400 focus-within:text-emerald-500 transition-colors">
            <Mail className="absolute left-3 top-3 h-4 w-4" />
            <Input
              {...register("email")}
              aria-label="E-mail"
              placeholder="seu@email.com"
              type="email"
              autoComplete="email"
              className={`pl-10 bg-white/5 border-white/10 focus:border-emerald-500/50 transition-all text-white placeholder:text-zinc-600 ${errors.email ? "border-red-500/50" : ""
                }`}
            />
          </div>
          {errors.email && (
            <span className="text-xs text-red-400 ml-1">{errors.email.message}</span>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative text-zinc-400 focus-within:text-emerald-500 transition-colors">
            <Lock className="absolute left-3 top-3 h-4 w-4" />
            <Input
              {...register("password")}
              aria-label="Senha"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={`pl-10 pr-10 bg-white/5 border-white/10 focus:border-emerald-500/50 transition-all text-white placeholder:text-zinc-600 ${errors.password ? "border-red-500/50" : ""
                }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 hover:text-white transition-colors"
              aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <span className="text-xs text-red-400 ml-1">{errors.password.message}</span>
          )}
          <div className="text-right">
            <Link href="/forgot-password" className="text-xs text-emerald-400 hover:underline">
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-emerald-400 via-emerald-600 to-teal-700 hover:from-emerald-300 hover:via-emerald-500 hover:to-teal-600 shadow-[0_0_25px_var(--glow-20)] hover:shadow-[0_0_35px_var(--glow-40)] text-white font-medium py-6 rounded-xl transition-all active:scale-[0.98]"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Fazer login"
          )}
        </Button>
      </form>

      {canResendConfirmation && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isResendPending}
            onClick={handleResendConfirmation}
            className="w-full text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
          >
            {isResendPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reenviar código de confirmação"}
          </Button>
          <Button asChild type="button" variant="ghost" className="w-full text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10">
            <Link href={currentEmail ? `/verify-otp?email=${encodeURIComponent(currentEmail.trim().toLowerCase())}` : "/verify-otp"}>
              Confirmar com código
            </Link>
          </Button>
        </div>
      )}

      <div className="text-center text-sm text-zinc-500">
        Não tem uma conta?{" "}
        <Link href="/register" className="text-emerald-400 hover:underline">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
