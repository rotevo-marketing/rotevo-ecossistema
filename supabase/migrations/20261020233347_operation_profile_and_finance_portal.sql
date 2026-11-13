-- Additive private profile preferences and authorized financial metadata. Local validation precedes rollout.
begin;
create table if not exists public.user_preferences(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null default '' check(length(display_name)<=180),avatar_asset_id uuid references public.project_assets(id) on delete set null,updated_at timestamptz not null default now());
alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from anon,authenticated;
grant all on public.user_preferences to service_role;
create table if not exists public.finance_invoice_links(invoice_id uuid primary key references rotevo_finance.invoices(id) on delete restrict,payment_url text not null default '' check(length(payment_url)<=2048),updated_at timestamptz not null default now());
alter table public.finance_invoice_links enable row level security;
revoke all on public.finance_invoice_links from anon,authenticated;
grant all on public.finance_invoice_links to service_role;
create or replace function rotevo_finance.campaigns(p_client uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'projectId',p.id,'projectTitle',p.title,'clientId',p.client_id,'campaignId',c->>'id','title',c->>'title',
 'platform',c->>'platform','month',coalesce(s->>'month',''),'budget',case when jsonb_typeof(c->'budget')='number' then c->'budget' else 'null'::jsonb end,'spent',case when jsonb_typeof(s->'spent')='number' then s->'spent' else 'null'::jsonb end)),'[]'::jsonb)
 from public.planning_projects p
 cross join lateral jsonb_array_elements(case when jsonb_typeof(p.data->'marketingCampaigns')='array' then p.data->'marketingCampaigns' else '[]'::jsonb end)c
 left join lateral jsonb_array_elements(case when jsonb_typeof(c->'snapshots')='array' then c->'snapshots' else '[]'::jsonb end)s on true
 where (p_client is null and rotevo_finance.allowed(false)) or
 (p_client=p.client_id and c->>'visibleToClient'='true' and
 (not (p.data ? 'portalModules') or p.data->'portalModules' ? 'campaigns') and
 not exists(select 1 from public.client_workspaces w where w.client_id=p_client and not (w.data->'modules' ? 'campaigns')) and exists(select 1 from public.profiles x where x.id=auth.uid() and x.role='client' and x.client_id=p_client))
$$;
revoke all on function rotevo_finance.campaigns(uuid) from public,anon,authenticated;


create or replace function rotevo_finance.client_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cid uuid;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select client_id into cid from public.profiles where id=auth.uid() and role='client';
 if cid is null then raise insufficient_privilege; end if;
 if exists(select 1 from public.client_workspaces w where w.client_id=cid and not (w.data->'modules' ? 'finance')) then raise insufficient_privilege;end if;
 return jsonb_build_object(
 'invoices',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'category',i.category,'competence',i.competence,'due_date',i.due_date,'amount_cents',i.amount_cents,'cancelled',i.cancelled,'paid_cents',(select coalesce(sum(amount_cents),0) from rotevo_finance.settlements where invoice_id=i.id and not reversed)) order by i.due_date),'[]') from rotevo_finance.invoices i where i.client_id=cid and i.direction='in'),
 'settlements',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'invoice_id',s.invoice_id,'amount_cents',s.amount_cents,'paid_on',s.paid_on) order by s.paid_on desc),'[]') from rotevo_finance.settlements s join rotevo_finance.invoices i on i.id=s.invoice_id where i.client_id=cid and i.direction='in' and not s.reversed),
 'campaigns',rotevo_finance.campaigns(cid));
end $$;
revoke all on function rotevo_finance.client_snapshot() from public,anon;
grant execute on function rotevo_finance.client_snapshot() to authenticated;
commit;
