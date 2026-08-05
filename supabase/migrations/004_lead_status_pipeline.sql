-- Expand the lead pipeline so each lead can be tracked through your process:
-- new -> seen -> followed_up -> call_scheduled -> sale_made -> work_in_progress,
-- plus archived to drop it out of the active feed.

alter table public.leads drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check
  check (status in (
    'new',
    'seen',
    'followed_up',
    'call_scheduled',
    'sale_made',
    'work_in_progress',
    'archived'
  ));

-- keep any legacy values valid
update public.leads set status = 'followed_up' where status = 'contacted';
update public.leads set status = 'sale_made'   where status = 'won';
update public.leads set status = 'archived'    where status = 'lost';
