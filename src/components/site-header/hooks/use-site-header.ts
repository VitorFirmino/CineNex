'use client';

import { useState } from 'react';
import { useAuth } from '@hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { IMMERSIVE_ROUTE_PREFIXES } from '@shared/constants';
import type { AuthUser } from '@infrastructure/api/auth-api';

interface UseSiteHeaderOptions {
  initialUser?: AuthUser | null;
}

export function useSiteHeader({ initialUser = null }: UseSiteHeaderOptions = {}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const resolvedUser = loading ? initialUser : user;
  const resolvedLoading = false;

  const isImmersiveRoute = IMMERSIVE_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdmin = resolvedUser?.app_metadata?.role === 'ADMIN';

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
  };

  return {
    user: resolvedUser,
    loading: resolvedLoading,
    router,
    pathname,
    isImmersiveRoute,
    isAdmin,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    handleLogout,
  };
}
