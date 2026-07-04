/**
 * Retell AI client helpers.
 * Fleshed out in Phase 3. Placeholders here keep the module importable.
 */
import type { Business } from '@/types';

const RETELL_API_BASE = 'https://api.retellai.com';

function retellHeaders() {
  return {
    Authorization: `Bearer ${process.env.RETELL_API_KEY ?? ''}`,
    'Content-Type': 'application/json',
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
