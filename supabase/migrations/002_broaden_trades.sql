-- Broaden CallCatch beyond home trades to all home & outdoor service verticals
-- (landscaping, lawn care, tree service, pest control, etc.).
-- Drop the trade_type CHECK so trade_type is stored as free text — new verticals
-- no longer need a migration. The app still offers a curated dropdown.

do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.businesses'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%trade_type%';
  if c is not null then
    execute format('alter table public.businesses drop constraint %I', c);
  end if;
end $$;
