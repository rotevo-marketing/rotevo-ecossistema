# UI3 — Reconciliação de comportamento com a main (10/11/2026)

## Base da comparação

Repositório `rotevo-marketing/rotevo-ecossistema`. A branch UI3 diverge da `main` com seis commits exclusivos no histórico de `main` e mais de mil commits de desenvolvimento UI3. É uma **revisão sem merge automático**: trazer a árvore antiga da main descartaria alterações intencionais de identidade, navegação e portais.

Seis commits exclusivos identificados na `main` (depois do ancestral comum):
- `c85ce07d` — Rotevo V2: nova interface administrativa e apresentação 2027.
- `5dc314f2`, `ef48701c`, `b38862dd` — releases do Portal do Cliente V2 e marca Poppins SemiBold.
- `fdaf6159` — gestão segura de usuários da Equipe no portal existente.
- `f3fc3a90` — publicação da gestão segura de usuários.

## Equivalência funcional preservada na UI3

| Funcionalidade da main | Evidência na UI3 | Decisão |
|---|---|---|
| Administração e visualização de equipe | `src/app/admin/page.tsx` com seção `team` e `TeamDirectory` | UI3 substitui rota legada `/admin/equipe` por aba integrada |
| Convites e gestão de permissões | `TeamInviteForm`, `TeamMemberControls`, `TeamAdminTransferForm`, `TeamMemberProfileEditor` | Preservar e continuar homologação de papel/identidade |
| Endpoints seguros de equipe | Oito rotas principais em `src/app/api/team/` mantidas | Preservar autorização e testes de lifecycle |
| Recuperação de senha | `/esqueci-senha`, `/redefinir-senha`, `PasswordRecoveryLink` e fluxo Supabase Auth | Preservar sem publicar credenciais |
| Identidade de marca | `RotevoLogo.tsx` com Poppins e acessibilidade | UI3 é a referência visual atual |
| Painel Cliente e Estrategista | UI3 visual e responsividade já homologados em laboratório | Não substituir pelos arquivos antigos V2 |

**Prova automatizada de equivalência estática:** `scripts/security/ui3-main-parity.test.mjs`, CI [42809880079](https://github.com/rotevo-marketing/rotevo-ecossistema/actions/runs/42809880079) com **SUCCESS**. A mesma execução mantém TypeScript, build e os testes SQL integrados. Este teste verifica presença e integração dos componentes; o comportamento funcional hospedado não é demonstrado por análise estática.

## Encaminhamento de código

1. Tomar a UI3 como branch de origem do release candidate, sem sobrescrever `main` ou produção.
2. Abrir PR **draft** para `main` a fim de expor conflitos de merge e revisar diffs; nunca habilitar auto-merge.
3. Não marcar divergência de ancestralidade como resolvida por simples `ours merge`/reparent: é preciso revisão de conflitos e regressões antes de atualizar a branch principal.
4. A publicação em Vercel permanece condicionada ao aceite técnico de segurança, backup/restauração e testes do candidato exato.

**Estado:** comportamentos da main cobertos no ambiente de homologação; integração definitiva Git pendente de revisão do PR. Nenhuma alteração feita em `main`.
