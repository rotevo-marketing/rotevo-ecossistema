-- PROPOSAL ONLY. Do not run until records, backup and notification expansion are approved.
-- Preview current eligible accounts; no writes:
select p.id user_id,p.full_name,p.client_id,c.name client,c.status client_status,
 exists(select 1 from public.client_users u where u.user_id=p.id and u.client_id=p.client_id) linked,
 (select n.enabled from rotevo_workflow.notification_pilot_users n where n.user_id=p.id) notifications_enabled,
 case when c.status<>'active' then 'exclude_inactive'
 when exists(select 1 from rotevo_workflow.notification_pilot_users n where n.user_id=p.id and not n.enabled) then 'preserve_disabled'
 when exists(select 1 from rotevo_workflow.notification_pilot_users n where n.user_id=p.id and n.enabled) then 'preserve_enabled'
 else 'propose_new_enrollment_after_link_review' end notification_action
from public.profiles p join public.clients c on c.id=p.client_id
where p.role='client' order by c.name,p.id;

-- Detect conflicting links before idempotent association repair.
select p.id user_id,p.client_id profile_client_id,u.client_id linked_client_id
from public.profiles p join public.client_users u on u.user_id=p.id
where p.role='client' and p.client_id is distinct from u.client_id;
-- Snapshot pilot rows and relevant routine definitions/ACL privately before approval/application.
select user_id,enabled from rotevo_workflow.notification_pilot_users order by user_id;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) arguments,
 md5(pg_get_functiondef(p.oid)) definition_md5,p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname in (
 'rotevo_client_action_create','rotevo_client_action_list','rotevo_client_action_submit',
 'rotevo_client_action_review','rotevo_project_client_assignments'))
 or (n.nspname='rotevo_workflow' and p.proname in ('can_view_event_v2','record_content_message_event'))
order by n.nspname,p.proname;
-- Direct access to the raw project JSON must remain unavailable to public clients.
select grantee,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='planning_projects' and grantee in ('PUBLIC','anon','authenticated');
