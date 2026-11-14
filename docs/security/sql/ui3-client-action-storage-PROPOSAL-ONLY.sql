-- UI3 CLIENT ASSIGNMENT STORAGE — PROPOSAL ONLY. NOT APPROVED FOR HOSTED DATABASES.
-- Private authenticated uploads: no signed URLs, no service-role browser paths, no upserts.
-- Storage bucket size/MIME restrictions are defense in depth, not sole authorization.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('rotevo-client-deliveries','rotevo-client-deliveries',false,26214400,
 array['application/pdf','image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
on conflict (id) do nothing;
commit;

create or replace function public.rotevo_client_action_storage_access(p_name text,p_operation text)
returns boolean language plpgsql stable security definer set search_path='' as $fn$
declare
 v_user uuid:=auth.uid();
 v_role text;
 v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_project public.planning_projects%rowtype;
 v_resource jsonb;
 v_match_count integer;
 v_assignment_id uuid;
 v_client_id uuid;
begin
 if v_user is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 or p_operation not in ('upload','download') or p_name is null
 then return false;end if;
 -- Exactly three segments: assignment UUID / assigned user UUID / random file UUID.ext
 if p_name !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(pdf|png|jpe?g|webp|mp4|mov)$'
 then return false;end if;
 begin
  v_assignment_id:=split_part(p_name,'/',1)::uuid;
  v_client_id:=split_part(p_name,'/',2)::uuid;
 exception when invalid_text_representation then return false;end;
 select * into v_assignment
 from rotevo_workflow.client_action_assignments where id=v_assignment_id;
 if not found or v_assignment.client_user_id<>v_client_id
  or v_assignment.released_at is null or v_assignment.status='cancelled'
 then return false;end if;
 select * into v_project from public.planning_projects where id=v_assignment.project_id;
 if not found then return false;end if;
 if not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.client_id=v_project.client_id and cu.user_id=v_assignment.client_user_id
   and p.client_id=v_project.client_id and p.role='client'
 ) then return false;end if;
 select count(*),(jsonb_agg(e.value)->0) into v_match_count,v_resource
 from jsonb_array_elements(
  case when pg_catalog.jsonb_typeof(v_project.data->
    (case when v_assignment.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end))='array'
   then v_project.data->
    (case when v_assignment.resource_type='content' then 'editorialCalendar' else 'executionTimeline' end)
   else '[]'::jsonb end
 ) e(value) where e.value->>'id'=v_assignment.resource_id;
 if v_match_count<>1 or v_resource->>'visibleToClient' is distinct from 'true'
  or coalesce(v_resource->>'archivedAt','')<>'' or coalesce(v_resource->>'deletedAt','')<>''
  or (v_assignment.resource_type='content'
      and coalesce(v_resource->>'version','')<>v_assignment.resource_version)
 then return false;end if;
 if p_operation='upload' then
  return v_user=v_assignment.client_user_id
   and v_assignment.status in ('pending','in_progress','correction_requested');
 end if;
 if v_user=v_assignment.client_user_id then return true;end if;
 select role into v_role from public.profiles where id=v_user;
 return v_role in ('staff','strategist') and exists(
  select 1 from public.team_members m where m.user_id=v_user and m.active
   and (m.role='admin' or (
    exists(select 1 from public.team_project_assignments a
      where a.user_id=v_user and a.project_id=v_assignment.project_id)
    and exists(select 1 from public.team_member_permissions g
      where g.user_id=v_user and g.permission in ('projects.write','editorial.write'))
   ))
 );
end;
$fn$;
revoke all on function public.rotevo_client_action_storage_access(text,text) from public,anon;
grant execute on function public.rotevo_client_action_storage_access(text,text) to authenticated;

-- Unique policy names: never apply over an existing unreviewed Storage policy.
create policy "ui3_client_delivery_upload" on storage.objects
for insert to authenticated
with check(bucket_id='rotevo-client-deliveries' and
 public.rotevo_client_action_storage_access(name,'upload'));
create policy "ui3_client_delivery_download" on storage.objects
for select to authenticated
using(bucket_id='rotevo-client-deliveries' and
 public.rotevo_client_action_storage_access(name,'download'));
-- Do NOT grant UPDATE/DELETE: uploaded evidence is immutable and versioned.
-- Do NOT use createSignedUrl for sensitive files: URL revocation is not immediate.
-- Client must upload with upsert:false using authenticated Supabase JWT.
