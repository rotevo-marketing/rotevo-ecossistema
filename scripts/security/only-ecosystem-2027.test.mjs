import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const source=(relative)=>readFileSync(fileURLToPath(new URL("../../src/"+relative,import.meta.url)),"utf8");
test("obsolete demo routes do not ship",()=>{
 assert.equal(existsSync(fileURLToPath(new URL("../../src/app/admin/planejamentos/demo",import.meta.url))),false);
});
test("presentation renders only Ecosystem 2027",()=>{
 const page=source("app/apresentacao/[slug]/page.tsx");
 assert.match(page,/EcosystemPresentationOverview/);
 assert.doesNotMatch(page,/LegacyPresentationV2|LegacyPresentation|moduleContent/);
});
test("client project presentation rejects JSON without ecosystem2027",()=>{
 const projection=source("lib/security/projectForPresentation.ts");
 assert.match(projection,/if\(!ecosystem\)return null/);
 assert.doesNotMatch(projection,/moduleContent|scrubLegacy/);
});

test("new planning creation does not reference the old module registry",()=>{
 const wizard=source("app/admin/novo-planejamento/modulos/page.tsx");
 assert.doesNotMatch(wizard,/planningModules|selectedModules|moduleContent|selectedModuleRecords/);
 assert.match(wizard,/ecosystem2027/);
 const endpoint=source("app/api/admin/project/create/route.ts");
 assert.match(endpoint,/payload\.selectedModules!==undefined/);
 assert.match(endpoint,/payload\.moduleContent!==undefined/);
 assert.match(endpoint,/selectedDocumentCodes/);
});

test("current ecosystem document editor uses authorized version-checked endpoint",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 const adminPage=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 assert.match(editor,/ecosystem2027/);
 assert.match(editor,/\/api\/admin\/project\/update/);
 assert.match(editor,/expectedUpdatedAt:updatedAt/);
 assert.doesNotMatch(editor,/\.from\("planning_projects"\)/);
 assert.match(adminPage,/EcosystemDocumentEditor/);
});

test("only released snapshots flow to the customer and review steps stay explicit",()=>{
 const projection=source("lib/security/projectForPresentation.ts");
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(projection,/doc\.publishedContent/);
 assert.match(projection,/doc\.publishedAt/);
 assert.doesNotMatch(projection,/\{content:doc\.content\}/);
 assert.match(editor,/action:"save"\|"review"\|"approve"\|"publish"/);
 assert.match(editor,/action==="publish"/);
 assert.match(editor,/record\?\.reviewStatus!=="approved"/);
 assert.match(editor,/publishedContent:savedContent/);
 assert.match(editor,/reviewStatus:"draft"/);
});

test("server validates all document transitions before changing project JSON",()=>{
 const handler=source("app/api/admin/project/update/route.ts");
 const guard=source("lib/security/ecosystemDocumentTransitions.ts");
 assert.match(handler,/validEcosystemDocumentTransition\(existing\.data,b\.data\)/);
 assert.match(guard,/status\(oldDoc\)==="draft"&&status\(nextDoc\)==="review"/);
 assert.match(guard,/status\(oldDoc\)==="review"&&status\(nextDoc\)==="approved"/);
 assert.match(guard,/nextDoc\.publishedContent!==oldDoc\.content/);
});

test("current project admin contains no legacy module selection state",()=>{
 const page=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 assert.doesNotMatch(page,/planningModules|moduleCategories|selectedModuleSlugs|saveModuleSelection|toggleModule/);
 assert.match(page,/EcosystemDocumentEditor/);
 assert.match(page,/selectedDocumentCodes/);
});

test("document workspace provides search and lifecycle progress visibility",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(editor,/visibleDocuments/);
 assert.match(editor,/reviewedCount/);
 assert.match(editor,/approvedCount/);
 assert.match(editor,/publishedCount/);
});

test("obsolete dynamic legacy module editor is no longer a route",()=>{
 assert.equal(existsSync(fileURLToPath(new URL("../../src/app/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]/page.tsx",import.meta.url))),false);
 const page=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 assert.match(page,/EcosystemDocumentEditor/);
});

test("obsolete demonstration source remains removed",()=>{
 assert.equal(existsSync(fileURLToPath(new URL("../../src/app/apresentacao/demo/page.old.tsx",import.meta.url))),false);
});

