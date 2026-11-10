import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=(path)=>readFileSync(new URL("../../src/"+path,import.meta.url),"utf8");

test("UI3 project directory is a compact operational list with explicit filters",()=>{
 const admin=source("app/admin/page.tsx");
 assert.match(admin,/rv-ui3-projects-surface/);
 assert.match(admin,/rv-ui3-project-list/);
 assert.match(admin,/rv-ui3-projects-filters/);
 assert.match(admin,/setStatusFilter\(f.value\)/);
 assert.match(admin,/value=\{searchTerm\}/);
 assert.match(admin,/handlePublishProject\(project,"published"\)/);
 assert.match(admin,/window\.confirm\(action\)/);
 assert.match(admin,/Esta ação não publica automaticamente documentos estratégicos individuais/);
});

test("onboarding phases preserve project-bound checklist persistence and legacy records",()=>{
 const editor=source("Components/admin/ProjectOnboarding.tsx");
 const hub=source("Components/admin/OperationalHubs.tsx");
 for(const phase of ["Formalização","Preparação","Alinhamento","Liberação"])assert.ok(editor.includes(phase),phase);
 assert.match(editor,/standardOrder\?phaseGroups/);
 assert.match(editor,/onboardingChecklist:next/);
 assert.match(editor,/\.\.\.items,\.\.\.missing\.map/);
 assert.match(editor,/visibleToClient:false/);
 assert.match(hub,/rv-ui3-onboarding-surface/);
 assert.match(hub,/Gerenciar onboarding/);
 assert.match(hub,/setStarterOpen\(true\)/);
});

test("access is intercepted into contextual drawer with direct authorized route intact",()=>{
 const drawer=source("app/admin/@modal/(.)planejamentos/[clientSlug]/acesso/page.tsx");
 const original=source("app/admin/planejamentos/[clientSlug]/acesso/page.tsx");
 assert.match(drawer,/AcessoClientePage/);
 assert.match(drawer,/role="dialog"/);
 assert.match(drawer,/DialogFocus/);
 assert.match(drawer,/router\.back\(\)/);
 assert.match(original,/supabase/);
 assert.match(original,/useParams/);
});

test("presentation returns to project list only when opened from projects",()=>{
 const admin=source("app/admin/page.tsx");
 const page=source("app/apresentacao/[slug]/page.tsx");
 const view=source("Components/apresentacao/EcosystemPresentationOverview.tsx");
 assert.match(admin,/\?from=projects/);
 assert.match(page,/query\.get\("from"\)==="projects"/);
 assert.match(view,/returnToProjects\?"\/admin\?section=projects":planningHref/);
});

