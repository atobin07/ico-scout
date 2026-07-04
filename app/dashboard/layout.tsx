import Link from 'next/link';
import { Logo, Badge } from '@/components/ui';

/**
 * Dashboard shell.
 * Phase 1: static sidebar + top bar so nested routes render.
 * Phase 5: real Supabase auth guard, live call indicator, notifications.
 */
const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '▮' },
  { href: '/dashboard/dispatch', label: 'Dispatch', icon: '◈' },
  { href: '/dashboard/customers', label: 'Customers', icon: '◱' },
  { href: '/dashboard/calls', label: 'Calls', icon: '☎' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '▤' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-midnight text-ink-1">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-navy md:flex">
        <div className="border-b border-border px-4 py-4">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-navy-mid hover:text-ink-1"
            >
              <span className="w-4 text-center text-ink-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-navy px-6 py-3">
          <div className="text-sm font-semibold text-ink-1">Dispatch Console</div>
          <div className="flex items-center gap-3">
            <Badge tone="live" dot>
              System live
            </Badge>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-navy-mid font-mono text-xs text-ink-2">
              CC
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
