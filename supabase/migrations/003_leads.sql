-- CallCatch leads capture
-- Every "Get a quote" inquiry and /get-started onboarding intake is stored here
-- so no submission is ever lost to an unset env var or a bounced email.
-- Reads/writes happen through the service-role client (ops console + API routes),
-- which bypasses RLS. RLS is enabled with NO permissive policies so anon and
-- authenticated roles can never see other people's contact info.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- 'quote' = pricing inquiry form; 'onboarding' = /get-started intake.
  kind text not null default 'quote'
    check (kind in ('quote','onboarding')),
  name text,
  business_name text,
  email text,
  phone text,
  trade text,
  -- freeform context (services / notes) shown in the list at a glance.
  message text,
  -- full raw submission so nothing is dropped even as forms evolve.
  payload jsonb not null default '{}'::jsonb,
  -- simple pipeline state you can advance from the ops console later.
  status text not null default 'new'
    check (status in ('new','contacted','won','lost'))
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_kind_idx on public.leads (kind);

alter table public.leads enable row level security;
-- Intentionally no policies: only the service-role key (server-side) may read
-- or write this table.
