begin;
create or replace function rotevo_operations.can_read_editorial(p_project uuid,p_content text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.planning_projects p join public.profiles u on u.id=auth.uid() where p.id=p_project and
 case when u.role='client' then
 p.client_id=u.client_id and
 (not (p.data ? 'portalModules') or (jsonb_typeof(p.data->'portalModules')='array' and p.data->'portalModules' ? 'content')) and
 not exists(select 1 from public.client_workspaces w where w.client_id=u.client_id and not coalesce(jsonb_typeof(w.data->'modules')='array' and w.data->'modules' ? 'content',false)) and
 exists(select 1 from jsonb_array_elements(case when jsonb_typeof(p.data->'editorialCalendar')='array' then p.data->'editorialCalendar' else '[]'::jsonb end)c where c->>'id'=p_content and c->>'visibleToClient'='true')
 else rotevo_operations.can_read_project(p_project) end);
$$;
revoke all on function rotevo_operations.can_read_editorial(uuid,text) from public,anon;
grant execute on function rotevo_operations.can_read_editorial(uuid,text) to authenticated;
drop policy if exists "read authorized immutable decisions" on public.editorial_approvals;
drop policy if exists editorial_approvals_authorized_read on public.editorial_approvals;
create policy editorial_approvals_authorized_read on public.editorial_approvals for select to authenticated using(rotevo_operations.can_read_editorial(project_id,content_id));
commit;
