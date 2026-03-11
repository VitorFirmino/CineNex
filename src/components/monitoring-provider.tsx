'use client';

import { useEffect, type ReactNode } from 'react';
import { useHeartbeat } from '@hooks/use-heartbeat';
import { usePathname } from 'next/navigation';

interface MonitoringProviderProps {
  children: ReactNode;
}

const THREE_CLOCK_DEPRECATION_MESSAGE =
  'THREE.THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';

function useDevelopmentConsoleFilters() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const [firstArg] = args;
      if (firstArg === THREE_CLOCK_DEPRECATION_MESSAGE) {
        return;
      }

      originalWarn(...args);
    };

    return () => {
      console.warn = originalWarn;
    };
  }, []);
}

export function MonitoringProvider({ children }: MonitoringProviderProps) {
  const pathname = usePathname();
  useDevelopmentConsoleFilters();

  const isPlaying = pathname.startsWith('/play/');
  const contentId = isPlaying ? pathname.split('/').pop() : undefined;

  useHeartbeat(contentId);

  return <>{children}</>;
}
