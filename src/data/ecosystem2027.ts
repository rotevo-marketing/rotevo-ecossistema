// Snapshot of the Notion “Matriz | Ecossistema 2027” and “Docs | Ecossistema 2027”.
// Reference catalog only: does NOT replace the legacy src/data/modules.ts identifiers.
// “application” describes the methodology; it does not mandate presentation visibility.
// Collected 2026-10-13. Review against Notion before future synchronization.
export type EcosystemTask = {
  code: string;
  area: string;
  title: string;
  application: "Obrigatória" | "Condicional";
  documentTemplate: string | null;
};

export const ecosystemTasks: EcosystemTask[] = [
  {
    "code": "00.01",
    "area": "00 Painel Executivo",
    "title": "Definir objetivo do ciclo",
    "application": "Obrigatória",
    "documentTemplate": "00.01 — Definir objetivo do ciclo | MODELO"
  },
  {
    "code": "00.02",
    "area": "00 Painel Executivo",
    "title": "Consolidar estado atual do crescimento",
    "application": "Obrigatória",
    "documentTemplate": "00.02 — Consolidar estado atual do crescimento | MODELO"
  },
  {
    "code": "00.03",
    "area": "00 Painel Executivo",
    "title": "Definir prioridades executivas do ciclo",
    "application": "Obrigatória",
    "documentTemplate": "00.03 — Definir prioridades executivas do ciclo | MODELO"
  },
  {
    "code": "00.04",
    "area": "00 Painel Executivo",
    "title": "Consolidar campanhas ativas",
    "application": "Condicional",
    "documentTemplate": "00.04 — Consolidar campanhas ativas | MODELO"
  },
  {
    "code": "00.05",
    "area": "00 Painel Executivo",
    "title": "Consolidar progresso do plano de 90 dias",
    "application": "Obrigatória",
    "documentTemplate": "00.05 — Consolidar progresso do plano de 90 dias | MODELO"
  },
  {
    "code": "00.06",
    "area": "00 Painel Executivo",
    "title": "Configurar alertas executivos",
    "application": "Condicional",
    "documentTemplate": "00.06 — Configurar alertas executivos | MODELO"
  },
  {
    "code": "00.07",
    "area": "00 Painel Executivo",
    "title": "Registrar decisões recentes",
    "application": "Obrigatória",
    "documentTemplate": "00.07 — Registrar decisões recentes | MODELO"
  },
  {
    "code": "01.01",
    "area": "01 Negócio e Diagnóstico",
    "title": "Realizar diagnóstico inicial do projeto",
    "application": "Obrigatória",
    "documentTemplate": "01.01: Diagnóstico Inicial do Projeto"
  },
  {
    "code": "01.02",
    "area": "01 Negócio e Diagnóstico",
    "title": "Mapear perfil da empresa",
    "application": "Obrigatória",
    "documentTemplate": "01.02: Mapear perfil da empresa"
  },
  {
    "code": "01.03",
    "area": "01 Negócio e Diagnóstico",
    "title": "Mapear modelo de negócio",
    "application": "Obrigatória",
    "documentTemplate": "01.03: Mapear modelo de negócio"
  },
  {
    "code": "01.04",
    "area": "01 Negócio e Diagnóstico",
    "title": "Analisar histórico de crescimento",
    "application": "Obrigatória",
    "documentTemplate": "01.04: Analisar histórico de crescimento"
  },
  {
    "code": "01.05",
    "area": "01 Negócio e Diagnóstico",
    "title": "Analisar histórico de marketing e vendas",
    "application": "Obrigatória",
    "documentTemplate": "01.05: Analisar histórico de marketing e vendas"
  },
  {
    "code": "01.06",
    "area": "01 Negócio e Diagnóstico",
    "title": "Mapear recursos e capacidade",
    "application": "Obrigatória",
    "documentTemplate": "01.06: Mapear recursos e capacidade"
  },
  {
    "code": "01.07",
    "area": "01 Negócio e Diagnóstico",
    "title": "Avaliar maturidade do negócio",
    "application": "Obrigatória",
    "documentTemplate": "01.07: Avaliar maturidade do negócio"
  },
  {
    "code": "01.08",
    "area": "01 Negócio e Diagnóstico",
    "title": "Diagnosticar sintomas e causas",
    "application": "Obrigatória",
    "documentTemplate": "01.08: Diagnosticar sintomas e causas"
  },
  {
    "code": "01.09",
    "area": "01 Negócio e Diagnóstico",
    "title": "Definir objetivos do projeto",
    "application": "Obrigatória",
    "documentTemplate": "01.09: Definir objetivos do projeto"
  },
  {
    "code": "01.10",
    "area": "01 Negócio e Diagnóstico",
    "title": "Definir prioridades iniciais, riscos e dependências",
    "application": "Obrigatória",
    "documentTemplate": "01.10: Definir prioridades iniciais, riscos e dependências"
  },
  {
    "code": "02.01",
    "area": "02 Produto e Oferta",
    "title": "Mapear portfólio atual",
    "application": "Obrigatória",
    "documentTemplate": "02.01 — Mapear portfólio atual | MODELO"
  },
  {
    "code": "02.02",
    "area": "02 Produto e Oferta",
    "title": "Estruturar arquitetura de ofertas",
    "application": "Obrigatória",
    "documentTemplate": "02.02 — Estruturar arquitetura de ofertas | MODELO"
  },
  {
    "code": "02.03",
    "area": "02 Produto e Oferta",
    "title": "Definir papel estratégico de cada oferta",
    "application": "Obrigatória",
    "documentTemplate": "02.03 — Definir papel estratégico de cada oferta | MODELO"
  },
  {
    "code": "02.04",
    "area": "02 Produto e Oferta",
    "title": "Construir proposta de valor",
    "application": "Obrigatória",
    "documentTemplate": "02.04 — Construir proposta de valor | MODELO"
  },
  {
    "code": "02.05",
    "area": "02 Produto e Oferta",
    "title": "Analisar pricing",
    "application": "Obrigatória",
    "documentTemplate": "02.05 — Analisar pricing | MODELO"
  },
  {
    "code": "02.06",
    "area": "02 Produto e Oferta",
    "title": "Analisar unit economics",
    "application": "Condicional",
    "documentTemplate": "02.06 — Analisar unit economics | MODELO"
  },
  {
    "code": "02.07",
    "area": "02 Produto e Oferta",
    "title": "Avaliar capacidade de entrega",
    "application": "Obrigatória",
    "documentTemplate": "02.07 — Avaliar capacidade de entrega | MODELO"
  },
  {
    "code": "03.01",
    "area": "03 Mercado e Demanda",
    "title": "Analisar mercado",
    "application": "Obrigatória",
    "documentTemplate": "03.01 — Analisar mercado | MODELO"
  },
  {
    "code": "03.02",
    "area": "03 Mercado e Demanda",
    "title": "Analisar demanda",
    "application": "Obrigatória",
    "documentTemplate": "03.02 — Analisar demanda | MODELO"
  },
  {
    "code": "03.03",
    "area": "03 Mercado e Demanda",
    "title": "Analisar macroambiente",
    "application": "Condicional",
    "documentTemplate": "03.03 — Analisar macroambiente | MODELO"
  },
  {
    "code": "03.04",
    "area": "03 Mercado e Demanda",
    "title": "Mapear microambiente",
    "application": "Obrigatória",
    "documentTemplate": "03.04 — Mapear microambiente | MODELO"
  },
  {
    "code": "03.05",
    "area": "03 Mercado e Demanda",
    "title": "Mapear concorrentes, substitutos e referências",
    "application": "Obrigatória",
    "documentTemplate": "03.05 — Mapear concorrentes, substitutos e referências | MODELO"
  },
  {
    "code": "03.06",
    "area": "03 Mercado e Demanda",
    "title": "Analisar concorrência",
    "application": "Obrigatória",
    "documentTemplate": "03.06 — Analisar concorrência | MODELO"
  },
  {
    "code": "03.07",
    "area": "03 Mercado e Demanda",
    "title": "Construir benchmarking e mapa competitivo",
    "application": "Condicional",
    "documentTemplate": "03.07 — Construir benchmarking e mapa competitivo | MODELO"
  },
  {
    "code": "03.08",
    "area": "03 Mercado e Demanda",
    "title": "Identificar diferenciação e whitespace",
    "application": "Obrigatória",
    "documentTemplate": "03.08 — Identificar diferenciação e whitespace | MODELO"
  },
  {
    "code": "04.01",
    "area": "04 Público e Jornada",
    "title": "Definir segmentos de mercado",
    "application": "Obrigatória",
    "documentTemplate": "04.01 — Definir segmentos de mercado | MODELO"
  },
  {
    "code": "04.02",
    "area": "04 Público e Jornada",
    "title": "Definir ICP",
    "application": "Obrigatória",
    "documentTemplate": "04.02 — Definir ICP | MODELO"
  },
  {
    "code": "04.03",
    "area": "04 Público e Jornada",
    "title": "Construir perfil de cliente",
    "application": "Obrigatória",
    "documentTemplate": "04.03 — Construir perfil de cliente | MODELO"
  },
  {
    "code": "04.04",
    "area": "04 Público e Jornada",
    "title": "Avaliar valor econômico dos segmentos",
    "application": "Condicional",
    "documentTemplate": "04.04 — Avaliar valor econômico dos segmentos | MODELO"
  },
  {
    "code": "04.05",
    "area": "04 Público e Jornada",
    "title": "Mapear jornada real de compra",
    "application": "Obrigatória",
    "documentTemplate": "04.05 — Mapear jornada real de compra | MODELO"
  },
  {
    "code": "04.06",
    "area": "04 Público e Jornada",
    "title": "Mapear jornada pós-compra",
    "application": "Condicional",
    "documentTemplate": "04.06 — Mapear jornada pós-compra | MODELO"
  },
  {
    "code": "04.07",
    "area": "04 Público e Jornada",
    "title": "Definir mensagens, provas e CTAs por jornada",
    "application": "Obrigatória",
    "documentTemplate": "04.07 — Definir mensagens, provas e CTAs por jornada | MODELO"
  },
  {
    "code": "05.01",
    "area": "05 Branding",
    "title": "Definir fundamentos de marca",
    "application": "Condicional",
    "documentTemplate": "05.01 — Definir fundamentos de marca | MODELO"
  },
  {
    "code": "05.02",
    "area": "05 Branding",
    "title": "Definir posicionamento",
    "application": "Obrigatória",
    "documentTemplate": "05.02 — Definir posicionamento | MODELO"
  },
  {
    "code": "05.03",
    "area": "05 Branding",
    "title": "Definir arquitetura de marca",
    "application": "Condicional",
    "documentTemplate": "05.03 — Definir arquitetura de marca | MODELO"
  },
  {
    "code": "05.04",
    "area": "05 Branding",
    "title": "Definir personalidade e arquétipos",
    "application": "Condicional",
    "documentTemplate": "05.04 — Definir personalidade e arquétipos | MODELO"
  },
  {
    "code": "05.05",
    "area": "05 Branding",
    "title": "Definir identidade verbal",
    "application": "Obrigatória",
    "documentTemplate": "05.05 — Definir identidade verbal | MODELO"
  },
  {
    "code": "05.06",
    "area": "05 Branding",
    "title": "Definir identidade visual estratégica",
    "application": "Condicional",
    "documentTemplate": "05.06 — Definir identidade visual estratégica | MODELO"
  },
  {
    "code": "05.07",
    "area": "05 Branding",
    "title": "Construir biblioteca de mensagens",
    "application": "Obrigatória",
    "documentTemplate": "05.07 — Construir biblioteca de mensagens | MODELO"
  },
  {
    "code": "05.08",
    "area": "05 Branding",
    "title": "Organizar provas e autoridade",
    "application": "Obrigatória",
    "documentTemplate": "05.08 — Organizar provas e autoridade | MODELO"
  },
  {
    "code": "06.01",
    "area": "06 Marketing e Canais",
    "title": "Inventariar canais atuais",
    "application": "Obrigatória",
    "documentTemplate": "06.01 — Inventariar canais atuais | MODELO"
  },
  {
    "code": "06.02",
    "area": "06 Marketing e Canais",
    "title": "Avaliar canais potenciais",
    "application": "Obrigatória",
    "documentTemplate": "06.02 — Avaliar canais potenciais | MODELO"
  },
  {
    "code": "06.03",
    "area": "06 Marketing e Canais",
    "title": "Classificar canais por prioridade",
    "application": "Obrigatória",
    "documentTemplate": "06.03 — Classificar canais por prioridade | MODELO"
  },
  {
    "code": "06.04",
    "area": "06 Marketing e Canais",
    "title": "Definir função estratégica por canal",
    "application": "Obrigatória",
    "documentTemplate": "06.04 — Definir função estratégica por canal | MODELO"
  },
  {
    "code": "06.05",
    "area": "06 Marketing e Canais",
    "title": "Definir operação e investimento por canal",
    "application": "Condicional",
    "documentTemplate": "06.05 — Definir operação e investimento por canal | MODELO"
  },
  {
    "code": "06.06",
    "area": "06 Marketing e Canais",
    "title": "Definir KPIs e critérios de continuidade dos canais",
    "application": "Obrigatória",
    "documentTemplate": "06.06 — Definir KPIs e critérios de continuidade dos canais | MODELO"
  },
  {
    "code": "07.01",
    "area": "07 Conteúdo e Distribuição",
    "title": "Definir territórios editoriais",
    "application": "Obrigatória",
    "documentTemplate": "07.01 — Definir territórios editoriais | MODELO"
  },
  {
    "code": "07.02",
    "area": "07 Conteúdo e Distribuição",
    "title": "Definir linhas editoriais",
    "application": "Obrigatória",
    "documentTemplate": "07.02 — Definir linhas editoriais | MODELO"
  },
  {
    "code": "07.03",
    "area": "07 Conteúdo e Distribuição",
    "title": "Mapear assuntos e tópicos",
    "application": "Obrigatória",
    "documentTemplate": "07.03 — Mapear assuntos e tópicos | MODELO"
  },
  {
    "code": "07.04",
    "area": "07 Conteúdo e Distribuição",
    "title": "Definir formatos de conteúdo",
    "application": "Obrigatória",
    "documentTemplate": "07.04 — Definir formatos de conteúdo | MODELO"
  },
  {
    "code": "07.05",
    "area": "07 Conteúdo e Distribuição",
    "title": "Definir função estratégica do conteúdo",
    "application": "Obrigatória",
    "documentTemplate": "07.05 — Definir função estratégica do conteúdo | MODELO"
  },
  {
    "code": "07.06",
    "area": "07 Conteúdo e Distribuição",
    "title": "Relacionar conteúdo à jornada e consciência",
    "application": "Obrigatória",
    "documentTemplate": "07.06 — Relacionar conteúdo à jornada e consciência | MODELO"
  },
  {
    "code": "07.07",
    "area": "07 Conteúdo e Distribuição",
    "title": "Definir CTAs por estágio",
    "application": "Obrigatória",
    "documentTemplate": "07.07 — Definir CTAs por estágio | MODELO"
  },
  {
    "code": "07.08",
    "area": "07 Conteúdo e Distribuição",
    "title": "Definir distribuição e reaproveitamento",
    "application": "Condicional",
    "documentTemplate": "07.08 — Definir distribuição e reaproveitamento | MODELO"
  },
  {
    "code": "07.09",
    "area": "07 Conteúdo e Distribuição",
    "title": "Definir métricas de conteúdo",
    "application": "Obrigatória",
    "documentTemplate": "07.09 — Definir métricas de conteúdo | MODELO"
  },
  {
    "code": "08.01",
    "area": "08 Campanhas e Investimento",
    "title": "Mapear calendário comercial",
    "application": "Obrigatória",
    "documentTemplate": "08.01 — Mapear calendário comercial | MODELO"
  },
  {
    "code": "08.02",
    "area": "08 Campanhas e Investimento",
    "title": "Priorizar oportunidades de campanha",
    "application": "Obrigatória",
    "documentTemplate": "08.02 — Priorizar oportunidades de campanha | MODELO"
  },
  {
    "code": "08.03",
    "area": "08 Campanhas e Investimento",
    "title": "Definir objetivo, oferta e público da campanha",
    "application": "Condicional",
    "documentTemplate": "08.03 — Definir objetivo, oferta e público da campanha | MODELO"
  },
  {
    "code": "08.04",
    "area": "08 Campanhas e Investimento",
    "title": "Definir conceito, mensagem e CTA da campanha",
    "application": "Condicional",
    "documentTemplate": "08.04 — Definir conceito, mensagem e CTA da campanha | MODELO"
  },
  {
    "code": "08.05",
    "area": "08 Campanhas e Investimento",
    "title": "Definir canais e peças da campanha",
    "application": "Condicional",
    "documentTemplate": "08.05 — Definir canais e peças da campanha | MODELO"
  },
  {
    "code": "08.06",
    "area": "08 Campanhas e Investimento",
    "title": "Definir orçamento e responsáveis da campanha",
    "application": "Condicional",
    "documentTemplate": "08.06 — Definir orçamento e responsáveis da campanha | MODELO"
  },
  {
    "code": "08.07",
    "area": "08 Campanhas e Investimento",
    "title": "Definir cronograma, meta e KPIs da campanha",
    "application": "Condicional",
    "documentTemplate": "08.07 — Definir cronograma, meta e KPIs da campanha | MODELO"
  },
  {
    "code": "08.08",
    "area": "08 Campanhas e Investimento",
    "title": "Estruturar plano de investimento",
    "application": "Obrigatória",
    "documentTemplate": "08.08 — Estruturar plano de investimento | MODELO"
  },
  {
    "code": "08.09",
    "area": "08 Campanhas e Investimento",
    "title": "Registrar resultado e aprendizado da campanha",
    "application": "Condicional",
    "documentTemplate": "08.09 — Registrar resultado e aprendizado da campanha | MODELO"
  },
  {
    "code": "09.01",
    "area": "09 Receita Funil e CS",
    "title": "Mapear funil de marketing",
    "application": "Obrigatória",
    "documentTemplate": "09.01 — Mapear funil de marketing | MODELO"
  },
  {
    "code": "09.02",
    "area": "09 Receita Funil e CS",
    "title": "Definir critérios de qualificação de marketing",
    "application": "Obrigatória",
    "documentTemplate": "09.02 — Definir critérios de qualificação de marketing | MODELO"
  },
  {
    "code": "09.03",
    "area": "09 Receita Funil e CS",
    "title": "Definir handoff Marketing para Vendas",
    "application": "Obrigatória",
    "documentTemplate": "09.03 — Definir handoff Marketing para Vendas | MODELO"
  },
  {
    "code": "09.04",
    "area": "09 Receita Funil e CS",
    "title": "Mapear funil de vendas",
    "application": "Obrigatória",
    "documentTemplate": "09.04 — Mapear funil de vendas | MODELO"
  },
  {
    "code": "09.05",
    "area": "09 Receita Funil e CS",
    "title": "Estruturar CRM",
    "application": "Obrigatória",
    "documentTemplate": "09.05 — Estruturar CRM | MODELO"
  },
  {
    "code": "09.06",
    "area": "09 Receita Funil e CS",
    "title": "Definir qualificação comercial",
    "application": "Obrigatória",
    "documentTemplate": "09.06 — Definir qualificação comercial | MODELO"
  },
  {
    "code": "09.07",
    "area": "09 Receita Funil e CS",
    "title": "Estruturar atendimento comercial",
    "application": "Obrigatória",
    "documentTemplate": "09.07 — Estruturar atendimento comercial | MODELO"
  },
  {
    "code": "09.08",
    "area": "09 Receita Funil e CS",
    "title": "Estruturar follow-up e reativação",
    "application": "Obrigatória",
    "documentTemplate": "09.08 — Estruturar follow-up e reativação | MODELO"
  },
  {
    "code": "09.09",
    "area": "09 Receita Funil e CS",
    "title": "Estruturar Customer Success",
    "application": "Condicional",
    "documentTemplate": "09.09 — Estruturar Customer Success | MODELO"
  },
  {
    "code": "09.10",
    "area": "09 Receita Funil e CS",
    "title": "Definir retenção, expansão e indicação",
    "application": "Condicional",
    "documentTemplate": "09.10 — Definir retenção, expansão e indicação | MODELO"
  },
  {
    "code": "10.01",
    "area": "10 Dados IA e Automação",
    "title": "Mapear fontes de dados",
    "application": "Obrigatória",
    "documentTemplate": "10.01 — Mapear fontes de dados | MODELO"
  },
  {
    "code": "10.02",
    "area": "10 Dados IA e Automação",
    "title": "Definir fonte única de verdade",
    "application": "Obrigatória",
    "documentTemplate": "10.02 — Definir fonte única de verdade | MODELO"
  },
  {
    "code": "10.03",
    "area": "10 Dados IA e Automação",
    "title": "Auditar qualidade dos dados",
    "application": "Obrigatória",
    "documentTemplate": "10.03 — Auditar qualidade dos dados | MODELO"
  },
  {
    "code": "10.04",
    "area": "10 Dados IA e Automação",
    "title": "Definir dashboards, alertas e anomalias",
    "application": "Condicional",
    "documentTemplate": "10.04 — Definir dashboards, alertas e anomalias | MODELO"
  },
  {
    "code": "10.05",
    "area": "10 Dados IA e Automação",
    "title": "Mapear oportunidades de IA",
    "application": "Obrigatória",
    "documentTemplate": "10.05 — Mapear oportunidades de IA | MODELO"
  },
  {
    "code": "10.06",
    "area": "10 Dados IA e Automação",
    "title": "Definir governança de IA",
    "application": "Obrigatória",
    "documentTemplate": "10.06 — Definir governança de IA | MODELO"
  },
  {
    "code": "10.07",
    "area": "10 Dados IA e Automação",
    "title": "Mapear oportunidades de automação",
    "application": "Obrigatória",
    "documentTemplate": "10.07 — Mapear oportunidades de automação | MODELO"
  },
  {
    "code": "10.08",
    "area": "10 Dados IA e Automação",
    "title": "Priorizar automações",
    "application": "Obrigatória",
    "documentTemplate": "10.08 — Priorizar automações | MODELO"
  },
  {
    "code": "10.09",
    "area": "10 Dados IA e Automação",
    "title": "Definir supervisão humana e procedimento de falha",
    "application": "Obrigatória",
    "documentTemplate": "10.09 — Definir supervisão humana e procedimento de falha | MODELO"
  },
  {
    "code": "11.01",
    "area": "11 Métricas e Forecast",
    "title": "Definir KPIs de marketing",
    "application": "Obrigatória",
    "documentTemplate": "11.01 — Definir KPIs de marketing | MODELO"
  },
  {
    "code": "11.02",
    "area": "11 Métricas e Forecast",
    "title": "Definir KPIs do funil",
    "application": "Obrigatória",
    "documentTemplate": "11.02 — Definir KPIs do funil | MODELO"
  },
  {
    "code": "11.03",
    "area": "11 Métricas e Forecast",
    "title": "Definir KPIs de vendas",
    "application": "Obrigatória",
    "documentTemplate": "11.03 — Definir KPIs de vendas | MODELO"
  },
  {
    "code": "11.04",
    "area": "11 Métricas e Forecast",
    "title": "Definir KPIs de retenção",
    "application": "Condicional",
    "documentTemplate": "11.04 — Definir KPIs de retenção | MODELO"
  },
  {
    "code": "11.05",
    "area": "11 Métricas e Forecast",
    "title": "Definir KPIs de marca",
    "application": "Condicional",
    "documentTemplate": "11.05 — Definir KPIs de marca | MODELO"
  },
  {
    "code": "11.06",
    "area": "11 Métricas e Forecast",
    "title": "Construir matemática reversa de crescimento",
    "application": "Obrigatória",
    "documentTemplate": "11.06 — Construir matemática reversa de crescimento | MODELO"
  },
  {
    "code": "11.07",
    "area": "11 Métricas e Forecast",
    "title": "Construir forecast de receita",
    "application": "Condicional",
    "documentTemplate": "11.07 — Construir forecast de receita | MODELO"
  },
  {
    "code": "11.08",
    "area": "11 Métricas e Forecast",
    "title": "Definir cobertura e gap de pipeline",
    "application": "Condicional",
    "documentTemplate": "11.08 — Definir cobertura e gap de pipeline | MODELO"
  },
  {
    "code": "12.01",
    "area": "12 Execução e Governança",
    "title": "Construir plano de 90 dias",
    "application": "Obrigatória",
    "documentTemplate": "12.01 — Construir plano de 90 dias | MODELO"
  },
  {
    "code": "12.02",
    "area": "12 Execução e Governança",
    "title": "Construir roadmap anual",
    "application": "Obrigatória",
    "documentTemplate": "12.02 — Construir roadmap anual | MODELO"
  },
  {
    "code": "12.03",
    "area": "12 Execução e Governança",
    "title": "Definir responsabilidades e governança",
    "application": "Obrigatória",
    "documentTemplate": "12.03 — Definir responsabilidades e governança | MODELO"
  },
  {
    "code": "12.04",
    "area": "12 Execução e Governança",
    "title": "Mapear dependências de execução",
    "application": "Obrigatória",
    "documentTemplate": "12.04 — Mapear dependências de execução | MODELO"
  },
  {
    "code": "12.05",
    "area": "12 Execução e Governança",
    "title": "Criar centro de decisões",
    "application": "Obrigatória",
    "documentTemplate": "12.05 — Criar centro de decisões | MODELO"
  },
  {
    "code": "12.06",
    "area": "12 Execução e Governança",
    "title": "Mapear riscos e contingências",
    "application": "Obrigatória",
    "documentTemplate": "12.06 — Mapear riscos e contingências | MODELO"
  },
  {
    "code": "12.07",
    "area": "12 Execução e Governança",
    "title": "Criar base de aprendizados",
    "application": "Obrigatória",
    "documentTemplate": "12.07 — Criar base de aprendizados | MODELO"
  },
  {
    "code": "12.08",
    "area": "12 Execução e Governança",
    "title": "Definir cadência de governança",
    "application": "Obrigatória",
    "documentTemplate": "12.08 — Definir cadência de governança | MODELO"
  }
];

export const ecosystemAreas = Array.from(
  new Map(ecosystemTasks.map((task) => [task.area, task.area])).values()
);
