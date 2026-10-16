-- Proposal for controlled rollout only. Never apply without verified database recovery.
-- The existing strategist role must not be granted to a restricted employee.
-- A separate profile role prevents accidental inheritance of legacy strategist policies.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('strategist','client','staff'));
-- Existing profiles are preserved. New staff identities must use role='staff'
-- and must never be allowed to update role or client_id from the browser.
revoke update on public.profiles from anon,authenticated;
grant update(full_name) on public.profiles to authenticated;
-- Exposed SECURITY DEFINER function is not intended as an anonymous RPC.
revoke execute on function public.is_strategist() from public,anon;
-- Authenticated is required to evaluate the existing RLS policies using this function.
grant execute on function public.is_strategist() to authenticated;
