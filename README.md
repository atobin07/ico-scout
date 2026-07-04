# CallCatch

AI receptionist SaaS for home service businesses (HVAC, plumbing, electrical, roofing).
Answers every call in under a second, qualifies the lead, and books the job — 24/7.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Retell AI · Mapbox · Stripe · Resend

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev
```

## Design system — "Dispatch Console"

Dark, dense, information-rich. Single blue accent (signal), live green reserved for
primary CTAs and active-call states, IBM Plex Mono for all numbers/timestamps.
Tokens live in `tailwind.config.ts`.

## Structure

```
app/
  (marketing)/        public site (/, /pricing)
  dashboard/          authenticated console (/dashboard/*)
  auth/               login + signup
  api/                retell + stripe webhooks
components/ui         design-system primitives
components/dashboard  console-specific components
components/marketing  landing-page sections
lib/                  supabase, retell, stripe, resend, mapbox clients
types/                shared TypeScript types
supabase/migrations   database schema
```

Built in 10 phases — see project brief.
