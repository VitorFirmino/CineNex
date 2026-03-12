"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { SiteHeader } from "@components/site-header";
import type { AuthUser } from "@infrastructure/api/auth-api";

const MonitoringProvider = dynamic(
  () => import("@components/monitoring-provider").then((m) => m.MonitoringProvider),
  { ssr: false },
);

const AuthHashRecoveryGuard = dynamic(
  () =>
    import("@features/auth/components/auth-hash-recovery-guard").then(
      (m) => m.AuthHashRecoveryGuard,
    ),
  { ssr: false },
);

const SiteFooterWrapper = dynamic(
  () => import("@components/site-footer/wrapper").then((m) => m.SiteFooterWrapper),
  { ssr: false },
);

interface LayoutClientShellProps {
  children: ReactNode;
  initialUser: AuthUser | null;
}

export function LayoutClientShell({
  children,
  initialUser,
}: LayoutClientShellProps) {
  return (
    <MonitoringProvider>
      <AuthHashRecoveryGuard />
      <SiteHeader initialUser={initialUser} />
      {children}
      <SiteFooterWrapper />
    </MonitoringProvider>
  );
}
