'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, Card, Button } from '@/components/ui';

export default function OpsLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/ops/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    setLoading(false);
    if (res.ok) router.push('/ops');
    else setError('Wrong passcode.');
  }

  return (
    <main className="grid min-h-screen place-items-center bg-midnight px-4">
      <Card className="w-full max-w-sm p-6" tape="signal">
        <Logo className="mb-6" />
        <h1 className="text-xl font-800 text-ink-1">Ops console</h1>
        <p className="mt-1 text-sm text-ink-2">Internal — enter your passcode.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            autoFocus
            className="w-full rounded-lg border border-border bg-navy-mid px-3 py-2 text-sm text-ink-1 placeholder:text-ink-3 focus:border-sky focus:outline-none"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="signal" className="w-full" disabled={loading}>
            {loading ? 'Checking…' : 'Enter'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
