import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../../src/app/api/admin/create-client-access/route.ts", import.meta.url), "utf8");
const invite = readFileSync(new URL("../../src/app/api/team/invite/route.ts", import.meta.url), "utf8");

function before(src, earlier, later, label) {
  const a = src.indexOf(earlier), b = src.indexOf(later);
  assert.ok(a !== -1 && b !== -1 && a < b, label);
}
test("client access: token and strategist check precede Auth user creation", () => {
  before(client, 'if (!token)', "auth.getUser(token)", "JWT must be required before verification");
  before(client, "auth.getUser(token)", 'callerProfile.role !== "strategist"', "verified identity before role check");
  before(client, 'callerProfile.role !== "strategist"', "auth.admin.createUser(", "role check before admin create");
});
test("client access: created users always have client role", () => {
  assert.match(client, /user_metadata:\s*\{\s*full_name:\s*fullName,\s*role:\s*"client"/);
  assert.match(client, /role:\s*"client",\s*client_id:\s*clientId/);
});
test("team invite: valid auth and active admin must precede invite", () => {
  before(invite, 'if (!auth?.startsWith("Bearer "))', "auth.getUser(auth.slice(7))", "bearer required before verify");
  before(invite, 'member.role !== "admin" || member.active !== true', "auth.admin.inviteUserByEmail(", "active admin required");
});
test("team invite: role allowlist excludes admin and input cannot grant project", () => {
  assert.match(invite, /new Set\(\["strategist",\s*"project_manager",\s*"producer",\s*"finance"\]\)/);
  assert.doesNotMatch(invite, /const\s*\{[^}]*\b(projectId|clientId|permissions)\b/);
});

test("client access: target exists before Auth creation", () => {
  before(client, '.from("clients")', "auth.admin.createUser(", "target client lookup must happen before creating account");
  assert.match(client, /if \(targetClientError \|\| !targetClient\)/);
});
test("client access: profile failure triggers only new-user compensation", () => {
  const onFailure = client.slice(client.indexOf("if (upsertError) {"), client.indexOf("// ── 10. Success"));
  assert.match(onFailure, /compensateNewClientAccount\(supabaseAdmin, userId\)/);
  assert.match(onFailure, /if \(rollback\.reconciliationRequired\)/);
  assert.match(onFailure, /reconciliationRequired:\s*true/);
  assert.match(onFailure, /status:\s*500/);
});

test("client access: missing Auth UID requires explicit reconciliation and prevents profile write", () => {
  const missing = client.slice(client.indexOf("if (!userId) {"), client.indexOf("// ── 9. Upsert client profile"));
  assert.match(missing, /reconciliationRequired:\s*true/);
  assert.match(missing, /status:\s*500/);
  before(client, "if (!userId) {", '.from("profiles").upsert(', "missing UID guard precedes profile update");
});

test("client access: duplicate Auth account cannot trigger profile upsert or rollback", () => {
  const segment = client.slice(client.indexOf("if (createError) {"), client.indexOf("const userId = newUser.user?.id"));
  assert.match(segment, /status:\s*409/);
  assert.match(segment, /if \(alreadyExists\)/);
  assert.doesNotMatch(segment, /\.from\("profiles"\)\.upsert\(/);
  assert.doesNotMatch(segment, /compensateNewClientAccount\(/);
});
test("client access: successful response appears only after profile upsert handling", () => {
  before(client, '.from("profiles").upsert(', "if (upsertError) {", "upsert precedes its failure handling");
  before(client, "if (upsertError) {", "success: true,", "never report success before profile write is checked");
});
test("client access: reconciliation marker is surfaced for failed rollback", () => {
  const branch = client.slice(client.indexOf("if (upsertError) {"), client.indexOf("// ── 10. Success"));
  assert.match(branch, /rollback\.reconciliationRequired/);
  assert.match(branch, /reconciliationRequired:\s*true/);
  assert.match(branch, /status:\s*500/);
});

const teamDirectory = readFileSync(new URL("../../src/Components/admin/TeamDirectory.tsx", import.meta.url), "utf8");
test("team invitation rejects extra permission grants and malformed body shapes", () => {
 assert.match(invite, /Array\.isArray\(input\)/);
 assert.match(invite, /Object\.keys\(input\).*permissions|Object\.keys\(input\)/);
 assert.match(invite, /Campos não autorizados/);
 before(invite, "Campos não autorizados", "auth.admin.inviteUserByEmail(", "extra fields rejected before sending invitations");
});
test("team invitation requires active team admin, and UI stays read only", () => {
 before(invite, 'member.role !== "admin" || member.active !== true', "auth.admin.inviteUserByEmail(", "team admin authorization");
 assert.match(teamDirectory, /Convites em preparação/);
 assert.doesNotMatch(teamDirectory, /inviteUserByEmail|\/api\/team\/invite/);
});

test("team invitations require an explicit server-side rollout flag",()=>{
 assert.match(invite, /ROTEVO_TEAM_INVITES_ENABLED !== "true"/);
 before(invite, 'ROTEVO_TEAM_INVITES_ENABLED !== "true"', "auth.admin.inviteUserByEmail(", "invite must remain disabled by default");
});

const directoryRoute = readFileSync(new URL("../../src/app/api/team/directory/route.ts", import.meta.url), "utf8");
test("team directory only returns data after verified strategist and active admin checks",()=>{
 before(directoryRoute, 'if(!token?.startsWith("Bearer ")', "auth.getUser(token.slice(7))", "token required");
 before(directoryRoute, "auth.getUser(token.slice(7))", 'profile?.role!=="strategist"', "verify session before role");
 before(directoryRoute, 'profile?.role!=="strategist"', 'member?.role!=="admin"||member.active!==true', "strategist and active admin");
 before(directoryRoute, 'member?.role!=="admin"||member.active!==true', '.from("team_members")\n  .select("user_id', "check role before directory query");
 assert.match(directoryRoute, /Cache-Control.*no-store/);
});
test("team directory UI never reads membership table with browser credentials",()=>{
 assert.match(teamDirectory, /fetch\("\/api\/team\/directory"/);
 assert.doesNotMatch(teamDirectory, /supabase\.from\("team_members"\)/);
});

test("team directory reads assignments and permissions only after admin authorization",()=>{
 before(directoryRoute, 'member?.role!=="admin"||member.active!==true', '.from("team_project_assignments")', "assignments protected");
 before(directoryRoute, 'member?.role!=="admin"||member.active!==true', '.from("team_member_permissions")', "permissions protected");
 assert.match(directoryRoute,/if\(assignmentsError\)return fail\(503\)/);
 assert.match(directoryRoute,/if\(permissionsError\)return fail\(503\)/);
 assert.match(teamDirectory,/data\?\.assignments/);
 assert.match(teamDirectory,/data\?\.permissions/);
});

const permissionRoute=readFileSync(new URL("../../src/app/api/team/permissions/route.ts",import.meta.url),"utf8");
test("permission mutations require verified active admin and explicit rollout",()=>{
 before(permissionRoute,'auth.getUser(bearer.slice(7))','profile?.role!=="strategist"',"verified user");
 before(permissionRoute,'profile?.role!=="strategist"','caller?.role!=="admin"||caller.active!==true',"caller role");
 before(permissionRoute,'caller?.role!=="admin"||caller.active!==true','ROTEVO_TEAM_PERMISSIONS_ENABLED!=="true"',"active administrator required");
 before(permissionRoute,'ROTEVO_TEAM_PERMISSIONS_ENABLED!=="true"','.upsert({user_id:userId,permission}',"disabled by default");
 before(permissionRoute,'ROTEVO_TEAM_PERMISSIONS_ENABLED!=="true"','.delete().eq("user_id",userId)',"disabled before revocation");
});
test("permission mutations disallow self editing, inactive targets and admin role",()=>{
 assert.match(permissionRoute,/userId===identity\.user\.id/);
 assert.match(permissionRoute,/target\.active!==true/);
 assert.match(permissionRoute,/target\.role==="admin"/);
 assert.match(permissionRoute,/Object\.keys\(input\)/);
 assert.doesNotMatch(permissionRoute,/team\.manage/);
});

const assignmentRoute=readFileSync(new URL("../../src/app/api/team/assignments/route.ts",import.meta.url),"utf8");
test("project assignment writes require administrator approval and rollout",()=>{
 before(assignmentRoute,'auth.getUser(bearer.slice(7))','caller?.role!=="admin"||caller.active!==true',"identity before admin");
 before(assignmentRoute,'caller?.role!=="admin"||caller.active!==true','ROTEVO_TEAM_ASSIGNMENTS_ENABLED!=="true"',"active admin before feature gate");
 before(assignmentRoute,'ROTEVO_TEAM_ASSIGNMENTS_ENABLED!=="true"','.from("team_project_assignments").upsert(',"disabled by default");
 before(assignmentRoute,'.from("planning_projects").select("id")','.from("team_project_assignments").upsert(',"project must exist");
 assert.match(assignmentRoute,/userId===identity\.user\.id/);
 assert.match(assignmentRoute,/target\.active!==true/);
 assert.match(assignmentRoute,/target\.role==="admin"/);
 assert.match(assignmentRoute,/Object\.keys\(input\)/);
});

test("team directory exposes read-only member detail without enabling permission editing",()=>{
 assert.match(teamDirectory,/Ver atribuições e permissões/);
 assert.match(teamDirectory,/aria-expanded/);
 assert.match(teamDirectory,/permissions\.filter\(p=>p\.user_id===m\.user_id\)/);
 assert.match(teamDirectory,/assignments\.filter\(a=>a\.user_id===m\.user_id\)/);
 assert.doesNotMatch(teamDirectory,/fetch\("\/api\/team\/(?:permissions|assignments)"/);
});

const memberStatusRoute=readFileSync(new URL("../../src/app/api/team/members/status/route.ts",import.meta.url),"utf8");
test("member status requires verified administrator and explicit activation flag",()=>{
 before(memberStatusRoute,'auth.getUser(bearer.slice(7))','caller?.role!=="admin"||caller.active!==true',"verified caller");
 before(memberStatusRoute,'caller?.role!=="admin"||caller.active!==true','ROTEVO_TEAM_MEMBER_STATUS_ENABLED!=="true"',"active admin");
 before(memberStatusRoute,'ROTEVO_TEAM_MEMBER_STATUS_ENABLED!=="true"','.update({active})',"disabled by default");
 assert.match(memberStatusRoute,/userId===identity\.user\.id/);
 assert.match(memberStatusRoute,/target\.role==="admin"/);
 assert.match(memberStatusRoute,/\.eq\("active",target\.active\)/);
 assert.match(memberStatusRoute,/\.neq\("role","admin"\)/);
});

const teamMemberControls=readFileSync(new URL("../../src/Components/admin/TeamMemberControls.tsx",import.meta.url),"utf8");
const teamInviteForm=readFileSync(new URL("../../src/Components/admin/TeamInviteForm.tsx",import.meta.url),"utf8");
test("administrative team controls are gated by authenticated server rollout capabilities",()=>{
 assert.match(directoryRoute,/ROTEVO_TEAM_PERMISSIONS_ENABLED==="true"/);
 assert.match(directoryRoute,/ROTEVO_TEAM_ASSIGNMENTS_ENABLED==="true"/);
 assert.match(directoryRoute,/ROTEVO_TEAM_MEMBER_STATUS_ENABLED==="true"/);
 assert.match(directoryRoute,/ROTEVO_TEAM_INVITES_ENABLED==="true"/);
 assert.match(teamDirectory,/capabilities\.invites&&<TeamInviteForm/);
 assert.match(teamMemberControls,/if\(!editable\|\|!capabilities\.permissions/);
 assert.match(teamMemberControls,/capabilities\.memberStatus/);
 assert.match(teamMemberControls,/capabilities\.assignments/);
 assert.match(teamMemberControls,/capabilities\.permissions/);
});
test("team editing requests use bearer token and never write Supabase tables in the browser",()=>{
 assert.match(teamMemberControls,/supabase\.auth\.getSession\(\)/);
 assert.match(teamInviteForm,/supabase\.auth\.getSession\(\)/);
 assert.match(teamMemberControls,/Authorization:/);
 assert.match(teamInviteForm,/Authorization:/);
 assert.doesNotMatch(teamMemberControls,/supabase\.from\(/);
 assert.doesNotMatch(teamInviteForm,/supabase\.from\(/);
});

const projectUpdateRoute=readFileSync(new URL("../../src/app/api/admin/project/update/route.ts",import.meta.url),"utf8");
test("staged project writes enforce active team status, project assignment and write permission",()=>{
 before(projectUpdateRoute,'profile?.role!=="strategist"','ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED==="true"',"legacy role before gate");
 before(projectUpdateRoute,'ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED==="true"','.from("team_project_assignments")',"rollout gate before project ACL");
 before(projectUpdateRoute,'member.active!==true','.from("team_project_assignments")',"inactive users denied");
 before(projectUpdateRoute,'.from("team_project_assignments")','.from("team_member_permissions")',"project assignment before write grant");
 before(projectUpdateRoute,'.eq("permission","projects.write")','.from("planning_projects")',"write grant before project data");
 assert.match(projectUpdateRoute,/if\(!assignment\)return fail\(403\)/);
 assert.match(projectUpdateRoute,/if\(!permission\)return fail\(403\)/);
});

const projectsListRoute=readFileSync(new URL("../../src/app/api/admin/projects/route.ts",import.meta.url),"utf8");
test("staged project listing enforces active membership, read permission and project filtering",()=>{
 before(projectsListRoute,'profile?.role!=="strategist"','ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED==="true"',"legacy role before feature gate");
 before(projectsListRoute,'member.active!==true','.eq("permission","projects.read")',"active membership checked");
 before(projectsListRoute,'.eq("permission","projects.read")','.from("team_project_assignments")',"read grant before assignment enumeration");
 assert.match(projectsListRoute,/query=query\.in\("id",allowedProjectIds\)/);
 assert.match(projectsListRoute,/allowedProjectIds\.length===0/);
});

const sharedProjectAuth=readFileSync(new URL("../../src/lib/security/teamProjectAuthorization.ts",import.meta.url),"utf8");
const projectDeleteRoute=readFileSync(new URL("../../src/app/api/admin/project/delete/route.ts",import.meta.url),"utf8");
const projectStatusRoute=readFileSync(new URL("../../src/app/api/admin/project/status/route.ts",import.meta.url),"utf8");
test("project status and deletion enforce the same server-side authorization",()=>{
 for(const route of [projectDeleteRoute,projectStatusRoute]){
  before(route,"auth.getUser(header.slice(7))","mayMutateProject(admin,identity.user.id,b.projectId)","verify caller before authorization");
  before(route,"mayMutateProject(admin,identity.user.id,b.projectId)","if(!access.allowed)return fail(access.status)","deny before database change");
  before(route,"if(!access.allowed)return fail(access.status)",'.from("planning_projects")',"authorize before changing project");
 }
});
test("shared project guard fails closed for inactive and unassigned members",()=>{
 assert.match(sharedProjectAuth,/ROTEVO_TEAM_ACCESS_ENFORCEMENT_ENABLED/);
 assert.match(sharedProjectAuth,/member\.active!==true/);
 assert.match(sharedProjectAuth,/if\(!assignment\)/);
 assert.match(sharedProjectAuth,/projects\.write/);
 assert.match(sharedProjectAuth,/status:503/);
});

test("invitation authorization checks trusted strategist profile before membership or email",()=>{
 before(invite, 'auth.getUser(auth.slice(7))', '.from("profiles")', "verified JWT before profile");
 before(invite, 'profile?.role !== "strategist"', '.from("team_members")', "strategist role before team membership");
 before(invite, 'member.role !== "admin" || member.active !== true', 'ROTEVO_TEAM_INVITES_ENABLED !== "true"', "active team admin before rollout");
 before(invite, 'ROTEVO_TEAM_INVITES_ENABLED !== "true"', 'auth.admin.inviteUserByEmail(', "rollout before email side-effect");
});
