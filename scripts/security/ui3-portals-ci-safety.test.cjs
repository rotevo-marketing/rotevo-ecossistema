const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),yaml=require('js-yaml');
const workflow=fs.readFileSync('.github/workflows/ui3-portals-final-validation.yml','utf8'),w=yaml.load(workflow);
test('CI has no publication capability, production environment or secret expressions',()=>{
 assert.deepEqual(w.permissions,{contents:'read'});assert.deepEqual(w.on.push.branches,['fix/client-portals-mirroring-20261118','fix/ui3-overviews-shared-task-center-20261123','fix/ui3-overview-meetings-calendar-20261123']);assert.equal(w.on.pull_request,undefined);assert.equal(w.on.pull_request_target,undefined);assert.equal(w.on.workflow_run,undefined);
 assert.doesNotMatch(workflow,/secrets\s*\.|secrets\s*:|id-token\s*:\s*write|contents\s*:\s*write/);
 for(const job of Object.values(w.jobs)){assert.equal(job.environment,undefined);assert.match(job.if,/github.ref == 'refs\/heads\/fix\/client-portals-mirroring-20261118'/);assert.match(job.if,/github.ref == 'refs\/heads\/fix\/ui3-overviews-shared-task-center-20261123'/);for(const step of job.steps){if(step.uses==='actions/checkout@v4')assert.equal(step.with['persist-credentials'],false);if(step.run)assert.doesNotMatch(step.run,/(?:vercel\s|\bnpm\s+publish\b|\bgit\s+push\b|\bsupabase\s+(?:link|db\s+push)\b|\bcurl[^\n]*-X\s*POST)/i);}}
 assert.equal(JSON.parse(fs.readFileSync('vercel.json','utf8')).git.deploymentEnabled,false);
 const p=JSON.parse(fs.readFileSync('package.json','utf8'));assert.equal(p.scripts.build,'next build --webpack');assert.equal(p.scripts.prebuild,undefined);assert.equal(p.scripts.postbuild,undefined);
});
test('CI installation preserves the application lockfile and browser credentials are local-only',()=>{
 assert.match(workflow,/npm ci --no-audit --no-fund/);assert.doesNotMatch(workflow,/npm (?:install|update) (?:next|react|@supabase)/);assert.match(workflow,/npm install --prefix/);assert.match(workflow,/test "\$API_URL" = 'http:\/\/127\.0\.0\.1:54321'/);assert.match(workflow,/SUPABASE_SERVICE_ROLE_KEY="\$SERVICE_ROLE_KEY"/);assert.match(workflow,/git diff --exit-code -- package.json package-lock.json vercel.json/);
 const prepare=fs.readFileSync('scripts/security/ui3-integrated-local-prepare.mjs','utf8');assert.match(prepare,/refuse a linked project/);assert.match(prepare,/temporary runner directory/);
});
