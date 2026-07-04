'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#problem', label: 'The Problem' },
  { href: '#how', label: 'How it works' },
  { href: '#demo', label: 'Live demo' },
  { href: '/quote', label: 'Pricing' },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-300',
        scrolled ? 'glass border-b border-border' : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" aria-label="CallCatch home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink-2 transition-colors hover:text-ink-1"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2.5 md:flex">
          <Link href="/auth/login" className="text-sm text-ink-2 hover:text-ink-1">
            Sign in
          </Link>
          <Link href="/quote">
            <Button variant="primary" size="sm">
              Get a quote
            </Button>
          </Link>
        </div>

        <button
          className="grid h-9 w-9 place-items-center rounded-lg border border-border-2 text-ink-1 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="text-lg leading-none">{open ? '×' : '≡'}</span>
        </button>
      </nav>

      {open && (
        <div className="glass border-t border-border px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-ink-2 hover:text-ink-1"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/quote" onClick={() => setOpen(false)} className="mt-2">
              <Button variant="primary" size="sm" className="w-full">
                Get a quote
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
