import 'server-only';

/**
 * SERVER-ONLY pricing engine.
 *
 * `import 'server-only'` makes the build FAIL if this module is ever pulled
 * into a client bundle — so our COGS, margins, and tier economics can never
 * leak to a prospect's browser. Only import this from route handlers / server
 * components.
 *
 * Numbers are grounded in Retell's 2026 rates:
 *   all-in ~$0.125/min (standard voice + small LLM) to ~$0.18/min
 *   (ElevenLabs + GPT-4.1, which is what our demo agent uses).
 */

export type VoiceTier = 'standard' | 'premium';

/** All-in Retell cost per connected minute, by voice/LLM setup. */
export const COST_PER_MIN: Record<VoiceTier, number> = {
  standard: 0.125, // Retell platform voice + small LLM + telephony
  premium: 0.18, // ElevenLabs + GPT-4.1 + telephony (current demo setup)
};

/** Assumed average length of a home-services call, in minutes. */
export const AVG_CALL_MINUTES = 3;

export interface Tier {
  id: 'starter' | 'pro' | 'scale';
  name: string;
  monthly: number;
  includedCalls: number;
  overagePerCall: number;
  installFee: number;
}

export const TIERS: Tier[] = [
  { id: 'starter', name: 'Starter', monthly: 199, includedCalls: 100, overagePerCall: 2.0, installFee: 499 },
  { id: 'pro', name: 'Pro', monthly: 399, includedCalls: 250, overagePerCall: 1.75, installFee: 749 },
  { id: 'scale', name: 'Scale', monthly: 699, includedCalls: 500, overagePerCall: 1.5, installFee: 999 },
];

export interface PricingResult {
  callsPerMonth: number;
  avgCallMinutes: number;
  voiceTier: VoiceTier;
  costPerMin: number;
  tier: Tier;
  recommendedByOverage: boolean;
  estMonthlyCogs: number;
  monthlyRevenue: number;
  grossProfit: number;
  marginPct: number;
  installFee: number;
  perCallCost: number;
  perCallPrice: number;
}

/** Pick the smallest tier whose bucket covers the volume (else Scale + overage). */
export function recommendTier(callsPerMonth: number): { tier: Tier; overage: boolean } {
  const fit = TIERS.find((t) => callsPerMonth <= t.includedCalls);
  if (fit) return { tier: fit, overage: false };
  return { tier: TIERS[TIERS.length - 1], overage: true };
}

/** Full internal pricing for a given monthly call volume. */
export function estimatePricing(input: {
  callsPerMonth: number;
  avgCallMinutes?: number;
  voiceTier?: VoiceTier;
}): PricingResult {
  const callsPerMonth = Math.max(0, Math.round(input.callsPerMonth || 0));
  const avgCallMinutes = input.avgCallMinutes ?? AVG_CALL_MINUTES;
  const voiceTier = input.voiceTier ?? 'premium';
  const costPerMin = COST_PER_MIN[voiceTier];

  const { tier, overage } = recommendTier(callsPerMonth);

  const estMonthlyCogs = callsPerMonth * avgCallMinutes * costPerMin;
  const overageCalls = Math.max(0, callsPerMonth - tier.includedCalls);
  const monthlyRevenue = tier.monthly + overageCalls * tier.overagePerCall;
  const grossProfit = monthlyRevenue - estMonthlyCogs;
  const marginPct = monthlyRevenue > 0 ? grossProfit / monthlyRevenue : 0;

  return {
    callsPerMonth,
    avgCallMinutes,
    voiceTier,
    costPerMin,
    tier,
    recommendedByOverage: overage,
    estMonthlyCogs: round2(estMonthlyCogs),
    monthlyRevenue: round2(monthlyRevenue),
    grossProfit: round2(grossProfit),
    marginPct: Math.round(marginPct * 100) / 100,
    installFee: tier.installFee,
    perCallCost: round2(avgCallMinutes * costPerMin),
    perCallPrice: callsPerMonth > 0 ? round2(monthlyRevenue / callsPerMonth) : 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** One-line summary for the internal lead email. */
export function pricingSummary(p: PricingResult): string {
  return [
    `Recommended: ${p.tier.name} — $${p.tier.monthly}/mo + $${p.installFee} install`,
    `(${p.tier.includedCalls} calls incl, $${p.tier.overagePerCall}/call overage)`,
    p.recommendedByOverage ? '[volume exceeds Scale bucket — expect overage]' : '',
    `| est cost $${p.estMonthlyCogs}/mo, projected revenue $${p.monthlyRevenue}/mo,`,
    `gross $${p.grossProfit} (${Math.round(p.marginPct * 100)}% margin)`,
  ]
    .filter(Boolean)
    .join(' ');
}
