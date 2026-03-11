import type { Metadata } from "next";
import { AuthBackgroundShell } from "@features/auth/components/auth-background-shell";
import { ForgotPasswordForm } from "@features/auth/forms/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar Senha | CineNex",
  description:
    "Recupere o acesso à sua conta no CineNex para voltar a assistir filmes e séries com favoritos e progresso sincronizados.",
  alternates: { canonical: "/forgot-password" },
  openGraph: {
    title: "Recuperar Senha | CineNex",
    description:
      "Solicite a recuperação de senha da sua conta CineNex e volte a acessar seus filmes, séries e favoritos.",
    url: "/forgot-password",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Recuperar Senha | CineNex",
    description:
      "Recupere sua senha no CineNex para continuar assistindo com sua conta e progresso salvos.",
  },
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      <AuthBackgroundShell />
      <div className="z-10 w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
