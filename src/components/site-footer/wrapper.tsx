'use client';

import { usePathname } from 'next/navigation';
import { SiteFooter } from './index';

export function SiteFooterWrapper() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <SiteFooter />;
}
