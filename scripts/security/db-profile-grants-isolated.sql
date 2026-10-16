\set ON_ERROR_STOP on
-- Synthetic database only. This file is not a migration and must not target hosted Supabase.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY,
 role text NOT NULL,
 client_id uuid,
 full_name text,
 email text
);
GRANT ALL ON public.profiles TO authenticated, anon;
DO $$
BEGIN
 IF NOT has_column_privilege('authenticated','public.profiles','role','UPDATE') THEN
  RAISE EXCEPTION 'Fixture did not reproduce unrestricted role grant';
 END IF;
END $$;
\i supabase/migrations/20261015_harden_profile_authorization.sql
DO $$
BEGIN
 IF has_table_privilege('authenticated','public.profiles','UPDATE') THEN
  RAISE EXCEPTION 'Authenticated retains broad profile UPDATE';
 END IF;
 IF has_column_privilege('authenticated','public.profiles','role','UPDATE') THEN
  RAISE EXCEPTION 'Authenticated can still change profile role';
 END IF;
 IF has_column_privilege('authenticated','public.profiles','client_id','UPDATE') THEN
  RAISE EXCEPTION 'Authenticated can still change client association';
 END IF;
 IF has_column_privilege('authenticated','public.profiles','email','UPDATE') THEN
  RAISE EXCEPTION 'Authenticated can still change identity email';
 END IF;
 IF has_column_privilege('anon','public.profiles','role','UPDATE') THEN
  RAISE EXCEPTION 'Anonymous role retains privilege to change profile role';
 END IF;
 IF NOT has_column_privilege('authenticated','public.profiles','full_name','UPDATE') THEN
  RAISE EXCEPTION 'Authenticated lost ability to edit harmless full_name';
 END IF;
END $$;
