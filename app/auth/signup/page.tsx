import Link from 'next/link';
import { Logo, Card, Button } from '@/components/ui';

/** Account setup for approved customers. */
export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-midnight px-4">
      <Card className="w-full max-w-md p-6" tape="live">
        <div className="mb-6">
          <Logo />
        </div>
        <h1 className="text-xl font-800 text-ink-1">Set up your account</h1>
        <p className="mt-1 text-sm text-ink-2">
          For approved customers. Need pricing first?{' '}
          <Link href="/quote" className="text-sky hover:underline">
            Get a quote
          </Link>
          .
        </p>
        <ol className="mt-6 space-y-2 text-sm text-ink-2">
          <li>1. Business name, owner, email, trade type</li>
          <li>2. Phone &amp; address — becomes your CallCatch number</li>
          <li>3. Customize your AI greeting &amp; responses</li>
        </ol>
        <Button variant="primary" className="mt-6 w-full">
          Create account
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
