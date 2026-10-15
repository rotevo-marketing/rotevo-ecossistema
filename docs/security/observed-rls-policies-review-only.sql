-- ROTEVO — ESPELHO DE POLÍTICAS REAIS: SOMENTE REVISÃO
-- Fonte: pg_policies do Supabase de produção, 2026-10-15.
-- NÃO executar em produção. NÃO instalar localmente antes de aprovar baseline, função e GRANTs.
-- A transcrição abaixo preserva expressões semânticas do catálogo; quebras de linha normalizadas.
-- Pré-requisitos não incluídos: tabelas public, função public.is_strategist(), grants, auth.
-- Todas as políticas originais são PERMISSIVE, com roles {authenticated}.

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

-- Total: 16 políticas, distribuídas em 4 tabelas.
-- Risco: profiles permite UPDATE no próprio registro sem proibição de role/client_id por coluna.
-- Risco: SELECT da linha planning_projects expõe data JSONB completo.
-- Testes devem reproduzir os comportamentos em usuários sintéticos, antes de corrigir localmente.
