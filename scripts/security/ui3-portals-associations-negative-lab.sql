create schema rtp_final_data_20261119;create schema rtp_final_auth_20261119;create schema rtp_final_work_20261119;
create table rtp_final_auth_20261119.users(id uuid primary key);
create table rtp_final_data_20261119.clients(like public.clients including all);
create table rtp_final_data_20261119.profiles(like public.profiles including all);
create table rtp_final_data_20261119.client_users(like public.client_users including all);
create table rtp_final_work_20261119.notification_pilot_users(like rotevo_workflow.notification_pilot_users including all);
alter table rtp_final_data_20261119.client_users add foreign key(client_id) references rtp_final_data_20261119.clients(id);
alter table rtp_final_data_20261119.client_users add foreign key(user_id) references rtp_final_auth_20261119.users(id);
alter table rtp_final_data_20261119.profiles add foreign key(id) references rtp_final_auth_20261119.users(id);
alter table rtp_final_data_20261119.profiles add foreign key(client_id) references rtp_final_data_20261119.clients(id);
alter table rtp_final_data_20261119.client_users enable row level security;alter table rtp_final_data_20261119.profiles enable row level security;
alter table rtp_final_data_20261119.clients enable row level security;alter table rtp_final_work_20261119.notification_pilot_users enable row level security;
revoke all on all tables in schema rtp_final_data_20261119,rtp_final_work_20261119,rtp_final_auth_20261119 from public,anon,authenticated;
insert into rtp_final_auth_20261119.users values('00000000-0000-4000-8000-000000000021'),('00000000-0000-4000-8000-000000000022'),('00000000-0000-4000-8000-000000000023');
insert into rtp_final_data_20261119.clients(id,name,slug,status)values('00000000-0000-4000-8000-000000000011','Synthetic active','synthetic-active','active'),('00000000-0000-4000-8000-000000000012','Synthetic inactive','synthetic-inactive','paused');
insert into rtp_final_data_20261119.profiles(id,client_id,role)values('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000011','client'),('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000011','client'),('00000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000012','client');
insert into rtp_final_data_20261119.client_users(client_id,user_id)values('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000021');
do $test$ declare refused boolean:=false;begin
 begin execute $repair$-- PROPOSAL ONLY. Review ui3-portal-standardization-preflight.sql and explicit audience approval before execution.
-- Idempotent; preserves profiles, Auth accounts, projects, tasks, assignments and history.

do $$
begin
 if exists(select 1 from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.client_users u on u.user_id=p.id
 where p.role='client' and p.client_id is distinct from u.client_id)
 then raise exception 'Conflicting client links: stop and reconcile manually';end if;
end $$;
insert into rtp_final_data_20261119.client_users(client_id,user_id)
select p.client_id,p.id from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.clients c on c.id=p.client_id
where p.role='client' and c.status='active'
on conflict(client_id,user_id) do nothing;
-- Audience expansion requires its own authorization. Does not remove Otávio/Rosane.
insert into rtp_final_work_20261119.notification_pilot_users(user_id,enabled)
select p.id,true from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.clients c on c.id=p.client_id
where p.role='client' and c.status='active'
 and exists(select 1 from rtp_final_data_20261119.client_users u where u.user_id=p.id and u.client_id=p.client_id)
on conflict(user_id) do update set enabled=true;

-- Rollback of the application may retain these valid associations without data loss.
-- To revert notification enrollment, use the reviewed preflight snapshot of enabled states;
-- never delete users, assignments, messages or notifications.
$repair$;exception when raise_exception then if sqlerrm<>'Conflicting client links: stop and reconcile manually' then raise;end if;refused:=true;end;
 if not refused or (select count(*) from rtp_final_data_20261119.client_users)<>1 or (select count(*) from rtp_final_work_20261119.notification_pilot_users)<>0 then raise exception 'Conflict repair was not atomic';end if;
 begin insert into rtp_final_data_20261119.client_users(client_id,user_id)values('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000999');raise exception 'Unknown user accepted';exception when foreign_key_violation then null;end;
 begin insert into rtp_final_data_20261119.client_users(client_id,user_id)values('00000000-0000-4000-8000-000000000999','00000000-0000-4000-8000-000000000022');raise exception 'Unknown client accepted';exception when foreign_key_violation then null;end;
