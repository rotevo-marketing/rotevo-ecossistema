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
 assert.match(adminOverview,/rv-ui2-dashboard-intro/);
 assert.match(adminOverview,/rv-ui2-overview-kpi/);
 assert.match(client,/rv-ui2-client-heading/);
 assert.match(client,/tab==="overview"\?"Seu projeto, em perspectiva\."/);
});

test("new workspace hero layouts support small screens and preserve document content",()=>{
 const adminCss=source("app/admin/rotevo-ui2.css");
 const sharedCss=source("app/rotevo-ui2-shared.css");
 assert.match(adminCss,/\.rv-ui2-workspace-heading/);
 assert.match(adminCss,/@media\(max-width:430px\)/);
 assert.match(sharedCss,/\.rv-ui2-client-heading/);
 assert.match(sharedCss,/@media\(max-width:767px\)/);
 assert.doesNotMatch(sharedCss,/\.se-paper\s*\{/);
 assert.doesNotMatch(sharedCss,/\.bn-editor\s*\{/);
});
