// Reuse the approved detached baseline; append only portal-specific schema dependencies.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const target=resolve(process.argv[2]);
const base=spawnSync(process.execPath,['scripts/security/ui3-integrated-local-prepare.mjs',target],{stdio:'inherit'});assert.equal(base.status,0);
const files=['ui3-gate-b-workflow','ui3-editorial-workflow-rpc','ui3-editorial-workflow-request','ui3-client-actions','ui3-client-action-rpc','ui3-client-action-submit','ui3-client-action-review','ui3-client-action-review-queue','ui3-client-action-notifications','ui3-production-notification-v2','ui3-content-message-event','ui3-account-appearance','ui3-strategist-client-assignments','ui3-portal-standardization-structures'];
for(const [i,n] of files.entries())writeFileSync(join(target,'supabase/migrations',String(20261111000000+i)+'_portal_lab.sql'),readFileSync('docs/security/sql/'+n+'-PROPOSAL-ONLY.sql','utf8'));
console.log('Prepared detached portal baseline and current candidate proposals. No hosted connection.');
