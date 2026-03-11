import { AuthBackgroundShell } from "@features/auth/components/auth-background-shell";
import { ResetPasswordForm } from "@features/auth/forms/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      <AuthBackgroundShell />
      <div className="z-10 w-full max-w-md">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
