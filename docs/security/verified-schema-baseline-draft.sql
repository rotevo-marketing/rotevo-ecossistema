-- ROTEVO | BASELINE ESTRUTURAL PARCIAL, APENAS PARA REVISÃO
-- Fonte: catálogo PostgreSQL do projeto Rotevo consultado somente leitura em 15/10/2026.
-- NÃO EXECUTAR como migration e NÃO aplicar em produção.
-- Deliberadamente salvo em docs/security/, não em supabase/migrations/.
-- Escopo comprovado: 4 tabelas public, tipos, nullability, defaults, PK, FK, UNIQUE, CHECK.
-- FALTAM neste artefato: políticas RLS, GRANTs, função is_strategist,
-- configuração exata de roles/owners/extensões, objetos auth gerenciados pelo Supabase.
-- O schema auth.users é disponibilizado pela instância local inicializada com Supabase CLI.

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

-- REVISÃO OBRIGATÓRIA ANTES DE USAR:
-- 1. Confrontar com dump oficial schema-only, quando houver acesso autorizado.
-- 2. Reconstituir integralmente RLS/policies, GRANTs, is_strategist() e objetos associados.
-- 3. Revisar efeitos das migrations 20261015_* e ordem de aplicação no ambiente local.
-- 4. Verificar diferenças com pg_catalog; não declarar paridade por executar estes CREATE TABLE.
-- 5. Usar dados exclusivamente fictícios para testes, sem credenciais ou dados reais.
