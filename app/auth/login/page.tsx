import Link from 'next/link';
import { Logo, Card, Button } from '@/components/ui';

/** Login. Wired to Supabase auth in Phase 9. */
export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-midnight px-4">
      <Card className="w-full max-w-sm p-6" tape="signal">
        <Logo className="mb-6" />
        <h1 className="text-xl font-800 text-ink-1">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-2">
          Sign in to your dispatch console.
        </p>
        <div className="mt-6 space-y-3 opacity-60">
          <input
            disabled
            placeholder="you@business.com"
            className="w-full rounded-lg border border-border bg-navy-mid px-3 py-2 text-sm text-ink-1 placeholder:text-ink-3"
          />
          <input
            disabled
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-border bg-navy-mid px-3 py-2 text-sm text-ink-1 placeholder:text-ink-3"
          />
        </div>
        <Button variant="signal" className="mt-4 w-full" disabled>
          Sign in (Phase 9)
        </Button>
        <p className="mt-4 text-center text-xs text-ink-2">
          No account?{' '}
          <Link href="/auth/signup" className="text-sky hover:underline">
            Start free trial
          </Link>
        </p>
      </Card>
    </main>
  );
}
