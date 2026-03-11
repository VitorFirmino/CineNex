import { AuthBackgroundShell } from "@features/auth/components/auth-background-shell";
import { VerifyOtpForm } from "@features/auth/forms/verify-otp-form";

export default function VerifyOtpPage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      <AuthBackgroundShell />
      <div className="z-10 w-full max-w-md">
        <VerifyOtpForm />
      </div>
    </main>
  );
}
