-- PROPOSED ONLY. Do not apply before auditing the existing strategist policies.
-- Rotevo team membership and authorization metadata.
create table if not exists public.team_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 job_title text,
 avatar_url text,
 role text not null check (role in ('admin','strategist','project_manager','producer','finance')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.team_project_assignments (
 user_id uuid not null references public.team_members(user_id) on delete cascade,
 project_id uuid not null references public.planning_projects(id) on delete cascade,
 assigned_at timestamptz not null default now(),
 primary key (user_id,project_id)
);
create table if not exists public.team_member_permissions (
 user_id uuid not null references public.team_members(user_id) on delete cascade,
 permission text not null check(permission in ('projects.read','projects.write','tasks.read','tasks.write','editorial.read','editorial.write','meetings.read','finance.read','finance.write','team.manage')),
 granted_at timestamptz not null default now(),
 primary key(user_id,permission)
);
alter table public.team_members enable row level security;
alter table public.team_project_assignments enable row level security;
alter table public.team_member_permissions enable row level security;
revoke all on public.team_members,public.team_project_assignments,public.team_member_permissions from anon;
grant select on public.team_members,public.team_project_assignments,public.team_member_permissions to authenticated;
-- Safe read-only policy: only authenticated strategist accounts already recognized in profiles.
create policy "strategists read team directory" on public.team_members for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='strategist')
);
create policy "strategists read team assignments" on public.team_project_assignments for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='strategist')
);
create policy "strategists read team permissions" on public.team_member_permissions for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='strategist')
);
-- No client-side insert/update/delete policies. Invitations and authorization management
-- will be handled by server-side admin endpoints after migration/RLS review.
