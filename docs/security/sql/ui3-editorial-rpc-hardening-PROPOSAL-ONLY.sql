-- PROPOSAL ONLY. For isolated testing. DO NOT apply to hosted Supabase without schema reconciliation and approval.
-- Fixes missing-workspace and initial-password direct RPC bypasses while preserving normal client decisions.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.client_workspaces') IS NULL
 OR to_regclass('public.editorial_approvals') IS NULL
 OR to_regclass('public.editorial_idea_approvals') IS NULL
 OR to_regprocedure('public.rotevo_editorial_decide(uuid,text,text,text,text)') IS NULL
 OR to_regprocedure('public.rotevo_editorial_idea_decide(uuid,text,text,text,text)') IS NULL
 THEN RAISE EXCEPTION 'Editorial release schema drift; abort'; END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='client_workspaces'
   AND column_name='data' AND data_type='jsonb')
 THEN RAISE EXCEPTION 'Workspace JSON schema drift; abort'; END IF;
END;
$guard$;

create or replace function public.rotevo_editorial_decide(p_project_id uuid,p_content_id text,p_content_version text,p_decision text,p_comment text default null)
returns public.editorial_approvals language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_client uuid;v_project public.planning_projects%rowtype;v_content jsonb;v_decision public.editorial_approvals%rowtype;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true' then raise exception 'Initial password change required' using errcode='42501';end if;
 select client_id into v_client from public.profiles where id=v_user and role='client';
 if v_client is null then raise exception 'Client authorization required' using errcode='42501';end if;
 if p_decision not in ('approved','changes_requested') or p_content_id is null or length(p_content_id)>80 or nullif(btrim(p_content_version),'') is null or length(p_content_version)>30 or length(coalesce(p_comment,''))>3000 or (p_decision='changes_requested' and length(btrim(coalesce(p_comment,'')))<3) then raise exception 'Invalid decision' using errcode='22023';end if;
 select * into v_project from public.planning_projects where id=p_project_id and client_id=v_client for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if (jsonb_typeof(v_project.data->'portalModules')='array' and not (v_project.data->'portalModules' ? 'content')) or not exists(select 1 from public.client_workspaces w where w.client_id=v_client and jsonb_typeof(w.data->'modules')='array' and w.data->'modules' ? 'content') then raise exception 'Module unavailable' using errcode='42501';end if;
 select value into v_content from jsonb_array_elements(case when jsonb_typeof(v_project.data->'editorialCalendar')='array' then v_project.data->'editorialCalendar' else '[]'::jsonb end) where value->>'id'=p_content_id;
 if v_content is null or v_content->>'visibleToClient' is distinct from 'true' or v_content->>'status' is distinct from 'awaiting_client' or coalesce(v_content->>'version','')<>p_content_version then raise exception 'Content version unavailable' using errcode='40001';end if;
 insert into public.editorial_approvals(project_id,content_id,content_version,decision,comment,decided_by) values(p_project_id,p_content_id,p_content_version,p_decision,nullif(btrim(p_comment),''),v_user) returning * into v_decision;
 -- Invalidates any project edit that observed the pre-decision version.
 update public.planning_projects set updated_at=clock_timestamp() where id=p_project_id;
 return v_decision;
end;$$;

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
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true' then raise exception 'Initial password change required' using errcode='42501';end if;
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
     or not exists(select 1 from public.client_workspaces w where w.client_id=v_client and jsonb_typeof(w.data->'modules')='array' and w.data->'modules' ? 'content')
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

DO $verify$
BEGIN
 IF NOT has_function_privilege('authenticated','public.rotevo_editorial_decide(uuid,text,text,text,text)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.rotevo_editorial_idea_decide(uuid,text,text,text,text)','EXECUTE')
 OR NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.rotevo_editorial_decide(uuid,text,text,text,text)'::regprocedure)
 OR NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.rotevo_editorial_idea_decide(uuid,text,text,text,text)'::regprocedure)
 THEN RAISE EXCEPTION 'Legitimate RPC entrypoint changed; abort'; END IF;
END;
$verify$;
COMMIT;
