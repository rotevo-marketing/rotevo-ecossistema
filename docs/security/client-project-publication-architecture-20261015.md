# ROTEVO — Proposta de leitura publicável de projetos (G2)

**Situação: proposta para revisão, não migrar nem publicar.** Branch `feature/admin-v2-redesign`.

## Evidência reproduzida
A execução isolada `38837752526` passou com um teste que demonstra que o papel `authenticated`, com RLS permitindo leitura de seu projeto, consegue ler inclusive uma chave fictícia `internalNotes` dentro de `planning_projects.data`. A RLS protege linhas, não propriedades específicas do JSONB.

## Consumidores existentes verificados
- `src/app/cliente/page.tsx` faz `select("id,title,slug,description,status,updated_at,data")` diretamente de `planning_projects`. Mesmo que a tela filtre visualmente propriedades, o JSON inteiro chega ao navegador.
- `src/Components/cliente/EditorialCalendar.tsx` utiliza `data.editorialCalendar`.
- `src/Components/cliente/ProjectTimeline.tsx` utiliza `data.executionTimeline` e `data.deliverySchedule`.
- A página de cliente também usa `coverImageUrl`, `onboardingChecklist` e `ecosystem2027`. Deve-se confirmar o subconjunto publicável de cada campo.

## Alternativa recomendada (a implementar e testar isoladamente)
1. **Revogar SELECT direto de clientes no JSON interno.** Como grants do PostgreSQL são por papel de banco (`authenticated`) e não por `profiles.role`, não basta revogar SELECT(data) do papel sem considerar estrategistas; escolher arquitetura de leitura segura após testar as dependências do painel interno.
2. Criar uma camada de publicação explicitamente autorizada: tabelas de projeção do projeto ou endpoints server-side que leem internamente com service role após verificar JWT, perfil e vínculo ao cliente, e retornam **somente** campos permitidos. Evitar copiar o JSON inteiro e depois ocultar no frontend.
3. Para campos de listas (`editorialCalendar`, `executionTimeline`, `onboardingChecklist`), transformar/filtrar cada item por `visibleToClient`, estado de publicação e demais critérios aprovados. Não pressupor que a simples existência de chave em `data` seja autorização de publicação.
4. Cobrir atualização e invalidação da projeção, exclusão de acesso e revogação de permissões, além dos estados `draft`, `published` e `archived`.
5. Criar contrato de resposta com lista positiva, nunca expor chaves adicionais futuras por padrão. Validar via HTTP com cliente A, B, usuário sem vínculo e estrategista, e garantir ausência de sentinela interna em payload, logs e artefatos.
6. Migrar a interface do cliente para a camada segura e testar funcionalidade, layout V2 e ícones Tabler. **Somente então** revogar a leitura direta de `data` e atualizar RLS em migração revisada.

## Critérios de aceitação antes de produção
- Um usuário cliente recebe apenas os dados explicitamente publicados do próprio projeto.
- Chaves internas em `data`, inclusive futuras, nunca aparecem no payload de cliente.
- Estratégistas preservam fluxo de edição necessário e permissões próprias.
- Conta suspensa ou vínculo removido perde acesso ao endpoint de publicação.
- Não há regressões nas telas de calendário, cronograma e onboarding.
- Plano de rollback sem restabelecer exposição acidental e autorização explícita separada para implantação.

## Restrições
Não modificar a tela de cliente ou as policies do banco hospedado até existir a camada segura funcional. Teste atual é de caracterização do risco; seu sucesso **não significa que o vazamento foi corrigido**.
