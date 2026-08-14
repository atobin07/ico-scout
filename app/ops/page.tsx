import { redirect } from 'next/navigation';
import { isOpsAuthed } from '@/lib/ops-auth';
import { createServiceSupabase } from '@/lib/supabase';
import { OpsNav } from '@/components/dashboard/OpsNav';
import { LeadsFeed, type LeadRow } from '@/components/dashboard/LeadsFeed';

export const dynamic = 'force-dynamic';

// The ops console lands on website leads — everyone who submitted a form.
export default async function OpsPage() {
  if (!isOpsAuthed()) redirect('/ops/login');

  let leads: LeadRow[] = [];
  let configError = false;
  try {
    const db = createServiceSupabase();
    const { data, error } = await db
      .from('leads')
      .select('id, created_at, kind, name, business_name, email, phone, trade, message, status, payload')
      .order('created_at', { ascending: false }) // newest inquiry at the top
      .limit(500);
    if (error) configError = true;
    leads = (data as LeadRow[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <div className="min-h-screen bg-midnight">
      <OpsNav active="/ops" />

      <main className="mx-auto max-w-4xl px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-800 text-ink-1">Leads</h1>
          <p className="mt-1 text-sm text-ink-2">
            Everyone who’s asked about your service through the website — newest first. Click a lead to see
            everything they submitted, then move it through your process.
          </p>
        </div>

        {configError && (
          <div className="mb-5 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
            Couldn’t reach the leads table. Make sure the Supabase env vars are set and migrations{' '}
            <code className="font-mono">003</code>/<code className="font-mono">004</code> are applied.
          </div>
        )}

        <LeadsFeed leads={leads} />
      </main>
    </div>
  );
}
