/**
 * One-shot Retell demo-agent setup.
 *
 * Creates a Retell LLM + Agent (voice, prompt, greeting) for the CallCatch
 * public voice demo, entirely via the Retell API — no dashboard clicking.
 *
 * Usage:
 *   RETELL_API_KEY=your_key node scripts/setup-retell-demo.mjs
 *
 * Optional overrides:
 *   VOICE_ID=11labs-Anna     # force a specific Retell voice id
 *   RETELL_MODEL=gpt-4.1     # force the LLM model
 *
 * On success it prints the RETELL_DEMO_AGENT_ID to add to your env.
 * Your API key never leaves your machine — nothing is committed or sent
 * anywhere except Retell.
 */
import Retell from 'retell-sdk';
import { readFileSync } from 'node:fs';
import {
  AGENT_NAME,
  BEGIN_MESSAGE,
  GENERAL_PROMPT,
  DEFAULT_MODEL,
  AGENT_TUNING,
  pickVoice,
} from './retell-config.mjs';

/** Fallback: read RETELL_API_KEY from .env.local so shell syntax doesn't matter. */
function keyFromEnvFile() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const line = raw.split(/\r?\n/).find((l) => l.trim().startsWith('RETELL_API_KEY='));
    const val = line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    return val || undefined;
  } catch {
    return undefined;
  }
}

const apiKey = process.env.RETELL_API_KEY || keyFromEnvFile();
if (!apiKey) {
  console.error(
    '\n✖ RETELL_API_KEY is not set.\n\n' +
      '  Provide it one of these ways:\n\n' +
      '  • Put it in .env.local:   RETELL_API_KEY=key_xxx   then run:  npm run setup:retell\n' +
      '  • PowerShell:   $env:RETELL_API_KEY="key_xxx"; npm run setup:retell\n' +
      '  • macOS/Linux:  RETELL_API_KEY=key_xxx npm run setup:retell\n',
  );
  process.exit(1);
}

const client = new Retell({ apiKey });

async function main() {
  console.log('→ Fetching available voices…');
  const voices = await client.voice.list();
  const voice = pickVoice(voices, process.env.VOICE_ID);
  console.log(
    `→ Using voice: ${voice.voice_name} (${voice.voice_id}) [${voice.provider}${
      voice.gender ? `, ${voice.gender}` : ''
    }${voice.accent ? `, ${voice.accent}` : ''}]`,
  );

  const model = process.env.RETELL_MODEL || DEFAULT_MODEL;
  console.log(`→ Creating LLM (model: ${model})…`);
  const llm = await client.llm.create({
    model,
    general_prompt: GENERAL_PROMPT,
    begin_message: BEGIN_MESSAGE,
  });
  console.log(`  llm_id: ${llm.llm_id}`);

  console.log('→ Creating agent with "sound human" settings…');
  const agent = await client.agent.create({
    agent_name: AGENT_NAME,
    voice_id: voice.voice_id,
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    ...AGENT_TUNING,
  });

  console.log('\n✅ Done! Your demo agent is live on Retell.\n');
  console.log('   Agent name: ' + AGENT_NAME);
  console.log('   agent_id:   ' + agent.agent_id + '\n');
  console.log('Add these to your environment (Vercel → Settings → Environment Variables):\n');
  console.log('   RETELL_API_KEY=' + '(the key you just used)');
  console.log('   RETELL_DEMO_AGENT_ID=' + agent.agent_id + '\n');
  console.log('Then redeploy. The /demo "Live voice" tab will connect to this agent.\n');
}

main().catch((err) => {
  console.error('\n✖ Setup failed:', err?.message ?? err);
  if (err?.status === 401) {
    console.error('  → 401 Unauthorized: check that RETELL_API_KEY is correct.');
  }
  process.exit(1);
});
