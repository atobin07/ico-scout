-- First-party web traffic tracking. A tiny beacon on the site records each page
-- view here so the admin portal can show real visitor/traffic analytics that we
-- own outright — independent of Vercel/Google/PostHog. RLS is on with no policy,
-- so only the service role (the /api/track route + ops portal) can read/write.

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null,
  referrer text,
  visitor_id text,           -- anonymous, cookie/localStorage id (no PII)
  device text                -- 'mobile' | 'tablet' | 'desktop'
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx on public.page_views (path);
create index if not exists page_views_visitor_idx on public.page_views (visitor_id);

alter table public.page_views enable row level security;
