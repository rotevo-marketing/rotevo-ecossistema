import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const invite=read("../../src/app/api/team/invite/route.ts");
const directory=read("../../src/app/api/team/directory/route.ts");
const grants=read("../../supabase/migrations/20261015_harden_profile_authorization.sql");
const team=read("../../supabase/migrations/20261015_team_roles.sql");
const audit=read("../../supabase/migrations/20261016_team_access_audit.sql");
test("release gate: restricted profile-column grants are part of the migration",()=>{
 assert.match(grants,/revoke update on table public\.profiles from anon, authenticated/i);
 assert.match(grants,/grant update \(full_name\) on table public\.profiles to authenticated/i);
});
test("release gate: audited team mutation remains service-role-only",()=>{
 assert.match(audit,/revoke all on function public\.rotevo_change_team_access[^;]+from public, anon, authenticated/i);
 assert.match(audit,/grant execute on function public\.rotevo_change_team_access[^;]+to service_role/i);
 assert.match(audit,/alter table public\.team_audit_events enable row level security/i);
});
test("release gate: directory requires active administrator and role",()=>{
 assert.match(directory,/profile\?\.role!=="strategist"/);
 assert.match(directory,/member\?\.role!=="admin"\|\|member\.active!==true/);
 assert.match(invite,/ROTEVO_TEAM_INVITES_ENABLED/);
 assert.match(team,/team_project_assignments/);
});
