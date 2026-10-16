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
