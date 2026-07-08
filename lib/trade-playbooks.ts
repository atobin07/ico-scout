import playbooks from '@/data/trade-playbooks.json';

export interface Playbook {
  label: string;
  questions: string[];
  emergencies: string[];
  jobTypes: string[];
  jobMinutes: number;
  notes?: string;
}

const BOOK = playbooks as Record<string, Playbook>;

/** Normalize a trade string to a playbook key. */
export function playbookKey(trade?: string | null): string {
  const t = (trade ?? '').toLowerCase().trim();
  if (!t) return 'general';
  if (BOOK[t]) return t;
  // loose matching for variants ("Tree Trimming" -> tree service, etc.)
  if (/tree|arborist|stump/.test(t)) return 'tree service';
  if (/lawn|mow/.test(t)) return 'lawn care';
  if (/landscap|hardscape/.test(t)) return 'landscaping';
  if (/pest|exterm|termite/.test(t)) return 'pest control';
  if (/pool|spa/.test(t)) return 'pool service';
  if (/clean|maid|janitor/.test(t)) return 'cleaning';
  if (/hvac|heat|air|ac\b|cooling/.test(t)) return 'hvac';
  if (/plumb|drain|pipe|water/.test(t)) return 'plumbing';
  if (/electric|panel|wiring/.test(t)) return 'electrical';
  if (/roof|gutter/.test(t)) return 'roofing';
  return 'general';
}

export function getPlaybook(trade?: string | null): Playbook {
  return BOOK[playbookKey(trade)] ?? BOOK.general;
}

/** A prompt section that teaches the agent how to intake this specific trade. */
export function playbookPromptSection(trade?: string | null): string {
  const p = getPlaybook(trade);
  const lines: string[] = [`## When it's a ${p.label} call, make sure you find out`];
  p.questions.forEach((q) => lines.push(`- ${q}`));
  if (p.emergencies.length) {
    lines.push(
      `Treat these as urgent and reassure them you'll rush someone out: ${p.emergencies.join('; ')}.`,
    );
  }
  if (p.jobTypes.length) {
    lines.push(`Common jobs you'll book: ${p.jobTypes.join(', ')}.`);
  }
  if (p.notes) lines.push(p.notes);
  return lines.join('\n');
}