test("search uses clickable results while preserving the native document selection",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(editor,/visibleDocuments\.map\(doc=><button/);
 assert.match(editor,/setCode\(doc\.code\)/);
 assert.match(editor,/Descartar alterações não salvas/);
 assert.doesNotMatch(editor,/hidden=\{!visibleDocuments\.includes\(doc\)\}/);
});

test("document workspace supports lifecycle filtering without modifying project contents",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(editor,/statusFilter/);
 assert.match(editor,/matchesStatus/);
 assert.match(editor,/publishedAt/);
 assert.match(editor,/Filtrar por etapa/);
 assert.match(editor,/draftCount/);
});

test("document publication reporting aggregates real released snapshots by area",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(editor,/areaProgress/);
 assert.match(editor,/overallProgress/);
 assert.match(editor,/Progresso de publicação/);
 assert.match(editor,/Acompanhar por área estratégica/);
 assert.match(editor,/\.publishedAt/);
});

test("strategist can inspect released text without accidentally exposing internal-only documents",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(editor,/Consultar última versão publicada/);
 assert.match(editor,/record\.publishedContent/);
 assert.match(editor,/presentedDocumentCodes\?\.includes\(activeCode\)/);
 assert.match(editor,/Documento interno/);
});

test("operational delivery may reference only a selected Ecossistema document",()=>{
 const editor=source("Components/admin/ExecutionTimelineEditor.tsx");
 const timeline=source("Components/cliente/ProjectTimeline.tsx");
 assert.match(editor,/strategicDocs/);
 assert.match(editor,/editing\.documentCode/);
 assert.match(editor,/Selecione um documento estratégico válido do projeto/);
 assert.match(editor,/Documento estratégico relacionado/);
 assert.match(timeline,/documentCode\?:string/);
});

test("document workspace displays only execution items linked to its active document",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 assert.match(editor,/linkedDeliveries/);
 assert.match(editor,/item\.documentCode===activeCode/);
 assert.match(editor,/Entregas vinculadas a este documento/);
 assert.match(editor,/Nenhuma entrega vinculada até agora/);
});

test("document-linked delivery summary includes overdue, pending and blocked items",()=>{
 const editor=source("Components/admin/EcosystemDocumentEditor.tsx");
 for(const name of ["linkedPending","linkedCompleted","linkedBlocked","linkedOverdue"])assert.match(editor,new RegExp(name));
 assert.match(editor,/Indicadores das entregas relacionadas/);
 assert.match(editor,/entrega\(s\) aguardando desbloqueio/);
});

test("central task board exposes linked document code and searchable title",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/task\.documentCode/);
 assert.match(board,/ecosystemDocuments\.find/);
});

test("admin operations summary connects published 2027 documents and delivery deadlines per project",()=>{
 const panel=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(panel,/documentSummary/);
 assert.match(panel,/ecosystem2027/);
 assert.match(panel,/publishedAt/);
 assert.match(panel,/Acompanhamento por cliente e projeto/);
 assert.match(panel,/Entregas abertas/);
 assert.match(panel,/Atrasadas/);
});

test("admin overview computes per-project publication rate and blocked deliverables without inferred records",()=>{
 const panel=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(panel,/selected\.length\?Math\.round\(released\/selected\.length\*100\):0/);
 assert.match(panel,/t\.status==="blocked"/);
 assert.match(panel,/Progresso dos documentos de/);
 assert.match(panel,/Sem documentos/);
});

test("operations dashboard counts valid 2027 document codes with the actual digit regex",()=>{
 const overview=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(overview,/filter\(code=>\/\^\\d\{2\}\\\.\\d\{2\}\$\/\.test\(code\)\)/);
 assert.doesNotMatch(overview,/filter\(code=>\/\^\\\\d/);
 assert.equal(/^\d{2}\.\d{2}$/.test("07.01"),true);
});

test("admin publication progress requires both published content and publication timestamp",()=>{
 const overview=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(overview,/typeof eco\?\.documents\?\.\[code\]\?\.publishedAt==="string"&&typeof eco\?\.documents\?\.\[code\]\?\.publishedContent==="string"/);
});

test("operations task hub filters deadlines and strategic references without changing project data",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 for(const token of ["documentScope","deadline","Filtrar prazo","Filtrar vínculo estratégico","Limpar filtros"])assert.ok(board.includes(token),token);
 assert.match(board,/task\.dueDate<today\(\)/);
 assert.match(board,/\!\["completed","cancelled"\]\.includes/);
 assert.match(board,/setDocumentScope\("all"\)/);
});

