/**
 * Upgrade an EXISTING CallCatch Retell agent to sound as human as possible:
 * natural voice model, backchanneling, interruption handling, ambient office
 * sound, a warmer prompt, and a human greeting.
 *
 * Usage (from a machine that can reach api.retellai.com — e.g. your laptop):
 *   $env:RETELL_API_KEY="key_xxx"; $env:RETELL_DEMO_AGENT_ID="agent_xxx"; npm run tune:retell   # PowerShell
 *   RETELL_API_KEY=key_xxx RETELL_DEMO_AGENT_ID=agent_xxx npm run tune:retell                   # bash
 * Both values are also read from .env.local if present.
 */
import Retell from 'retell-sdk';
import { readFileSync } from 'node:fs';
import {
  AGENT_NAME,
  BEGIN_MESSAGE,
  GENERAL_PROMPT,
  DEFAULT_MODEL,
  AGENT_TUNING,
} from './retell-config.mjs';

function fromEnvFile(key) {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const line = raw.split(/\r?\n/).find((l) => l.trim().startsWith(`${key}=`));
    return line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') || undefined;
  } catch {
    return undefined;
  }
}

const apiKey = process.env.RETELL_API_KEY || fromEnvFile('RETELL_API_KEY');
const agentId = process.env.RETELL_DEMO_AGENT_ID || fromEnvFile('RETELL_DEMO_AGENT_ID');

if (!apiKey || !agentId) {
  console.error(
    '\n✖ Need RETELL_API_KEY and RETELL_DEMO_AGENT_ID.\n' +
      '  Put them in .env.local, or:\n' +
      '  PowerShell:  $env:RETELL_API_KEY="key_xxx"; $env:RETELL_DEMO_AGENT_ID="agent_xxx"; npm run tune:retell\n',
  );
  process.exit(1);
}

const client = new Retell({ apiKey });

async function main() {
  console.log(`→ Loading agent ${agentId}…`);
  const agent = await client.agent.retrieve(agentId);
  const llmId = agent?.response_engine?.llm_id;
  if (!llmId) {
    throw new Error('This agent has no Retell LLM attached (was it created with a Conversation Flow?).');
  }

  console.log(`→ Updating prompt + greeting on LLM ${llmId}…`);
  await client.llm.update(llmId, {
    model: process.env.RETELL_MODEL || DEFAULT_MODEL,
    general_prompt: GENERAL_PROMPT,
    begin_message: BEGIN_MESSAGE,
  });

  console.log('→ Applying "sound human" voice + turn-taking settings…');
  const tuning = { ...AGENT_TUNING };
  if (process.env.VOICE_ID) tuning.voice_id = process.env.VOICE_ID;
  if (process.env.NO_AMBIENT) {
    tuning.ambient_sound = null;
    delete tuning.ambient_sound_volume;
  }
  await client.agent.update(agentId, { agent_name: AGENT_NAME, ...tuning });

  console.log('\n✅ Tuned. Call the agent again — it should sound noticeably more human.\n');
  console.log('   Voice model:', tuning.voice_model);
  console.log('   Backchannel:', tuning.enable_backchannel, '· Ambient:', tuning.ambient_sound ?? 'off');
  console.log('   Interruption:', tuning.interruption_sensitivity, '· Responsiveness:', tuning.responsiveness);
  console.log('\nTweak anything in scripts/retell-config.mjs and re-run. NO_AMBIENT=1 turns off background sound.');
}

main().catch((err) => {
  console.error('\n✖ Tuning failed:', err?.message ?? err);
  if (err?.status === 401) console.error('  → 401: check RETELL_API_KEY.');
  if (err?.status === 404) console.error('  → 404: check RETELL_DEMO_AGENT_ID.');
  process.exit(1);
});
