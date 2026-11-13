-- Financial domain: private storage, authenticated RPCs, no production activation.
create schema if not exists rotevo_finance;
revoke all on schema rotevo_finance from public, anon;
grant usage on schema rotevo_finance to authenticated;

create table rotevo_finance.accounts (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 opening_cents bigint not null default 0 check(abs(opening_cents)<=1000000000000), active boolean not null default true
);
create table rotevo_finance.contracts (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete restrict,
 title text not null check(length(title) between 3 and 180), start_date date not null, end_date date,
 monthly_cents bigint not null check(monthly_cents between 1 and 1000000000000), due_day integer not null check(due_day between 1 and 31),
 status text not null check(status in ('draft','active','paused','closed')), version integer not null default 1,
 check(end_date is null or end_date>=start_date), unique(id,client_id)
);
create table rotevo_finance.contract_projects (
 contract_id uuid not null references rotevo_finance.contracts(id) on delete restrict,
 project_id uuid not null references public.planning_projects(id) on delete restrict, primary key(contract_id,project_id)
);
create table rotevo_finance.invoices (
 id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete restrict,
 project_id uuid references public.planning_projects(id) on delete restrict,
 contract_id uuid, direction text not null check(direction in ('in','out')),
 title text not null check(length(title) between 3 and 180), counterparty text not null check(length(counterparty) between 1 and 180),
 category text not null check(length(category) between 1 and 80), competence date not null check(extract(day from competence)=1),
 due_date date not null, amount_cents bigint not null check(amount_cents between 1 and 1000000000000),
 cancelled boolean not null default false, version integer not null default 1,
 check(direction<>'in' or client_id is not null), check(contract_id is null or (client_id is not null and direction='in')),
 foreign key(contract_id,client_id) references rotevo_finance.contracts(id,client_id) on delete restrict,
 unique(contract_id,competence)
);
create table rotevo_finance.settlements (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references rotevo_finance.invoices(id) on delete restrict,
 account_id uuid not null references rotevo_finance.accounts(id) on delete restrict,
 amount_cents bigint not null check(amount_cents between 1 and 1000000000000), paid_on date not null,
 method text not null check(length(method) between 1 and 60), reference text not null default '' check(length(reference)<=180),
 actor_id uuid not null references auth.users(id) on delete restrict, reversed boolean not null default false,
 created_at timestamptz not null default now()
);
create table rotevo_finance.transfers (
 id uuid primary key default gen_random_uuid(), from_account_id uuid not null references rotevo_finance.accounts(id),
 to_account_id uuid not null references rotevo_finance.accounts(id), amount_cents bigint not null check(amount_cents between 1 and 1000000000000),
 paid_on date not null, check(from_account_id<>to_account_id)
);
create table rotevo_finance.audit (
 id bigint generated always as identity primary key, request_id uuid not null unique,
 actor_id uuid not null references auth.users(id) on delete restrict, action text not null,
 input jsonb not null, created_at timestamptz not null default now()
);
create table rotevo_finance.settings (
 id boolean primary key default true check(id), categories jsonb not null check(jsonb_typeof(categories)='array')
);
insert into rotevo_finance.settings(categories) values ('["Mensalidade","Projeto avulso","Equipe","Ferramentas","Mídia","Impostos","Outros"]');
create index on rotevo_finance.contracts(client_id);
create index on rotevo_finance.contract_projects(project_id);
create index on rotevo_finance.invoices(client_id,due_date);
create index on rotevo_finance.invoices(project_id);
create index on rotevo_finance.invoices(due_date) where not cancelled;
create index on rotevo_finance.settlements(invoice_id) where not reversed;
create index on rotevo_finance.settlements(account_id,paid_on);
create index on rotevo_finance.transfers(from_account_id);
create index on rotevo_finance.transfers(to_account_id);
create index on rotevo_finance.audit(actor_id);
-- No direct browser access. RLS remains enabled as defense in depth.
do $$ declare t text; begin
 foreach t in array array['accounts','contracts','contract_projects','invoices','settlements','transfers','audit','settings'] loop
 execute format('alter table rotevo_finance.%I enable row level security',t);
 execute format('revoke all on rotevo_finance.%I from public, anon, authenticated',t);
 end loop;
