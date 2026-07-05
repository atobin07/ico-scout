/**
 * Onboard a real CallCatch client in one command:
 *   1. Creates a Retell LLM + Agent branded to the client (human voice, tuned,
 *      with the post-call analysis fields the webhook needs to book jobs).
 *   2. Points the agent's webhook at your production /api/retell/webhook.
 *   3. Provisions a Retell phone number bound to the agent (best-effort).
 *   4. Inserts the businesses row in Supabase so calls link to the client.
 *
 * Run on a machine that can reach api.retellai.com (your laptop):
 *   $env:CLIENT_NAME="Bell Comfort HVAC"; $env:CLIENT_EMAIL="owner@bell.com"; \
 *   $env:CLIENT_TRADE="HVAC"; $env:CLIENT_PHONE="+15125551234"; \
 *   $env:CLIENT_AREA_CODE="512"; npm run onboard:client
 *
 * Reads RETELL_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SITE_URL from the environment or .env.local.
 */
import Retell from 'retell-sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_MODEL,
  AGENT_TUNING,
  POST_CALL_ANALYSIS,
  clientPrompt,
  clientBeginMessage,
  pickVoice,
} from './retell-config.mjs';

function envFile(key) {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const line = raw.split(/\r?\n/).find((l) => l.trim().startsWith(`${key}=`));
    return line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') || undefined;
  } catch {
    return undefined;
  }
}
const env = (k) => process.env[k] || envFile(k);

const apiKey = env('RETELL_API_KEY');
const siteUrl = env('NEXT_PUBLIC_SITE_URL') || 'https://www.callcatchai.online';
const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');

const client = {
  name: env('CLIENT_NAME'),
  email: env('CLIENT_EMAIL'),
  owner: env('CLIENT_OWNER'),
  trade: env('CLIENT_TRADE'),
  phone: env('CLIENT_PHONE') || '',
  areaCode: env('CLIENT_AREA_CODE'),
  city: env('CLIENT_CITY'),
  state: env('CLIENT_STATE'),
};

if (!apiKey || !client.name || !client.email) {
  console.error(
    '\n✖ Need RETELL_API_KEY, CLIENT_NAME, and CLIENT_EMAIL (set the rest as desired).\n' +
      '  PowerShell example:\n' +
      '    $env:CLIENT_NAME="Bell Comfort HVAC"; $env:CLIENT_EMAIL="owner@bell.com"; $env:CLIENT_TRADE="HVAC"; $env:CLIENT_AREA_CODE="512"; npm run onboard:client\n',
  );
  process.exit(1);
}

const retell = new Retell({ apiKey });
const webhookUrl = `${siteUrl.replace(/\/$/, '')}/api/retell/webhook`;

async function main() {
  console.log(`\n→ Onboarding: ${client.name} (${client.trade || 'home services'})`);

  console.log('→ Fetching voices…');
  const voices = await retell.voice.list();
  const voice = pickVoice(voices, process.env.VOICE_ID);
  console.log(`  voice: ${voice.voice_name} (${voice.voice_id})`);

  console.log('→ Creating LLM…');
  const llm = await retell.llm.create({
    model: process.env.RETELL_MODEL || DEFAULT_MODEL,
    general_prompt: clientPrompt({ businessName: client.name, trade: client.trade }),
    begin_message: clientBeginMessage(client.name),
  });

  console.log('→ Creating agent (tuned, webhook + booking analysis)…');
  const agent = await retell.agent.create({
    agent_name: `${client.name} — CallCatch`,
    voice_id: voice.voice_id,
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    webhook_url: webhookUrl,
    post_call_analysis_data: POST_CALL_ANALYSIS,
    post_call_analysis_model: 'gpt-4.1-mini',
    ...AGENT_TUNING,
  });
  console.log(`  agent_id: ${agent.agent_id}`);

  // Provision a phone number bound to the agent (best-effort).
  let phoneNumber = null;
  try {
    console.log('→ Provisioning a phone number…');
    const num = await retell.phoneNumber.create({
      area_code: client.areaCode ? Number(client.areaCode) : undefined,
      inbound_agents: [{ agent_id: agent.agent_id, weight: 1 }],
      nickname: `${client.name} front desk`,
    });
    phoneNumber = num.phone_number;
    console.log(`  number: ${phoneNumber}`);
  } catch (err) {
    console.warn(`  ⚠ Could not auto-provision a number (${err?.message ?? err}).`);
    console.warn('    Set one up in the Retell dashboard, or have the client forward calls to a Retell number.');
  }

  // Insert the businesses row so calls link to this client.
  if (supabaseUrl && serviceKey) {
    console.log('→ Saving business in Supabase…');
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { error } = await db.from('businesses').upsert(
      {
        name: client.name,
        owner_email: client.email,
        owner_name: client.owner ?? null,
        phone: client.phone,
        trade_type: client.trade ?? null,
        city: client.city ?? null,
        state: client.state ?? null,
        retell_agent_id: agent.agent_id,
        retell_phone_number: phoneNumber,
        ai_script: clientPrompt({ businessName: client.name, trade: client.trade }),
        subscription_status: 'active',
      },
      { onConflict: 'owner_email' },
    );
    if (error) console.warn(`  ⚠ Supabase insert failed: ${error.message}`);
    else console.log('  ✓ business saved');
  } else {
    console.warn('→ Skipping Supabase insert (set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
  }

  console.log('\n✅ Client onboarded.\n');
  console.log(`   Business:  ${client.name}`);
  console.log(`   Agent:     ${agent.agent_id}`);
  console.log(`   Number:    ${phoneNumber ?? '(set up in Retell / use call forwarding)'}`);
  console.log(`   Webhook:   ${webhookUrl}\n`);
  if (phoneNumber) {
    console.log('NEXT STEP — tell the client to forward their business line to:');
    console.log(`   ${phoneNumber}`);
    console.log('   (Full forward, or "forward on no-answer/busy" to only catch missed calls.)\n');
  }
  console.log('Calls will now appear in your ops console at ' + siteUrl + '/ops\n');
}

main().catch((err) => {
  console.error('\n✖ Onboarding failed:', err?.message ?? err);
  if (err?.status === 401) console.error('  → 401: check RETELL_API_KEY.');
  process.exit(1);
});
