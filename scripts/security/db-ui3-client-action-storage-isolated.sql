-- Disposable Postgres fixture: no access to hosted Storage or customer files.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-rpc-isolated.sql
create schema storage;
create table storage.buckets(
 id text primary key,name text not null,public boolean not null,
 file_size_limit bigint,allowed_mime_types text[]
);
create table storage.objects(
 bucket_id text not null references storage.buckets(id),
 name text not null,primary key(bucket_id,name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select on storage.buckets to authenticated;
grant insert,select on storage.objects to authenticated;
\ir ../../docs/security/sql/ui3-client-action-storage-PROPOSAL-ONLY.sql
select id as assignment_id from rotevo_workflow.client_action_assignments
 where idempotency_key='assignment-test-001' \gset
select set_config('rotevo_test.assignment_id', :'assignment_id',false);
select set_config('rotevo_test.asset_path',
 :'assignment_id'||'/00000000-0000-4000-8000-000000000012/00000000-0000-4000-8000-000000000021.pdf',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);

-- Client A can upload own immutable evidence in the exact assignment folder.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
insert into storage.objects(bucket_id,name)
 values('rotevo-client-deliveries',current_setting('rotevo_test.asset_path'));
do $client_read$
begin
 if not exists(select 1 from storage.objects
 where bucket_id='rotevo-client-deliveries' and name=current_setting('rotevo_test.asset_path'))
 then raise exception 'Assigned client could not read private delivery';end if;
end $client_read$;
reset role;

-- Different client and unauthenticated role must not see assignment assets.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000014',false);
set role authenticated;
do $isolated$
declare denied boolean:=false;
begin
 if exists(select 1 from storage.objects where bucket_id='rotevo-client-deliveries')
 then raise exception 'Cross-tenant file visible';end if;
 begin
  insert into storage.objects(bucket_id,name)
  values('rotevo-client-deliveries',current_setting('rotevo_test.asset_path')||'.png');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Wrong client uploaded file';end if;
end $isolated$;
reset role;

-- Assigned client cannot upload to an invented folder or change to a fake suffix.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
do $invalid_path$
declare denied boolean:=false;
begin
 begin
  insert into storage.objects(bucket_id,name)
  values('rotevo-client-deliveries','evil/file.pdf');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Invalid path accepted';end if;
end $invalid_path$;
reset role;

-- Active authorized internal reviewer can read the existing evidence.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
do $team$
begin
 if not exists(select 1 from storage.objects
  where bucket_id='rotevo-client-deliveries' and name=current_setting('rotevo_test.asset_path'))
 then raise exception 'Authorized strategist cannot access pending evidence';end if;
end $team$;
reset role;

-- Resource visibility revoked: all readers immediately lose RLS access.
update public.planning_projects
set data=jsonb_set(data,'{editorialCalendar,0,visibleToClient}','false'::jsonb,false)
where id='00000000-0000-4000-8000-000000000011';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
do $revocation$
begin
 if exists(select 1 from storage.objects where bucket_id='rotevo-client-deliveries')
 then raise exception 'Revoked resource leaked to former assigned client';end if;
end $revocation$;
reset role;
do $private$
begin
 if (select public from storage.buckets where id='rotevo-client-deliveries')
 then raise exception 'Client delivery bucket is public';end if;
 if has_table_privilege('authenticated','storage.objects','UPDATE') or
  has_table_privilege('authenticated','storage.objects','DELETE')
 then raise exception 'Clients can overwrite or delete private evidence';end if;
 raise notice 'UI3_CLIENT_ACTION_STORAGE_RLS_PASS';
end $private$;
