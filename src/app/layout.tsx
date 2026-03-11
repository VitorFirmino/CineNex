import type { Metadata } from "next";
import { TooltipProvider } from "@components/ui/tooltip";
import { SiteHeader } from "@components/site-header";
import { SiteFooterWrapper } from "@components/site-footer/wrapper";
import { MaintenanceScreen } from "@components/screens/maintenance-screen";
import { getMaintenanceState } from "@lib/maintenance";
import { createClient } from "@infrastructure/supabase/server";
import { prisma } from "@infrastructure/database/prisma";
import { MonitoringProvider } from "@components/monitoring-provider";
import { AuthHashRecoveryGuard } from "@features/auth/components/auth-hash-recovery-guard";
import { Analytics } from "@vercel/analytics/next";
import type { AuthUser } from "@infrastructure/api/auth-api";
import "./globals.css";
import "plyr/dist/plyr.css";

function resolveMetadataBase(): URL | undefined {
  const origin = process.env.AUTH_REDIRECT_BASE_URL;
  if (!origin) return undefined;

  try {
    return new URL(origin);
  } catch (error) {
    console.error("[layout] AUTH_REDIRECT_BASE_URL invalida para metadataBase.", error);
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "CineNex | Sua Central Multimídia",
  description: "Explore um vasto catálogo de filmes e séries com uma interface cinematográfica e de alta performance.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    isAdmin = profile?.role === "ADMIN";
  }

  const initialAuthUser: AuthUser | null = user
    ? {
        id: user.id,
        email: user.email || null,
        email_confirmed_at: user.email_confirmed_at || null,
        app_metadata: {
          role: isAdmin ? "ADMIN" : null,
        },
        user_metadata: {
          avatar_url: user.user_metadata?.avatar_url || null,
          picture: user.user_metadata?.picture || null,
          full_name: user.user_metadata?.full_name || null,
          name: user.user_metadata?.name || null,
        },
      }
    : null;

  const isMaintenance = getMaintenanceState();

  if (isMaintenance && !isAdmin) {
    return (
      <html lang="pt-BR" className="dark" data-scroll-behavior="smooth">
        <body className="font-sans antialiased text-zinc-100 min-h-screen bg-black" suppressHydrationWarning>
          <MaintenanceScreen />
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-BR" className="dark" data-scroll-behavior="smooth">
      <body className="font-sans antialiased text-zinc-100 min-h-screen bg-black" suppressHydrationWarning>
        <TooltipProvider>
          <MonitoringProvider>
            <AuthHashRecoveryGuard />
            <SiteHeader initialUser={initialAuthUser} />
            {children}
            <SiteFooterWrapper />
          </MonitoringProvider>
        </TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
