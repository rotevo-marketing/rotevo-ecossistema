-- Disposable PostgreSQL CI fixture ONLY. Deliberate schema drift: missing updated_at.
-- The proposal must fail its preflight before any permission can be changed.
\set ON_ERROR_STOP on
CREATE TABLE public.planning_projects(
 id uuid PRIMARY KEY, client_id uuid NOT NULL, title text NOT NULL,
 slug text NOT NULL, description text, status text NOT NULL,
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 published_at timestamptz, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;
-- Roles are created in the previous CI job steps, at the PostgreSQL cluster level.
GRANT SELECT, UPDATE ON public.planning_projects TO anon,authenticated,service_role;
SELECT 'PASS: incompatible schema fixture prepared' AS result;
