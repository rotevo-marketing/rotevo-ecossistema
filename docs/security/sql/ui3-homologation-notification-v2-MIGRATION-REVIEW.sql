-- ROTEVO UI3 / HOMOLOGATION ONLY / PRIVATE ACTIONS + PILOT NOTIFICATION V2.
-- Dedicated for project tqedxahsqbskninjenfg; do not apply to production.
-- Additive: retains existing public.rotevo_workflow_list_notifications (10 columns),
-- public.rotevo_workflow_mark_notification_read, and rotevo_workflow.can_view_event.
-- Never modifies existing enabled pilot user records or customer/project data.
begin;
do $guard$ begin
 if (select count(*) from rotevo_workflow.operational_events)>0 or (select count(*) from rotevo_workflow.user_notifications)>0 then
  raise exception 'Hosted homologation workflow already has events: abort for manual migration review';
 end if;
 if to_regclass('rotevo_workflow.client_action_assignments') is not null
    or to_regclass('rotevo_workflow.client_action_submissions') is not null then
  raise exception 'Client action tables already installed: abort and reconcile instead';
 end if;
 if to_regprocedure('public.rotevo_workflow_list_notifications_v2(integer,boolean)') is not null then
  raise exception 'Notification v2 already installed: abort rather than overwrite';
 end if;
end; $guard$;

-- Private client assignments and submissions (existing production schema proposal).
-- UI3 client actions / submissions: PROPOSAL ONLY. NEVER apply to production without gate.
-- Assumes existing private schema rotevo_workflow. Run only after review of RLS/GRANT,
-- account approver contract, backup and rollback. No public EXECUTE grants or API exposure.
create schema if not exists rotevo_workflow;
create table if not exists rotevo_workflow.client_action_assignments (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id) on delete restrict,
 resource_type text not null check(resource_type in ('content','task')),
 resource_id text not null check(length(resource_id) between 1 and 180),
 resource_version text,
 action_type text not null check(action_type in ('record_video','send_material','provide_information','review_material','custom')),
 client_user_id uuid not null,
 internal_owner_user_id uuid,
 instructions text not null default '' check(length(instructions)<=4000),
 reference_url text,
 due_date date,
 status text not null default 'pending' check(status in ('pending','in_progress','submitted','validated','correction_requested','cancelled')),
 ready_at timestamptz,
 released_at timestamptz,
 completed_at timestamptz,
 created_by uuid not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 idempotency_key text not null unique check(length(idempotency_key) between 8 and 250),
 check(resource_type<>'content' or nullif(resource_version,'') is not null),
 check(released_at is null or ready_at is not null),
 check(completed_at is null or status in ('validated','cancelled')),
 check(reference_url is null or length(reference_url)<=2048)
);
create index if not exists idx_ui3_client_assignments_user
 on rotevo_workflow.client_action_assignments(client_user_id,status,due_date)
 where released_at is not null;
create index if not exists idx_ui3_client_assignments_resource
 on rotevo_workflow.client_action_assignments(project_id,resource_type,resource_id,resource_version);
create table if not exists rotevo_workflow.client_action_submissions (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references rotevo_workflow.client_action_assignments(id) on delete restrict,
 submitted_by uuid not null,
 submission_url text,
 note text not null default '' check(length(note)<=4000),
 attempt_number integer not null check(attempt_number between 1 and 1000),
 review_status text not null default 'submitted' check(review_status in ('submitted','validated','correction_requested')),
 reviewed_by uuid,
 reviewed_at timestamptz,
 reviewer_feedback text check(reviewer_feedback is null or length(reviewer_feedback)<=4000),
 created_at timestamptz not null default now(),
 request_key text not null unique check(length(request_key) between 8 and 250),
 unique(assignment_id,attempt_number),
 check(submission_url is not null and length(trim(submission_url))>0),
 check(submission_url ~ '^https://(drive|docs)[.]google[.]com/' and length(submission_url)<=2048),
 check(reviewed_at is null or reviewed_by is not null)
);
create index if not exists idx_ui3_client_submissions_assignment
 on rotevo_workflow.client_action_submissions(assignment_id,created_at desc);
