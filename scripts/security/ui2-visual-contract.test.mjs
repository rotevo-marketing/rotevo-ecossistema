import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const source=(relative)=>readFileSync(fileURLToPath(new URL("../../src/"+relative,import.meta.url)),"utf8");

test("lightwork themes are scoped to the correct workspaces",()=>{
 assert.match(source("app/admin/page.tsx"),/admin-v2 rv-ui2/);
 assert.match(source("app/cliente/page.tsx"),/client-portal-v2 rv-ui2/);
 assert.match(source("Components/admin/PlanningAdminShell.tsx"),/pw-app rv-ui2/);
 assert.match(source("app/admin/planejamentos/[clientSlug]/page.tsx"),/admin-manage-v2 rv-ui2/);
 assert.match(source("app/layout.tsx"),/rotevo-ui2-shared\.css/);
});

test("unified modules adopt the UI2 density class",()=>{
 for(const path of [
  "Components/admin/ClientsDirectory.tsx","Components/admin/EditorialManager.tsx",
  "Components/admin/CampaignsHub.tsx","Components/admin/TeamDirectory.tsx",
  "Components/admin/OperationalHubs.tsx","Components/finance/FinanceHub.tsx",
  "Components/cliente/ClientOverview.tsx","Components/cliente/ClientCampaigns.tsx",
  "Components/cliente/ClientContent.tsx","Components/cliente/ClientMeetings.tsx",
  "Components/cliente/ClientContracts.tsx","Components/cliente/ClientDrive.tsx",
  "Components/finance/ClientFinance.tsx","Components/cliente/ProjectTimeline.tsx"
 ]) assert.match(source(path),/rv-ui2-module/,path);
});

test("icon library uses Tabler outline for sidebar and mobile controls",()=>{
 const icons=source("Components/RotevoTablerIcon.tsx");
 for(const icon of ['menu-2','chevron-left','chevron-right'])assert.ok(icons.includes('"'+icon+'"'));
 for(const path of ["app/admin/page.tsx","app/cliente/page.tsx","Components/admin/PlanningAdminShell.tsx"])
  assert.match(source(path),/RotevoTablerIcon/);
});

