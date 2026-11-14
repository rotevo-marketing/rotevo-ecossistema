import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const source=path=>readFileSync(fileURLToPath(new URL("../../src/"+path,import.meta.url)),"utf8");

test("progressive planning only returns approved published snapshots",()=>{
 const projection=source("lib/security/projectForPresentation.ts");
 assert.match(projection,/data\.planningClientAccessEnabled===true/);
 assert.match(projection,/doc\.publishedContent/);
 assert.match(projection,/doc\.publishedAt/);
 assert.match(projection,/hiddenAreas/);
 assert.match(projection,/catalogDocumentCodes/);
 assert.doesNotMatch(projection,/\{content:doc\.content\}/);
});
test("planning dates cannot publish documents automatically",()=>{
 const dates=source("Components/admin/PlanningAreaScheduleEditor.tsx");
 assert.match(dates,/Concluir uma área ou informar uma data não publica/);
 assert.match(dates,/onSave\(next\)/);
 assert.doesNotMatch(dates,/publishedContent:/);
 const guard=source("app/api/admin/project/update/route.ts");
 assert.match(guard,/validPlanningAreaSchedule\(nextAreaSchedule\)/);
 assert.match(guard,/typeof nextAccess!=="boolean"/);
});
test("reader is read-only and uses authorized document presentation endpoint",()=>{
 const reader=source("Components/cliente/ClientPlanning.tsx");
 assert.match(reader,/api\/presentation\/project/);
 assert.match(reader,/DynamicDocumentReader/);
 assert.match(reader,/catalogDocumentCodes/);
 assert.match(reader,/Se[u]? planejamento est[aá] sendo constru[ií]do/);
 assert.doesNotMatch(reader,/contentEditable|saveDocument|publishDocument|setPublishedContent/);
});
