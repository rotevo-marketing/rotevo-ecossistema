-- Rotevo editorial idea approval transition. Apply ONLY after lab approval and backup validation.
-- Keeps decision history per version and updates the editorial item state atomically.
create or replace function public.rotevo_editorial_idea_decide(
 p_project_id uuid,p_content_id text,p_content_version text,p_decision text,p_comment text default null
) returns public.editorial_idea_approvals
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=auth.uid();
 v_client uuid;
 v_project public.planning_projects%rowtype;
 v_content jsonb;
 v_result public.editorial_idea_approvals%rowtype;
 v_next_status text;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true' then
   raise exception 'Initial password change required' using errcode='42501';end if;
 select client_id into v_client from public.profiles where id=v_user and role='client';
 if v_client is null then raise exception 'Client authorization required' using errcode='42501';end if;
 -- Until an explicit primary approver is chosen, multiple-client-account tenants
 -- must not approve on behalf of each other.
 if (select count(*) from public.profiles where client_id=v_client and role='client')<>1 then
  raise exception 'Authorized client approver not configured' using errcode='42501';end if;
 if p_decision not in ('approved','changes_requested') or p_content_id is null or length(p_content_id)>80
   or nullif(btrim(p_content_version),'') is null or length(p_content_version)>30
   or length(coalesce(p_comment,''))>3000
   or (p_decision='changes_requested' and length(btrim(coalesce(p_comment,'')))<3)
 then raise exception 'Invalid decision' using errcode='22023';end if;
 select * into v_project from public.planning_projects
  where id=p_project_id and client_id=v_client for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if (jsonb_typeof(v_project.data->'portalModules')='array' and not (v_project.data->'portalModules' ? 'content'))
   or not exists(select 1 from public.client_workspaces w where w.client_id=v_client
    and jsonb_typeof(w.data->'modules')='array' and w.data->'modules' ? 'content')
 then raise exception 'Module unavailable' using errcode='42501';end if;
 select value into v_content from jsonb_array_elements(
  case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
    then v_project.data->'editorialCalendar' else '[]'::jsonb end
 ) where value->>'id'=p_content_id;
 if v_content is null or v_content->>'visibleToClient' is distinct from 'true'
  or v_content->>'status' not in ('idea','idea_pending')
  or coalesce(v_content->>'version','')<>p_content_version
  or coalesce(v_content->>'archivedAt','')<>'' or coalesce(v_content->>'deletedAt','')<>''
 then raise exception 'Idea version unavailable' using errcode='40001';end if;
 v_next_status:=case when p_decision='approved' then 'idea_approved' else 'idea_changes' end;
 insert into public.editorial_idea_approvals(
  project_id,content_id,content_version,decision,comment,decided_by
 ) values(p_project_id,p_content_id,p_content_version,p_decision,
   nullif(btrim(p_comment),''),v_user) returning * into v_result;
 update public.planning_projects
 set data=jsonb_set(
   v_project.data,'{editorialCalendar}',
   (select jsonb_agg(case when entry.value->>'id'=p_content_id
      then jsonb_set(entry.value,'{status}',to_jsonb(v_next_status),true)
      else entry.value end order by entry.position)
    from jsonb_array_elements(v_project.data->'editorialCalendar')
      with ordinality as entry(value,position)),false),
     updated_at=clock_timestamp()
 where id=p_project_id;
 return v_result;
end $$;
revoke all on function public.rotevo_editorial_idea_decide(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.rotevo_editorial_idea_decide(uuid,text,text,text,text) to authenticated;