test("UI3 leaves published strategic document sheets untouched",()=>{
 const css=source("app/rotevo-ui3.css");
 assert.doesNotMatch(css,/\.se-paper\s*\{/);
 assert.doesNotMatch(css,/\.bn-editor\s*\{/);
 assert.match(css,/\.rv-ui3/);
});

test("strategist overview prioritizes real attention before daily console and secondary summary",()=>{
 const overview=source("Components/admin/AdminOperationsOverview.tsx");
 const console=source("Components/admin/AdminWorkConsole.tsx");
 assert.match(overview,/rv-ui3-overview-summary/);
 assert.match(overview,/rv-ui3-attention-first/);
 assert.match(overview,/buildOperationsOverview/);
 assert.match(overview,/loadOverviewDecisions/);
 assert.match(overview,/financeRequest\(false\)/);
 assert.ok(overview.indexOf("rv-ui3-attention-first")<overview.indexOf("<AdminWorkConsole"),"attention before work console");
 assert.ok(overview.indexOf("rv-ui3-attention-first")<overview.indexOf("rv-ui3-overview-summary"),"urgent actions before secondary KPI strip");
 assert.match(console,/rv-ui3-work-console/);
 assert.match(console,/view===t.id/);
 assert.match(console,/filter\(r,view\)/);
 assert.doesNotMatch(console,/grid grid-cols-2 gap-2 sm:grid-cols-4/);
});

test("client overview prioritizes pending decisions and hides duplicate summary cards",()=>{
 const overview=source("Components/cliente/ClientOverview.tsx");
 assert.match(overview,/rv-ui3-client-status/);
 assert.match(overview,/Entregas a acompanhar/);
 assert.match(overview,/nextTask\?\.projectId/);
 assert.match(overview,/Prazo vencido/);
 assert.match(overview,/pendingIdeas/);
 assert.match(overview,/pendingFinal/);
 assert.match(overview,/hasDecision\(final,i\)/);
 assert.match(overview,/visibleToClient===true/);
 assert.match(overview,/approvalsFailed/);
 assert.match(overview,/onNavigate\(a.module,a.projectId,a.contentId\)/);
 assert.ok(overview.indexOf("Precisa da sua atenção")<overview.indexOf("rv-ui3-client-status"));
 assert.doesNotMatch(overview,/serviceRows\.map/);
 assert.doesNotMatch(overview,/grid grid-cols-2 gap-3 xl:grid-cols-4/);
});

test("overview styling does not touch rich document sheets or hide actionable status",()=>{
 const css=source("app/rotevo-ui3.css");
 assert.match(css,/rv-ui3-overview-summary/);
 assert.match(css,/rv-ui3-client-overview-panel/);
 assert.doesNotMatch(css,/\.se-paper\s*\{/);
 assert.doesNotMatch(css,/\.bn-editor\s*\{/);
});

test("strategic editor UI3 uses compact navigation and preserves safe authorized saving",()=>{
 const page=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 const shell=source("Components/admin/PlanningAdminShell.tsx");
 const css=source("app/rotevo-ui3.css");
 assert.match(shell,/pw-app rv-ui2 rv-ui3 workspace-production/);
 assert.match(page,/admin-manage-v2 rv-ui2 rv-ui3 workspace-project-page/);
 assert.match(page,/rv-ui3-planning-tabs/);
 assert.match(page,/rv-ui3-planning-header/);
 assert.match(page,/documentSearch/);
 assert.match(page,/matchesDocumentSearch\(doc\)/);
 assert.match(page,/saveDocumentScope/);
 assert.match(page,/expectedUpdatedAt:current\.updated_at/);
 assert.match(page,/expectedUpdatedAt:project\.updated_at/);
 assert.match(page,/onSaved=/);
 assert.match(page,/richDirty\|\|richBusy/);
 assert.match(css,/rv-ui3-planning-tabs/);
 assert.match(css,/rv-ui3-document-group/);
 assert.doesNotMatch(css,/\.se-paper\s*\{/);
 assert.doesNotMatch(css,/\.bn-editor\s*\{/);
});

test("scheduling remains editable by area without automatically publishing documents",()=>{
 const schedule=source("Components/admin/PlanningAreaScheduleEditor.tsx");
 const planning=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 assert.match(schedule,/rv-ui3-area-schedule/);
 assert.match(schedule,/onSave\(next\)/);
 assert.match(schedule,/normalizedPlanningAreaSchedule\(initial\)/);
 assert.match(schedule,/visibleToClient/);
 assert.match(planning,/planningClientAccessEnabled/);
 assert.match(planning,/PlanningScheduleEditor/);
});

test("execution detail form is a contextual drawer with existing concurrency-safe save",()=>{
 const execution=source("Components/admin/ExecutionTimelineEditor.tsx");
 assert.match(execution,/rv-ui3-execution-editor/);
 assert.match(execution,/DialogFocus/);
 assert.match(execution,/role="dialog"/);
 assert.match(execution,/setEditing\(null\)/);
 assert.match(execution,/expectedUpdatedAt:updatedAt/);
 assert.match(execution,/saveItem/);
 assert.match(execution,/dependencies/);
 assert.match(execution,/visibleToClient/);
});

test("editorial admin and client share channel filtering without duplicating content stores",()=>{
 const calendar=source("Components/cliente/EditorialCalendar.tsx");
 const admin=source("Components/admin/EditorialManager.tsx");
 const portal=source("Components/cliente/ClientContent.tsx");
 assert.match(calendar,/channelFilter/);
 assert.match(calendar,/Filtrar conteúdos por canal/);
 assert.match(calendar,/i\.channel===channelFilter/);
 assert.match(calendar,/visibleToClient===true/);
 assert.match(admin,/rv-ui3-editorial-form/);
 assert.match(admin,/ideaSummary/);
 assert.match(admin,/objective/);
 assert.match(admin,/references/);
 assert.match(admin,/visibleToClient/);
 assert.match(admin,/version/);
 assert.match(portal,/view==="approvals"\?approvals:displayed/);
 assert.match(portal,/x\.status==="idea_pending"\|\|x\.status==="awaiting"/);
 assert.match(portal,/i\.visibleToClient===true/);
 assert.match(portal,/d\.content_version===\(i\.version\?\?""\)/);
 assert.match(portal,/EditorialDecision/);
 assert.match(portal,/EditorialIdeaDecision/);
 assert.match(portal,/loadError/);
});

test("campaign metrics retain monthly manual source, missing values, and per-project guards",()=>{
 const hub=source("Components/admin/CampaignsHub.tsx");
 const client=source("Components/cliente/ClientCampaigns.tsx");
 assert.match(hub,/rv-ui3-campaign-metrics/);
 assert.match(hub,/rv-ui3-campaign-list/);
 assert.match(hub,/Dados informados manualmente/);
 assert.match(hub,/Ausência de dados não equivale a zero/);
 assert.match(hub,/Alcance único não é somado/);
 assert.match(hub,/monthRows=scoped\.filter/);
 assert.match(hub,/values\.length\?values\.reduce/);
 assert.match(hub,/expectedUpdatedAt:project\.updated_at/);
 assert.match(hub,/DialogFocus/);
 assert.match(client,/visibleToClient===true/);
 assert.match(client,/role="dialog"/);
});

test("meeting minutes and tasks stay project-bound and client-sharing is explicit",()=>{
 const admin=source("Components/admin/OperationalAgenda.tsx");
 const hub=source("Components/admin/OperationalHubs.tsx");
 const portal=source("Components/cliente/ClientMeetings.tsx");
 const projection=source("lib/security/projectForClient.ts");
 const api=source("app/api/admin/project/update/route.ts");
 assert.match(admin,/internalNotes/);
 assert.match(admin,/actionItems/);
 assert.match(admin,/minutesHistory/);
 assert.match(admin,/Reuniões realizadas e atas registradas são preservadas/);
 assert.match(portal,/Encaminhamentos definidos/);
 assert.match(projection,/projected\.actionItems/);
 assert.match(api,/authenticated server identity/);
 assert.match(api,/minutesHistory:history/);
 assert.match(api,/nextIds\.has\(old\.id\)/);

 assert.match(admin,/minutesVisibleToClient/);
 assert.match(admin,/relatedTaskId/);
 assert.match(admin,/tasks\.some\(t=>t\.id===editing\.relatedTaskId\)/);
 assert.match(admin,/expectedUpdatedAt:updatedAt/);
 assert.match(admin,/Compartilhar compromisso e pauta/);
 assert.match(hub,/rv-ui3-meetings/);
 assert.match(portal,/view==="history"/);
 assert.match(portal,/visibleToClient===true/);
 assert.match(projection,/item\.minutesVisibleToClient === false/);
 assert.doesNotMatch(projection,/internalNotes:"/);
 assert.match(api,/oldRoot\.operationalAgenda/);
 assert.match(api,/minutesVisibleToClient/);
 assert.match(api,/validHttps\(item\.meetingUrl\)/);
});


test("client finance only displays payments linked to authorized invoices and preserves financial segregation",()=>{
 const finance=source("Components/cliente/ClientFinanceView.tsx");
 const portal=source("Components/finance/ClientFinance.tsx");
 const contracts=source("Components/cliente/ClientContracts.tsx");
 assert.match(finance,/data\.settlements\.flatMap\(payment=>/);
 assert.match(finance,/if\(!invoice\)return \[\]/);
 assert.doesNotMatch(finance,/entries\.find\(i=>i\.id===payment\.invoice_id\)!/);
 assert.match(finance,/balance\(i\)/);
 assert.match(finance,/data\.paymentLinks/);
 assert.match(finance,/AuthorizedFileLink/);
 assert.match(finance,/Consulta dos registros autorizados/);
 assert.match(portal,/financeRequest\(true\)/);
 assert.match(contracts,/AuthorizedFileLink/);
 assert.match(contracts,/contract\.history/);
});


test("UI3 finance administrator retains authorized operations and filtered contract workspace",()=>{
 const hub=source("Components/finance/FinanceHub.tsx");
 const lifecycle=source("Components/finance/FinanceLifecycleDialog.tsx");
 const clientFinance=source("Components/cliente/ClientFinanceView.tsx");
 const contracts=source("Components/cliente/ClientContracts.tsx");
 const api=source("lib/finance/api.ts");
 assert.match(hub,/rv-ui3-finance-workspace/);
 assert.match(hub,/rv-ui3-finance-contract-list/);
 assert.match(hub,/rv-ui3-finance-summary/);
 assert.match(hub,/visibleContracts=state\.contracts\.filter/);
 assert.match(hub,/contractStatus==="all"\|\|c\.status===contractStatus/);
 assert.match(hub,/Buscar contrato por título ou cliente/);
 assert.match(hub,/Filtrar contratos por situação/);
 assert.match(hub,/state\.contracts\.length>0&&!visibleContracts\.length/);
 assert.match(hub,/state\.canWrite&&/);
 assert.match(hub,/invoice\.settle/);
 assert.match(hub,/recurrence\.generate/);
 assert.match(hub,/settlement\.reverse/);
 assert.match(hub,/settings\.save/);
 assert.match(hub,/accountBalance\(state/);
 assert.match(hub,/!s\.reversed/);
 assert.match(lifecycle,/version:invoice!\.version/);
 assert.match(clientFinance,/rv-ui3-finance-summary/);
 assert.match(clientFinance,/data\.settlements\.flatMap\(payment=>/);
 assert.match(clientFinance,/totalPaid=paidEntries\.reduce/);
 assert.match(clientFinance,/if\(!invoice\)return \[\]/);
 assert.match(contracts,/rv-ui3-client-contracts/);
 assert.match(contracts,/AuthorizedFileLink/);
 assert.match(api,/clientView\?"\/api\/client\/finance":"\/api\/admin\/finance"/);
});
