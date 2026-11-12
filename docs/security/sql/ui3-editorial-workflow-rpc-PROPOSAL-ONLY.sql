-- UI3 Gate B: EDITORIAL WORKFLOW FUNCTION PROPOSAL. ISOLATED LAB ONLY.
-- Apply AFTER docs/security/sql/ui3-gate-b-workflow-PROPOSAL-ONLY.sql
-- Never apply to hosted Supabase or run in production without separate approval.
-- SECURITY DEFINER is necessary only for the guarded transaction against private tables.
-- Every invocation performs auth.uid(), role, tenant, module, item, state and version checks.
create or replace function public.rotevo_editorial_workflow_decide(
 p_project_id uuid,
 p_content_id text,
 p_content_version text,
 p_phase text,
 p_decision text,
 p_adjustment_body text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
 v_actor uuid := auth.uid();
 v_client uuid;
 v_project public.planning_projects%rowtype;
 v_item jsonb;
 v_position bigint;
 v_matches integer;
 v_expected text;
 v_new_status text;
 v_request_id uuid;
 v_legacy_id uuid;
 v_message_id uuid;
 v_event_id uuid;
 v_key text;
 v_kind text;
 v_comment text;
 v_result jsonb;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true' then
  raise exception 'Initial password change required' using errcode='42501';
 end if;
 select client_id into v_client from public.profiles where id=v_actor and role='client';
 if v_client is null then raise exception 'Client authorization required' using errcode='42501';end if;
 if p_content_id is null or p_content_id !~ '^[A-Za-z0-9_-]{1,80}$'
  or p_content_version is null or length(btrim(p_content_version)) not between 1 and 30
  or p_phase not in ('idea','final') or p_decision not in ('approved','changes_requested')
 then raise exception 'Invalid decision request' using errcode='22023';end if;
 v_comment := nullif(btrim(coalesce(p_adjustment_body,'')),'');
 if p_decision='changes_requested' and
   (v_comment is null or length(v_comment)<3 or length(v_comment)>3000)
 then raise exception 'Ajuste exige mensagem entre 3 e 3000 caracteres' using errcode='22023';end if;
 if p_decision='approved' and v_comment is not null then
  raise exception 'Approval cannot carry an adjustment message' using errcode='22023';
 end if;
 select * into v_project from public.planning_projects
 where id=p_project_id and client_id=v_client for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if (jsonb_typeof(v_project.data->'portalModules')='array'
     and not (v_project.data->'portalModules' ? 'content'))
  or not exists (
    select 1 from public.client_workspaces w where w.client_id=v_client
      and jsonb_typeof(w.data->'modules')='array' and w.data->'modules' ? 'content'
  )
 then raise exception 'Content module unavailable' using errcode='42501';end if;

 select count(*) into v_matches
 from jsonb_array_elements(
   case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
     then v_project.data->'editorialCalendar' else '[]'::jsonb end
 ) as e(value) where value->>'id'=p_content_id;
 select value,pos into v_item,v_position
 from jsonb_array_elements(
   case when jsonb_typeof(v_project.data->'editorialCalendar')='array'
     then v_project.data->'editorialCalendar' else '[]'::jsonb end
 ) with ordinality as e(value,pos)
 where value->>'id'=p_content_id limit 1;
 if v_matches<>1 or v_item->>'visibleToClient' is distinct from 'true'
  or coalesce(v_item->>'version','')<>p_content_version
  or v_item ? 'deletedAt' and coalesce(v_item->>'deletedAt','')<>''
  or v_item ? 'archivedAt' and coalesce(v_item->>'archivedAt','')<>''
 then raise exception 'Content unavailable' using errcode='40001';end if;
 v_expected := case p_phase when 'idea' then 'idea_pending' else 'awaiting_client' end;
 if v_item->>'status' is distinct from v_expected then
  raise exception 'Content state unavailable' using errcode='40001';end if;

 v_new_status := case when p_decision='changes_requested' then 'changes_requested'
                       when p_phase='idea' then 'idea_approved' else 'approved' end;
 v_kind := case when p_phase='idea' then 'editorial_idea_approvals' else 'editorial_approvals' end;
 v_key := 'editorial:' || p_project_id::text || ':' || p_phase || ':' ||
             p_content_id || ':' || p_content_version;
 insert into rotevo_workflow.approval_requests(
  project_id,resource_type,resource_id,phase,resource_version,requested_by,request_key)
 values(p_project_id,'content',p_content_id,p_phase,p_content_version,v_actor,v_key)
 returning id into v_request_id;

 -- The legacy decision is inserted in the same transaction so old client views
 -- continue to read approval history. A request for adjustments writes one
 -- conversation message first, with no second comment editor.
 if p_decision='changes_requested' then
  insert into public.rotevo_collaboration_messages(
   project_id,resource_type,resource_id,content_version,author_user_id,author_role,body)
  values(p_project_id,'content',p_content_id,p_content_version,v_actor,'client',v_comment)
  returning id into v_message_id;
 end if;
 if p_phase='idea' then
  insert into public.editorial_idea_approvals(
   project_id,content_id,content_version,decision,comment,decided_by)
  values(p_project_id,p_content_id,p_content_version,p_decision,v_comment,v_actor)
  returning id into v_legacy_id;
 else
  insert into public.editorial_approvals(
   project_id,content_id,content_version,decision,comment,decided_by)
  values(p_project_id,p_content_id,p_content_version,p_decision,v_comment,v_actor)
  returning id into v_legacy_id;
 end if;
 insert into rotevo_workflow.approval_decisions(
  request_id,decided_by,decision,adjustment_message_id,legacy_source,legacy_decision_id)
 values(v_request_id,v_actor,p_decision,v_message_id,v_kind,v_legacy_id);
 update public.planning_projects
 set data=jsonb_set(v_project.data,array['editorialCalendar',(v_position-1)::text,'status'],
                    to_jsonb(v_new_status),false),
     updated_at=clock_timestamp()
 where id=p_project_id;

 update rotevo_workflow.approval_requests set status=p_decision,decided_at=clock_timestamp()
 where id=v_request_id;
 insert into rotevo_workflow.operational_events(
  project_id,resource_type,resource_id,resource_version,event_type,actor_user_id,
  request_id,source_message_id,idempotency_key,metadata)
 values(p_project_id,'content',p_content_id,p_content_version,
        case when p_decision='approved' then 'approval_approved' else 'adjustments_requested' end,
        v_actor,v_request_id,v_message_id,'editorial-decision:'||v_key,
        jsonb_build_object('phase',p_phase,'decision',p_decision))
 returning id into v_event_id;

 -- Recipient IDs are derived from active, currently authorized team members,
 -- NEVER from customer-supplied text. Exclude actor. Do not include message body.
 insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
 select v_event_id,m.user_id
 from public.team_members m
 join public.profiles u on u.id=m.user_id and u.role in ('staff','strategist')
 where m.active and m.user_id<>v_actor
  and (
    m.role='admin'
    or (
      exists(select 1 from public.team_project_assignments a
        where a.user_id=m.user_id and a.project_id=p_project_id)
      and exists(select 1 from public.team_member_permissions q
        where q.user_id=m.user_id and q.permission in ('editorial.read','projects.read'))
    )
  )
 on conflict(event_id,recipient_user_id) do nothing;
 v_result:=jsonb_build_object(
  'status',v_new_status,'decision',p_decision,'contentVersion',p_content_version,
  'requestId',v_request_id,'legacyDecisionId',v_legacy_id,'messageId',v_message_id,
  'eventId',v_event_id);
 return v_result;
end
$fn$;
revoke all on function public.rotevo_editorial_workflow_decide(uuid,text,text,text,text,text)
 from PUBLIC,anon;
grant execute on function public.rotevo_editorial_workflow_decide(uuid,text,text,text,text,text)
 to authenticated;
