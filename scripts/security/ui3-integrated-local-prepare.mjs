// Copies selected SQL into a fresh, unlinked, temporary Supabase test project only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {baselineFiles} from './ui3-sql-baseline.mjs';
const target=resolve(process.argv[2]??'');
const scratch=realpathSync(process.env.RUNNER_TEMP||tmpdir());
assert.ok(target.startsWith(scratch+sep),'test project must be under the temporary runner directory');
assert.ok(existsSync(join(target,'supabase/config.toml')),'initialize a detached project first');
assert.ok(!existsSync(join(target,'supabase/.temp/project-ref')),'refuse a linked project');
const repo=realpathSync(new URL('../..',import.meta.url));
assert.ok(relative(repo,target).startsWith('..'),'refuse repository migration directory');
const migrationDir=join(target,'supabase/migrations');mkdirSync(migrationDir,{recursive:true});
for(const [i,file] of [...baselineFiles,'docs/security/sql/ui3-private-planning-json-grants-PROPOSAL-ONLY.sql','docs/security/sql/ui3-editorial-rpc-hardening-PROPOSAL-ONLY.sql','docs/security/sql/ui3-collaboration-messages-PROPOSAL-ONLY.sql'].entries()){
 writeFileSync(join(migrationDir,String(20261110000000+i)+'_synthetic_lab.sql'),readFileSync(new URL('../../'+file,import.meta.url)));
}
console.log('Prepared selected SQL baseline plus grant, editorial RPC and collaboration table proposals in detached local test project. No hosted execution.');
