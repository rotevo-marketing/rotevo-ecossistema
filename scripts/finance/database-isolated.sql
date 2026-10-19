\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',label; end if; raise notice 'PASS: %',label; end $$;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','finance-admin@rotevo.invalid'),
 ('10000000-0000-4000-8000-000000000002','finance-client-a@rotevo.invalid'),
 ('10000000-0000-4000-8000-000000000003','finance-client-b@rotevo.invalid'),
 ('10000000-0000-4000-8000-000000000004','finance-reader@rotevo.invalid');
insert into public.clients(id,name,slug) values
 ('20000000-0000-4000-8000-000000000001','Synthetic finance A','synthetic-finance-a'),
 ('20000000-0000-4000-8000-000000000002','Synthetic finance B','synthetic-finance-b');
insert into public.profiles(id,role,client_id) values
 ('10000000-0000-4000-8000-000000000001','strategist',null),
 ('10000000-0000-4000-8000-000000000002','client','20000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000003','client','20000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000004','staff',null);
insert into public.team_members(user_id,display_name,role,active) values
 ('10000000-0000-4000-8000-000000000001','Synthetic finance admin','admin',true),
 ('10000000-0000-4000-8000-000000000004','Synthetic finance reader','finance',true);
insert into public.team_member_permissions(user_id,permission) values ('10000000-0000-4000-8000-000000000004','finance.read');
insert into public.planning_projects(id,client_id,title,slug,data) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic A','synthetic-a','{"marketingCampaigns":[{"id":"campaign-a","title":"Campaign A","budget":1000,"spent":99999,"notes":"PRIVATE_NOTE","snapshots":[{"month":"2027-02","spent":600}]}]}'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Synthetic B','synthetic-b','{"marketingCampaigns":[{"id":"campaign-b","title":"Campaign B","snapshots":[{"month":"2027-02","spent":400}]}]}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',true);
select pg_temp.assert_true(rotevo_finance.allowed(true),'active admin can write');
select public.rotevo_finance_mutate('account.create','{"name":"Synthetic bank","opening_cents":10000}','40000000-0000-4000-8000-000000000001');
select public.rotevo_finance_mutate('account.create','{"name":"Synthetic bank","opening_cents":10000}','40000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((select count(*)=1 from jsonb_array_elements(public.rotevo_finance_snapshot()->'accounts') a where a->>'name'='Synthetic bank'),'same request is idempotent');
select public.rotevo_finance_mutate('contract.create','{"client_id":"20000000-0000-4000-8000-000000000001","title":"Synthetic monthly contract","start_date":"2026-01-01","monthly_cents":100000,"due_day":31,"project_ids":["30000000-0000-4000-8000-000000000001"]}','40000000-0000-4000-8000-000000000002');
select public.rotevo_finance_mutate('recurrence.generate','{"month":"2027-02"}','40000000-0000-4000-8000-000000000003');
select public.rotevo_finance_mutate('recurrence.generate','{"month":"2027-02"}','40000000-0000-4000-8000-000000000004');
select pg_temp.assert_true((select count(*)=1 from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices') i where i->>'title'='Synthetic monthly contract'),'recurrence is unique per competence');
select pg_temp.assert_true((select i->>'due_date'='2027-02-28' from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')i where i->>'title'='Synthetic monthly contract'),'February end-of-month due date');
do $$ begin
 perform public.rotevo_finance_mutate('contract.create','{"client_id":"20000000-0000-4000-8000-000000000001","title":"Wrong client project","start_date":"2026-01-01","monthly_cents":100000,"due_day":10,"project_ids":["30000000-0000-4000-8000-000000000002"]}',gen_random_uuid());
 raise exception 'FAILED: cross-tenant contract accepted';
 exception when invalid_parameter_value then raise notice 'PASS: cross-tenant contract rejected'; end $$;
do $$ declare i jsonb; a jsonb; p jsonb; begin
 select x into i from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'title'='Synthetic monthly contract';
 select x into a from jsonb_array_elements(public.rotevo_finance_snapshot()->'accounts')x where x->>'name'='Synthetic bank';
 p:=jsonb_build_object('id',i->>'id','version',1,'account_id',a->>'id','amount_cents',30000,'paid_on','2026-01-01','method','Pix');
 perform public.rotevo_finance_mutate('invoice.settle',p,'40000000-0000-4000-8000-000000000005');
 perform public.rotevo_finance_mutate('invoice.settle',p,'40000000-0000-4000-8000-000000000005');
 perform pg_temp.assert_true((select (x->>'paid_cents')::bigint=30000 from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'id'=i->>'id'),'partial payment and repeated request do not duplicate');
 begin
  perform public.rotevo_finance_mutate('invoice.settle',p,gen_random_uuid());raise exception 'FAILED: stale version accepted';
 exception when serialization_failure then raise notice 'PASS: stale version rejected'; end;
 begin
  perform public.rotevo_finance_mutate('invoice.settle',(p||'{"version":2,"amount_cents":80000}'),gen_random_uuid());raise exception 'FAILED: overpayment accepted';
 exception when invalid_parameter_value then raise notice 'PASS: overpayment rejected'; end;
 begin
  perform public.rotevo_finance_mutate('invoice.settle',(p||'{"version":2,"paid_on":"2099-01-01"}'),gen_random_uuid());raise exception 'FAILED: future payment accepted';
 exception when invalid_parameter_value then raise notice 'PASS: future payment rejected'; end;
 begin
  perform public.rotevo_finance_mutate('invoice.cancel',jsonb_build_object('id',i->>'id','version',2,'reason','Cancel synthetic'),gen_random_uuid());raise exception 'FAILED: paid invoice canceled';
 exception when invalid_parameter_value then raise notice 'PASS: paid invoice requires reversal before cancellation'; end;
end $$;
select public.rotevo_finance_mutate('invoice.create','{"client_id":"20000000-0000-4000-8000-000000000002","title":"Client B monthly","counterparty":"Synthetic B","category":"Mensalidade","direction":"in","competence":"2027-02","due_date":"2027-02-10","amount_cents":50000}',gen_random_uuid());
select public.rotevo_finance_mutate('invoice.create','{"title":"INTERNAL_SECRET_EXPENSE","counterparty":"PRIVATE_SUPPLIER","category":"Equipe","direction":"out","competence":"2027-02","due_date":"2027-02-10","amount_cents":5000}',gen_random_uuid());
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.assert_true(jsonb_array_length(public.rotevo_client_finance()->'invoices')=1,'client A only sees own monthly invoice');
select pg_temp.assert_true(jsonb_array_length(public.rotevo_client_finance()->'campaigns')=1,'client A only sees own campaign');
select pg_temp.assert_true((public.rotevo_client_finance()->'campaigns'->0->>'spent')::integer=600,'campaign reads monthly spent without general spent');
select pg_temp.assert_true(public.rotevo_client_finance()::text !~ 'PRIVATE|INTERNAL|actor_id|account_id|counterparty|reference|method|contracts','portal excludes financial and campaign internals');
do $$ begin
 perform public.rotevo_finance_snapshot();raise exception 'FAILED: client read internal finance';
 exception when insufficient_privilege then raise notice 'PASS: internal snapshot denies client'; end $$;
do $$ begin
 perform public.rotevo_finance_mutate('account.create','{"name":"FORBIDDEN"}',gen_random_uuid());raise exception 'FAILED: client write';
 exception when insufficient_privilege then raise notice 'PASS: writes deny client'; end $$;
do $$ begin
 perform * from rotevo_finance.invoices;raise exception 'FAILED: direct table access';
 exception when insufficient_privilege then raise notice 'PASS: direct financial table access denied'; end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select pg_temp.assert_true(jsonb_array_length(public.rotevo_client_finance()->'invoices')=1 and public.rotevo_client_finance()->'invoices'->0->>'title'='Client B monthly','client B sees only own invoice');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select pg_temp.assert_true(rotevo_finance.allowed(false) and not rotevo_finance.allowed(true),'finance reader cannot write');
do $$ begin
 perform public.rotevo_finance_mutate('account.create','{"name":"FORBIDDEN"}',gen_random_uuid());raise exception 'FAILED: reader write';
 exception when insufficient_privilege then raise notice 'PASS: writes deny reader'; end $$;
reset role;
update public.team_members set active=false where user_id='10000000-0000-4000-8000-000000000004';
set local role authenticated;
select pg_temp.assert_true(not rotevo_finance.allowed(false),'inactivation revokes access with existing JWT');
reset role;
set local role anon;
do $$ begin
 perform public.rotevo_client_finance();raise exception 'FAILED: anonymous RPC';
 exception when insufficient_privilege then raise notice 'PASS: anonymous RPC denied'; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare s jsonb; inv jsonb; begin
 select x into s from jsonb_array_elements(public.rotevo_finance_snapshot()->'settlements')x where x->>'reference'='';
 perform public.rotevo_finance_mutate('settlement.reverse',jsonb_build_object('id',s->>'id','reason','Wrong synthetic payment'),gen_random_uuid());
 select x into inv from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'id'=s->>'invoice_id';
 perform pg_temp.assert_true((inv->>'paid_cents')::integer=0,'reversal restores invoice balance');
 perform pg_temp.assert_true((select (x->>'reversed')::boolean from jsonb_array_elements(public.rotevo_finance_snapshot()->'settlements')x where x->>'id'=s->>'id'),'reversal preserves original settlement');
 perform public.rotevo_finance_mutate('invoice.cancel',jsonb_build_object('id',inv->>'id','version',inv->>'version','reason','Cancelled after reversal'),gen_random_uuid());
 perform pg_temp.assert_true((select (x->>'cancelled')::boolean from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'id'=inv->>'id'),'cancellation works after reversal');
end $$;
do $$ declare c jsonb; i jsonb; begin
 select x into c from jsonb_array_elements(public.rotevo_finance_snapshot()->'contracts')x where x->>'title'='Synthetic monthly contract';
 select x into i from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'title'='Synthetic monthly contract';
 begin
  perform public.rotevo_finance_mutate('invoice.settle',jsonb_build_object('id',i->>'id','amount_cents',100),gen_random_uuid());raise exception 'FAILED: missing version accepted';
 exception when invalid_parameter_value then raise notice 'PASS: missing expected version rejected'; end;
 perform public.rotevo_finance_mutate('contract.update',jsonb_build_object('id',c->>'id','version',c->>'version','client_id',c->>'client_id','title',c->>'title','start_date',c->>'start_date','monthly_cents',120000,'due_day',15,'project_ids',c->'project_ids'),gen_random_uuid());
 perform pg_temp.assert_true((select (x->>'amount_cents')::integer=100000 from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'id'=i->>'id'),'contract edit preserves issued invoice amount');
 perform public.rotevo_finance_mutate('recurrence.generate','{"month":"2027-03"}',gen_random_uuid());
 perform pg_temp.assert_true((select (x->>'amount_cents')::integer=120000 and x->>'due_date'='2027-03-15' from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'contract_id'=c->>'id' and x->>'competence'='2027-03-01'),'new competence uses edited contract terms');
 begin
  perform public.rotevo_finance_mutate('account.create','{"name":"different retry"}','40000000-0000-4000-8000-000000000001');raise exception 'FAILED: idempotency key reused with changed payload';
 exception when invalid_parameter_value then raise notice 'PASS: changed payload cannot reuse request ID'; end;
end $$;
do $$ declare payload jsonb := '{"title":"Synthetic subscription","counterparty":"PRIVATE_SUBSCRIPTION_SUPPLIER","category":"Ferramentas","direction":"out","competence":"2028-01","due_date":"2028-01-31","amount_cents":12990,"repeat_months":3}'; req uuid:=gen_random_uuid(); begin
 perform public.rotevo_finance_mutate('invoice.create',payload,req);
 perform public.rotevo_finance_mutate('invoice.create',payload,req);
 perform pg_temp.assert_true((select count(*)=3 from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'title'='Synthetic subscription'),'monthly expenses retry does not duplicate');
 perform pg_temp.assert_true((select array_agg(x->>'due_date' order by x->>'due_date')=array['2028-01-31','2028-02-29','2028-03-31'] from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'title'='Synthetic subscription'),'expense schedule keeps original due day');
 perform pg_temp.assert_true((select bool_and((x->>'paid_cents')::integer=0 and x->>'client_id' is null) from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'title'='Synthetic subscription'),'internal expenses require no client and remain unpaid');
 begin
  perform public.rotevo_finance_mutate('invoice.create',payload||'{"repeat_months":61}',gen_random_uuid());raise exception 'FAILED: excessive repeats accepted';
 exception when invalid_parameter_value then raise notice 'PASS: expense repeat limit enforced'; end;
 begin
  perform public.rotevo_finance_mutate('invoice.create',payload||'{"direction":"in","client_id":"20000000-0000-4000-8000-000000000001"}',gen_random_uuid());raise exception 'FAILED: revenue repeats accepted';
 exception when invalid_parameter_value then raise notice 'PASS: expense repetition rejects revenue'; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.assert_true(public.rotevo_client_finance()::text !~ 'Synthetic subscription|SUBSCRIPTION_SUPPLIER','expense series never appears in client portal');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare supplier jsonb; sub jsonb; invoice jsonb; payload jsonb; req uuid:=gen_random_uuid(); begin
 perform public.rotevo_finance_mutate('supplier.save','{"name":"PRIVATE_SYNTHETIC_SUPPLIER","email":"supplier@example.com","notes":"PRIVATE_SUPPLIER_NOTE"}',req);
 perform public.rotevo_finance_mutate('supplier.save','{"name":"PRIVATE_SYNTHETIC_SUPPLIER","email":"supplier@example.com","notes":"PRIVATE_SUPPLIER_NOTE"}',req);
 perform pg_temp.assert_true((select count(*)=1 from jsonb_array_elements(public.rotevo_finance_snapshot()->'suppliers')x where x->>'name'='PRIVATE_SYNTHETIC_SUPPLIER'),'supplier creation retry idempotent');
 select x into supplier from jsonb_array_elements(public.rotevo_finance_snapshot()->'suppliers')x where x->>'name'='PRIVATE_SYNTHETIC_SUPPLIER';
 payload:=jsonb_build_object('supplier_id',supplier->>'id','title','PRIVATE_SYNTHETIC_SUBSCRIPTION','category','Ferramentas','amount_cents',10000,'start_date','2027-01-01','end_date','2027-06-30','due_day',31);
 perform public.rotevo_finance_mutate('subscription.save',payload,gen_random_uuid());
 select x into sub from jsonb_array_elements(public.rotevo_finance_snapshot()->'subscriptions')x where x->>'title'='PRIVATE_SYNTHETIC_SUBSCRIPTION';
 perform public.rotevo_finance_mutate('subscription.generate','{"month":"2027-02"}',gen_random_uuid());
 perform public.rotevo_finance_mutate('subscription.generate','{"month":"2027-02"}',gen_random_uuid());
 perform pg_temp.assert_true((select count(*)=1 from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'subscription_id'=sub->>'id'),'subscription month generation unique');
 select x into invoice from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'subscription_id'=sub->>'id';
 perform pg_temp.assert_true(invoice->>'due_date'='2027-02-28' and (invoice->>'paid_cents')::integer=0,'subscription February unpaid obligation');
 begin
  perform public.rotevo_finance_mutate('supplier.status',jsonb_build_object('id',supplier->>'id','version',1,'active',false),gen_random_uuid());raise exception 'FAILED: archived supplier with active subscription';
 exception when invalid_parameter_value then raise notice 'PASS: archive requires paused or closed subscription'; end;
 perform public.rotevo_finance_mutate('subscription.save',payload||jsonb_build_object('id',sub->>'id','version',1,'amount_cents',12000),gen_random_uuid());
 perform public.rotevo_finance_mutate('subscription.generate','{"month":"2027-03"}',gen_random_uuid());
 perform pg_temp.assert_true((select (x->>'amount_cents')::integer=10000 from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'id'=invoice->>'id'),'subscription reprice preserves old invoice');
 perform pg_temp.assert_true((select (x->>'amount_cents')::integer=12000 and x->>'due_date'='2027-03-31' from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'subscription_id'=sub->>'id' and x->>'competence'='2027-03-01'),'subscription new month uses repriced amount');
 perform public.rotevo_finance_mutate('subscription.status',jsonb_build_object('id',sub->>'id','version',2,'status','paused'),gen_random_uuid());
 perform public.rotevo_finance_mutate('subscription.generate','{"month":"2027-04"}',gen_random_uuid());
 perform pg_temp.assert_true(not exists(select 1 from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'subscription_id'=sub->>'id' and x->>'competence'='2027-04-01'),'paused subscription emits nothing');
 perform public.rotevo_finance_mutate('subscription.status',jsonb_build_object('id',sub->>'id','version',3,'status','closed'),gen_random_uuid());
 begin
  perform public.rotevo_finance_mutate('subscription.status',jsonb_build_object('id',sub->>'id','version',4,'status','active'),gen_random_uuid());raise exception 'FAILED: reopened closed subscription';
 exception when serialization_failure then raise notice 'PASS: closed subscription cannot reopen'; end;
 perform public.rotevo_finance_mutate('supplier.status',jsonb_build_object('id',supplier->>'id','version',1,'active',false),gen_random_uuid());
 perform public.rotevo_finance_mutate('invoice.update',jsonb_build_object('id',invoice->>'id','version',1,'title','PRIVATE_EDITED_INVOICE','counterparty','PRIVATE_SUPPLIER','category','Ferramentas','amount_cents',10500,'due_date','2027-02-27','document_reference','PRIVATE_FAT','notes','PRIVATE_NOTE'),gen_random_uuid());
 perform pg_temp.assert_true((select (x->>'amount_cents')::integer=10500 and x->>'supplier_id'=supplier->>'id' from jsonb_array_elements(public.rotevo_finance_snapshot()->'invoices')x where x->>'id'=invoice->>'id'),'unpaid invoice correction preserves supplier link');
 begin
  perform public.rotevo_finance_mutate('invoice.update',jsonb_build_object('id',invoice->>'id','version',1),gen_random_uuid());raise exception 'FAILED: stale invoice update';
 exception when serialization_failure then raise notice 'PASS: stale invoice edit denied'; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.assert_true(public.rotevo_client_finance()::text !~ 'PRIVATE|suppliers|subscriptions|document_reference|notes','client projection excludes lifecycle fields');
do $$ begin
 perform public.rotevo_finance_mutate('supplier.save','{"name":"Forbidden supplier"}',gen_random_uuid());raise exception 'FAILED: client supplier write';
 exception when insufficient_privilege then raise notice 'PASS: client lifecycle write denied'; end $$;
do $$ begin
 perform * from rotevo_finance.suppliers;raise exception 'FAILED: direct supplier read';
 exception when insufficient_privilege then raise notice 'PASS: direct supplier table denied'; end $$;
rollback;
