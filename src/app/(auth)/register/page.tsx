import type { Metadata } from "next";
import { RegisterForm } from "@features/auth/forms/register-form";
import { AuthBackgroundShell } from "@features/auth/components/auth-background-shell";

export const metadata: Metadata = {
  title: "Criar Conta | CineNex",
  description:
    "Crie sua conta no CineNex para salvar favoritos, continuar assistindo e acessar uma experiência personalizada para filmes e séries.",
  alternates: { canonical: "/register" },
  openGraph: {
    title: "Criar Conta | CineNex",
    description:
      "Cadastre-se no CineNex para acompanhar filmes e séries com favoritos, progresso e navegação personalizada.",
    url: "/register",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Criar Conta | CineNex",
    description:
      "Cadastre-se no CineNex e acompanhe seus filmes e séries com favoritos e progresso salvo.",
  },
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 pt-24">
      <AuthBackgroundShell />
      <div className="z-10 w-full max-w-md">
        <RegisterForm />
      </div>
    </main>
  );
}
