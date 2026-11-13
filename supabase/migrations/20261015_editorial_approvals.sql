-- Editorial decisions are immutable and stored separately from planning_projects.data.
-- Review existing RLS on planning_projects before enabling client-facing content.
create table if not exists public.editorial_approvals (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.planning_projects(id) on delete cascade,
 content_id text not null,
 content_version text not null,
 decision text not null check (decision in ('approved','changes_requested')),
 comment text,
 decided_by uuid not null references auth.users(id),
 decided_at timestamptz not null default now(),
 constraint editorial_decision_version_unique unique(project_id,content_id,content_version),
 constraint editorial_changes_need_comment check(decision <> 'changes_requested' or length(btrim(coalesce(comment,''))) >= 3)
);
create index if not exists editorial_approvals_project_idx on public.editorial_approvals(project_id);
alter table public.editorial_approvals enable row level security;
revoke all on public.editorial_approvals from anon;
grant select, insert on public.editorial_approvals to authenticated;
-- Strategists can review decisions for all projects. Client sees decisions for its own client_id.
create policy "editorial decisions readable by assigned parties" on public.editorial_approvals
 for select to authenticated using (
  exists (select 1 from public.profiles u join public.planning_projects p on p.id=editorial_approvals.project_id
   where u.id=(select auth.uid()) and
   (u.role='strategist' or (u.role='client' and u.client_id=p.client_id)))
 );
-- Client may insert only for its own visible material in the currently awaiting-client state.
-- No policy for UPDATE or DELETE: decisions remain immutable.
create policy "clients approve only own visible requested content" on public.editorial_approvals
 for insert to authenticated with check (
  decided_by=(select auth.uid()) and
  exists (
   select 1 from public.profiles u
   join public.planning_projects p on p.client_id=u.client_id
   cross join lateral jsonb_array_elements(
     case when jsonb_typeof(p.data::jsonb->'editorialCalendar')='array'
     then p.data::jsonb->'editorialCalendar' else '[]'::jsonb end
   ) content
   where u.id=(select auth.uid()) and u.role='client' and p.id=editorial_approvals.project_id
    and content->>'id'=editorial_approvals.content_id
    and coalesce(content->>'version','')=editorial_approvals.content_version
    and content->>'status'='awaiting_client'
    and content->>'visibleToClient'='true'
  )
 );
