import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const baseline = read("../../docs/security/verified-schema-baseline-draft.sql");
const policies = read("../../docs/security/observed-rls-policies-review-only.sql");
const grants = read("../../docs/security/observed-rls-and-grants-20261015.md");
const team = read("../../supabase/migrations/20261015_team_roles.sql");
const hardening = read("../../supabase/migrations/20261015_harden_profile_authorization.sql");

test("four documented baseline tables are present", () => {
  for (const name of ["clients", "profiles", "client_users", "planning_projects"]) {
    assert.match(baseline, new RegExp("create\\s+table\\s+public\\." + name + "\\s*\\(", "i"));
  }
});
test("exactly sixteen catalogued RLS policies refer to the expected tables", () => {
  const matches = [...policies.matchAll(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.(\w+)/gi)];
  assert.equal(matches.length, 16);
  assert.deepEqual([...new Set(matches.map(([,table]) => table))].sort(), ["client_users", "clients", "planning_projects", "profiles"]);
});
test("baseline is explicitly incomplete and not executable as-is", () => {
  assert.match(baseline, /NÃO EXECUTAR/i);
  assert.doesNotMatch(baseline, /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(public\.)?is_strategist\s*\(/i);
  assert.doesNotMatch(baseline, /CREATE\s+POLICY/i);
});
test("team roles and profile hardening are not silently treated as approved migrations", () => {
  assert.match(team, /PROPOSED ONLY/i);
  assert.match(hardening, /STAGED SECURITY FIX/i);
  assert.match(grants, /SECURITY DEFINER/i);
});

const hardeningDbTests=read("../../supabase/tests/database/team_authorization_hardening_test.sql");
test("profile hardening denies privilege-changing columns and preserves benign name edits",()=>{
 assert.match(hardening,/revoke update on table public\.profiles from anon, authenticated/i);
 assert.match(hardening,/grant update \(full_name\) on table public\.profiles to authenticated/i);
 for(const column of ["role","client_id"])assert.match(hardeningDbTests,new RegExp("has_column_privilege\\('authenticated','public.profiles','"+column+"','UPDATE'\\)"));
 assert.match(hardeningDbTests,/select plan\(10\)/);
 assert.match(hardeningDbTests,/rollback;/);
});
test("proposed team schema does not expose browser-side writes",()=>{
 assert.match(team,/alter table public\.team_members enable row level security/i);
 assert.match(team,/revoke all on public\.team_members,public\.team_project_assignments,public\.team_member_permissions from anon/i);
 assert.doesNotMatch(team,/grant\s+(insert|update|delete|all)\s+on\s+public\.team_members\s+to\s+authenticated/i);
});