test("shared stylesheet does not override rich text and keeps focus indicator",()=>{
 const css=source("app/rotevo-ui2-shared.css");
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.rv-ui2-module/);
 assert.doesNotMatch(css,/\.se-paper\s*\{/);
 assert.doesNotMatch(css,/\.bn-editor\s*\{/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});


test("all planning entrypoints use the scoped UI2 design system",()=>{
 for(const path of [
  "app/admin/novo-planejamento/page.tsx",
  "app/admin/novo-planejamento/modulos/page.tsx",
  "app/admin/planejamentos/[clientSlug]/acesso/page.tsx",
  "app/admin/planejamentos/[clientSlug]/page.tsx"
 ]) assert.match(source(path),/rv-ui2/,path);
});

test("mobile data tables only force intrinsic width inside scroll containers",()=>{
 const css=source("app/rotevo-ui2-shared.css");
 assert.match(css,/\.rv-ui2 \.rv-ui2-module table\s*\{\s*min-width:0;/);
 assert.match(css,/\.rv-ui2 \.rv-ui2-module :is\(\.overflow-x-auto,\.overflow-auto,\.rv-ui2-task-board\) > table\s*\{\s*min-width:max-content;/);
 assert.doesNotMatch(css,/\.rv-ui2 \.rv-ui2-module table\s*\{\s*min-width:max-content;/);
});


test("strategist and client dashboards have substantial UI2 workspace hierarchy",()=>{
 const admin=source("app/admin/page.tsx");
 const adminOverview=source("Components/admin/AdminOperationsOverview.tsx");
 const client=source("app/cliente/page.tsx");
 assert.match(admin,/rv-ui2-workspace-heading/);
 assert.match(admin,/rv-ui2-heading-primary/);
 assert.match(adminOverview,/rv-ui3-overview-summary/);
 assert.match(adminOverview,/rv-ui2-overview-kpi/);
 assert.match(client,/rv-ui2-client-heading/);
 assert.match(client,/tab==="overview"\?"Visão geral"/);
 assert.match(client,/client-portal-v2 rv-ui2 rv-ui3/);
 assert.match(admin,/admin-v2 rv-ui2 rv-ui3/);
});

test("workspace layout remains responsive and preserves document content",()=>{
 const adminCss=source("app/admin/rotevo-ui2.css");
 const sharedCss=source("app/rotevo-ui2-shared.css");
 assert.match(adminCss,/\.rv-ui2-workspace-heading/);
 assert.match(adminCss,/@media\(max-width:430px\)/);
 assert.match(sharedCss,/\.rv-ui2-client-heading/);
 assert.match(sharedCss,/@media\(max-width:767px\)/);
 assert.doesNotMatch(sharedCss,/\.se-paper\s*\{/);
 assert.doesNotMatch(sharedCss,/\.bn-editor\s*\{/);
});


test("UI2 interactive text pairs meet WCAG AA normal-text contrast",()=>{
 const luminance=(hex)=>{
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const linear=rgb.map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
  return linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722;
 };
 const contrast=(a,b)=>{
  const [lighter,darker]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (lighter+0.05)/(darker+0.05);
 };
 for(const [foreground,background] of [
  ["#5949D1","#FFFFFF"],["#5949D1","#EDEAFF"],
  ["#6C5CE7","#FFFFFF"],["#687487","#FFFFFF"]
 ]) assert.ok(contrast(foreground,background)>=4.5,`${foreground} on ${background}`);
});


test("UI2 preserves authenticated client module visibility and published document gating",()=>{
 const portal=source("app/cliente/page.tsx");
 const planning=source("Components/cliente/ClientPlanning.tsx");
 assert.match(portal,/supabase\.auth\.getUser\(\)/);
 assert.match(portal,/profile\.role!==\"client\"\|\|!profile\.client_id/);
 assert.match(portal,/!workspace\.modules\.includes\(tab as never\)/);
 assert.match(planning,/presentedDocumentCodes/);
 assert.match(planning,/selectedDocumentCodes/);
 assert.match(planning,/const published=knownDocuments\.filter\(doc=>released\.has\(doc\.code\)\)/);
 assert.match(planning,/visibleToClient/);
});

test("UI2 preserves strategist authorization and concurrency-safe planning saves",()=>{
 const planning=source("app/admin/planejamentos/[clientSlug]/page.tsx");
 assert.match(planning,/profile\?\.role !== "strategist"/);
 assert.match(planning,/expectedUpdatedAt:current\.updated_at/);
 assert.match(planning,/expectedUpdatedAt:project\.updated_at/);
 assert.match(planning,/if\(richDirty\|\|richBusy\)/);
 assert.match(planning,/onSaved=/);
 assert.match(planning,/aria-selected=\{planningTab===item\.id\}/);
 assert.match(planning,/event\.key==="ArrowRight"/);
});


test("workspace mobile overlays can be dismissed by Escape",()=>{
 const strategist=source("app/admin/page.tsx");
 const client=source("app/cliente/page.tsx");
 for(const [label,code] of [["strategist",strategist],["client",client]]){
  assert.match(code,/event\.key!=="Escape"|event\.key==="Escape"/,label);
  assert.match(code,/window\.addEventListener\("keydown",closeOnEscape\)/,label);
  assert.match(code,/window\.removeEventListener\("keydown",closeOnEscape\)/,label);
 }
 assert.match(client,/setProfileOpen\(false\)/);
 assert.match(client,/setMobileMenu\(false\)/);
});


test("switching client projects remounts project-scoped modules without stale document state",()=>{
 const portal=source("app/cliente/page.tsx");
 for(const name of ["ClientPlanning","ProjectTimeline","ClientContent","ClientCampaigns","ClientMeetings"]){
  const prefix="<"+name+" key={scopedProjects[0]?.id??\"no-project\"}";
  assert.ok(portal.includes(prefix),name+" must reset state when the authorized project changes");
 }
 assert.match(source("Components/cliente/ClientPlanning.tsx"),/result\?\.key===requestKey/);
 assert.match(source("Components/cliente/ClientPlanning.tsx"),/payload\.project\.id!==selected\.id/);
});
