'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Anonymous, stable visitor id (no PII) kept in localStorage. */
function visitorId(): string {
  try {
    const key = 'cc_vid';
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return '';
  }
}

function device(): 'mobile' | 'tablet' | 'desktop' {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua) || (w >= 640 && w < 1024)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua) || w < 640) return 'mobile';
  return 'desktop';
}

/** Fires a first-party page-view beacon on each route change. */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/ops')) return;
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      visitorId: visitorId(),
      device: device(),
    });
    try {
      // sendBeacon survives navigation; fall back to fetch.
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true });
      }
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return null;
}
