-- Apply only after verified production backup/restore and compatibility validation.
-- TRUNCATE is not subject to row-level security. No browser role needs it.
revoke truncate, references, trigger on table public.clients, public.client_users,
 public.planning_projects, public.profiles from public, anon, authenticated;
-- Profile identities and tenant/role associations are managed by the server only.
revoke insert, delete, update on table public.profiles from public, anon, authenticated;
-- Remove column-level grants too: a table REVOKE does not remove independent grants.
do $$
declare columns text;
begin
 select string_agg(quote_ident(attname), ',') into columns
 from pg_attribute where attrelid='public.profiles'::regclass
 and attnum>0 and not attisdropped;
 execute format('revoke insert (%s), update (%s), references (%s) on public.profiles from public, anon, authenticated', columns, columns, columns);
end $$;
grant update(full_name) on public.profiles to authenticated;
-- Hosted Supabase default privileges can otherwise grant new tables ALL.
revoke all on table public.team_members, public.team_project_assignments,
 public.team_member_permissions from public, anon, authenticated;
grant select on table public.team_members, public.team_project_assignments,
 public.team_member_permissions to authenticated;
grant all on table public.team_members, public.team_project_assignments,
 public.team_member_permissions, public.team_audit_events to service_role;
grant usage, select on sequence public.team_audit_events_id_seq to service_role;
