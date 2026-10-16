import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const root=new URL("../../src/",import.meta.url);
const files=[
 "Components/admin/ExecutionTimelineEditor.tsx",
 "Components/admin/ProjectOnboarding.tsx",
 "Components/admin/EditorialManager.tsx",
 "app/admin/planejamentos/[clientSlug]/page.tsx",
 "app/admin/planejamentos/[clientSlug]/modulos/[moduleSlug]/page.tsx"
];

test("all migrated editors write project JSON via authorized API",()=>{
 for(const path of files){
  const code=readFileSync(new URL(path,root),"utf8");
  assert.match(code,/\/api\/admin\/project\/update/,path);
  assert.doesNotMatch(code,/\.from\("planning_projects"\)\s*\.update\(\{\s*data\s*:/,path);
 }
});

test("administrative write API checks identity, role and expected version",()=>{
 const code=readFileSync(new URL("app/api/admin/project/update/route.ts",root),"utf8");
 assert.match(code,/auth\.getUser\(/);
 assert.match(code,/profile\?\.role\s*!==\s*"strategist"/);
 assert.match(code,/\.eq\("updated_at",b\.expectedUpdatedAt\)/);
 assert.match(code,/if\(!updated\)return fail\(409\)/);
 assert.match(code,/"Cache-Control":"no-store"/);
});

test("administrative read API authenticates and authorizes before fetching document",()=>{
 const code=readFileSync(new URL("app/api/admin/project/route.ts",root),"utf8");
 const auth=code.indexOf("auth.getUser("),role=code.indexOf('profile?.role!=="strategist"'),project=code.indexOf('.from("planning_projects")');
 assert.ok(auth>=0&&role>auth&&project>role);
});
