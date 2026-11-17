-- PROPOSAL ONLY. Requires explicit production approval before execution.
-- Adds one private agenda per authenticated user. No existing row is changed.
begin;
create table public.rotevo_user_agendas (
 user_id uuid primary key references auth.users(id) on delete restrict,
 data jsonb not null default '{"operationalAgenda":[]}'::jsonb,
 updated_at timestamptz not null default now(),
 constraint rotevo_user_agenda_shape check (
  jsonb_typeof(data)='object' and data ? 'operationalAgenda'
  and jsonb_typeof(data->'operationalAgenda')='array'
  and (data-'operationalAgenda')='{}'::jsonb
  and jsonb_array_length(data->'operationalAgenda')<=500
 )
);
alter table public.rotevo_user_agendas enable row level security;
-- No REST access, including by authenticated users. Dedicated server endpoints
-- require an active strategist and constrain every query/write by their user_id.
revoke all on table public.rotevo_user_agendas from public,anon,authenticated,service_role;
grant select,insert,update on table public.rotevo_user_agendas to service_role;
-- There is deliberately no client policy, direct deletion grant, trigger,
-- change to project tables, backfill, or automatic Google connection.
commit;

-- Reversal: restore the preceding application version. Keep this table and its
-- records recoverable. If disabling private storage is necessary, revoke its
-- SELECT/INSERT/UPDATE grants from service_role; do not DROP or TRUNCATE it.
