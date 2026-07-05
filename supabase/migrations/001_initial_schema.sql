-- CallCatch initial schema
-- Tables: businesses, technicians, customers, calls, appointments
-- + Row Level Security (per-business isolation), auth signup trigger, realtime.

-- ---------------------------------------------------------------------------
-- businesses  (one per authenticated user)
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- links the row to its Supabase auth user (set by the signup trigger).
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  phone text not null default '',
  trade_type text check (trade_type in ('HVAC','Plumbing','Electrical','Roofing','General')),
  address text,
  city text,
  state text,
  zip text,
  owner_name text,
  owner_email text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial','active','past_due','cancelled')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  retell_agent_id text,
  retell_phone_number text,
  ai_script text,
  timezone text not null default 'America/Chicago',
  settings jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- technicians
-- ---------------------------------------------------------------------------
create table if not exists public.technicians (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  trade_type text,
  status text not null default 'available'
    check (status in ('available','en_route','on_job','offline')),
  current_lat decimal(10,7),
  current_lng decimal(10,7),
  last_location_update timestamptz,
  color text
);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text,
  phone text not null,
  email text,
  address text,
  city text,
  notes text,
  source text check (source in ('ai_call','manual','referral','walk_in')),
  lifetime_value decimal(10,2) not null default 0,
  call_count integer not null default 0,
  last_contact_at timestamptz,
  tags text[],
  status text not null default 'active' check (status in ('active','inactive','vip'))
);

-- ---------------------------------------------------------------------------
-- calls
-- ---------------------------------------------------------------------------
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  retell_call_id text unique,
  direction text check (direction in ('inbound','outbound')),
  status text check (status in ('completed','missed','in_progress','failed')),
  duration_seconds integer,
  recording_url text,
  transcript jsonb,
  summary text,
  sentiment text check (sentiment in ('positive','neutral','negative')),
  outcome text check (outcome in ('booked','quoted','callback','no_action','missed')),
  estimated_value decimal(10,2),
  caller_phone text,
  started_at timestamptz,
  ended_at timestamptz
);

-- ---------------------------------------------------------------------------
-- appointments  (references technicians + calls, so declared last)
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  call_id uuid references public.calls(id) on delete set null,
  technician_id uuid references public.technicians(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  job_type text,
  address text,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','in_progress','complete','cancelled')),
  estimated_value decimal(10,2),
  actual_value decimal(10,2),
  notes text,
  booked_by text not null default 'ai' check (booked_by in ('ai','manual'))
);

-- ---------------------------------------------------------------------------
-- Indexes for dashboard queries
-- ---------------------------------------------------------------------------
create index if not exists idx_technicians_business on public.technicians(business_id);
create index if not exists idx_customers_business on public.customers(business_id);
create index if not exists idx_customers_business_phone on public.customers(business_id, phone);
create index if not exists idx_calls_business_created on public.calls(business_id, created_at desc);
create index if not exists idx_calls_customer on public.calls(customer_id);
create index if not exists idx_appointments_business_time on public.appointments(business_id, scheduled_at);

-- ---------------------------------------------------------------------------
-- Row Level Security: a business can only touch its own rows.
-- (The service-role key used by webhooks bypasses RLS.)
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.technicians enable row level security;
alter table public.customers enable row level security;
alter table public.calls enable row level security;
alter table public.appointments enable row level security;

-- businesses: owner sees/edits only their own business
create policy "businesses_select_own" on public.businesses
  for select using (auth_user_id = auth.uid());
create policy "businesses_update_own" on public.businesses
  for update using (auth_user_id = auth.uid());

-- helper predicate for child tables
-- (inlined as a subquery in each policy)
create policy "technicians_all_own" on public.technicians
  for all
  using (business_id in (select id from public.businesses where auth_user_id = auth.uid()))
  with check (business_id in (select id from public.businesses where auth_user_id = auth.uid()));

create policy "customers_all_own" on public.customers
  for all
  using (business_id in (select id from public.businesses where auth_user_id = auth.uid()))
  with check (business_id in (select id from public.businesses where auth_user_id = auth.uid()));

create policy "calls_all_own" on public.calls
  for all
  using (business_id in (select id from public.businesses where auth_user_id = auth.uid()))
  with check (business_id in (select id from public.businesses where auth_user_id = auth.uid()));

create policy "appointments_all_own" on public.appointments
  for all
  using (business_id in (select id from public.businesses where auth_user_id = auth.uid()))
  with check (business_id in (select id from public.businesses where auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Auto-create a businesses row when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.businesses (auth_user_id, owner_email, name, phone, owner_name, trade_type)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'business_name',''), 'My Business'),
    coalesce(new.raw_user_meta_data->>'phone',''),
    new.raw_user_meta_data->>'owner_name',
    new.raw_user_meta_data->>'trade_type'
  )
  on conflict (owner_email) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The trigger still fires (it runs as the table owner); we only remove the
-- REST rpc exposure so anon/authenticated users can't call it directly.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: stream live call + dispatch updates to the dashboard.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.technicians;
