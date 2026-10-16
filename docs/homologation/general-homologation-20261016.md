# ROTEVO — Homologação Geral: evidências e limites (16/10/2026)

Ambiente: branch `feature/admin-v2-redesign`. **Não houve alterações no Supabase de produção nem no domínio oficial.**

## Lote 1 — revisão estrutural do legado

- Revisão estática de dependências e remoção de 82 arquivos legados sem importações identificadas.
- Bloqueio em CI para retorno de componentes órfãos e pontos de entrada de demonstrações obsoletas.
- Build, TypeScript, testes de segurança, HTTP e PostgreSQL descartável aprovados na execução [#38944659542](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/38944659542).
- Dados históricos dos clientes não foram modificados.

## Lote 2 — homologação automatizada geral

- Ampliados testes HTTP anônimos para APIs de listagem, consulta, criação, edição, alteração de status, exclusão e apresentação de projetos.
- Os testes só se executam contra Next.js em loopback, com URLs Supabase locais e credenciais artificiais.
- Mantidas as regressões anteriores de documentos Ecossistema 2027, publicação e projeção permitida ao cliente, vínculos/tarefas/agenda, autorização de equipe e PostgreSQL sintético.
- **Limite:** testes HTTP sem JWT comprovam rejeição de requisições anônimas, não a jornada autenticada do usuário.

## Prévia visual

Um novo deployment **preview**, separado da produção, foi solicitado para o commit `a5b23fc5770f42d99ea606131650d0a961a2369c`:
`https://rotevo-ecossistema-ad27rdtcl-rotevo-marketing.vercel.app`.

A preview compartilha configuração pública de autenticação com o Supabase atual. **Usar apenas para inspeção visual e não executar testes que alterem dados reais.**

## Matriz de homologação e evidências

| Frente | Evidência existente | Estado |
|---|---|---|
| Compilação, tipagem | GitHub Actions | Automatizado |
| Controle de APIs sem autenticação | Next.js isolado + tokens ausentes | Automatizado |
| Correção de grants de profiles | PostgreSQL descartável | Automatizado |
| Modelo de equipe e auditoria propostos | PostgreSQL descartável | Automatizado |
| Publicação de documentos 2027 | Testes de contrato e validação de transição | Parcial (sem browser autenticado) |
| Gestão operacional e calendário | Testes de dependência e contratos | Parcial (sem browser autenticado) |
| Navegação e responsividade em browser real | Revisão manual ainda necessária | Pendente |
| Acesso com contas reais separadas | Supabase com equipe ainda não migrada | Bloqueado |
| Ativação de permissões | Migrar e autorizar produção | Bloqueado |
| Deploy em domínio oficial | Aprovação final | Não executado |

## Próximas decisões sem reabrir o desenvolvimento

1. Confirmar o resultado final do pipeline da homologação e da preview atualizada.
2. Executar inspeção visual autenticada da preview com usuário autorizado, sem editar dados reais.
3. Aplicar correções de UI que forem identificadas, em lotes, e repetir CI.
4. Para aprovar a operação completa dos papéis, realizar aplicação autorizada das migrações, garantindo backup, grants de perfil, bootstrap administrativo e rollback.
5. Só então testar autorização real por papel e projeto e aprovar publicação no domínio oficial.

**Conclusão:** testes automatizados não equivalem à homologação de ponta a ponta nem liberam produção. Nenhuma alteração de cliente, conta ou tabela foi realizada.
