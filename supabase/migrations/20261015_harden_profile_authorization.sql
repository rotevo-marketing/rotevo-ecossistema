-- STAGED SECURITY FIX - DO NOT APPLY BEFORE REVIEWING EXISTING SIGNUP / PROFILE-EDIT FLOWS.
-- Existing RLS allows users to UPDATE their own profiles, potentially including role and client_id.
-- PostgreSQL grants must restrict column writes independently of row policies.
-- Administrative profile changes must use a separately audited server-side flow.
revoke update on table public.profiles from anon, authenticated;
-- Permit changes to benign display information only.
grant update (full_name) on table public.profiles to authenticated;
-- Keep current RLS self-row policy so an authenticated user edits only their own name.
-- Staff role, client_id, email and account identity cannot be updated through client-side API.
-- Before applying, audit any code that writes profiles.email, profiles.updated_at,
-- profiles.role or profiles.client_id from a browser session.
