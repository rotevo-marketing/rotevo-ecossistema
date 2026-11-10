-- Synthetic Supabase Auth + PostgREST + RLS lab schema; NEVER apply to hosted Rotevo.
CREATE TABLE public.clients(id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE public.profiles(
 id uuid PRIMARY KEY REFERENCES auth.users(id),
 role text NOT NULL CHECK (role IN ('client','staff','strategist')),
 client_id uuid REFERENCES public.clients(id)
);
CREATE TABLE public.planning_projects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id),
 title text NOT NULL, slug text NOT NULL, status text NOT NULL DEFAULT 'draft',
 data jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_profile ON public.profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY tenant_project_read ON public.planning_projects FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.role='client'
 AND p.client_id=planning_projects.client_id));
-- Exercise proposed restriction: browser roles can see project metadata but not private JSON.
REVOKE ALL ON public.planning_projects FROM anon,authenticated,PUBLIC;
GRANT SELECT (id,client_id,title,slug,status) ON public.planning_projects TO authenticated;
REVOKE ALL ON public.profiles FROM anon,authenticated,PUBLIC;
GRANT SELECT (id,role,client_id) ON public.profiles TO authenticated;

-- Explicit privileges for fixture management by the local service role.
GRANT ALL ON public.clients, public.profiles, public.planning_projects TO service_role;
