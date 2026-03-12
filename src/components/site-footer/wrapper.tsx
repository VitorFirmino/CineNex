'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SiteFooter } from './index';

export function SiteFooterWrapper() {
  const pathname = usePathname();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) return;
    if (shouldRender) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: '1200px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isAdminRoute, shouldRender]);

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />
      {shouldRender ? <SiteFooter /> : null}
    </>
  );
}
