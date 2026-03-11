"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, KeyRound, AlertCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Alert, AlertDescription } from "@components/ui/alert";
import { useVerifyOtpForm } from "./hooks/use-verify-otp-form";

export function VerifyOtpForm() {
  const {
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
  } = useVerifyOtpForm();

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">
          Confirmar Cadastro
        </h1>
        <p className="text-zinc-400 text-sm">
          Digite o código de 6 a 8 dígitos enviado por e-mail.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {(feedback || flashMessage) && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-300">
              <AlertDescription>{feedback || flashMessage}</AlertDescription>
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
        <input type="hidden" autoComplete="email" {...register("email")} />
        {errors.email && (
          <span className="text-xs text-red-400 ml-1 block text-center">{errors.email.message}</span>
        )}

        <div className="space-y-2">
          <div className="relative">
            <Input
              {...register("token", {
                setValueAs: (value: string) => String(value || "").replace(/\D/g, "").slice(0, OTP_MAX_LENGTH),
              })}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div className="mb-2 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <KeyRound className="h-4 w-4" />
              <span>Cole o código e o preenchimento será automático</span>
            </div>
            <div className="flex justify-center gap-2">
              {tokenDigits.map((digit, index) => (
                <input
                  key={`otp-digit-${index}`}
                  ref={(node) => { otpRefs.current[index] = node; }}
                  value={digit}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => { handleDigitChange(index, event.target.value); }}
                  onKeyDown={(event) => {
                    if (["Backspace", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                      event.preventDefault();
                      handleDigitKeyDown(index, event.key);
                    }
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    applyPastedToken(index, event.clipboardData.getData("text"));
                  }}
                  aria-label={`Dígito ${index + 1} do código`}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={OTP_MAX_LENGTH}
                  className={`h-12 w-10 rounded-lg border text-center text-lg font-semibold transition-all outline-none ${
                    index === 3 ? "mr-2" : ""
                  } ${
                    errors.token
                      ? "border-red-500/50 bg-red-500/10 text-red-200"
                      : "border-white/10 bg-white/5 text-white focus:border-emerald-500/50"
                  }`}
                />
              ))}
            </div>
          </div>
          {errors.token && (
            <span className="text-xs text-red-400 ml-1">{errors.token.message}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-emerald-400 via-emerald-600 to-teal-700 hover:from-emerald-300 hover:via-emerald-500 hover:to-teal-600 shadow-[0_0_25px_var(--glow-20)] hover:shadow-[0_0_35px_var(--glow-40)] text-white font-medium py-6 rounded-xl transition-all active:scale-[0.98]"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Validar código"}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        disabled={isResendPending || resendCooldown > 0}
        onClick={handleResend}
        className="w-full text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
      >
        {isResendPending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : resendCooldown > 0
            ? `Reenviar código em ${resendCooldown}s`
            : "Reenviar código"}
      </Button>

      <div className="text-center text-sm text-zinc-500">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-emerald-400 hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  );
}
