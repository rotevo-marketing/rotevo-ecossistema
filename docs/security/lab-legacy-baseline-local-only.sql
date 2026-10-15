-- ROTEVO — LABORATÓRIO LOCAL SOMENTE. NÃO EXECUTAR EM PRODUÇÃO.
-- ESPELHO LEGADO PARA TESTES NEGATIVOS, NÃO CONFIGURAÇÃO SEGURA RECOMENDADA.
-- NÃO colocar em supabase/migrations do aplicativo. Aplicar apenas em banco local
-- vazio e isolado, após revisar dependências. Não inclui dados de usuários.
-- Não executar com CLI vinculada a projeto remoto.
-- Não executado nem validado no banco até este commit.
BEGIN;
create table public.clients (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  contact_name text,
  contact_email text,
  whatsapp text,
  status text not null default 'active'::text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_pkey primary key (id),
  constraint clients_slug_key unique (slug),
  constraint clients_status_check check (status = any (array['active'::text,'paused'::text,'archived'::text]))
);

create table public.profiles (
  id uuid not null,
  full_name text,
  email text,
  role text not null default 'client'::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid,
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_role_check check (role = any (array['strategist'::text,'client'::text])),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_client_id_fkey foreign key (client_id) references public.clients(id)
);

create table public.client_users (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint client_users_pkey primary key (id),
  constraint client_users_client_id_user_id_key unique (client_id,user_id),
  constraint client_users_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint client_users_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

create table public.planning_projects (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  title text not null,
  slug text not null,
  description text,
  status text not null default 'draft'::text,
  data jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planning_projects_pkey primary key (id),
  constraint planning_projects_client_id_slug_key unique (client_id,slug),
  constraint planning_projects_status_check check (status = any (array['draft'::text,'in_progress'::text,'published'::text,'archived'::text])),
  constraint planning_projects_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade
);

-- Função observada via pg_get_functiondef. No laboratório conferir owner e search_path.
CREATE OR REPLACE FUNCTION public.is_strategist()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'strategist');
$function$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;

-- Reproduz GRANTs amplos OBSERVADOS, apenas para provar o comportamento inseguro
-- do legado com usuários FICTÍCIOS. Jamais promover estas permissões à produção.
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.clients,public.profiles,public.client_users,public.planning_projects
  TO anon,authenticated,service_role;

CREATE POLICY "Client users can read their own link" ON public.client_users
AS PERMISSIVE FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Strategists can manage client users" ON public.client_users
AS PERMISSIVE FOR ALL TO authenticated
USING is_strategist()
WITH CHECK is_strategist();

CREATE POLICY "Client users can read their client" ON public.clients
AS PERMISSIVE FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1 FROM client_users WHERE ((client_users.client_id = clients.id) AND (client_users.user_id = auth.uid()))));

CREATE POLICY "Strategists can manage clients" ON public.clients
AS PERMISSIVE FOR ALL TO authenticated
USING is_strategist()
WITH CHECK is_strategist();

CREATE POLICY "Strategists can read clients" ON public.clients
AS PERMISSIVE FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'strategist'::text))));

CREATE POLICY "clients_read_own" ON public.clients
AS PERMISSIVE FOR SELECT TO authenticated
USING (id = ( SELECT profiles.client_id FROM profiles WHERE (profiles.id = auth.uid())));

CREATE POLICY "strategists_read_all_clients" ON public.clients
AS PERMISSIVE FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'strategist'::text))));

CREATE POLICY "Client users can read their planning projects" ON public.planning_projects
AS PERMISSIVE FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1 FROM client_users WHERE ((client_users.client_id = planning_projects.client_id) AND (client_users.user_id = auth.uid()))));

CREATE POLICY "Strategists can delete planning projects" ON public.planning_projects
AS PERMISSIVE FOR DELETE TO authenticated
USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'strategist'::text))));

CREATE POLICY "Strategists can manage planning projects" ON public.planning_projects
AS PERMISSIVE FOR ALL TO authenticated
USING is_strategist()
WITH CHECK is_strategist();

CREATE POLICY "Strategists can read planning projects" ON public.planning_projects
AS PERMISSIVE FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'strategist'::text))));

CREATE POLICY "Strategists can update planning projects" ON public.planning_projects
AS PERMISSIVE FOR UPDATE TO authenticated
USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'strategist'::text))))
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'strategist'::text))));

CREATE POLICY "clients_read_own_projects" ON public.planning_projects
AS PERMISSIVE FOR SELECT TO authenticated
USING (client_id = ( SELECT profiles.client_id FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'client'::text))));

CREATE POLICY "Strategists can manage profiles" ON public.profiles
AS PERMISSIVE FOR ALL TO authenticated
USING is_strategist()
WITH CHECK is_strategist();

CREATE POLICY "Users can read own profile" ON public.profiles
AS PERMISSIVE FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
AS PERMISSIVE FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
COMMIT;
