"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Alert, AlertDescription } from "@components/ui/alert";
import { useForgotPasswordForm } from "./hooks/use-forgot-password-form";

export function ForgotPasswordForm() {
  const { form, isPending, cooldownSeconds, error, feedback, onSubmit } = useForgotPasswordForm();
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-emerald-300 to-emerald-600 bg-clip-text text-transparent">
          Recuperar Senha
        </h1>
        <p className="text-zinc-400 text-sm">
          Informe seu e-mail para receber o link de redefinição.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-300">
              <AlertDescription>{feedback}</AlertDescription>
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
        <div className="space-y-2">
          <div className="relative text-zinc-400 focus-within:text-emerald-500 transition-colors">
            <Mail className="absolute left-3 top-3 h-4 w-4" />
            <Input
              {...register("email")}
              placeholder="seu@email.com"
              type="email"
              autoComplete="email"
              className={`pl-10 bg-white/5 border-white/10 focus:border-emerald-500/50 transition-all text-white placeholder:text-zinc-600 ${
                errors.email ? "border-red-500/50" : ""
              }`}
            />
          </div>
          {errors.email && (
            <span className="text-xs text-red-400 ml-1">{errors.email.message}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending || cooldownSeconds > 0}
          className="w-full bg-gradient-to-r from-emerald-400 via-emerald-600 to-teal-700 hover:from-emerald-300 hover:via-emerald-500 hover:to-teal-600 shadow-[0_0_25px_var(--glow-20)] hover:shadow-[0_0_35px_var(--glow-40)] text-white font-medium py-6 rounded-xl transition-all active:scale-[0.98]"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : cooldownSeconds > 0 ? (
            `Aguarde ${cooldownSeconds}s`
          ) : (
            "Enviar link de recuperação"
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-500">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-emerald-400 hover:underline">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
