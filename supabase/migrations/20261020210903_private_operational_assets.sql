begin;
create table if not exists public.project_assets(
 id uuid primary key default gen_random_uuid(),
 client_id uuid references public.clients(id) on delete restrict,
 project_id uuid references public.planning_projects(id) on delete restrict,
 invoice_id uuid references rotevo_finance.invoices(id) on delete restrict,
 owner_user_id uuid not null references auth.users(id) on delete restrict,
 purpose text not null check(purpose in ('planning','contract','invoice','receipt','avatar')),
 storage_path text not null unique,
 original_name text not null check(length(original_name) between 1 and 180),
 mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp','application/pdf')),
 size_bytes integer not null check(size_bytes between 1 and 10485760),
 visible_to_client boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 check(purpose='avatar' or client_id is not null),
 check(purpose<>'planning' or project_id is not null),
 check(purpose not in ('invoice','receipt') or invoice_id is not null)
);
create index if not exists project_assets_client_idx on public.project_assets(client_id);
create index if not exists project_assets_project_idx on public.project_assets(project_id);
create index if not exists project_assets_invoice_idx on public.project_assets(invoice_id);
alter table public.project_assets enable row level security;
revoke all on public.project_assets from public,anon,authenticated;
grant all on public.project_assets to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('rotevo-private','rotevo-private',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf']) on conflict(id) do nothing;
do $$ begin if exists(select 1 from storage.buckets where id='rotevo-private' and public) then raise exception 'Private assets bucket must never be public';end if;end;$$;
-- Existing legacy permissive policies must not expose the new private bucket.
drop policy if exists "private operational assets server only" on storage.objects;
create policy "private operational assets server only" on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'rotevo-private') with check(bucket_id<>'rotevo-private');
notify pgrst,'reload schema';
commit;
