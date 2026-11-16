export const PLANNING_V5 = 5 as const;

export function isPlanningV5(data: unknown): boolean {
  return typeof data === "object" && data !== null
    && "planningStructureVersion" in data && data.planningStructureVersion === PLANNING_V5;
}

export const planningV5Stages = [
  { code: "01", title: "Investigar", internal: true, pages: [
    { code: "01.01", title: "Diagnóstico Inicial do Negócio (F01)" },
    { code: "01.02", title: "Documentos complementares" },
    { code: "01.03", title: "Base Consolidada" },
  ] },
  { code: "02", title: "Diagnosticar", internal: false, pages: [
    { code: "02.01", title: "Análise da Empresa" },
    { code: "02.02", title: "Modelo de Negócio" },
    { code: "02.03", title: "Análise Operacional" },
    { code: "02.04", title: "Recursos e Capacidade" },
    { code: "02.05", title: "Mercado e Concorrência" },
    { code: "02.06", title: "Diagnóstico Estratégico" },
  ] },
  { code: "03", title: "Definir o Caminho", internal: false, pages: [
    { code: "03.01", title: "Objetivos Estratégicos" },
    { code: "03.02", title: "DNA e Posicionamento" },
    { code: "03.03", title: "Perfil de Cliente Ideal (ICP)" },
    { code: "03.04", title: "Produtos e Ofertas" },
  ] },
  { code: "04", title: "Conectar com o Cliente", internal: false, pages: [
    { code: "04.01", title: "Personas e Jornadas de Compra" },
    { code: "04.02", title: "DNA do Conteúdo" },
    { code: "04.03", title: "Canais e Conteúdo" },
    { code: "04.04", title: "Aquisição, Conversão e Relacionamento" },
  ] },
  { code: "05", title: "Plano de Ação", internal: false, pages: [
    { code: "05.01", title: "Linha do Tempo" },
    { code: "05.02", title: "Investimentos e Resultados" },
  ] },
] as const;

export const V5_TIMELINE_PAGE = "05.01";
