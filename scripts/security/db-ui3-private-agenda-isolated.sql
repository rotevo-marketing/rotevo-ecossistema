-- Isolated homologation only; never run against production.
-- Verified on rotevo-ui3-homologacao (tqedxahsqbskninjenfg).
-- Requires the reviewed user-agendas proposal installed in that isolated target.
-- All synthetic data and any Auth profile-trigger effects are rolled back.
begin;
do $fixture$
declare
 owner_a uuid:=gen_random_uuid();
 owner_b uuid:=gen_random_uuid();
 stamp timestamptz:=clock_timestamp();
 touched integer;
begin
 if not (select relrowsecurity from pg_class where oid='public.rotevo_user_agendas'::regclass) then raise exception 'RLS missing';end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='rotevo_user_agendas') then raise exception 'Unexpected access policy';end if;
 if has_table_privilege('anon','public.rotevo_user_agendas','SELECT') or has_table_privilege('authenticated','public.rotevo_user_agendas','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Browser role received privileges';end if;
 if not has_table_privilege('service_role','public.rotevo_user_agendas','SELECT,INSERT,UPDATE') or has_table_privilege('service_role','public.rotevo_user_agendas','DELETE') then raise exception 'Server privileges differ from proposal';end if;
 if not exists(select 1 from pg_constraint where conrelid='public.rotevo_user_agendas'::regclass and contype='f' and confrelid='auth.users'::regclass and confdeltype='r') then raise exception 'Restrict FK missing';end if;
 insert into auth.users(id,email,role,aud) values
 (owner_a,'agenda-fixture-'||owner_a||'@example.invalid','authenticated','authenticated'),
 (owner_b,'agenda-fixture-'||owner_b||'@example.invalid','authenticated','authenticated');
 insert into public.rotevo_user_agendas(user_id,data,updated_at) values
 (owner_a,'{"operationalAgenda":[{"id":"synthetic-a","title":"Owner A private event"}]}'::jsonb,stamp),
 (owner_b,'{"operationalAgenda":[{"id":"synthetic-b","title":"Owner B private event"}]}'::jsonb,stamp);
 if (select count(*) from public.rotevo_user_agendas where user_id=owner_a)<>1 then raise exception 'Owner scope failed';end if;
 update public.rotevo_user_agendas set data=jsonb_set(data,'{operationalAgenda,0,title}','"A updated"'::jsonb),updated_at=stamp+interval '1 second' where user_id=owner_a and updated_at=stamp;
 get diagnostics touched=row_count;
 if touched<>1 then raise exception 'Initial CAS update failed';end if;
 update public.rotevo_user_agendas set data='{"operationalAgenda":[]}'::jsonb where user_id=owner_a and updated_at=stamp;
 get diagnostics touched=row_count;
 if touched<>0 then raise exception 'Stale CAS update was accepted';end if;
 if (select data->'operationalAgenda'->0->>'title' from public.rotevo_user_agendas where user_id=owner_b)<>'Owner B private event' then raise exception 'Other owner changed';end if;
 begin
  insert into public.rotevo_user_agendas(user_id) values(owner_a);
  raise exception 'Duplicate owner accepted';
 exception when unique_violation then null;end;
 begin
  update public.rotevo_user_agendas set data='{"executionTimeline":[]}'::jsonb where user_id=owner_a;
  raise exception 'Invalid root accepted';
 exception when check_violation then null;end;
 execute 'set local role authenticated';
 begin
  perform count(*) from public.rotevo_user_agendas;
  raise exception 'Authenticated direct read succeeded';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 execute 'set local role anon';
 begin
  perform count(*) from public.rotevo_user_agendas;
  raise exception 'Anonymous direct read succeeded';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
end
$fixture$;
select 'PASS: RLS, role grants, direct-read denial, two synthetic owners, version CAS, uniqueness, JSON shape, restrictive FK; fixtures rolled back' as result;
rollback;
