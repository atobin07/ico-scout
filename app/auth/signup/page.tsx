import Link from 'next/link';
import { Logo, Card, Button, Badge } from '@/components/ui';

/** 3-step onboarding. Full build in Phase 9. */
export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-midnight px-4">
      <Card className="w-full max-w-md p-6" tape="live">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Badge tone="signal">Phase 9</Badge>
        </div>
        <h1 className="text-xl font-800 text-ink-1">Start your free trial</h1>
        <p className="mt-1 text-sm text-ink-2">
          3 steps: business details → phone number → AI script.
        </p>
        <ol className="mt-6 space-y-2 text-sm text-ink-2">
          <li>1. Business name, owner, email, trade type</li>
          <li>2. Phone &amp; address — becomes your CallCatch number</li>
          <li>3. Customize your AI greeting &amp; responses</li>
        </ol>
        <Button variant="primary" className="mt-6 w-full" disabled>
          Create account (Phase 9)
        </Button>
        <p className="mt-4 text-center text-xs text-ink-2">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-sky hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
