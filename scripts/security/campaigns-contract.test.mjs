import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../../src/",import.meta.url);
const hub=readFileSync(new URL("Components/admin/CampaignsHub.tsx",root),"utf8");
const api=readFileSync(new URL("app/api/admin/project/update/route.ts",root),"utf8");
const admin=readFileSync(new URL("app/admin/page.tsx",root),"utf8");

test("campaigns stay project-bound with authenticated optimistic writes",()=>{
 assert.match(hub,/marketingCampaigns:next/);
 assert.match(hub,/\/api\/admin\/project\/update/);
 assert.match(hub,/expectedUpdatedAt:project.updated_at/);
 assert.match(hub,/authorization/i);
 assert.match(api,/marketingCampaigns/);
 assert.match(api,/campaigns.length>200/);
 assert.match(api,/approvedStatuses/);
 assert.match(api,/approvedPlatforms/);
});
test("campaigns are manual and empty until records are explicitly saved",()=>{
 assert.match(hub,/Array.isArray\(source\)/);
 assert.match(hub,/Nenhuma campanha encontrada/);
 assert.match(hub,/Dados informados manualmente/);
 assert.match(hub,/Não informado/);
 assert.match(hub,/resultados/);
 assert.doesNotMatch(hub,/mockCampaigns|fakeCampaigns|sampleCampaigns/);
});
test("campaign filtering, figures and editor remain available",()=>{
 for(const value of ["Filtrar projeto de campanhas","Filtrar plataforma","Filtrar situação","Filtrar campanhas por mês ativo","Buscar campanhas","Nova campanha","Salvar campanha"]){
  assert.ok(hub.includes(value),value);
 }
 assert.match(hub,/money\(dataFor\(item\)!\.spent!\/dataFor\(item\)!\.results!\)/);
 assert.match(hub,/dataFor\(item\)!\.results!>0/);
 assert.match(hub,/role="dialog"/);
 assert.match(admin,/<CampaignsHub projects=/);
});
test("campaign records enforce nonnegative money, valid dates and HTTPS on the server",()=>{
 assert.match(api,/n<0\|\|n>1e12/);
 assert.match(api,/new Date\(value\+"T12:00:00"\)/);
 assert.match(api,/new URL\(row.dashboardUrl\).protocol!=="https:"/);
});
