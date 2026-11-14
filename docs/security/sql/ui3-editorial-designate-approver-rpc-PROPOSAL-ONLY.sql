-- UI3 designated formal client approver RPC, PROPOSAL ONLY.
-- Modifications restricted to an ACTIVE strategist with G2 workspace admin.
-- Preserves all historical decisions and each revoked designation row.
create or replace function public.rotevo_editorial_designate_approver(
 p_project_id uuid,p_phase text,p_approver_user_id uuid,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_project public.planning_projects%rowtype;
 v_active rotevo_workflow.editorial_designated_approvers%rowtype;
 v_new uuid;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_phase not in ('idea','final') or p_reason is null
 or length(btrim(p_reason)) not between 3 and 500
 then raise exception 'Invalid approver designation' using errcode='22023';end if;
 if not exists(
  select 1 from public.profiles p join public.team_members m on m.user_id=p.id
  where p.id=v_actor and p.role='strategist' and m.active and m.role='admin'
 ) then raise exception 'Only strategist administrator may designate an approver' using errcode='42501';end if;
 select * into v_project from public.planning_projects where id=p_project_id for update;
 if not found then raise exception 'Project unavailable' using errcode='42501';end if;
 if not exists(
  select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id
  where cu.client_id=v_project.client_id and cu.user_id=p_approver_user_id
    and p.role='client' and p.client_id=v_project.client_id
 ) then raise exception 'Approver does not belong to the client account' using errcode='42501';end if;
 select * into v_active from rotevo_workflow.editorial_designated_approvers
  where project_id=p_project_id and phase=p_phase and revoked_at is null for update;
 if found and v_active.approver_user_id=p_approver_user_id then
  return pg_catalog.jsonb_build_object('id',v_active.id,'approverUserId',p_approver_user_id,'replayed',true);
 end if;
 if found then
  update rotevo_workflow.editorial_designated_approvers
  set revoked_at=clock_timestamp(),revocation_reason=btrim(p_reason)
  where id=v_active.id;
 end if;
 insert into rotevo_workflow.editorial_designated_approvers(
  project_id,phase,approver_user_id,designated_by)
 values(p_project_id,p_phase,p_approver_user_id,v_actor)
 returning id into v_new;
 return pg_catalog.jsonb_build_object('id',v_new,'approverUserId',p_approver_user_id,'replayed',false);
end;
$fn$;
revoke all on function public.rotevo_editorial_designate_approver(uuid,text,uuid,text) from public,anon;
grant execute on function public.rotevo_editorial_designate_approver(uuid,text,uuid,text) to authenticated;
