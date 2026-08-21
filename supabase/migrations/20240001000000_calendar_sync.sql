-- Calendar sync tables

create table if not exists calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google', 'microsoft')),
  account_email text not null,
  display_name text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  calendar_ids text[] default '{}',
  is_primary boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (provider, account_email)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  source_account_id uuid references calendar_accounts(id) on delete cascade,
  source_calendar_id text not null,
  source_event_id text not null,
  title text not null,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  attendees jsonb default '[]',
  video_link text,
  organizer_email text,
  organizer_name text,
  status text default 'confirmed',
  is_all_day boolean default false,
  raw_data jsonb,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  unique (source_account_id, source_calendar_id, source_event_id)
);

create table if not exists busy_blocks (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid references events(id) on delete cascade,
  target_account_id uuid references calendar_accounts(id) on delete cascade,
  target_calendar_id text not null,
  target_event_id text not null,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  notification_type text not null check (notification_type in ('24h', '15min')),
  sent_at timestamptz,
  recipient_email text,
  status text default 'pending',
  error_message text,
  unique (event_id, notification_type)
);

create table if not exists sync_state (
  account_id uuid references calendar_accounts(id) on delete cascade,
  calendar_id text not null,
  last_sync_at timestamptz,
  sync_token text,
  delta_link text,
  primary key (account_id, calendar_id)
);

create index if not exists events_start_time_idx on events(start_time);
create index if not exists events_status_idx on events(status);
