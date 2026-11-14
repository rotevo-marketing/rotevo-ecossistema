-- UI3 isolated end-to-end SQL fixture: no Supabase-hosted database touched.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-schema-isolated.sql
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
alter table public.planning_projects add column client_id uuid;
alter table public.planning_projects add column data jsonb not null default '{}'::jsonb;
create table public.profiles(id uuid primary key,client_id uuid,role text);
create table public.client_users(id uuid primary key default gen_random_uuid(),client_id uuid,user_id uuid,unique(client_id,user_id));
create table public.team_members(user_id uuid primary key,role text,active boolean);
create table public.team_project_assignments(user_id uuid,project_id uuid,primary key(user_id,project_id));
create table public.team_member_permissions(user_id uuid,permission text,primary key(user_id,permission));
update public.planning_projects set client_id='10000000-0000-4000-8000-000000000001',
 data='{"editorialCalendar":[{"id":"content-1","version":"01","visibleToClient":true,"status":"idea"},{"id":"hidden-1","version":"01","visibleToClient":false}],"executionTimeline":[{"id":"task-1","visibleToClient":true}]}'
 where id='00000000-0000-4000-8000-000000000011';
insert into public.planning_projects(id,client_id,data) values
('00000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000002',
 '{"editorialCalendar":[{"id":"content-1","version":"01","visibleToClient":true}]}');
insert into public.profiles(id,client_id,role) values
('00000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','client'),
('00000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000002','client'),
('00000000-0000-4000-8000-000000000013',null,'strategist'),
('00000000-0000-4000-8000-000000000015',null,'staff');
insert into public.client_users(client_id,user_id) values
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012'),
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000014');
insert into public.team_members(user_id,role,active) values
('00000000-0000-4000-8000-000000000013','admin',true),
('00000000-0000-4000-8000-000000000015','producer',false);
\ir ../../docs/security/sql/ui3-client-action-rpc-PROPOSAL-ONLY.sql

-- Internal strategist allowed to create a visible content assignment.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
set role authenticated;
select public.rotevo_client_action_create(
 '00000000-0000-4000-8000-000000000011','content','content-1','01',
 '00000000-0000-4000-8000-000000000012','record_video',
 'Gravar depoimento em vídeo','2026-11-20','assignment-test-001');
-- Idempotent retry must not create another row.
select public.rotevo_client_action_create(
 '00000000-0000-4000-8000-000000000011','content','content-1','01',
 '00000000-0000-4000-8000-000000000012','record_video',
 'Gravar depoimento em vídeo','2026-11-20','assignment-test-001');
reset role;
do $check$
begin
 if (select count(*) from rotevo_workflow.client_action_assignments
 where idempotency_key='assignment-test-001')<>1
 then raise exception 'Idempotency duplicated assignment';end if;
end $check$;

-- Client A may read own assignment and must never see assignments from B.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
do $client$
declare a jsonb;
begin
 select public.rotevo_client_action_list('00000000-0000-4000-8000-000000000011') into a;
 if jsonb_array_length(a)<>1 or a->0->>'resourceId'<>'content-1'
 then raise exception 'Client own list invalid';end if;
end $client$;
do $cross$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_client_action_list('00000000-0000-4000-8000-000000000022');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Cross-tenant read permitted';end if;
end $cross$;
do $nonteam$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_client_action_create(
 '00000000-0000-4000-8000-000000000011','task','task-1',null,
 '00000000-0000-4000-8000-000000000012','send_material',
 'Enviar material do cliente',null,'assignment-test-002');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Client created a team-only assignment';end if;
end $nonteam$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
do $hidden$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_client_action_create(
 '00000000-0000-4000-8000-000000000011','content','hidden-1','01',
 '00000000-0000-4000-8000-000000000012','send_material',
 'Enviar documento para análise',null,'assignment-test-003');
 exception when serialization_failure then denied:=true;end;
 if not denied then raise exception 'Hidden resource assigned';end if;
end $hidden$;
do $tenant$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_client_action_create(
 '00000000-0000-4000-8000-000000000011','task','task-1',null,
 '00000000-0000-4000-8000-000000000014','send_material',
 'Enviar documento para análise',null,'assignment-test-004');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Cross-tenant client recipient assigned';end if;
end $tenant$;
do $replay$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_client_action_create(
 '00000000-0000-4000-8000-000000000011','content','content-1','01',
 '00000000-0000-4000-8000-000000000012','send_material',
 'Alteração da solicitação original',null,'assignment-test-001');
 exception when unique_violation then denied:=true;end;
 if not denied then raise exception 'Mutated idempotency replay accepted';end if;
end $replay$;
reset role;
do $priv$
begin
 if has_table_privilege('authenticated','rotevo_workflow.client_action_assignments','SELECT')
 then raise exception 'Browser role has private table SELECT';end if;
 raise notice 'UI3_CLIENT_ACTION_RPC_TENANCY_PASS';
end $priv$;
