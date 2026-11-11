// No network or production access. Enforce consistency of the rollback release gate.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=(path)=>readFileSync(new URL("../../"+path, import.meta.url),"utf8");

test("a restricted-grant release must never roll back to legacy UI2",()=>{
 const rollback=load("scripts/security/pg-planning-postrelease-safe-rollback.sql");
 const runbook=load("docs/ui/rotevo-ui3-release-preproduction-runbook-20261110.md");
 assert.match(rollback,/Never roll back to legacy UI2/i);
 assert.match(rollback,/PREVALIDATED application artifact compatible with restricted grants/);
 assert.match(runbook,/N[aã]o.*reverter.*UI2/i);
 assert.match(rollback,/Unsafe grant restoration detected before app rollback/);
 assert.doesNotMatch(rollback,/^\s*GRANT\s+(?:ALL|SELECT|UPDATE)\b/im);
});

test("private JSON restriction cannot silently restore direct browser grants",()=>{
 const grant=load("docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql");
 assert.match(grant,/REVOKE SELECT, UPDATE ON TABLE public\.planning_projects FROM anon,authenticated/);
 assert.match(grant,/GRANT SELECT \(id,client_id,title,slug,description,status,published_at,created_at,updated_at\)/);
 assert.doesNotMatch(grant,/GRANT\s+(?:ALL|SELECT|UPDATE)\s+ON\s+(?:TABLE\s+)?public\.planning_projects\s+TO\s+(?:anon|authenticated)/i);
 assert.match(grant,/has_column_privilege\('service_role','public\.planning_projects','data','UPDATE'\)/);
});

test("cutover procedure requires active UI3 and traffic containment before revoking private JSON grants",()=>{
 const runbook=load("docs/ui/rotevo-ui3-release-preproduction-runbook-20261110.md");
 assert.match(runbook,/não aplicar REVOKE enquanto qualquer instância UI2 puder receber tráfego legítimo/i);
 assert.match(runbook,/confirmar a versão efetivamente ativa e a ausência de instâncias UI2/i);
 assert.match(runbook,/se não houver mecanismo demonstrável para essa contenção, \*\*NO-GO\*\*/i);
 assert.match(runbook,/usar apenas um artefato compatível com grants restritos/i);
});
