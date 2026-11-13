-- Exact prechange production function definition. Rollback REPLACES function only; it does NOT undo decisions made after release.
-- Use only as a controlled rollback, after reviewing current production data and permissions.
CREATE OR REPLACE FUNCTION public.rotevo_editorial_idea_decide(p_project_id uuid, p_content_id text, p_content_version text, p_decision text, p_comment text DEFAULT NULL::text)
 RETURNS editorial_idea_approvals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;
revoke all on function public.rotevo_editorial_idea_decide(uuid,text,text,text,text) from PUBLIC,anon,authenticated;
grant execute on function public.rotevo_editorial_idea_decide(uuid,text,text,text,text) to authenticated;
