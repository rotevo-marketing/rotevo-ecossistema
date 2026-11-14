-- UI3 immutable file evidence linkage — PROPOSAL ONLY, disposable database first.
-- Depends on ui3-client-action-submit-PROPOSAL-ONLY.sql and private Storage policies.
-- One upload per submission; do not expose signed URLs or service-role credentials.
create unique index if not exists ui3_submission_unique_private_asset
 on rotevo_workflow.client_action_submissions(private_storage_path)
 where private_storage_path is not null;

create or replace function public.rotevo_client_action_submit_asset(
 p_assignment_id uuid,p_note text,p_request_key text,p_private_storage_path text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_assignment rotevo_workflow.client_action_assignments%rowtype;
 v_result jsonb;
 v_submission_id uuid;
 v_prior rotevo_workflow.client_action_submissions%rowtype;
begin
 if v_actor is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 -- Filename must be a random UUID + approved extension and exactly match the actor.
 if p_private_storage_path is null
  or p_private_storage_path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(pdf|png|jpe?g|webp|mp4|mov)$'
  or split_part(p_private_storage_path,'/',1)<>p_assignment_id::text
  or split_part(p_private_storage_path,'/',2)<>v_actor::text
 then raise exception 'Invalid asset path' using errcode='22023';end if;
 select * into v_assignment from rotevo_workflow.client_action_assignments
  where id=p_assignment_id for update;
 if not found or v_assignment.client_user_id<>v_actor or v_assignment.released_at is null
 then raise exception 'Assignment unavailable' using errcode='42501';end if;
 -- No ref to a fabricated file: the immutable object must already exist.
 if not exists(select 1 from storage.objects where bucket_id='rotevo-client-deliveries'
   and name=p_private_storage_path)
 then raise exception 'Private asset not found' using errcode='40001';end if;
 -- Existing legacy RPC guards project tenant, resource version and current status.
 v_result:=public.rotevo_client_action_submit(p_assignment_id,p_note,p_request_key);
 v_submission_id:=(v_result->>'id')::uuid;
 select * into v_prior from rotevo_workflow.client_action_submissions
 where id=v_submission_id for update;
 if v_prior.private_storage_path is not null
  and v_prior.private_storage_path<>p_private_storage_path
 then raise exception 'Replay may not replace delivery asset' using errcode='23505';end if;
 if v_prior.private_storage_path is null then
  update rotevo_workflow.client_action_submissions
  set private_storage_path=p_private_storage_path where id=v_submission_id;
 end if;
 return v_result || pg_catalog.jsonb_build_object('hasAsset',true);
end;
$fn$;
revoke all on function public.rotevo_client_action_submit_asset(uuid,text,text,text) from public,anon;
grant execute on function public.rotevo_client_action_submit_asset(uuid,text,text,text) to authenticated;
