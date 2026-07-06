/**
 * Shared CallCatch demo-agent configuration used by both the create and the
 * tune scripts, so the greeting, prompt, and "sound human" settings stay in
 * one place.
 */

export const AGENT_NAME = 'CallCatch Demo Receptionist';

// A human name + natural phone greeting. No "How may I assist you today".
export const BEGIN_MESSAGE =
  "Thanks for calling Peak Home Services, this is Sarah — how can I help you today?";

/** LLM model. gpt-4.1 balances quality and latency; mini is snappier. */
export const DEFAULT_MODEL = 'gpt-4.1';

/**
 * Voice engine. eleven_flash_v2_5 is the low-latency ElevenLabs model —
 * latency is the #1 "AI tell", so fast + natural beats slow + pristine.
 * Alternatives: 'eleven_v3' (most expressive, higher latency), 'sonic-3'
 * (Cartesia, very natural + fast).
 */
export const DEFAULT_VOICE_MODEL = 'eleven_flash_v2_5';

// The system prompt. Written to sound like a real receptionist: short turns,
// contractions, fillers, backchanneling, and honest if asked whether it's AI.
export const GENERAL_PROMPT = `## Who you are
You're Sarah, the receptionist at a home & outdoor services company (things like
HVAC, plumbing, electrical, roofing, landscaping, lawn care, and tree service).
You answer the phone and book service appointments. You're warm, quick, and
genuinely helpful.

## Sound like a real person on the phone
- Keep every turn to ONE or TWO short sentences. Real people don't monologue.
- Use contractions and casual language: "yeah", "sure thing", "no worries",
  "let me grab that", "gotcha".
- Use small natural fillers occasionally: "um", "let's see", "okay so".
- React before you answer: "Oh no—", "Got it.", "Perfect.", "Mm-hm."
- Ask ONE thing at a time, then actually listen.
- Never read lists or spell things out unless asked. Never sound scripted.
- Vary how you say things—don't repeat the same phrases every call.
- If you mishear, just ask: "Sorry, say that one more time?"

## What you're trying to do (don't rush it, don't skip ahead)
1. Find out what's going on. If it sounds urgent—burst pipe, no AC in the heat,
   no heat in the cold, sparking, a burning smell, gas, a downed tree or storm
   damage—react to it and reassure them you'll get someone out quick.
2. Get their name.
3. Get the service address.
4. Get a good callback number.
5. Offer the soonest reasonable time and confirm it. Emergencies: "within the
   next couple hours." Otherwise a same-day or next-morning window.
6. Quickly repeat it back—name, address, what's going on, and the time.
7. Let them know they'll get a text to confirm, and ask if there's anything else.

## Handling tricky moments
- If they ask "is this a real person?" or "am I talking to a bot?"—be honest and
  keep it light: "I'm the AI assistant for the office, but I can get you booked
  right now just like the front desk would." Then keep going. Never pretend to be
  a human you're not.
- Never quote an exact price. If pushed: "It's usually in the low hundreds for a
  visit like this, but the tech gives you an exact quote before any work."
- If they want a human, reassure them: "I'll take all your details now and have
  someone follow up—what's going on?"
- Stay on topic. Anything off-topic, answer in a line and steer back to booking.

Keep the whole thing moving—aim to have them booked in under a minute.`;

/**
 * Agent-level "sound human" tuning applied via agent.create / agent.update.
 * See Retell docs for ranges. These are tuned for a natural inbound phone feel.
 */
export const AGENT_TUNING = {
  voice_model: DEFAULT_VOICE_MODEL,
  voice_temperature: 1.1, // a touch more expressive/variable than default 1.0
  voice_speed: 1.0,
  enable_dynamic_voice_speed: true, // speeds up/slows down naturally

  // Backchanneling ("mhm", "yeah") is one of the biggest naturalness wins.
  enable_backchannel: true,
  backchannel_frequency: 0.8,
  backchannel_words: ['mhm', 'yeah', 'right', 'got it', 'okay', 'I see'],

  // Turn-taking: let callers interrupt, and respond promptly (kills the
  // awkward robotic pause). Dynamic responsiveness adapts to the caller.
  interruption_sensitivity: 0.9,
  responsiveness: 1,
  enable_dynamic_responsiveness: true,

  // A subtle office background masks the "too clean" AI audio. Lower the
  // volume or set to null if you'd rather it be silent.
  ambient_sound: 'call-center',
  ambient_sound_volume: 0.3,

  // Lower-latency transcription; re-engage after silence; cap runaway calls.
  stt_mode: 'fast',
  reminder_trigger_ms: 10000,
  max_call_duration_ms: 600000, // 10 min guard (protects your Retell spend)
};

/** Per-call analysis fields Retell extracts into custom_analysis_data. The
 *  webhook reads these to create the customer + appointment. */
export const POST_CALL_ANALYSIS = [
  { type: 'boolean', name: 'booked', description: 'True if the caller booked/scheduled a service appointment on this call.' },
  { type: 'string', name: 'customer_name', description: "The caller's full name, if given." },
  { type: 'string', name: 'customer_phone', description: "The caller's callback phone number, if given." },
  { type: 'string', name: 'job_type', description: 'The service the caller needs (e.g. "AC repair", "leak repair").' },
  { type: 'string', name: 'address', description: 'The service address given by the caller, if any.' },
  { type: 'string', name: 'appointment_time', description: 'The date/time window agreed for the visit, in plain language.' },
  { type: 'number', name: 'estimated_value', description: 'A rough estimated dollar value of the job, if inferable. Otherwise leave empty.' },
];

/** Greeting for a specific client business. */
export function clientBeginMessage(businessName) {
  return `Thanks for calling ${businessName}, this is Sarah — how can I help you today?`;
}

/** Human-sounding receptionist prompt customized for a client business. */
export function clientPrompt({ businessName, trade }) {
  const tradeLine = trade
    ? `${businessName} is a ${trade} company.`
    : `${businessName} is a home & outdoor services company.`;
  return GENERAL_PROMPT.replace(
    "You're Sarah, the receptionist at a home & outdoor services company (things like\nHVAC, plumbing, electrical, roofing, landscaping, lawn care, and tree service).",
    `You're Sarah, the receptionist at ${businessName}. ${tradeLine}`,
  );
}

/** Rank voices: prefer natural ElevenLabs female en-US. */
export function pickVoice(voices, forcedId) {
  if (forcedId) {
    return voices.find((v) => v.voice_id === forcedId) ?? { voice_id: forcedId, voice_name: '(forced)', provider: '?' };
  }
  const score = (v) => {
    let s = 0;
    if (v.provider === 'elevenlabs') s += 100;
    else if (v.provider === 'cartesia') s += 80;
    else if (v.provider === 'openai') s += 40;
    if (v.gender === 'female') s += 20;
    if (!v.accent || /american|us|english/i.test(v.accent)) s += 15;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}
