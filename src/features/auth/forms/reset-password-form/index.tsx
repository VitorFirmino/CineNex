"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Eye, EyeOff, AlertCircle, Check, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Alert, AlertDescription } from "@components/ui/alert";
import { cn } from "@shared/utils";
import { useResetPasswordForm } from "./hooks/use-reset-password-form";

export function ResetPasswordForm() {
  const {
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
  } = useResetPasswordForm();
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">
          Nova Senha
        </h1>
        <p className="text-zinc-400 text-sm">
          Defina uma nova senha para concluir a recuperação.
        </p>
      </div>

      <AnimatePresence mode="wait">
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
        <div className="space-y-2">
          <div className="relative text-zinc-400 focus-within:text-emerald-500 transition-colors">
            <Lock className="absolute left-3 top-3 h-4 w-4" />
            <Input
              {...register("password")}
              placeholder="Nova senha"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-describedby="password-requirements"
              className={`pl-10 pr-10 bg-white/5 border-white/10 focus:border-emerald-500/50 transition-all text-white placeholder:text-zinc-600 ${
                errors.password ? "border-red-500/50" : ""
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

          {passwordValue.length > 0 && (
            <div className="space-y-2 px-1 py-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Força da Senha</span>
                <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors",
                  strength <= 2 ? "text-red-400" : strength <= 4 ? "text-amber-400" : "text-emerald-400"
                )}>{strengthText}</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-full flex-1 transition-all duration-500",
                      i < strength ? strengthColor : "bg-transparent"
                    )}
                  />
                ))}
              </div>
              <div id="password-requirements" className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {req.met ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <X className="size-3 text-zinc-700" />
                    )}
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", req.met ? "text-emerald-500/80" : "text-zinc-600")}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.password && (
            <span className="text-xs text-red-400 ml-1">{errors.password.message}</span>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative text-zinc-400 focus-within:text-emerald-500 transition-colors">
            <Lock className="absolute left-3 top-3 h-4 w-4" />
            <Input
              {...register("confirmPassword")}
              placeholder="Confirme a nova senha"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={`pl-10 bg-white/5 border-white/10 focus:border-emerald-500/50 transition-all text-white placeholder:text-zinc-600 ${
                errors.confirmPassword ? "border-red-500/50" : ""
              }`}
            />
          </div>
          {errors.confirmPassword && (
            <span className="text-xs text-red-400 ml-1">{errors.confirmPassword.message}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-emerald-400 via-emerald-600 to-teal-700 hover:from-emerald-300 hover:via-emerald-500 hover:to-teal-600 shadow-[0_0_25px_var(--glow-20)] hover:shadow-[0_0_35px_var(--glow-40)] text-white font-medium py-6 rounded-xl transition-all active:scale-[0.98]"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Atualizar senha"}
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-500">
        Problemas com o link?{" "}
        <Link href="/forgot-password" className="text-emerald-400 hover:underline">
          Solicitar novo e-mail
        </Link>
      </div>
    </div>
  );
}
