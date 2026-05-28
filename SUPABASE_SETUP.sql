create table if not exists public.tracker_state (
  id text primary key,
  state jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.tracker_state enable row level security;

drop policy if exists "tracker_state_select" on public.tracker_state;
drop policy if exists "tracker_state_insert" on public.tracker_state;
drop policy if exists "tracker_state_update" on public.tracker_state;

create policy "tracker_state_select"
on public.tracker_state
for select
to anon
using (id = 'patrick-glanville');

create policy "tracker_state_insert"
on public.tracker_state
for insert
to anon
with check (id = 'patrick-glanville');

create policy "tracker_state_update"
on public.tracker_state
for update
to anon
using (id = 'patrick-glanville')
with check (id = 'patrick-glanville');

do $$
begin
  alter publication supabase_realtime add table public.tracker_state;
exception
  when duplicate_object then null;
end $$;

insert into public.tracker_state (id, state, updated_by)
values ('patrick-glanville', '{}'::jsonb, 'setup')
on conflict (id) do nothing;
