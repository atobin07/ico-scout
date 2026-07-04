import { NextResponse } from 'next/server';
import { createWebCall, demoAgentId, isLiveDemoConfigured } from '@/lib/retell';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mints a Retell web-call access token for the public voice demo.
 * The browser calls this, then hands the token to the Retell client SDK.
 *
 * Returns 503 { configured: false } when RETELL_API_KEY / RETELL_DEMO_AGENT_ID
 * aren't set, so the client can fall back to the guided (simulated) demo.
 */
export async function POST() {
  if (!isLiveDemoConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        message:
          'Live voice demo is not configured. Set RETELL_API_KEY and RETELL_DEMO_AGENT_ID.',
      },
      { status: 503 },
    );
  }

  try {
    const agentId = demoAgentId()!;
    const token = await createWebCall(agentId);
    return NextResponse.json({ configured: true, ...token });
  } catch (err) {
    console.error('[retell/web-call] failed to create web call', err);
    return NextResponse.json(
      { configured: true, error: 'Failed to start the call. Please try again.' },
      { status: 502 },
    );
  }
}

/** Lightweight availability probe used by the demo UI on load. */
export async function GET() {
  return NextResponse.json({ configured: isLiveDemoConfigured() });
}
