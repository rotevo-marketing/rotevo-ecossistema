-- UI3 account appearance, disposable PostgreSQL only. No client records used.
\set ON_ERROR_STOP on
\ir db-ui3-client-action-rpc-isolated.sql
create table public.user_preferences (
 user_id uuid primary key,
 display_name text not null default '',
 avatar_asset_id uuid,
 updated_at timestamptz not null default now()
);
insert into public.user_preferences(user_id,display_name,avatar_asset_id) values
('00000000-0000-4000-8000-000000000012','Cliente exemplo','00000000-0000-4000-8000-000000000099');
\ir ../../docs/security/sql/ui3-account-appearance-PROPOSAL-ONLY.sql
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
select set_config('request.jwt.claims','{"app_metadata":{}}',false);
set role authenticated;
do $default$
declare data jsonb;
begin
 select public.rotevo_account_appearance_get() into data;
 if data->>'appearance'<>'system' then raise exception 'Initial default appearance mismatch';end if;
end $default$;
select public.rotevo_account_appearance_set('dark');
select public.rotevo_account_appearance_set('dark');
do $client$
declare data jsonb;
begin
 select public.rotevo_account_appearance_get() into data;
 if data->>'appearance'<>'dark' then raise exception 'Client appearance not stored';end if;
end $client$;
do $bad$
declare denied boolean:=false;
begin
 begin perform public.rotevo_account_appearance_set('auto-black');
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Invalid theme accepted';end if;
end $bad$;
reset role;
do $preserve$
begin
 if (select display_name from public.user_preferences
  where user_id='00000000-0000-4000-8000-000000000012')<>'Cliente exemplo'
 or (select avatar_asset_id from public.user_preferences
  where user_id='00000000-0000-4000-8000-000000000012')
   <>'00000000-0000-4000-8000-000000000099'
 then raise exception 'Changing appearance overwrote profile';end if;
end $preserve$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
set role authenticated;
do $isolation$
declare data jsonb;
begin
 select public.rotevo_account_appearance_get() into data;
 if data->>'appearance'<>'system' then raise exception 'Appearance leaked across users';end if;
end $isolation$;
select public.rotevo_account_appearance_set('light');
reset role;
do $persist$
begin
 if (select appearance from public.user_preferences
  where user_id='00000000-0000-4000-8000-000000000012')<>'dark'
 or (select appearance from public.user_preferences
  where user_id='00000000-0000-4000-8000-000000000013')<>'light'
 then raise exception 'Account appearance not isolated';end if;
 if has_table_privilege('authenticated','public.user_preferences','UPDATE')
 then raise exception 'Authenticated role has direct write permission';end if;
 raise notice 'UI3_APPEARANCE_ACCOUNT_ISOLATED_PASS';
end $persist$;
