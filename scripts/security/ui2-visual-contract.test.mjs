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
