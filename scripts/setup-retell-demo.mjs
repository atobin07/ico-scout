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

const AGENT_NAME = 'CallCatch Demo Receptionist';

const BEGIN_MESSAGE =
  "Thanks for calling Peak Home Services, this is the front desk — how can I help you today?";

const GENERAL_PROMPT = `## Identity
You are the friendly, professional front-desk receptionist for a home-services
company that does HVAC, plumbing, and electrical work. You answer the phone,
figure out what the caller needs, and book a service appointment. You sound like
a warm, competent human — never mention that you are an AI unless directly asked.

## Speaking style
- This is a live phone call. Keep every reply to one or two short sentences.
- Talk naturally, with contractions ("I'll", "let's", "no problem"). No jargon.
- Ask ONE question at a time, then stop and listen.
- Never read lists, bullet points, or long explanations aloud.
- Use brief backchannels ("Got it." "Okay." "Mm-hm.") so it feels human.
- Mirror the caller's urgency. If they're stressed, be calm and reassure first.
- If you didn't catch something, politely ask them to repeat it.

## Your goal on every call
Walk the caller through booking a visit, in this order. Don't re-ask for anything
they already told you.
1. Understand the problem. If it sounds urgent (burst pipe, no AC in heat, no heat
   in cold, sparking, burning smell, or gas), acknowledge it and reassure them you
   will get someone out quickly.
2. Get the caller's full name.
3. Get the service address.
4. Get the best callback number.
5. Offer the soonest reasonable time window and confirm it works. For emergencies
   offer "within the next couple of hours"; otherwise a same-day or next-morning slot.
6. Briefly read the details back to confirm: name, address, issue, and time.
7. Tell them a confirmation text with the technician's name and ETA is on the way,
   and ask if there's anything else.

## Guardrails
- Stay on topic. If asked something unrelated, answer in one line and steer back to
  booking the visit.
- Never quote an exact price. If pressed, give a rough range and say the technician
  confirms the quote on site before any work: "It's usually in the low hundreds for a
  visit like this, but the tech gives you an exact quote first."
- Don't invent policies or details the caller didn't give you.
- Keep it moving — aim to have the caller booked in under a minute.`;

const client = new Retell({ apiKey });

function pickVoice(voices) {
  if (process.env.VOICE_ID) {
    const forced = voices.find((v) => v.voice_id === process.env.VOICE_ID);
    return forced ?? { voice_id: process.env.VOICE_ID, voice_name: '(forced)', provider: '?' };
  }
  const isEnglish = (v) => !v.accent || /american|us|british|english/i.test(v.accent);
  const score = (v) => {
    let s = 0;
    if (v.provider === 'elevenlabs') s += 100;
    else if (v.provider === 'cartesia') s += 80;
    else if (v.provider === 'openai') s += 40;
    if (v.gender === 'female') s += 20;
    if (isEnglish(v)) s += 15;
    if (/american|us/i.test(v.accent ?? '')) s += 10;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

async function main() {
  console.log('→ Fetching available voices…');
  const voices = await client.voice.list();
  const voice = pickVoice(voices);
  console.log(
    `→ Using voice: ${voice.voice_name} (${voice.voice_id}) [${voice.provider}${
      voice.gender ? `, ${voice.gender}` : ''
    }${voice.accent ? `, ${voice.accent}` : ''}]`,
  );

  const model = process.env.RETELL_MODEL || 'gpt-4.1';
  console.log(`→ Creating LLM (model: ${model})…`);
  const llm = await client.llm.create({
    model,
    general_prompt: GENERAL_PROMPT,
    begin_message: BEGIN_MESSAGE,
  });
  console.log(`  llm_id: ${llm.llm_id}`);

  console.log('→ Creating agent…');
  const agent = await client.agent.create({
    agent_name: AGENT_NAME,
    voice_id: voice.voice_id,
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
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
