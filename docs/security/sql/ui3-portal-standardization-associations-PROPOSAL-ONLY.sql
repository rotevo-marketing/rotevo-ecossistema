-- PROPOSAL ONLY. Review ui3-portal-standardization-preflight.sql and explicit audience approval before execution.
-- Idempotent; preserves profiles, Auth accounts, projects, tasks, assignments and history.
begin;
do $$
begin
 if exists(select 1 from public.profiles p join public.client_users u on u.user_id=p.id
 where p.role='client' and p.client_id is distinct from u.client_id)
 then raise exception 'Conflicting client links: stop and reconcile manually';end if;
end $$;
insert into public.client_users(client_id,user_id)
select p.client_id,p.id from public.profiles p join public.clients c on c.id=p.client_id
where p.role='client' and c.status='active'
on conflict(client_id,user_id) do nothing;
-- Audience expansion requires its own authorization. Does not remove Otávio/Rosane.
insert into rotevo_workflow.notification_pilot_users(user_id,enabled)
select p.id,true from public.profiles p join public.clients c on c.id=p.client_id
where p.role='client' and c.status='active'
 and exists(select 1 from public.client_users u where u.user_id=p.id and u.client_id=p.client_id)
on conflict(user_id) do update set enabled=true;
commit;
-- Rollback of the application may retain these valid associations without data loss.
-- To revert notification enrollment, use the reviewed preflight snapshot of enabled states;
-- never delete users, assignments, messages or notifications.
