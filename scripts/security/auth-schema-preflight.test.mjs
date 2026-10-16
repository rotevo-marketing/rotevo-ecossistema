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