alter table rotevo_workflow.client_action_assignments enable row level security;
alter table rotevo_workflow.client_action_submissions enable row level security;
-- Fail closed: no RLS policies, no anon/authenticated grants, no exposed schema.
revoke all on rotevo_workflow.client_action_assignments from public, anon, authenticated;
revoke all on rotevo_workflow.client_action_submissions from public, anon, authenticated;
-- NON-EXECUTABLE INTEGRATION GATES
-- 1. Internal RPC must check auth.uid(), project's client_id, active client_users linkage,
--    assigned client_user_id, resource visibility, resource version, project/team/G2.
-- 2. Approved target users are explicit; client user names cannot authorize actions.
-- 3. Add server-side state transition, retry + optimistic concurrency, auditable events.
-- 4. No file storage: submissions contain only a validated Google Drive URL and optional note.
-- 5. A client submission cannot mutate editorial approval or publish status.
-- 6. No asynchronous reminders or notifications until recipient authorization is tested.
-- 7. If only SQL is applied, these tables remain unreachable: that is intentional.

-- Trigger-based private event generation and deduplication.
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

-- Private pilot authorization and ADDITIVE public notification v2 RPCs.
-- UI3 PR17 | NOTIFICATIONS READ PILOT V2 — ADDITIVE PROPOSAL ONLY.
-- Keeps the existing hosted 10-column RPC and original can_view_event untouched.
-- Never apply to production/hosted Supabase without an explicit migration approval.
-- The CI local installer runs this against disposable 127.0.0.1:54322 only.
-- Prerequisites: Gate B workflow schema + client action assignments/events.
-- Authorization: server UUID allowlist AND private database pilot table; deny by default.
create table if not exists rotevo_workflow.notification_pilot_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 created_at timestamptz not null default now()
);
alter table rotevo_workflow.notification_pilot_users enable row level security;
revoke all on rotevo_workflow.notification_pilot_users from PUBLIC,anon,authenticated;
-- No recipient is enabled by this proposal.

