/**
 * Retell AI client helpers.
 * `createWebCall` powers the public browser voice demo (real mic + AI voice
 * + live transcript). Agent/recording helpers are fleshed out in Phase 3.
 */
import Retell from 'retell-sdk';
import type { Business } from '@/types';

const RETELL_API_BASE = 'https://api.retellai.com';

function retellHeaders() {
  return {
    Authorization: `Bearer ${process.env.RETELL_API_KEY ?? ''}`,
    'Content-Type': 'application/json',
  };
}

let _retell: Retell | null = null;

/** Lazily-instantiated server-side Retell client (uses the secret API key). */
export function getRetell(): Retell {
  if (!_retell) {
    _retell = new Retell({ apiKey: process.env.RETELL_API_KEY ?? '' });
  }
  return _retell;
}

/** The agent used by the public marketing voice demo. */
export function demoAgentId(): string | undefined {
  return process.env.RETELL_DEMO_AGENT_ID || undefined;
}

/** True when the live browser demo can run (API key + demo agent set). */
export function isLiveDemoConfigured(): boolean {
  return Boolean(process.env.RETELL_API_KEY && demoAgentId());
}

export interface WebCallToken {
  accessToken: string;
  callId: string;
  agentId: string;
}

/**
 * Create a Retell web call and return the access token the browser SDK
 * needs to join. MUST run server-side — it uses the secret API key.
 */
export async function createWebCall(agentId: string): Promise<WebCallToken> {
  const res = await getRetell().call.createWebCall({ agent_id: agentId });
  return {
    accessToken: res.access_token,
    callId: res.call_id,
    agentId: res.agent_id,
  };
}

/** Create a Retell agent configured with the business's custom AI script. */
export async function createRetellAgent(_business: Business): Promise<{
  agent_id: string;
  phone_number?: string;
}> {
  // Implemented in Phase 3.
  throw new Error('createRetellAgent not implemented until Phase 3');
}

/** Fetch the recording URL for a completed Retell call. */
export async function getCallRecording(_retellCallId: string): Promise<string | null> {
  // Implemented in Phase 3.
  throw new Error('getCallRecording not implemented until Phase 3');
}

/** Update the AI prompt/script for an existing agent. */
export async function updateAgentScript(
  _retellAgentId: string,
  _script: string,
): Promise<void> {
  // Implemented in Phase 3.
  throw new Error('updateAgentScript not implemented until Phase 3');
}

export { RETELL_API_BASE, retellHeaders };
