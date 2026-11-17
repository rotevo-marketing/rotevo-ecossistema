-- Google Calendar connections. Install only in an authorized isolated environment.
begin;
create table if not exists public.rotevo_google_calendar_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 google_account text not null,
 refresh_token_ciphertext text not null,
 selected_calendar_id text,
 updated_at timestamptz not null default now()
);
alter table public.rotevo_google_calendar_connections enable row level security;
revoke all on table public.rotevo_google_calendar_connections from public,anon,authenticated;
grant select,insert,update,delete on table public.rotevo_google_calendar_connections to service_role;
commit;
