-- A aprovação da ideia é independente da aprovação final do material.
create table if not exists public.editorial_idea_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.planning_projects(id) on delete cascade,
  content_id text not null,
  content_version text not null,
  decision text not null check (decision in ('approved','changes_requested')),
  comment text,
  decided_by uuid not null references auth.users(id),
  decided_at timestamptz not null default clock_timestamp(),
  constraint editorial_idea_approvals_unique_version unique(project_id,content_id,content_version)
);
alter table public.editorial_idea_approvals enable row level security;
revoke all on public.editorial_idea_approvals from anon,authenticated;
grant select on public.editorial_idea_approvals to authenticated;
drop policy if exists editorial_idea_approvals_authorized_read on public.editorial_idea_approvals;
create policy editorial_idea_approvals_authorized_read on public.editorial_idea_approvals
  for select to authenticated using (rotevo_operations.can_read_editorial(project_id,content_id));
create or replace function public.rotevo_editorial_idea_decide(
  p_project_id uuid,p_content_id text,p_content_version text,p_decision text,p_comment text default null
) returns public.editorial_idea_approvals
language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid();
  v_client uuid;
  v_project public.planning_projects%rowtype;
  v_content jsonb;
  v_result public.editorial_idea_approvals%rowtype;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501';end if;
  select client_id into v_client from public.profiles where id=v_user and role='client';
  if v_client is null then raise exception 'Client authorization required' using errcode='42501';end if;
  if p_decision not in ('approved','changes_requested') or p_content_id is null
     or length(p_content_id)>80 or nullif(btrim(p_content_version),'') is null
     or length(p_content_version)>30 or length(coalesce(p_comment,''))>3000
     or (p_decision='changes_requested' and length(btrim(coalesce(p_comment,'')))<3)
  then raise exception 'Invalid decision' using errcode='22023';end if;
  select * into v_project from public.planning_projects
    where id=p_project_id and client_id=v_client for update;
  if not found then raise exception 'Project unavailable' using errcode='42501';end if;
  if (jsonb_typeof(v_project.data->'portalModules')='array'
      and not (v_project.data->'portalModules' ? 'content'))
     or exists(select 1 from public.client_workspaces w
      where w.client_id=v_client and not (w.data->'modules' ? 'content'))
  then raise exception 'Module unavailable' using errcode='42501';end if;
  select value into v_content from jsonb_array_elements(
    case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
    then v_project.data->'editorialCalendar' else '[]'::jsonb end
  ) where value->>'id'=p_content_id;
  if v_content is null or v_content->>'visibleToClient' is distinct from 'true'
    or v_content->>'status' is distinct from 'idea_pending'
    or coalesce(v_content->>'version','')<>p_content_version
  then raise exception 'Content version unavailable' using errcode='40001';end if;
  insert into public.editorial_idea_approvals(
   project_id,content_id,content_version,decision,comment,decided_by
  ) values(p_project_id,p_content_id,p_content_version,p_decision,
   nullif(btrim(p_comment),''),v_user) returning * into v_result;
  update public.planning_projects set updated_at=clock_timestamp() where id=p_project_id;
  return v_result;
end $$;
revoke all on function public.rotevo_editorial_idea_decide(uuid,text,text,text,text) from public,anon;
grant execute on function public.rotevo_editorial_idea_decide(uuid,text,text,text,text) to authenticated,service_role;
