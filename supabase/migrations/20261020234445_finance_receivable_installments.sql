-- Each incoming installment has the explicitly entered per-installment value. No payment is generated.
begin;
create or replace function rotevo_finance.mutate(p_action text,p_input jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_client uuid; v_project uuid; v_contract rotevo_finance.contracts;
 v_invoice rotevo_finance.invoices; v_settlement rotevo_finance.settlements;
 v_amount bigint; v_paid bigint; v_month date; v_due date; v_item text; v_existing rotevo_finance.audit;
 v_repeat integer; v_offset integer; v_due_month date;
 v_supplier rotevo_finance.suppliers; v_subscription rotevo_finance.subscriptions;
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
 if p_action='supplier.save' then
  if nullif(p_input->>'id','') is null then
   insert into rotevo_finance.suppliers(name,document,email,phone,notes) values(trim(p_input->>'name'),trim(coalesce(p_input->>'document','')),trim(coalesce(p_input->>'email','')),trim(coalesce(p_input->>'phone','')),trim(coalesce(p_input->>'notes','')));
  else
   update rotevo_finance.suppliers set name=trim(p_input->>'name'),document=trim(coalesce(p_input->>'document','')),email=trim(coalesce(p_input->>'email','')),phone=trim(coalesce(p_input->>'phone','')),notes=trim(coalesce(p_input->>'notes','')),version=version+1 where id=(p_input->>'id')::uuid and version=(p_input->>'version')::integer;
   if not found then raise serialization_failure; end if;
  end if;
 elsif p_action='supplier.status' then
  if jsonb_typeof(p_input->'active') is distinct from 'boolean' then raise invalid_parameter_value; end if;
  if not (p_input->>'active')::boolean and exists(select 1 from rotevo_finance.subscriptions where supplier_id=(p_input->>'id')::uuid and status='active') then raise exception using errcode='22023',message='FIN:Pause ou encerre as assinaturas ativas antes de arquivar o fornecedor.'; end if;
  update rotevo_finance.suppliers set active=(p_input->>'active')::boolean,version=version+1 where id=(p_input->>'id')::uuid and version=(p_input->>'version')::integer;
  if not found then raise serialization_failure; end if;
 elsif p_action='subscription.save' then
  if not exists(select 1 from rotevo_finance.suppliers where id=(p_input->>'supplier_id')::uuid and active) then raise invalid_parameter_value; end if;
  if not exists(select 1 from rotevo_finance.settings where id and categories ? (p_input->>'category')) then raise invalid_parameter_value; end if;
  if nullif(p_input->>'id','') is null then
   insert into rotevo_finance.subscriptions(supplier_id,title,category,amount_cents,start_date,end_date,due_day) values((p_input->>'supplier_id')::uuid,trim(p_input->>'title'),p_input->>'category',(p_input->>'amount_cents')::bigint,(p_input->>'start_date')::date,nullif(p_input->>'end_date','')::date,(p_input->>'due_day')::integer);
  else
   update rotevo_finance.subscriptions set title=trim(p_input->>'title'),category=p_input->>'category',amount_cents=(p_input->>'amount_cents')::bigint,start_date=(p_input->>'start_date')::date,end_date=nullif(p_input->>'end_date','')::date,due_day=(p_input->>'due_day')::integer,version=version+1 where id=(p_input->>'id')::uuid and version=(p_input->>'version')::integer and status<>'closed' and supplier_id=(p_input->>'supplier_id')::uuid;
   if not found then raise serialization_failure; end if;
  end if;
 elsif p_action='subscription.status' then
  if p_input->>'status' is null or p_input->>'status' not in ('active','paused','closed') then raise invalid_parameter_value; end if;
  if p_input->>'status'='active' and not exists(select 1 from rotevo_finance.subscriptions x join rotevo_finance.suppliers s on s.id=x.supplier_id where x.id=(p_input->>'id')::uuid and s.active) then raise invalid_parameter_value; end if;
  update rotevo_finance.subscriptions set status=p_input->>'status',version=version+1 where id=(p_input->>'id')::uuid and version=(p_input->>'version')::integer and status<>'closed';
  if not found then raise serialization_failure; end if;
 elsif p_action='subscription.generate' then
  if p_input->>'month' is null or (p_input->>'month') !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise invalid_parameter_value; end if;
  v_month:=((p_input->>'month')||'-01')::date;
  insert into rotevo_finance.invoices(supplier_id,subscription_id,direction,title,counterparty,category,competence,due_date,amount_cents)
  select s.id,x.id,'out',x.title,s.name,x.category,v_month,v_month+(least(x.due_day,extract(day from (v_month+interval '1 month - 1 day'))::integer)-1),x.amount_cents
  from rotevo_finance.subscriptions x join rotevo_finance.suppliers s on s.id=x.supplier_id
  where x.status='active' and s.active and x.start_date<v_month+interval '1 month' and (x.end_date is null or x.end_date>=v_month)
  on conflict(subscription_id,competence) do nothing;
 elsif p_action='invoice.update' then
  select * into v_invoice from rotevo_finance.invoices where id=(p_input->>'id')::uuid for update;
  if not found or v_invoice.version is distinct from (p_input->>'version')::integer then raise serialization_failure; end if;
  if v_invoice.cancelled or exists(select 1 from rotevo_finance.settlements where invoice_id=v_invoice.id and not reversed) then raise exception using errcode='22023',message='FIN:Somente lançamentos em aberto, sem pagamentos, podem ser editados.'; end if;
  if not exists(select 1 from rotevo_finance.settings where id and categories ? (p_input->>'category')) then raise invalid_parameter_value; end if;
  update rotevo_finance.invoices set title=trim(p_input->>'title'),counterparty=trim(p_input->>'counterparty'),category=p_input->>'category',amount_cents=(p_input->>'amount_cents')::bigint,due_date=(p_input->>'due_date')::date,document_reference=coalesce(p_input->>'document_reference',''),notes=coalesce(p_input->>'notes',''),version=version+1 where id=v_invoice.id;
 elsif p_action='account.update' then
  if jsonb_typeof(p_input->'active') is distinct from 'boolean' then raise invalid_parameter_value; end if;
  update rotevo_finance.accounts set name=trim(p_input->>'name'),active=(p_input->>'active')::boolean where id=(p_input->>'id')::uuid;
  if not found then raise invalid_parameter_value; end if;
 elsif p_action='account.create' then
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
  if v_repeat not between 1 and 60 then
   raise exception using errcode='22023',message='FIN:Informe de 1 a 60 parcelas ou competências.';
  end if;
  v_month:=((p_input->>'competence')||'-01')::date; v_due:=(p_input->>'due_date')::date;
  for v_offset in 0..v_repeat-1 loop
   v_due_month:=(date_trunc('month',v_due)+make_interval(months=>v_offset))::date;
   insert into rotevo_finance.invoices(client_id,project_id,direction,title,counterparty,category,competence,due_date,amount_cents)
   values(v_client,v_project,p_input->>'direction',trim(p_input->>'title')||case when v_repeat>1 and p_input->>'direction'='in' then ' — parcela '||(v_offset+1)::text||'/'||v_repeat::text else '' end,trim(p_input->>'counterparty'),p_input->>'category',
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


commit;
