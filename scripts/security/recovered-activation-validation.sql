\set ON_ERROR_STOP on
-- ONLY in the offline container restored from the private production backup.
-- Everything, including candidate DDL and synthetic identities, is rolled back.
begin;
\i supabase/migrations/20261015_harden_profile_authorization.sql
\i supabase/migrations/20261015_team_roles.sql
\i supabase/migrations/20261016_staff_role_legacy_boundary.sql
\i supabase/migrations/20261016_team_access_audit.sql
\i supabase/migrations/20261016210140_activation_privilege_boundary.sql
\i supabase/migrations/20261016221303_restrict_storage_mutations.sql
\i supabase/migrations/20261016_bootstrap_rotevo_owner.sql
insert into public.clients(id,name,slug) values
 ('b2000000-0000-4000-8000-000000000001','Offline synthetic A','offline-synthetic-a'),
 ('b2000000-0000-4000-8000-000000000002','Offline synthetic B','offline-synthetic-b');
insert into public.planning_projects(id,client_id,title,slug) values
 ('c2000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Offline A','offline-a'),
 ('c2000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Offline B','offline-b');
do $$
declare i int; uid uuid; roles text[]:=array['strategist','producer','project_manager','finance']; owner_id uuid;
begin
 select id into strict owner_id from public.profiles where lower(email)='contato@rotevo.com.br';
 for i in 1..4 loop
  uid:=('a2000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  insert into auth.users(id,email) values(uid,'offline-staff-'||i||'@rotevo.invalid');
  insert into public.profiles(id,email,full_name,role) values(uid,'offline-staff-'||i||'@rotevo.invalid','Offline staff','staff');
  insert into public.team_members(user_id,display_name,role,active) values(uid,'Offline staff',roles[i],true);
  perform public.rotevo_change_team_access(owner_id,uid,'assignment',null,'c2000000-0000-4000-8000-000000000001',true,null);
  perform public.rotevo_change_team_access(owner_id,uid,'permission','projects.read',null,true,null);
 end loop;
end $$;
insert into auth.users(id,email) values('a2000000-0000-4000-8000-000000000005','offline-client@rotevo.invalid');
insert into public.profiles(id,email,role,client_id) values
 ('a2000000-0000-4000-8000-000000000005','offline-client@rotevo.invalid','client','b2000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
declare i int; uid uuid;
begin
 for i in 1..4 loop
  uid:=('a2000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  if exists(select 1 from public.clients) or exists(select 1 from public.planning_projects) then raise exception 'Staff inherited global client/project access'; end if;
  if exists(select 1 from public.team_members) then raise exception 'Staff reads team directory'; end if;
  begin
   update public.profiles set role='strategist' where id=uid;
   raise exception 'Profile role escalation allowed';
  exception when insufficient_privilege then null; end;
  begin
   insert into storage.objects(bucket_id,name) values('planning-covers','offline-denied-staff-'||i);
   raise exception 'Staff wrote storage cover';
  exception when insufficient_privilege then null; end;
 end loop;
 perform set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000005',true);
 if (select count(*) from public.planning_projects)<>1 then raise exception 'Client tenant isolation failed'; end if;
 if exists(select 1 from public.planning_projects where title='Offline B') then raise exception 'Other tenant visible'; end if;
 begin
  update public.profiles set client_id='b2000000-0000-4000-8000-000000000002' where id=auth.uid();
  raise exception 'Client tenant reassignment allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects(bucket_id,name) values('planning-covers','offline-denied-client');
  raise exception 'Client wrote project cover';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where lower(email)='contato@rotevo.com.br'),true); end $$;
set local role authenticated;
do $$ begin
 if (select count(*) from public.planning_projects)<3 then raise exception 'Existing owner project access broken'; end if;
 insert into storage.objects(bucket_id,name) values('planning-covers','offline-allowed-owner');
end $$;
reset role;
do $$
declare owner_id uuid;
begin
 select id into strict owner_id from public.profiles where lower(email)='contato@rotevo.com.br';
 perform public.rotevo_change_team_access(owner_id,'a2000000-0000-4000-8000-000000000001','status',null,null,false,true);
 if (select count(*) from public.team_audit_events)<>9 then raise exception 'Audited changes missing'; end if;
 if has_column_privilege('authenticated','public.profiles','role','UPDATE') or has_table_privilege('anon','public.clients','TRUNCATE') then raise exception 'Unsafe grants remain'; end if;
 if not exists(select 1 from public.team_members where user_id=owner_id and role='admin' and active) then raise exception 'Owner bootstrap failed'; end if;
end $$;
rollback;
select 'PASS: restored data, four staff roles, client isolation, storage boundaries, owner compatibility, audit, transaction rollback' as result;
