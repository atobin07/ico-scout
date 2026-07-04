/**
 * CatchBot — a lightweight, fully client-side conversation engine that
 * simulates the CallCatch AI receptionist for the public demo.
 *
 * No API keys, no network. A slot-filling state machine drives a realistic
 * "answer → qualify → book" flow. Phase 3 swaps this for live Retell AI.
 */

export type Trade = 'HVAC' | 'Plumbing' | 'Electrical' | 'Roofing';
export type Accent = 'live' | 'signal' | 'warn' | 'danger';

export interface Scenario {
  id: string;
  trade: Trade;
  label: string;
  blurb: string;
  /** Suggested opener a caller might say — prefilled as a hint. */
  opener: string;
  jobType: string;
  estValue: number;
  accent: Accent;
  company: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'ac',
    trade: 'HVAC',
    label: 'AC Emergency',
    blurb: 'No cooling on a 98° day',
    opener: 'My air conditioner just stopped working and the house is getting really hot.',
    jobType: 'Emergency AC repair',
    estValue: 480,
    accent: 'danger',
    company: 'Peak Comfort Heating & Air',
  },
  {
    id: 'pipe',
    trade: 'Plumbing',
    label: 'Pipe Burst',
    blurb: 'Water spreading under the sink',
    opener: 'A pipe burst under my kitchen sink and water is going everywhere.',
    jobType: 'Emergency leak repair',
    estValue: 650,
    accent: 'warn',
    company: 'Rapid Response Plumbing',
  },
  {
    id: 'panel',
    trade: 'Electrical',
    label: 'Electrical Panel',
    blurb: 'Breakers keep tripping',
    opener: 'Half my house lost power and the breaker keeps tripping when I reset it.',
    jobType: 'Panel diagnostic & repair',
    estValue: 725,
    accent: 'signal',
    company: 'Coreline Electric',
  },
];

export function scenarioById(id?: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export type Step = 'issue' | 'name' | 'address' | 'time' | 'done';

export interface Booking {
  jobType: string;
  window: string;
  estValue: number;
  name: string;
  address: string;
  smsSent: boolean;
}

export interface BotState {
  step: Step;
  slots: {
    issue?: string;
    name?: string;
    address?: string;
    time?: string;
  };
  scenarioId?: string;
}

export interface TurnResult {
  reply: string;
  state: BotState;
  done: boolean;
  booking?: Booking;
}

const URGENT = /(burst|flood|sparks?|smoke|fire|no (heat|ac|power|cooling)|gas|leak|emergency|overflow)/i;

/** The AI always speaks first — this is the greeting for a fresh call. */
export function greeting(scenario?: Scenario): string {
  const company = scenario?.company ?? 'Precision Home Services';
  return `Thanks for calling ${company}. This is the CallCatch AI assistant — I can get a technician booked for you right now. What's going on today?`;
}

export function initialState(scenarioId?: string): BotState {
  return { step: 'issue', slots: {}, scenarioId };
}

function extractName(input: string): string {
  const m = input.match(/\b(?:my name is|this is|i am|i'm|it's)\s+([a-z][a-z'.-]*(?:\s+[a-z][a-z'.-]*)?)/i);
  const raw = (m?.[1] ?? input).trim();
  // Keep it to first two words, title-cased.
  return raw
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/[^a-zA-Z'.\- ]/g, '')
    .trim();
}

function timeWindow(input: string): string {
  const t = input.toLowerCase();
  if (/\b(now|asap|right away|immediately|urgent|emergency)\b/.test(t)) return 'within the next 2 hours';
  if (/\b(tonight|evening|after work)\b/.test(t)) return 'this evening, 5–7 PM';
  if (/\b(tomorrow|morning)\b/.test(t)) return 'tomorrow morning, 8–10 AM';
  if (/\b(afternoon)\b/.test(t)) return 'this afternoon, 1–3 PM';
  return 'today between 2 and 4 PM';
}

/**
 * Advance the conversation given the caller's latest utterance.
 * Returns the AI reply plus the next state (and a booking once complete).
 */
export function respond(state: BotState, utterance: string): TurnResult {
  const input = utterance.trim();
  const scenario = scenarioById(state.scenarioId);
  const slots = { ...state.slots };

  switch (state.step) {
    case 'issue': {
      slots.issue = input;
      const urgent = URGENT.test(input);
      const lead = urgent
        ? "I'm sorry — that sounds urgent. Let's get someone out to you fast."
        : 'Got it, I can help with that.';
      return {
        reply: `${lead} First, can I get your name?`,
        state: { ...state, step: 'name', slots },
        done: false,
      };
    }

    case 'name': {
      slots.name = extractName(input) || 'there';
      return {
        reply: `Thanks, ${slots.name}. What's the service address I should send the technician to?`,
        state: { ...state, step: 'address', slots },
        done: false,
      };
    }

    case 'address': {
      slots.address = input;
      const win = timeWindow(slots.issue ?? '');
      return {
        reply: `Perfect. Based on your area, I can have a licensed ${
          scenario?.trade ?? 'service'
        } technician out ${win}. Does that time work for you?`,
        state: { ...state, step: 'time', slots },
        done: false,
      };
    }

    case 'time': {
      const win = timeWindow(`${slots.issue ?? ''} ${input}`);
      slots.time = win;
      const est = scenario?.estValue ?? 350;
      const jobType = scenario?.jobType ?? 'Service call';
      const booking: Booking = {
        jobType,
        window: win,
        estValue: est,
        name: slots.name ?? 'Customer',
        address: slots.address ?? '—',
        smsSent: true,
      };
      return {
        reply: `You're all set, ${slots.name ?? 'and'}. I've booked a ${jobType.toLowerCase()} ${win}, and I just texted a confirmation to your phone with the technician's name and ETA. Is there anything else I can help with?`,
        state: { ...state, step: 'done', slots },
        done: true,
        booking,
      };
    }

    case 'done':
    default:
      return {
        reply: "You're all booked — we'll see you soon! Thanks for calling.",
        state: { ...state, step: 'done', slots },
        done: true,
      };
  }
}

/** Scripted exchange used by the hero's auto-playing call card. */
export const HERO_SCRIPT: { role: 'agent' | 'caller'; text: string }[] = [
  { role: 'agent', text: 'Thanks for calling Peak Comfort. This is the CallCatch assistant — how can I help?' },
  { role: 'caller', text: 'My AC died and the house is 88 degrees.' },
  { role: 'agent', text: "I'm sorry to hear that — let's get someone out fast. Can I get your name and address?" },
  { role: 'caller', text: "Marcus Bell, 4417 Cedar Lane." },
  { role: 'agent', text: 'Thanks Marcus. A technician can be there within 2 hours. Booking it now…' },
  { role: 'agent', text: '✓ Booked · confirmation texted · est. $480' },
];
