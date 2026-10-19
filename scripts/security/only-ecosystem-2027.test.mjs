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

test("central task board searches linked projects and task titles without adding a redundant document column",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/task.title/);
 assert.match(board,/project.title/);
 assert.match(board,/query.toLocaleLowerCase/);
 for(const name of ["Tarefa","Projeto","Responsável","Situação","Prioridade","Prazo"])assert.ok(board.includes('["'+name+'",'),name);
});

test("admin operations summary keeps formal document reviews actionable per project",()=>{
 const panel=source("Components/admin/AdminOperationsOverview.tsx"),model=source("lib/overview/model.ts");
 assert.match(panel,/Projetos em Atenção/);assert.match(model,/ecosystem2027/);assert.match(model,/reviewStatus!=="review"/);assert.match(panel,/RecordLink item=\{items\[0\]\}/);
});

test("admin overview omits publication-rate decorations and retains actual blocked records",()=>{
 const panel=source("Components/admin/AdminOperationsOverview.tsx"),model=source("lib/overview/model.ts");
 assert.doesNotMatch(panel,/<progress|released\/selected|Progresso dos documentos/);assert.match(model,/task.status==="blocked"/);
});

test("operations dashboard counts only valid selected document codes in formal review",async()=>{
 const {buildOperationsOverview}=await import('../../src/lib/overview/model.ts');
 const project={id:'p',status:'draft',data:{ecosystem2027:{selectedDocumentCodes:['07.01','invalid'],documents:{'07.01':{content:'Valid review',reviewStatus:'review'},invalid:{content:'Invalid review',reviewStatus:'review'}}}}};
 assert.equal(buildOperationsOverview([project],null,[],'ready').pendingDecisions,1);
});

test("already approved or published documents are not pending dashboard decisions",async()=>{
 const {buildOperationsOverview}=await import('../../src/lib/overview/model.ts');
 const project={id:'p',status:'draft',data:{ecosystem2027:{selectedDocumentCodes:['07.01'],documents:{'07.01':{content:'Approved',reviewStatus:'approved',publishedContent:'Approved',publishedAt:'2026-10-19T00:00:00Z'}}}}};
 assert.equal(buildOperationsOverview([project],null,[],'ready').pendingDecisions,0);
});

test("task hub filters project, owner, priority, status and deadlines without changing data",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 for(const token of ["Filtrar projeto","Filtrar responsável","Filtrar prioridade","Filtrar prazo","Limpar"])assert.ok(board.includes(token),token);
 assert.match(board,/task.dueDate<today\(\)/);
 assert.match(board,/isOpen\(task\)/);
 assert.match(board,/setDeadline\("all"\)/);
});
test("task triage shows today's and overdue deadlines without completed items",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/todayCount=tasks.filter/);
 assert.match(board,/overdue=tasks.filter/);
 assert.match(board,/isOpen\(x.task\)/);
 assert.match(board,/Minha visão do dia/);
});
test("task ordering places overdue and blocked work first in default view",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 assert.match(board,/urgencyScore/);
 assert.match(board,/t.status==="blocked"\?1/);
 assert.match(board,/t.dueDate===today\(\)\?2/);
 assert.match(board,/openScore\(a.task\)-openScore\(b.task\)/);
});

test("execution editor enforces same-project acyclic task prerequisites",()=>{
 const editor=source("Components/admin/ExecutionTimelineEditor.tsx");
 assert.match(editor,/Pré-requisitos desta entrega/);
 assert.match(editor,/Dependência circular detectada/);
 assert.match(editor,/Uma entrega não pode depender de si mesma/);
 assert.match(editor,/Esta entrega é pré-requisito de outra/);
 assert.match(editor,/const reaches=/);
});

test("central task creation keeps dependencies empty and blocks premature completion",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 const timeline=source("Components/admin/ExecutionTimelineEditor.tsx");
 assert.match(board,/dependencies:\[\]/);
 assert.match(board,/\(task.dependencies\?\?\[\]\).some/);
 assert.match(board,/Conclua os pré-requisitos/);
 assert.match(board,/Reabra primeiro as tarefas/);
 assert.match(timeline,/Conclua todos os pré-requisitos/);
 assert.match(timeline,/Reabra a atividade dependente primeiro/);
});

test("overview distinguishes name-only ownership and preserves recorded prerequisites",()=>{
 const panel=source("Components/admin/AdminOperationsOverview.tsx"),model=source("lib/overview/model.ts");
 assert.match(panel,/atribuídas apenas por nome/);assert.match(model,/task.ownerUserId===userId/);assert.match(model,/task.dependencies/);assert.match(model,/pré-requisito/);
});

test("advanced prerequisite editing stays in the project and task table resets compact filters",()=>{
 const board=source("Components/admin/CentralTarefas.tsx");
 const editor=source("Components/admin/ExecutionTimelineEditor.tsx");
 assert.match(editor,/Pré-requisitos desta entrega/);
 assert.match(board,/setProjectId\("all"\)/);
 assert.match(board,/setPriority\("all"\)/);
 assert.match(board,/setDeadline\("all"\)/);
});
test("task priority controls remain specialized and overview does not duplicate team workload",()=>{
 const timeline=source("Components/admin/ExecutionTimelineEditor.tsx"),board=source("Components/admin/CentralTarefas.tsx"),overview=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(timeline,/Prioridade/);assert.match(board,/Filtrar prioridade/);assert.match(board,/setPriority\("all"\)/);assert.doesNotMatch(overview,/Distribuição da carga por responsável/);assert.match(overview,/Minha Rotina/);
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

test("overview consults formal editorial decisions without duplicating the editorial calendar",()=>{
 const overview=source("Components/admin/AdminOperationsOverview.tsx"),model=source("lib/overview/model.ts");
 assert.match(overview,/loadOverviewDecisions/);assert.match(model,/content_version/);assert.match(model,/decisionSource===\"ready\"/);assert.doesNotMatch(overview,/Agenda editorial e aprovações|Próximas publicações/);assert.match(overview,/total fica indisponível até que seja possível conferir as decisões/);
});

test("operational meetings integrate authorized project editor and admin overview",()=>{
 const page=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 const agenda=source("Components/admin/OperationalAgenda.tsx");
 const dashboard=source("Components/admin/AdminOperationsOverview.tsx");
 assert.match(page,/<OperationalAgenda(?: key=\{project\.id\})? projectId=/);
 assert.match(agenda,/\/api\/admin\/project\/update/);
 assert.match(agenda,/expectedUpdatedAt:updatedAt/);
 assert.match(agenda,/Reuniões e acompanhamento/);
 assert.match(dashboard,/Próximas Reuniões/);
 assert.match(source("lib/overview/model.ts"),/Compromisso vencido/);
});

test("operational agenda timestamps and task deletion retain linked meeting integrity",()=>{
 const agenda=source("Components/admin/OperationalAgenda.tsx");
 const execution=source("Components/admin/ExecutionTimelineEditor.tsx");
 assert.match(agenda,/Horário \(opcional\)/);
 assert.match(agenda,/a\.date\+"T"\+/);
 assert.match(execution,/agenda\.operationalAgenda\?\.some/);
 assert.match(execution,/Remova o vínculo na agenda antes de excluir/);
});