test("task triage highlights due-today and blocked work without flagging completed tasks as overdue",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/const dueToday=task\.dueDate===today\(\)&&open/);
 assert.match(board,/const blocked=task\.status==="blocked"/);
 assert.match(board,/Vence hoje/);
 assert.match(board,/Bloqueada/);
 assert.match(board,/Bloqueadas/);
});

test("operational task ordering prioritizes overdue blocked and due-today work",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/if\(task\.status==="completed"\|\|task\.status==="cancelled"\)return 4/);
 assert.match(board,/if\(task\.dueDate&&task\.dueDate<today\(\)\)return 0/);
 assert.match(board,/if\(task\.status==="blocked"\)return 1/);
 assert.match(board,/if\(task\.dueDate===today\(\)\)return 2/);
 assert.match(board,/rank\(a\.task\)-rank\(b\.task\)/);
});

test("execution editor enforces same-project acyclic task prerequisites",()=>{
 const editor=source("Components/admin/ExecutionTimelineEditor.tsx");
 assert.match(editor,/Pré-requisitos desta entrega/);
 assert.match(editor,/Dependência circular detectada/);
 assert.match(editor,/Uma entrega não pode depender de si mesma/);
 assert.match(editor,/Esta entrega é pré-requisito de outra/);
 assert.match(editor,/const reaches=/);
});

test("central task cards show incomplete dependencies from the same project's timeline",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/const prerequisites=/);
 assert.match(board,/project\.data\?\.executionTimeline/);
 assert.match(board,/const waiting=prerequisites\.filter/);
 assert.match(board,/Pré-requisitos:/);
});

test("task completion UI enforces prerequisite constraints on both operational entry points",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 const timeline=source("Components/admin/ExecutionTimelineEditor.tsx");
 assert.match(board,/Conclua os pré-requisitos pendentes/);
 assert.match(board,/Reabra primeiro as atividades concluídas/);
 assert.match(timeline,/Conclua todos os pré-requisitos/);
 assert.match(timeline,/Reabra a atividade dependente primeiro/);
});

test("project operational overview shows work with missing owners and unmet prerequisites",()=>{
 const overview=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(overview,/const unassigned=tasks\.filter/);
 assert.match(overview,/!t\.owner\?\.trim\(\)&&!t\.ownerUserId/);
 assert.match(overview,/const waitingPrerequisites=tasks\.filter/);
 assert.match(overview,/aguardando pré-requisitos/);
 assert.match(overview,/atividade\(s\) sem responsável/);
});

test("central task board filters waiting and satisfied prerequisites without losing reset",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/prerequisiteScope/);
 assert.match(board,/Filtrar pré-requisitos/);
 assert.match(board,/Aguardando pré-requisitos/);
 assert.match(board,/Pré-requisitos atendidos/);
 assert.match(board,/setPrerequisiteScope\("all"\)/);
});

test("operational management connects task priorities to editor, task board and team workload",()=>{
 const timeline=source("Components/admin/ExecutionTimelineEditor.tsx");
 const board=source("Components/admin/CentralTarefas.tsx");
 const overview=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(timeline,/Prioridade/);
 assert.match(board,/Filtrar prioridade/);
 assert.match(board,/setPriorityScope\("all"\)/);
 assert.match(overview,/Distribuição da carga por responsável/);
 assert.match(overview,/Não representa horas trabalhadas/);
});

test("task hub supports authorized inline team reassignment and reprioritization",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/supabase\.from\("team_members"\)/);
 assert.match(board,/\.eq\("active",true\)/);
 assert.match(board,/async function updateTask/);
 assert.match(board,/expectedUpdatedAt:project\.updated_at/);
 assert.match(board,/updateTask\(project,task,\{priority:/);
 assert.match(board,/updateTask\(project,task,\{ownerUserId:/);
 assert.match(board,/Responsável por/);
 assert.match(board,/Prioridade de/);
});

test("operations overview integrates editorial calendar without inventing formal approval decisions",()=>{
 const overview=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(overview,/editorialCalendar/);
 assert.match(overview,/Agenda editorial e aprovações/);
 assert.match(overview,/awaitingApproval/);
 assert.match(overview,/editorialOverdue/);
 assert.match(overview,/nextEditorial/);
 assert.match(overview,/awaitingEditorial/);
 assert.match(overview,/pastEditorial/);
 assert.match(overview,/As decisões formais do cliente são acompanhadas no painel de aprovações/);
});
