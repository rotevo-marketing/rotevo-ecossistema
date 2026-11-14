-- UI3 client action notifications: PROPOSAL ONLY. Applies only after Gate B workflow tables exist.
-- Events are inserted in the same transaction as the state change; the read RPC
-- independently checks CURRENT project/module permissions and recipient identity.
-- No external mail, webhook, email or WhatsApp delivery is performed here.
create or replace function rotevo_workflow.client_action_emit_event(
 p_project_id uuid,p_resource_type text,p_resource_id text,p_resource_version text,
 p_event_type text,p_actor uuid,p_recipient uuid,p_key text,p_metadata jsonb
) returns void language plpgsql security definer set search_path='' as $fn$
declare v_event_id uuid;
begin
 if p_actor is null or p_recipient is null or p_actor=p_recipient then return;end if;
 if p_event_type not in ('assignment_changed','item_ready','task_delivery_accepted','adjustments_requested')
 then raise exception 'Invalid notification event' using errcode='22023';end if;
 insert into rotevo_workflow.operational_events(
  project_id,resource_type,resource_id,resource_version,event_type,
  actor_user_id,idempotency_key,metadata
 ) values(p_project_id,p_resource_type,p_resource_id,p_resource_version,
  p_event_type,p_actor,p_key,p_metadata)
 on conflict(idempotency_key) do nothing returning id into v_event_id;
 if v_event_id is null then
  select id into v_event_id from rotevo_workflow.operational_events
  where idempotency_key=p_key;
 end if;
 if v_event_id is not null then
  insert into rotevo_workflow.user_notifications(event_id,recipient_user_id)
  values(v_event_id,p_recipient) on conflict(event_id,recipient_user_id) do nothing;
 end if;
end;
$fn$;
revoke all on function rotevo_workflow.client_action_emit_event(
 uuid,text,text,text,text,uuid,uuid,text,jsonb) from PUBLIC,anon,authenticated;

create or replace function rotevo_workflow.client_action_assignment_notice()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_tenant uuid;
begin
 if new.released_at is null then return new;end if;
 select client_id into v_tenant from public.planning_projects where id=new.project_id;
 if not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=new.client_user_id and cu.client_id=v_tenant
    and p.client_id=v_tenant and p.role='client'
 ) then return new;end if;
 perform rotevo_workflow.client_action_emit_event(
  new.project_id,new.resource_type,new.resource_id,new.resource_version,
  'assignment_changed',new.created_by,new.client_user_id,
  'client-action:assigned:'||new.id,
  pg_catalog.jsonb_build_object('phase',new.resource_type,'actionId',new.id,'action','assigned')
 );
 return new;
end;
$fn$;
revoke all on function rotevo_workflow.client_action_assignment_notice() from PUBLIC,anon,authenticated;
create trigger ui3_client_action_assignment_notice
after insert on rotevo_workflow.client_action_assignments
for each row execute function rotevo_workflow.client_action_assignment_notice();

create or replace function rotevo_workflow.client_action_submission_notice()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_recipient uuid;
begin
 select * into v_assignment from rotevo_workflow.client_action_assignments where id=new.assignment_id;
 if not found or v_assignment.status='cancelled' then return new;end if;
 v_recipient:=coalesce(v_assignment.internal_owner_user_id,v_assignment.created_by);
 if not exists(
  select 1 from public.team_members m where m.user_id=v_recipient and m.active
  and (m.role='admin' or (
   exists(select 1 from public.team_project_assignments a
    where a.user_id=v_recipient and a.project_id=v_assignment.project_id)
   and exists(select 1 from public.team_member_permissions g
    where g.user_id=v_recipient and g.permission in ('projects.read','projects.write','editorial.read','editorial.write'))
  ))
 ) then return new;end if;
 perform rotevo_workflow.client_action_emit_event(
  v_assignment.project_id,v_assignment.resource_type,v_assignment.resource_id,v_assignment.resource_version,
  'item_ready',new.submitted_by,v_recipient,'client-action:submitted:'||new.id,
  pg_catalog.jsonb_build_object('phase',v_assignment.resource_type,'actionId',v_assignment.id,'submissionId',new.id,'action','submitted')
 );
 return new;
end;
$fn$;
revoke all on function rotevo_workflow.client_action_submission_notice() from PUBLIC,anon,authenticated;
create trigger ui3_client_action_submission_notice
after insert on rotevo_workflow.client_action_submissions
for each row execute function rotevo_workflow.client_action_submission_notice();

create or replace function rotevo_workflow.client_action_review_notice()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_tenant uuid;
begin
 if old.reviewed_at is not null or new.reviewed_at is null
 or new.review_status not in ('validated','correction_requested') then return new;end if;
 select * into v_assignment from rotevo_workflow.client_action_assignments where id=new.assignment_id;
 if not found then return new;end if;
 select client_id into v_tenant from public.planning_projects where id=v_assignment.project_id;
 if not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.user_id=v_assignment.client_user_id and cu.client_id=v_tenant
  and p.client_id=v_tenant and p.role='client'
 ) then return new;end if;
 perform rotevo_workflow.client_action_emit_event(
  v_assignment.project_id,v_assignment.resource_type,v_assignment.resource_id,v_assignment.resource_version,
  case when new.review_status='validated' then 'task_delivery_accepted' else 'assignment_changed' end,
  new.reviewed_by,v_assignment.client_user_id,'client-action:review:'||new.id,
  pg_catalog.jsonb_build_object('phase',v_assignment.resource_type,'actionId',v_assignment.id,
   'submissionId',new.id,'action',new.review_status)
 );
 return new;
end;
$fn$;
revoke all on function rotevo_workflow.client_action_review_notice() from PUBLIC,anon,authenticated;
create trigger ui3_client_action_review_notice
after update of review_status,reviewed_at on rotevo_workflow.client_action_submissions
for each row execute function rotevo_workflow.client_action_review_notice();
