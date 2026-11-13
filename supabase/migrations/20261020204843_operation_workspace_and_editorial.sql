-- Additive operational workspace and atomic, immutable editorial approvals.
-- Existing project JSON and published document versions are preserved.
begin;
create schema if not exists rotevo_operations;
revoke all on schema rotevo_operations from public,anon;
grant usage on schema rotevo_operations to authenticated,service_role;
create table if not exists public.client_workspaces(
 client_id uuid primary key references public.clients(id) on delete restrict,
 data jsonb not null default '{"contracts":[],"folders":[],"modules":["planning","execution","content","campaigns","meetings","contract","drive","finance"]}'::jsonb check(jsonb_typeof(data)='object'),
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.client_workspaces enable row level security;
revoke all on public.client_workspaces from public,anon,authenticated;
grant all on public.client_workspaces to service_role;
grant select(client_id,updated_at) on public.client_workspaces to authenticated;
drop policy if exists "workspace owner metadata" on public.client_workspaces;
create policy "workspace owner metadata" on public.client_workspaces for select to authenticated using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='client' and p.client_id=client_workspaces.client_id));

create or replace function rotevo_operations.can_read_project(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles u join public.planning_projects p on p.id=p_project where u.id=auth.uid() and
 ((u.role='client' and u.client_id=p.client_id) or
 (u.role in ('strategist','staff') and exists(select 1 from public.team_members m where m.user_id=u.id and m.active and
 (m.role='admin' or (exists(select 1 from public.team_project_assignments a where a.user_id=u.id and a.project_id=p.id) and exists(select 1 from public.team_member_permissions q where q.user_id=u.id and q.permission in ('editorial.read','projects.read'))))))));
$$;
revoke all on function rotevo_operations.can_read_project(uuid) from public,anon;
grant execute on function rotevo_operations.can_read_project(uuid) to authenticated,service_role;

create table if not exists public.editorial_approvals(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.planning_projects(id) on delete cascade,
 content_id text not null,content_version text not null,decision text not null check(decision in ('approved','changes_requested')),comment text,
 decided_by uuid not null references auth.users(id),decided_at timestamptz not null default clock_timestamp(),
 constraint editorial_decision_version_unique unique(project_id,content_id,content_version),
 constraint editorial_changes_need_comment check(decision<>'changes_requested' or length(btrim(coalesce(comment,'')))>=3)
);
create index if not exists editorial_approvals_project_idx on public.editorial_approvals(project_id);
alter table public.editorial_approvals enable row level security;
revoke all on public.editorial_approvals from public,anon,authenticated;
grant all on public.editorial_approvals to service_role;
grant select on public.editorial_approvals to authenticated;
drop policy if exists "editorial decisions readable by assigned parties" on public.editorial_approvals;
drop policy if exists "clients approve only own visible requested content" on public.editorial_approvals;
drop policy if exists "read authorized immutable decisions" on public.editorial_approvals;
create policy "read authorized immutable decisions" on public.editorial_approvals for select to authenticated using(rotevo_operations.can_read_project(project_id));

create or replace function public.rotevo_editorial_decide(p_project_id uuid,p_content_id text,p_content_version text,p_decision text,p_comment text default null)
returns public.editorial_approvals language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_client uuid;v_project public.planning_projects%rowtype;v_content jsonb;v_decision public.editorial_approvals%rowtype;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501';end if;
 select client_id into v_client from public.profiles where id=v_user and role='client';
 if v_client is null then raise exception 'Client authorization required' using errcode='42501';end if;
 if p_decision not in ('approved','changes_requested') or p_content_id is null or length(p_content_id)>80 or nullif(btrim(p_content_version),'') is null or length(p_content_version)>30 or length(coalesce(p_comment,''))>3000 or (p_decision='changes_requested' and length(btrim(coalesce(p_comment,'')))<3) then raise exception 'Invalid decision' using errcode='22023';end if;
 select * into v_project from public.planning_projects where id=p_project_id and client_id=v_client for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if (jsonb_typeof(v_project.data->'portalModules')='array' and not (v_project.data->'portalModules' ? 'content')) or exists(select 1 from public.client_workspaces w where w.client_id=v_client and not (w.data->'modules' ? 'content')) then raise exception 'Module unavailable' using errcode='42501';end if;
 select value into v_content from jsonb_array_elements(case when jsonb_typeof(v_project.data->'editorialCalendar')='array' then v_project.data->'editorialCalendar' else '[]'::jsonb end) where value->>'id'=p_content_id;
 if v_content is null or v_content->>'visibleToClient' is distinct from 'true' or v_content->>'status' is distinct from 'awaiting_client' or coalesce(v_content->>'version','')<>p_content_version then raise exception 'Content version unavailable' using errcode='40001';end if;
 insert into public.editorial_approvals(project_id,content_id,content_version,decision,comment,decided_by) values(p_project_id,p_content_id,p_content_version,p_decision,nullif(btrim(p_comment),''),v_user) returning * into v_decision;
 -- Invalidates any project edit that observed the pre-decision version.
 update public.planning_projects set updated_at=clock_timestamp() where id=p_project_id;
 return v_decision;
end;$$;
revoke all on function public.rotevo_editorial_decide(uuid,text,text,text,text) from public,anon;
grant execute on function public.rotevo_editorial_decide(uuid,text,text,text,text) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
