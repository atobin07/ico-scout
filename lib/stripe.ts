/**
 * Stripe server client. Fully wired in Phase 10.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/** Lazily-instantiated Stripe client (server-only). */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      // Pin to the SDK's default pinned version to stay in sync with types.
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID ?? '',
  pro: process.env.STRIPE_PRO_PRICE_ID ?? '',
} as const;

export type PlanId = keyof typeof STRIPE_PRICE_IDS;