end $test$;
update rtp_final_data_20261119.client_users set client_id='00000000-0000-4000-8000-000000000011' where user_id='00000000-0000-4000-8000-000000000021';
-- PROPOSAL ONLY. Review ui3-portal-standardization-preflight.sql and explicit audience approval before execution.
-- Idempotent; preserves profiles, Auth accounts, projects, tasks, assignments and history.

do $$
begin
 if exists(select 1 from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.client_users u on u.user_id=p.id
 where p.role='client' and p.client_id is distinct from u.client_id)
 then raise exception 'Conflicting client links: stop and reconcile manually';end if;
end $$;
insert into rtp_final_data_20261119.client_users(client_id,user_id)
select p.client_id,p.id from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.clients c on c.id=p.client_id
where p.role='client' and c.status='active'
on conflict(client_id,user_id) do nothing;
-- Audience expansion requires its own authorization. Does not remove Otávio/Rosane.
insert into rtp_final_work_20261119.notification_pilot_users(user_id,enabled)
select p.id,true from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.clients c on c.id=p.client_id
where p.role='client' and c.status='active'
 and exists(select 1 from rtp_final_data_20261119.client_users u where u.user_id=p.id and u.client_id=p.client_id)
on conflict(user_id) do update set enabled=true;

-- Rollback of the application may retain these valid associations without data loss.
-- To revert notification enrollment, use the reviewed preflight snapshot of enabled states;
-- never delete users, assignments, messages or notifications.

-- PROPOSAL ONLY. Review ui3-portal-standardization-preflight.sql and explicit audience approval before execution.
-- Idempotent; preserves profiles, Auth accounts, projects, tasks, assignments and history.

do $$
begin
 if exists(select 1 from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.client_users u on u.user_id=p.id
 where p.role='client' and p.client_id is distinct from u.client_id)
 then raise exception 'Conflicting client links: stop and reconcile manually';end if;
end $$;
insert into rtp_final_data_20261119.client_users(client_id,user_id)
select p.client_id,p.id from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.clients c on c.id=p.client_id
where p.role='client' and c.status='active'
on conflict(client_id,user_id) do nothing;
-- Audience expansion requires its own authorization. Does not remove Otávio/Rosane.
insert into rtp_final_work_20261119.notification_pilot_users(user_id,enabled)
select p.id,true from rtp_final_data_20261119.profiles p join rtp_final_data_20261119.clients c on c.id=p.client_id
where p.role='client' and c.status='active'
 and exists(select 1 from rtp_final_data_20261119.client_users u where u.user_id=p.id and u.client_id=p.client_id)
on conflict(user_id) do update set enabled=true;

-- Rollback of the application may retain these valid associations without data loss.
-- To revert notification enrollment, use the reviewed preflight snapshot of enabled states;
-- never delete users, assignments, messages or notifications.

do $test$ begin
 if(select count(*) from rtp_final_data_20261119.client_users)<>2 then raise exception 'Invalid association count';end if;
 if exists(select 1 from rtp_final_data_20261119.client_users where user_id='00000000-0000-4000-8000-000000000023') then raise exception 'Inactive client was enrolled';end if;
 if(select count(*) from rtp_final_work_20261119.notification_pilot_users where enabled)<>2 then raise exception 'Invalid pilot count';end if;
 if(select count(*) from rtp_final_data_20261119.profiles)<>3 or(select count(*) from rtp_final_auth_20261119.users)<>3 then raise exception 'Original identities changed';end if;
end $test$;
drop schema rtp_final_data_20261119 cascade;drop schema rtp_final_work_20261119 cascade;drop schema rtp_final_auth_20261119 cascade;
