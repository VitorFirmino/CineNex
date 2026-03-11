"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AuthBackground3D = dynamic(
  () => import("@features/auth/components/auth-background").then((mod) => mod.AuthBackground),
  { ssr: false },
);

function shouldDisable3DBackground(): boolean {
  if (typeof window === "undefined") return true;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return true;

  const isMobile = window.innerWidth < 768;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType as string | undefined;
  const saveData = Boolean(connection?.saveData);

  if (saveData) return true;
  if (["slow-2g", "2g", "3g"].includes(effectiveType ?? "")) return true;
  if (isMobile && effectiveType === "4g") return false;

  return isMobile;
}

function LightweightAuthBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-black w-full h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-base)] via-[var(--bg-mid)] to-black" />
      <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_18%_20%,var(--glow-22),transparent_40%),radial-gradient(circle_at_82%_8%,var(--glow-secondary-16),transparent_36%),radial-gradient(circle_at_50%_100%,var(--glow-12),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75" />
    </div>
  );
}

export function AuthBackgroundShell() {
  const [allow3D, setAllow3D] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAllow3D(!shouldDisable3DBackground());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!allow3D) return <LightweightAuthBackground />;
  return <AuthBackground3D />;
}
