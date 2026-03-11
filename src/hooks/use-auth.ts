'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, subscribeAuthSync } from '@store/auth-store';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();

  useEffect(() => {
    return subscribeAuthSync();
  }, []);

  const logout = async (): Promise<void> => {
    await useAuthStore.getState().logout();
    router.push('/');
    router.refresh();
  };

  return { user, loading, logout };
}