end $$;

create or replace function rotevo_finance.allowed(p_write boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')<>'true'
 and exists(select 1 from public.profiles p join public.team_members m on m.user_id=p.id
 where p.id=auth.uid() and p.role in ('strategist','staff') and m.active
 and (m.role='admin' or (
 exists(select 1 from public.team_member_permissions x where x.user_id=p.id and x.permission='finance.read')
 and (not p_write or exists(select 1 from public.team_member_permissions x where x.user_id=p.id and x.permission='finance.write')))))
$$;
revoke all on function rotevo_finance.allowed(boolean) from public,anon;
grant execute on function rotevo_finance.allowed(boolean) to authenticated;

create or replace function rotevo_finance.campaigns(p_client uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'projectId',p.id,'projectTitle',p.title,'clientId',p.client_id,'campaignId',c->>'id','title',c->>'title',
 'platform',c->>'platform','month',coalesce(s->>'month',''),'budget',case when jsonb_typeof(c->'budget')='number' then c->'budget' else 'null'::jsonb end,'spent',case when jsonb_typeof(s->'spent')='number' then s->'spent' else 'null'::jsonb end)),'[]'::jsonb)
 from public.planning_projects p
 cross join lateral jsonb_array_elements(case when jsonb_typeof(p.data->'marketingCampaigns')='array' then p.data->'marketingCampaigns' else '[]'::jsonb end)c
 left join lateral jsonb_array_elements(case when jsonb_typeof(c->'snapshots')='array' then c->'snapshots' else '[]'::jsonb end)s on true
 where (p_client is null and rotevo_finance.allowed(false)) or
 (p_client=p.client_id and exists(select 1 from public.profiles x where x.id=auth.uid() and x.role='client' and x.client_id=p_client))
$$;
revoke all on function rotevo_finance.campaigns(uuid) from public,anon,authenticated;

create or replace function rotevo_finance.snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not rotevo_finance.allowed(false) then raise insufficient_privilege; end if;
 return jsonb_build_object(
 'canWrite',rotevo_finance.allowed(true),
 'clients',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]') from public.clients),
 'projects',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'client_id',client_id,'title',title) order by title),'[]') from public.planning_projects),
 'accounts',(select coalesce(jsonb_agg(to_jsonb(a) order by name),'[]') from rotevo_finance.accounts a),
 'contracts',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('project_ids',(select coalesce(jsonb_agg(project_id),'[]') from rotevo_finance.contract_projects where contract_id=c.id)) order by start_date desc),'[]') from rotevo_finance.contracts c),
 'invoices',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('paid_cents',(select coalesce(sum(amount_cents),0) from rotevo_finance.settlements where invoice_id=i.id and not reversed)) order by due_date),'[]') from rotevo_finance.invoices i),
 'settlements',(select coalesce(jsonb_agg(to_jsonb(s)-'actor_id' order by created_at desc),'[]') from rotevo_finance.settlements s),
 'transfers',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from rotevo_finance.transfers t),
 'audit',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select id,action,created_at from rotevo_finance.audit order by id desc limit 100)a),
 'categories',(select categories from rotevo_finance.settings where id),
 'campaigns',rotevo_finance.campaigns(null));
end $$;
revoke all on function rotevo_finance.snapshot() from public,anon;
grant execute on function rotevo_finance.snapshot() to authenticated;

