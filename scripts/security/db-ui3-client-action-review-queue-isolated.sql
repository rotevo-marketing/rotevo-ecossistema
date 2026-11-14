-- UI3 pending review queue, synthetic PostgreSQL only.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-submission-isolated.sql
\ir ../../docs/security/sql/ui3-client-action-review-queue-PROPOSAL-ONLY.sql
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
do $team$
declare queue jsonb;
begin
 select public.rotevo_client_action_review_queue('00000000-0000-4000-8000-000000000011') into queue;
 if jsonb_array_length(queue)<>1 or queue->0->>'attemptNumber'<>'1'
 or queue->0->>'driveUrl'<>'https://drive.google.com/file/d/synthetic-test-link/view'
 then raise exception 'Pending review not visible to authorized strategist';end if;
end $team$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
set role authenticated;
do $client$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_client_action_review_queue('00000000-0000-4000-8000-000000000011');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Client accessed internal review queue';end if;
end $client$;
reset role;

update public.team_members set active=true where user_id='00000000-0000-4000-8000-000000000015';
insert into public.team_project_assignments(user_id,project_id) values('00000000-0000-4000-8000-000000000015','00000000-0000-4000-8000-000000000011');
insert into public.team_member_permissions(user_id,permission) values('00000000-0000-4000-8000-000000000015','projects.write');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000015',false);
set role authenticated;
do $tenant$
declare denied boolean:=false;
begin
 begin
 perform public.rotevo_client_action_review_queue('00000000-0000-4000-8000-000000000022');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Strategist without tenant assignment accessed another project';end if;
end $tenant$;
reset role;

-- Revocation must immediately remove the item from team's pending queue.
update public.planning_projects
set data=jsonb_set(data,'{editorialCalendar,0,visibleToClient}','false'::jsonb,false)
where id='00000000-0000-4000-8000-000000000011';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
do $revoked$
declare queue jsonb;
begin
 select public.rotevo_client_action_review_queue('00000000-0000-4000-8000-000000000011') into queue;
 if jsonb_array_length(queue)<>0 then raise exception 'Revoked content remains in pending queue';end if;
end $revoked$;
reset role;
select 'UI3_REVIEW_QUEUE_ISOLATED_PASS' as result;
