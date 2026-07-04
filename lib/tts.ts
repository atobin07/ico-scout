/**
 * Browser text-to-speech helper for the guided demo.
 *
 * The Web Speech API's default voice is often the OS's low-quality robotic
 * voice, and `getVoices()` frequently returns an empty list on first call
 * (voices load asynchronously). This module loads voices reliably and ranks
 * them so we always speak with the best NATURAL voice the device offers
 * (Microsoft neural "Online (Natural)", Google, or Apple premium) instead of
 * falling back to the robotic default.
 *
 * Note: this is only the *guided* demo. The real product voice is Retell AI
 * (the Live voice tab), which sounds human regardless of the device.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];
let bestVoice: SpeechSynthesisVoice | null = null;

/** Higher score = more natural-sounding. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const isEn = /^en(-|_|$)/i.test(v.lang);
  const isEnUs = /en[-_]us/i.test(v.lang);
  if (!isEn) return -1;

  let score = 0;

  // Microsoft neural voices (Edge / Windows) — the best widely-available ones.
  if (/online \(natural\)|natural\b/.test(name) && /microsoft/.test(name)) score += 120;
  // Preferred warm, female en-US neural names.
  if (/\b(aria|jenny|michelle|ava|emma|ana)\b/.test(name)) score += 25;

  // Google network voices (Chrome) — solid quality.
  if (/google/.test(name)) score += 90;

  // Apple premium / enhanced voices (Safari / macOS / iOS).
  if (/\(premium\)|\(enhanced\)/.test(name)) score += 100;
  if (/\b(ava|zoe|allison|samantha|serena|nicky|karen|kate|moira)\b/.test(name)) score += 15;

  // Network (non-local) voices are usually much better than local espeak-style.
  if (v.localService === false) score += 40;

  if (isEnUs) score += 20;
  else score += 8; // other English locales

  return score;
}

function recompute() {
  if (cachedVoices.length === 0) return;
  const ranked = [...cachedVoices]
    .map((v) => ({ v, s: scoreVoice(v) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);
  bestVoice = ranked[0]?.v ?? cachedVoices[0] ?? null;
}

/** Begin loading voices. Safe to call repeatedly; idempotent. */
export function primeVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const load = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      cachedVoices = voices;
      recompute();
    }
  };
  load();
  // Voices populate asynchronously in most browsers.
  window.speechSynthesis.onvoiceschanged = load;
}

export function getBestVoice(): SpeechSynthesisVoice | null {
  if (!bestVoice) primeVoices();
  return bestVoice;
}

/**
 * Speak text with the best available natural voice and warm prosody.
 * Returns the utterance so callers can wire onstart/onend.
 */
export function speakText(
  text: string,
  handlers?: { onStart?: () => void; onEnd?: () => void },
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const clean = text.replace(/[✓•→]/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const u = new SpeechSynthesisUtterance(clean);
  const voice = getBestVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = 'en-US';
  }
  // Slightly slower + natural pitch reads far less robotic than defaults.
  u.rate = 0.97;
  u.pitch = 1.0;
  u.volume = 1;
  if (handlers?.onStart) u.onstart = handlers.onStart;
  if (handlers?.onEnd) {
    u.onend = handlers.onEnd;
    u.onerror = handlers.onEnd;
  }
  synth.speak(u);
}

export function cancelSpeech(): void {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}
