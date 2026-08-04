import Link from 'next/link';
import { Logo, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/ops', label: 'Overview' },
  { href: '/ops/leads', label: 'Leads' },
  { href: '/ops/dispatch', label: 'Dispatch' },
  { href: '/ops/analytics', label: 'Analytics' },
];

export function OpsNav({ active }: { active: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-navy px-6 py-3">
      <div className="flex items-center gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 sm:flex">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                active === t.href ? 'bg-navy-mid text-ink-1' : 'text-ink-2 hover:text-ink-1',
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <Badge tone="live" dot>
        Live
      </Badge>
    </header>
  );
}