-- This private helper is intentionally SECURITY DEFINER because the workflow
-- tables are private and have no authenticated grants. It does not trust p_user
-- by itself as authorization for the public entry points below use auth.uid().
create or replace function rotevo_workflow.can_view_event_v2(p_user uuid,p_event uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
select exists (
 select 1
 from rotevo_workflow.operational_events e
 join public.planning_projects project on project.id=e.project_id
 join public.profiles profile on profile.id=p_user
 where e.id=p_event
   and exists(select 1 from rotevo_workflow.notification_pilot_users pilot
              where pilot.user_id=p_user and pilot.enabled=true)
   and e.resource_type in ('content','task')
   and exists (
    select 1 from pg_catalog.jsonb_array_elements(
     case when pg_catalog.jsonb_typeof(project.data->
      (case when e.resource_type='task' then 'executionTimeline' else 'editorialCalendar' end))='array'
     then project.data->(case when e.resource_type='task' then 'executionTimeline' else 'editorialCalendar' end)
     else '[]'::jsonb end) element(value)
    where element.value->>'id'=e.resource_id
      and coalesce(element.value->>'deletedAt','')=''
      and coalesce(element.value->>'archivedAt','')=''
      and (
       profile.role in ('staff','strategist')
       or element.value->>'visibleToClient'='true'
      )
      and (
       e.resource_type<>'content'
       or e.resource_version is null
       or coalesce(element.value->>'version','')=e.resource_version
      )
   )
   and (
    (
     profile.role='client'
     and profile.client_id=project.client_id
     and exists(
       select 1 from public.client_users cu
       where cu.user_id=p_user and cu.client_id=project.client_id
     )
     and (
      -- A private client action may be viewed without granting the entire execution module.
      -- The same user must be the explicit assignee, and the event must be tied
      -- to exactly that assignment, project, resource and current version.
      (
       e.event_type in ('assignment_changed','item_ready','task_delivery_accepted')
       and e.metadata->>'actionId' is not null
       and exists(
        select 1 from rotevo_workflow.client_action_assignments assignment
        where assignment.id::text=e.metadata->>'actionId'
          and assignment.project_id=e.project_id
          and assignment.resource_type=e.resource_type
          and assignment.resource_id=e.resource_id
          and coalesce(assignment.resource_version,'')=
              coalesce(e.resource_version,'')
          and assignment.client_user_id=p_user
          and assignment.released_at is not null
          and assignment.status<>'cancelled'
       )
      )
      or
      -- Ordinary editorial/task notifications still require module sharing.
      (
       (
        not (project.data ? 'portalModules')
        or (
         pg_catalog.jsonb_typeof(project.data->'portalModules')='array'
         and project.data->'portalModules'?
            (case when e.resource_type='task' then 'execution' else 'content' end)
        )
       )
       and exists(
        select 1 from public.client_workspaces w
        where w.client_id=project.client_id
         and pg_catalog.jsonb_typeof(w.data->'modules')='array'
         and w.data->'modules'?
           (case when e.resource_type='task' then 'execution' else 'content' end)
       )
       and (e.metadata->>'actionId' is null)
      )
     )
    )
    or
    (
     profile.role in ('staff','strategist')
     and exists(
      select 1 from public.team_members m
      where m.user_id=p_user and m.active
       and (
        m.role='admin'
        or (
         exists(select 1 from public.team_project_assignments a
                where a.user_id=p_user and a.project_id=project.id)
         and exists(select 1 from public.team_member_permissions g
           where g.user_id=p_user and g.permission in ('projects.read','editorial.read'))
        )
       )
     )
     and (
      e.metadata->>'actionId' is null
      or exists(
       select 1 from rotevo_workflow.client_action_assignments assignment
       where assignment.id::text=e.metadata->>'actionId'
        and assignment.project_id=e.project_id
        and assignment.resource_type=e.resource_type
        and assignment.resource_id=e.resource_id
        and coalesce(assignment.resource_version,'')=
            coalesce(e.resource_version,'')
        and coalesce(assignment.internal_owner_user_id,assignment.created_by)=p_user
      )
     )
    )
   )
);
$fn$;
revoke all on function rotevo_workflow.can_view_event_v2(uuid,uuid)
 from PUBLIC,anon,authenticated;

create or replace function public.rotevo_workflow_list_notifications_v2(
 p_limit integer default 30,p_unread_only boolean default false)
returns table(
 notification_id uuid,event_id uuid,project_id uuid,project_title text,
 resource_id text,resource_version text,event_type text,event_phase text,
 action_id text,occurred_at timestamptz,read_at timestamptz
) language plpgsql stable security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Initial password change required' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 50
 then raise exception 'Invalid notification limit' using errcode='22023';end if;
 return query
 select n.id,e.id,e.project_id,project.title,e.resource_id,e.resource_version,
        e.event_type,e.metadata->>'phase',e.metadata->>'actionId',e.occurred_at,n.read_at
 from rotevo_workflow.user_notifications n
 join rotevo_workflow.operational_events e on e.id=n.event_id
 join public.planning_projects project on project.id=e.project_id
 where n.recipient_user_id=v_actor
   and (not coalesce(p_unread_only,false) or n.read_at is null)
   and rotevo_workflow.can_view_event_v2(v_actor,e.id)
 order by e.occurred_at desc,e.id desc
 limit p_limit;
end;
$fn$;
revoke all on function public.rotevo_workflow_list_notifications_v2(integer,boolean)
 from PUBLIC,anon;
grant execute on function public.rotevo_workflow_list_notifications_v2(integer,boolean)
 to authenticated;

create or replace function public.rotevo_workflow_mark_notification_read_v2(
 p_notification_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid();v_updated uuid;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Initial password change required' using errcode='42501';end if;
 update rotevo_workflow.user_notifications n
 set read_at=coalesce(n.read_at,pg_catalog.clock_timestamp())
 from rotevo_workflow.operational_events e
 where n.id=p_notification_id and n.recipient_user_id=v_actor
   and n.event_id=e.id and rotevo_workflow.can_view_event_v2(v_actor,e.id)
 returning n.id into v_updated;
 return v_updated is not null;
end;
$fn$;
revoke all on function public.rotevo_workflow_mark_notification_read_v2(uuid)
 from PUBLIC,anon;
grant execute on function public.rotevo_workflow_mark_notification_read_v2(uuid)
 to authenticated;

commit;