create or replace function rotevo_finance.client_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cid uuid;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select client_id into cid from public.profiles where id=auth.uid() and role='client';
 if cid is null then raise insufficient_privilege; end if;
 return jsonb_build_object(
 'invoices',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'competence',i.competence,'due_date',i.due_date,'amount_cents',i.amount_cents,'cancelled',i.cancelled,'paid_cents',(select coalesce(sum(amount_cents),0) from rotevo_finance.settlements where invoice_id=i.id and not reversed)) order by i.due_date),'[]') from rotevo_finance.invoices i where i.client_id=cid and i.direction='in' and i.category='Mensalidade'),
 'settlements',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'invoice_id',s.invoice_id,'amount_cents',s.amount_cents,'paid_on',s.paid_on) order by s.paid_on desc),'[]') from rotevo_finance.settlements s join rotevo_finance.invoices i on i.id=s.invoice_id where i.client_id=cid and i.direction='in' and i.category='Mensalidade' and not s.reversed),
 'campaigns',rotevo_finance.campaigns(cid));
end $$;
revoke all on function rotevo_finance.client_snapshot() from public,anon;
grant execute on function rotevo_finance.client_snapshot() to authenticated;

create or replace function rotevo_finance.mutate(p_action text,p_input jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_client uuid; v_project uuid; v_contract rotevo_finance.contracts;
 v_invoice rotevo_finance.invoices; v_settlement rotevo_finance.settlements;
 v_amount bigint; v_paid bigint; v_month date; v_due date; v_item text; v_existing rotevo_finance.audit;
 v_repeat integer; v_offset integer; v_due_month date;
 v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
 if not rotevo_finance.allowed(true) then raise insufficient_privilege; end if;
 if p_request_id is null or p_input is null or jsonb_typeof(p_input)<>'object' then raise invalid_parameter_value; end if;
 if p_action in ('invoice.settle','invoice.cancel','contract.status','contract.update') and (p_input->>'version') is null then raise invalid_parameter_value; end if;
 if p_action in ('invoice.cancel','settlement.reverse') and length(coalesce(p_input->>'reason',''))>500 then raise invalid_parameter_value; end if;
 -- Serialize financial commands, including retries and generation, within one agency.
 perform pg_advisory_xact_lock(2027,1801);
 select * into v_existing from rotevo_finance.audit where request_id=p_request_id;
 if found then
  if v_existing.actor_id<>auth.uid() or v_existing.action<>p_action or v_existing.input<>p_input then
   raise exception using errcode='22023',message='FIN:Identificador de operação já utilizado.';
  end if;
  return jsonb_build_object('ok',true,'replayed',true);
 end if;
 if p_action='account.create' then
  insert into rotevo_finance.accounts(name,opening_cents) values(trim(p_input->>'name'),coalesce((p_input->>'opening_cents')::bigint,0));
 elsif p_action in ('contract.create','contract.update') then
  v_client:=(p_input->>'client_id')::uuid;
  if p_action='contract.update' then
   select * into v_contract from rotevo_finance.contracts where id=(p_input->>'id')::uuid for update;
   if not found or v_contract.version is distinct from (p_input->>'version')::integer or v_contract.status='closed' then raise serialization_failure; end if;
   if v_contract.client_id is distinct from v_client then raise invalid_parameter_value; end if;
   update rotevo_finance.contracts set title=trim(p_input->>'title'),start_date=(p_input->>'start_date')::date,end_date=nullif(p_input->>'end_date','')::date,monthly_cents=(p_input->>'monthly_cents')::bigint,due_day=(p_input->>'due_day')::integer,version=version+1 where id=v_contract.id;
   v_id:=v_contract.id;
   delete from rotevo_finance.contract_projects where contract_id=v_id;
  else
  insert into rotevo_finance.contracts(client_id,title,start_date,end_date,monthly_cents,due_day,status)
  values(v_client,trim(p_input->>'title'),(p_input->>'start_date')::date,nullif(p_input->>'end_date','')::date,(p_input->>'monthly_cents')::bigint,(p_input->>'due_day')::integer,'active') returning id into v_id;
  end if;
  for v_item in select jsonb_array_elements_text(coalesce(p_input->'project_ids','[]')) loop
   v_project:=v_item::uuid;
   if not exists(select 1 from public.planning_projects where id=v_project and client_id=v_client) then
    raise exception using errcode='22023',message='FIN:O projeto não pertence ao cliente do contrato.';
   end if;
   insert into rotevo_finance.contract_projects values(v_id,v_project);
  end loop;
 elsif p_action='contract.status' then
  if p_input->>'status' not in ('active','paused','closed') then raise invalid_parameter_value; end if;
  update rotevo_finance.contracts set status=p_input->>'status',version=version+1 where id=(p_input->>'id')::uuid and version=(p_input->>'version')::integer and status<>'closed';
  if not found then raise serialization_failure; end if;
 elsif p_action='recurrence.generate' then
  if (p_input->>'month') !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise invalid_parameter_value; end if;
  v_month:=((p_input->>'month')||'-01')::date;
  insert into rotevo_finance.invoices(client_id,contract_id,direction,title,counterparty,category,competence,due_date,amount_cents)
  select c.client_id,c.id,'in',c.title,cl.name,'Mensalidade',v_month,
   v_month+(least(c.due_day,extract(day from (v_month+interval '1 month - 1 day'))::integer)-1),c.monthly_cents
  from rotevo_finance.contracts c join public.clients cl on cl.id=c.client_id
  where c.status='active' and c.start_date<v_month+interval '1 month' and (c.end_date is null or c.end_date>=v_month)
  on conflict(contract_id,competence) do nothing;
 elsif p_action='invoice.create' then
  v_client:=nullif(p_input->>'client_id','')::uuid; v_project:=nullif(p_input->>'project_id','')::uuid;
  if v_project is not null and not exists(select 1 from public.planning_projects where id=v_project and client_id=v_client) then
   raise exception using errcode='22023',message='FIN:O projeto não pertence ao cliente informado.';
  end if;
  if (p_input->>'competence') !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise invalid_parameter_value; end if;
  if coalesce(p_input->>'repeat_months','1') !~ '^[0-9]{1,2}$' then raise invalid_parameter_value; end if;
  v_repeat:=coalesce(p_input->>'repeat_months','1')::integer;
  if v_repeat not between 1 and 60 or (v_repeat>1 and p_input->>'direction' is distinct from 'out') then
   raise exception using errcode='22023',message='FIN:Repetição mensal disponível somente para despesas, de 1 a 60 meses.';
  end if;
  v_month:=((p_input->>'competence')||'-01')::date; v_due:=(p_input->>'due_date')::date;
  for v_offset in 0..v_repeat-1 loop
   v_due_month:=(date_trunc('month',v_due)+make_interval(months=>v_offset))::date;
   insert into rotevo_finance.invoices(client_id,project_id,direction,title,counterparty,category,competence,due_date,amount_cents)
   values(v_client,v_project,p_input->>'direction',trim(p_input->>'title'),trim(p_input->>'counterparty'),p_input->>'category',
    (v_month+make_interval(months=>v_offset))::date,
    v_due_month+(least(extract(day from v_due)::integer,extract(day from (v_due_month+interval '1 month - 1 day'))::integer)-1),
    (p_input->>'amount_cents')::bigint);
  end loop;
 elsif p_action in ('invoice.settle','invoice.cancel') then
  select * into v_invoice from rotevo_finance.invoices where id=(p_input->>'id')::uuid for update;
  if not found or v_invoice.version is distinct from (p_input->>'version')::integer or v_invoice.cancelled then raise serialization_failure; end if;
  select coalesce(sum(amount_cents),0) into v_paid from rotevo_finance.settlements where invoice_id=v_invoice.id and not reversed;
  if p_action='invoice.cancel' then
   if length(trim(coalesce(p_input->>'reason','')))<5 or v_paid<>0 then
    raise exception using errcode='22023',message='FIN:Informe o motivo e estorne os recebimentos antes de cancelar.';
   end if;
   update rotevo_finance.invoices set cancelled=true,version=version+1 where id=v_invoice.id;
  else
   v_amount:=(p_input->>'amount_cents')::bigint;
   if v_amount is null or v_amount<=0 or v_amount>v_invoice.amount_cents-v_paid then
    raise exception using errcode='22023',message='FIN:O valor deve ser positivo e não pode superar o saldo.';
   end if;
   if (p_input->>'paid_on')::date>v_today then raise exception using errcode='22023',message='FIN:O pagamento não pode ter data futura.'; end if;
   if not exists(select 1 from rotevo_finance.accounts where id=(p_input->>'account_id')::uuid and active) then raise invalid_parameter_value; end if;
   insert into rotevo_finance.settlements(invoice_id,account_id,amount_cents,paid_on,method,reference,actor_id)
   values(v_invoice.id,(p_input->>'account_id')::uuid,v_amount,(p_input->>'paid_on')::date,p_input->>'method',coalesce(p_input->>'reference',''),auth.uid());
   update rotevo_finance.invoices set version=version+1 where id=v_invoice.id;
  end if;
 elsif p_action='settlement.reverse' then
  if length(trim(coalesce(p_input->>'reason','')))<5 then raise invalid_parameter_value; end if;
  select * into v_settlement from rotevo_finance.settlements where id=(p_input->>'id')::uuid for update;
  if not found or v_settlement.reversed then raise serialization_failure; end if;
  update rotevo_finance.settlements set reversed=true where id=v_settlement.id;
  update rotevo_finance.invoices set version=version+1 where id=v_settlement.invoice_id;
 elsif p_action='transfer.create' then
  if (p_input->>'paid_on')::date>v_today then raise invalid_parameter_value; end if;
  insert into rotevo_finance.transfers(from_account_id,to_account_id,amount_cents,paid_on)
  values((p_input->>'from_account_id')::uuid,(p_input->>'to_account_id')::uuid,(p_input->>'amount_cents')::bigint,(p_input->>'paid_on')::date);
 elsif p_action='settings.save' then
  if jsonb_typeof(p_input->'categories')<>'array' or jsonb_array_length(p_input->'categories') not between 1 and 40 or not (p_input->'categories' ? 'Mensalidade') then raise invalid_parameter_value; end if;
  for v_item in select jsonb_array_elements_text(p_input->'categories') loop
   if length(trim(v_item)) not between 1 and 80 then raise invalid_parameter_value; end if;
  end loop;
  update rotevo_finance.settings set categories=p_input->'categories' where id;
 else raise invalid_parameter_value;
 end if;
 insert into rotevo_finance.audit(request_id,actor_id,action,input) values(p_request_id,auth.uid(),p_action,p_input);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function rotevo_finance.mutate(text,jsonb,uuid) from public,anon;
grant execute on function rotevo_finance.mutate(text,jsonb,uuid) to authenticated;
-- Invoker wrappers expose only the explicitly authenticated functions, never tables.
create or replace function public.rotevo_finance_snapshot() returns jsonb language sql security invoker set search_path='' as $$ select rotevo_finance.snapshot() $$;
create or replace function public.rotevo_client_finance() returns jsonb language sql security invoker set search_path='' as $$ select rotevo_finance.client_snapshot() $$;
create or replace function public.rotevo_finance_mutate(p_action text,p_input jsonb,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select rotevo_finance.mutate(p_action,p_input,p_request_id) $$;
revoke all on function public.rotevo_finance_snapshot(),public.rotevo_client_finance(),public.rotevo_finance_mutate(text,jsonb,uuid) from public,anon;
grant execute on function public.rotevo_finance_snapshot(),public.rotevo_client_finance(),public.rotevo_finance_mutate(text,jsonb,uuid) to authenticated;


notify pgrst, 'reload schema';
