// Generates a focused, disposable enrollment regression. Never executes SQL or connects to a database.
const fs=require('fs');const P='rtp_notify_data_20261119',W='rtp_notify_work_20261119',A='rtp_notify_auth_20261119';
const source=fs.readFileSync('docs/security/sql/ui3-portal-standardization-structures-PROPOSAL-ONLY.sql','utf8');const start=source.indexOf('create or replace function public.rotevo_provision_client_profile('),end=source.indexOf('create or replace function public.rotevo_workflow_notification_access()');if(start<0||end<start)throw Error('Provisioner definition unavailable');
const map=s=>s.replace(/^begin;\s*$/gmi,'').replace(/^commit;\s*$/gmi,'').replace(/public\./g,P+'.').replace(/rotevo_workflow\./g,W+'.').replace(/auth\./g,A+'.');const provision=map(source.slice(start,end)),repair=map(fs.readFileSync('docs/security/sql/ui3-portal-standardization-associations-PROPOSAL-ONLY.sql','utf8'));const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
let sql=`-- Disposable notification regression; only project tqedxahsqbskninjenfg is authorized for hosted execution.
create schema ${P};create schema ${W};create schema ${A};
create table ${A}.users(id uuid primary key,email text);
create function ${A}.jwt() returns jsonb language sql stable as $$ select coalesce(current_setting('rtp_notify.claims',true),'{}')::jsonb $$;
grant usage on schema ${P},${W},${A} to authenticated,anon,service_role;
create table ${P}.clients(like public.clients including all);create table ${P}.profiles(like public.profiles including all);create table ${P}.client_users(like public.client_users including all);create table ${W}.notification_pilot_users(like rotevo_workflow.notification_pilot_users including all);
alter table ${P}.client_users add foreign key(client_id) references ${P}.clients(id);alter table ${P}.client_users add foreign key(user_id) references ${A}.users(id);
alter table ${P}.profiles add foreign key(id) references ${A}.users(id);
alter table ${P}.clients enable row level security;alter table ${P}.profiles enable row level security;alter table ${P}.client_users enable row level security;alter table ${W}.notification_pilot_users enable row level security;
revoke all on all tables in schema ${P},${W},${A} from public,anon,authenticated;
${provision}
insert into ${P}.clients(id,name,slug,status)values('${id(11)}','Synthetic active','synthetic-active','active'),('${id(12)}','Synthetic paused','synthetic-paused','paused');
`;
for(const n of [1,2,3,4,5,6]){sql+=`insert into ${A}.users values('${id(n)}','client${n}@example.invalid');\n`;if(![4,6].includes(n))sql+=`insert into ${P}.profiles(id,client_id,role,full_name,email)values('${id(n)}','${id(n===5?12:11)}','client','Synthetic ${n}','client${n}@example.invalid');\n`;}
sql+=`insert into ${P}.client_users(client_id,user_id)values('${id(11)}','${id(2)}');insert into ${W}.notification_pilot_users(user_id,enabled)values('${id(1)}',false),('${id(2)}',true);
${repair}\n${repair}
do $check$ begin
 if(select enabled from ${W}.notification_pilot_users where user_id='${id(1)}') is distinct from false then raise exception 'Disabled account reactivated by repair';end if;
 if(select enabled from ${W}.notification_pilot_users where user_id='${id(2)}') is distinct from true then raise exception 'Enabled account changed';end if;
 if(select enabled from ${W}.notification_pilot_users where user_id='${id(3)}') is distinct from true then raise exception 'New eligible client not enrolled';end if;
 if exists(select 1 from ${W}.notification_pilot_users where user_id='${id(5)}') then raise exception 'Paused client enrolled';end if;
 if(select count(*) from ${P}.client_users)<>3 or(select count(*) from ${W}.notification_pilot_users)<>3 then raise exception 'Repair duplicated rows';end if;
end $check$;
select set_config('rtp_notify.claims','{"role":"service_role"}',true);set local role service_role;
select ${P}.rotevo_provision_client_profile('${id(1)}','${id(11)}','Synthetic 1','client1@example.invalid',true);
select ${P}.rotevo_provision_client_profile('${id(4)}','${id(11)}','Synthetic 4','client4@example.invalid',true);
select ${P}.rotevo_provision_client_profile('${id(4)}','${id(11)}','Synthetic 4','client4@example.invalid',true);
select ${P}.rotevo_provision_client_profile('${id(6)}','${id(11)}','Synthetic 6','client6@example.invalid');reset role;
do $check$ begin
 if(select enabled from ${W}.notification_pilot_users where user_id='${id(1)}') is distinct from false then raise exception 'Provisioner reactivated disabled client';end if;
 if(select enabled from ${W}.notification_pilot_users where user_id='${id(4)}') is distinct from true then raise exception 'New future client not enrolled';end if;
 if exists(select 1 from ${W}.notification_pilot_users where user_id='${id(6)}') then raise exception 'Default enrollment must be opt-in';end if;
end $check$;
update ${W}.notification_pilot_users set enabled=false where user_id='${id(4)}';set local role service_role;
select ${P}.rotevo_provision_client_profile('${id(4)}','${id(11)}','Synthetic 4','client4@example.invalid',true);reset role;
do $check$ begin
 if(select enabled from ${W}.notification_pilot_users where user_id='${id(4)}') is distinct from false then raise exception 'Retry undid subsequent revocation';end if;
 if(select count(*) from ${P}.profiles)<>6 or(select count(*) from ${P}.client_users)<>5 then raise exception 'Provisioning duplicate';end if;
end $check$;
drop schema ${W} cascade;drop schema ${P} cascade;drop schema ${A} cascade;
`;
if(/\b(insert into|update|delete from|alter table|drop table|create or replace function)\s+(public|auth|rotevo_workflow)\./i.test(sql))throw Error('Live-schema write detected');fs.writeFileSync('local-notification-preservation-lab.sql',sql);console.log('Generated isolated enrollment regression. No connection made.');
