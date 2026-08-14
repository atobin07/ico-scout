import Link from 'next/link';
import { Logo } from '@/components/ui';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-navy">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-2">
            The AI receptionist for home &amp; outdoor service businesses. Every call answered,
            every job booked — 24/7.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Product
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
            <Link href="/#how" className="hover:text-ink-1">How it works</Link>
            <Link href="/demo" className="hover:text-ink-1">Live demo</Link>
            <Link href="/quote" className="hover:text-ink-1">Pricing</Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Get started
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
            <Link href="/quote" className="hover:text-ink-1">Get a quote</Link>
            <a href="mailto:sales@callcatchai.online" className="hover:text-ink-1">sales@callcatchai.online</a>
            <Link href="/auth/login" className="hover:text-ink-1">Sign in</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-ink-3 sm:flex-row">
          <span className="font-mono">© {new Date().getFullYear()} CallCatch</span>
          <span>callcatchai.online</span>
        </div>
      </div>
    </footer>
  );
}
