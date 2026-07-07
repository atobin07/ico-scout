/**
 * Turns a /get-started intake submission into a ready-to-paste Retell setup:
 * a full receptionist prompt, a begin message (greeting), and a voice suggestion.
 * Used server-side by /api/onboarding so the notification email hands you a
 * copy-paste prompt for the Retell dashboard.
 */

export interface IntakeForPrompt {
  businessName?: string;
  ownerName?: string;
  trade?: string;
  services?: string;
  serviceArea?: string;
  hours?: string;
  voiceGender?: string;
  tone?: string;
  greeting?: string;
  specialInstructions?: string;
  availability?: string;
  pricing?: string;
  alertsTo?: string;
}

export interface BuiltPrompt {
  agentName: string;
  generalPrompt: string;
  beginMessage: string;
  voiceSuggestion: string;
}

const TONE_LINE: Record<string, string> = {
  'Warm & friendly': 'Sound warm and friendly — like a helpful neighbor who’s glad they called.',
  'Professional & polished': 'Sound clear, professional, and polished — competent and reassuring.',
  'Casual & down-to-earth': 'Sound casual and down-to-earth — like a real person, not a script.',
  'Energetic & upbeat': 'Sound upbeat and energetic — positive and quick, without rushing them.',
};

const TONE_WORD: Record<string, string> = {
  'Warm & friendly': 'warm, friendly',
  'Professional & polished': 'clear, professional',
  'Casual & down-to-earth': 'natural, easygoing',
  'Energetic & upbeat': 'upbeat, energetic',
};

/** Pull a name from a greeting like "…this is Jake…", else default to Sarah. */
function nameFromGreeting(greeting?: string): string {
  const m = greeting?.match(/this is\s+([A-Z][a-zA-Z'-]+)/);
  return m?.[1] ?? 'Sarah';
}

export function buildPromptFromIntake(intake: IntakeForPrompt): BuiltPrompt {
  const business = intake.businessName?.trim() || 'the company';
  const trade = intake.trade?.trim();
  const name = nameFromGreeting(intake.greeting);

  const identity = trade
    ? `You're ${name}, the receptionist at ${business}, a ${trade} company.`
    : `You're ${name}, the receptionist at ${business}, a home & outdoor services company.`;

  const context: string[] = [];
  if (intake.services?.trim()) context.push(`They handle: ${intake.services.trim()}.`);
  if (intake.serviceArea?.trim()) context.push(`They serve ${intake.serviceArea.trim()}.`);
  if (intake.hours?.trim())
    context.push(`Normal hours are ${intake.hours.trim()}, but you answer and take messages anytime, 24/7.`);

  const toneLine = intake.tone ? (TONE_LINE[intake.tone] ?? '') : '';

  const availabilityLine = intake.availability?.trim()
    ? `When offering a time, use what they told us about availability: ${intake.availability.trim()}. For emergencies, offer the soonest possible window.`
    : 'Offer the soonest reasonable time. For emergencies, offer "within the next couple hours."';

  const pricingLine = intake.pricing?.trim()
    ? `If asked about price: ${intake.pricing.trim()}`
    : `Never quote an exact price. If pushed: "It's usually in the low hundreds for a visit like this, but the tech gives you an exact quote before any work."`;

  const special = intake.specialInstructions?.trim()
    ? `\n## Owner’s special instructions (follow these)\n${intake.specialInstructions.trim()}\n`
    : '';

  const alerts = intake.alertsTo?.trim() ? ` (${intake.alertsTo.trim().toLowerCase()})` : '';

  const generalPrompt = `## Who you are
${identity} You answer the phone and book service appointments. You're warm, quick, and genuinely helpful.
${context.length ? context.join(' ') + '\n' : ''}
## Sound like a real person on the phone
${toneLine ? `- ${toneLine}\n` : ''}- Keep every turn to ONE or TWO short sentences. Real people don't monologue.
- Use contractions and casual language: "yeah", "sure thing", "no worries", "gotcha".
- React before you answer: "Oh no—", "Got it.", "Perfect.", "Mm-hm."
- Ask ONE thing at a time, then actually listen. Never sound scripted.
- If you mishear, just ask: "Sorry, say that one more time?"

## What you're trying to do (don't rush, don't skip ahead)
1. Find out what's going on. If it sounds urgent—burst pipe, no AC/heat, sparking, gas, a downed tree, storm damage—react and reassure them you'll get someone out quick.
2. Get their name.
3. Get the service address.
4. Get a good callback number.
5. ${availabilityLine} Confirm the time.
6. Quickly repeat it back—name, address, what's going on, and the time.
7. Let them know they'll get a confirmation${alerts}, and ask if there's anything else.

## Pricing
${pricingLine}
${special}
## Handling tricky moments
- If asked "is this a real person?"—be honest and light: "I'm the AI assistant for the office, but I can get you booked right now just like the front desk would." Never pretend to be a human.
- If they want a human: "I'll take all your details now and have someone follow up—what's going on?"
- Stay on topic. Anything off-topic, answer in a line and steer back to booking.

Keep the whole thing moving—aim to have them booked in under a minute.`;

  const beginMessage =
    intake.greeting?.trim() ||
    `Thanks for calling ${business}, this is ${name} — how can I help you today?`;

  const genderPref = intake.voiceGender?.trim();
  const genderText = genderPref ? genderPref.toLowerCase() : 'either';
  const toneWord = intake.tone ? (TONE_WORD[intake.tone] ?? 'natural') : 'natural';
  const voiceSuggestion = `In Retell, pick an ElevenLabs ${genderText} voice with a ${toneWord} sound (voice model eleven_flash_v2_5). Set the Begin Message and Prompt below.`;

  return { agentName: name, generalPrompt, beginMessage, voiceSuggestion };
}
