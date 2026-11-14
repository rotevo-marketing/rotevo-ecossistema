-- ROTEVO UI3: per-account appearance preference, PROPOSAL ONLY.
-- Does NOT activate a dark theme or edit existing production user records.
-- Apply to disposable PostgreSQL first; production requires explicit authorization.
begin;
alter table public.user_preferences
 add column if not exists appearance text not null default 'system'
 constraint user_preferences_appearance_check check (appearance in ('light','dark','system'));
commit;

create or replace function public.rotevo_account_appearance_get()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_user uuid:=auth.uid();v_appearance text;
begin
 if v_user is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 select appearance into v_appearance from public.user_preferences where user_id=v_user;
 return jsonb_build_object('appearance',coalesce(v_appearance,'system'));
end;
$fn$;
revoke all on function public.rotevo_account_appearance_get() from public,anon;
grant execute on function public.rotevo_account_appearance_get() to authenticated;

create or replace function public.rotevo_account_appearance_set(p_appearance text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or coalesce(auth.jwt()->'app_metadata'->>'rotevo_password_reset_required','false')='true'
 then raise exception 'Authentication required' using errcode='42501';end if;
 if p_appearance is null or p_appearance not in ('light','dark','system')
 then raise exception 'Invalid appearance' using errcode='22023';end if;
 -- Preserves display_name and avatar_asset_id of any existing preference.
 insert into public.user_preferences(user_id,appearance,updated_at)
 values(v_user,p_appearance,clock_timestamp())
 on conflict(user_id) do update
 set appearance=excluded.appearance,updated_at=clock_timestamp();
 return jsonb_build_object('appearance',p_appearance);
end;
$fn$;
revoke all on function public.rotevo_account_appearance_set(text) from public,anon;
grant execute on function public.rotevo_account_appearance_set(text) to authenticated;
