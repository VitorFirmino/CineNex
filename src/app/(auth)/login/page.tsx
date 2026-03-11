import type { Metadata } from "next";
import { LoginForm } from "@features/auth/forms/login-form";
import { AuthBackgroundShell } from "@features/auth/components/auth-background-shell";

export const metadata: Metadata = {
  title: "Entrar | CineNex",
  description:
    "Acesse sua conta no CineNex para continuar assistindo, salvar favoritos e acompanhar seu progresso em filmes e séries.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Entrar | CineNex",
    description:
      "Entre na sua conta do CineNex para retomar filmes, séries e favoritos com sua sessão sincronizada.",
    url: "/login",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Entrar | CineNex",
    description:
      "Entre no CineNex para continuar assistindo, acessar favoritos e manter seu progresso salvo.",
  },
};

export default function LoginPage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      <AuthBackgroundShell />
      <div className="z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
