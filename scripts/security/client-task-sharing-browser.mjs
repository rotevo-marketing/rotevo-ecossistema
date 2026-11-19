// New regression only: disposable Auth/Postgres + two tenants, no hosted credentials.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createClient} from '@supabase/supabase-js';
const api=process.env.API_URL,app=process.env.ROTEVO_LOCAL_APP_URL;
assert.equal(process.env.ROTEVO_LOCAL_API_TESTS,'YES_LOCAL_ONLY');assert.equal(api,'http://127.0.0.1:54321');assert.equal(app,'http://127.0.0.1:3000/');
const scratch=resolve(process.env.RUNNER_TEMP),tools=resolve(process.env.ROTEVO_BROWSER_TOOLS);assert.ok(!relative(scratch,tools).startsWith('..'));
const {chromium}=createRequire(join(tools,'package.json'))('playwright');
const output=join(scratch,'portal-viewport-evidence');mkdirSync(output,{recursive:true});
const service=createClient(api,process.env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),suffix=randomUUID();
const must=async(p,label)=>{const r=await p;assert.equal(r.error,null,label+': '+(r.error?.message??''));return r.data;};
const identity=async(label)=>{const email=label+'-'+suffix+'@synthetic.invalid',password='Sharing-'+suffix+'!';const {user}=await must(service.auth.admin.createUser({email,password,email_confirm:true}),'synthetic identity');return {id:user.id,email,password};};
const login=async(user)=>{const client=createClient(api,process.env.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});return (await must(client.auth.signInWithPassword({email:user.email,password:user.password}),'synthetic login')).session;};
async function http(path,session,method='GET',body,status=200){const response=await fetch(new URL(path,app),{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(response.status,status,method+' '+path.split('?')[0]);return response.json();}
const admin=await identity('strategist');await must(service.from('profiles').insert({id:admin.id,email:admin.email,full_name:'Estrategista sintético',role:'strategist'}),'profile');await must(service.from('team_members').insert({user_id:admin.id,display_name:'Estrategista sintético',role:'admin',active:true}),'team');const adminSession=await login(admin);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fixtures=[];
for(let i=0;i<2;i++){
 const user=await identity('client-'+i),clientId=randomUUID(),projectId=randomUUID();
 await must(service.from('clients').insert({id:clientId,name:'Cliente sintético '+i,slug:'sharing-'+i+'-'+suffix}),'client');
 await must(service.rpc('rotevo_provision_client_profile',{p_user_id:user.id,p_client_id:clientId,p_full_name:'Cliente sintético '+i,p_email:user.email,p_enroll_notifications:true}),'provision');
 await must(service.from('client_workspaces').insert({client_id:clientId,data:{modules:['execution','content'],contracts:[],folders:[]}}),'workspace');
 const first={id:'task-1',kind:'task',title:'Preparar roteiro de apresentação',status:'in_progress',owner:'Estrategista sintético',priority:'urgent',dueDate:today,visibleToClient:false,clientProjectionVersion:1,description:'PRIVATE_DESCRIPTION_'+i,clientSummary:'Resumo compartilhado: organize os pontos da apresentação.',checklist:[{id:'brief',text:'Briefing recebido',done:true,visibleToClient:true},{id:'internal',text:'PRIVATE_STEP_'+i,done:true},{id:'review',text:'Revisar roteiro com a equipe',done:false,visibleToClient:true}]};
 const data={portalModules:['execution','content'],executionTimeline:[first,{...first,id:'task-2',title:'Confirmar os materiais do encontro',priority:undefined,checklist:[]},{...first,id:'task-3',title:'Separar referências para a reunião',priority:'high',dueDate:'2020-01-01',checklist:[]},{...first,id:'secret',title:'PRIVATE_CONFIDENTIAL',clientVisibility:'confidential',clientConfidentialReason:'Planejamento interno'}],editorialCalendar:[{id:'content-1',title:'Vídeo de apresentação',visibleToClient:true,version:'01',channel:'Instagram',format:'Reels',status:'awaiting_client',priority:'normal',publishDate:today},{id:'content-2',title:'Sequência de stories',visibleToClient:true,version:'01',channel:'Instagram',format:'Stories',status:'awaiting_client',publishDate:today}]};
 await must(service.from('planning_projects').insert({id:projectId,client_id:clientId,title:'Projeto sintético '+i,slug:'sharing-'+i+'-'+suffix,status:'draft',data}),'project');
 fixtures.push({user,clientId,projectId,data,session:await login(user)});
}
const f=fixtures[0],other=fixtures[1];
for(const v of fixtures){const projected=await http('/api/client/projects',v.session);assert.deepEqual(projected.projects.map(p=>p.id),[v.projectId]);assert.doesNotMatch(JSON.stringify(projected),/PRIVATE_/);assert.equal(projected.projects[0].data.executionTimeline[0].checklist.length,2);await http('/api/admin/project/update',v.session,'PATCH',{projectId:v.projectId,expectedUpdatedAt:projected.projects[0].updated_at,data:{...v.data,executionTimeline:[]}},403);const client=createClient(api,process.env.ANON_KEY,{global:{headers:{Authorization:'Bearer '+v.session.access_token}},auth:{persistSession:false}});assert.ok((await client.from('planning_projects').update({data:{}}).eq('id',v.projectId)).error,'raw JSON write remains denied');assert.ok((await client.rpc('rotevo_project_client_assignments',{p_project_id:v.projectId})).error,'client cannot call strategist RPC');}
await http('/api/collaboration/messages',f.session,'POST',{projectId:other.projectId,resourceType:'task',resourceId:'task-1',body:'Cross-tenant denied',expectedAuthorUserId:f.user.id},403);
const release=await http('/api/workflow/client-actions',adminSession,'POST',{projectId:f.projectId,resourceType:'content',resourceId:'content-1',resourceVersion:'01',clientUserId:f.user.id,actionType:'send_material',instructions:'Enviar o vídeo pelo Google Drive',dueDate:null,requestKey:'sharing-'+randomUUID(),expectedAuthorUserId:admin.id});
await http('/api/collaboration/messages',adminSession,'POST',{projectId:f.projectId,resourceType:'task',resourceId:'task-1',body:'Pode acompanhar o roteiro e as etapas compartilhadas.',expectedAuthorUserId:admin.id},201);
const browser=await chromium.launch();const report={status:'running',screenshots:[],checks:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)?route.continue():route.abort();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app);await page.getByLabel('E-mail',{exact:true}).fill(f.user.email);await page.getByLabel('Senha',{exact:true}).fill(f.user.password);await page.getByRole('button',{name:'Acessar Ecossistema',exact:true}).click();await page.waitForURL('**/cliente',{timeout:60000});await page.locator('.rv-ui3-client-daily-dashboard').waitFor({timeout:60000});
 async function shots(prefix){for(const width of [1440,390])for(const theme of ['light','dark']){await page.setViewportSize({width,height:1000});await page.evaluate(mode=>document.documentElement.dataset.rotevoAppearance=mode,theme);await page.waitForTimeout(180);if(prefix==='overview'){const flag=page.getByRole('img',{name:'Prioridade Urgente',exact:true});assert.equal(await flag.evaluate(el=>getComputedStyle(el).color),'rgb(218, 53, 83)','priority color '+theme);const rowColors=await page.locator('.rv-ui3-client-summary-list').first().locator('button').evaluateAll(rows=>rows.map(el=>getComputedStyle(el).backgroundColor));assert.notEqual(rowColors[0],rowColors[1],'alternating rows '+theme);}const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width+2,'horizontal overflow');const name=prefix+'-'+width+'-'+theme+'.png';await page.screenshot({path:join(output,name),fullPage:true});report.screenshots.push(name);}}
 await page.waitForFunction(()=>document.querySelectorAll('.rv-ui3-client-summary-list').length===3);
 const lists=page.locator('.rv-ui3-client-summary-list');assert.equal(await lists.count(),3);assert.equal(await lists.nth(0).locator('li').count(),2);assert.equal(await lists.nth(0).locator('[role="img"]').count(),1);assert.equal(await lists.nth(2).locator('[role="img"]').count(),1);
 const colors=await lists.nth(0).locator('button').evaluateAll(buttons=>buttons.map(b=>getComputedStyle(b).backgroundColor));assert.notEqual(colors[0],colors[1]);await shots('overview');
 await page.getByText('Preparar roteiro de apresentação',{exact:true}).click();const details=page.getByRole('dialog',{name:'Detalhes da tarefa Preparar roteiro de apresentação'});await details.waitFor();await details.getByText('Briefing recebido',{exact:true}).waitFor();assert.equal(await details.locator('input[type="checkbox"]').count(),0);assert.doesNotMatch(await details.innerText(),/PRIVATE_/);assert.equal(await details.locator('progress').getAttribute('value'),'2');await shots('task-details');
 const before=await must(service.from('planning_projects').select('data,updated_at').eq('id',f.projectId).single(),'read synthetic project');const next=structuredClone(before.data);next.executionTimeline[0].clientDescriptionApproved=true;next.executionTimeline[0].description='Descrição operacional compartilhada: revise o roteiro e confirme a sequência.';next.executionTimeline[0].checklist[2].done=true;
 await http('/api/admin/project/update',adminSession,'PATCH',{projectId:f.projectId,expectedUpdatedAt:before.updated_at,data:next});await page.waitForTimeout(1100);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await details.getByText(next.executionTimeline[0].description,{exact:true}).waitFor({timeout:35000});await page.waitForFunction(()=>document.querySelector('[aria-label="Progresso total do checklist"]')?.value===3);await page.screenshot({path:join(output,'task-after-confirmed-update.png'),fullPage:true});
 report.screenshots.push('task-after-confirmed-update.png');
 await page.reload();
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByRole('navigation',{name:'Navegação do portal'}).getByRole('button',{name:'Tarefas',exact:true}).click();
 await page.getByRole('button',{name:'Preparar roteiro de apresentação',exact:true}).click();
 await details.getByText(next.executionTimeline[0].description,{exact:true}).waitFor();
 assert.equal(await details.locator('progress').getAttribute('value'),'3');
 const saved=await must(service.from('planning_projects').select('data').eq('id',f.projectId).single(),'persisted data');assert.equal(saved.data.executionTimeline[0].checklist[2].done,true);assert.equal(saved.data.executionTimeline[0].checklist[1].visibleToClient,undefined);
 const safe=await http('/api/client/projects',f.session);assert.doesNotMatch(JSON.stringify(safe),/PRIVATE_/);const untouched=await http('/api/client/projects',other.session);assert.equal(untouched.projects[0].data.executionTimeline[0].description,'Resumo compartilhado: organize os pontos da apresentação.');
 const thread={projectId:f.projectId,resourceType:'task',resourceId:'task-1'};
 const threadUrl='/api/collaboration/messages?'+new URLSearchParams(thread);
 const incoming=await http(threadUrl,f.session);
 assert.ok(incoming.messages.some(message=>message.body==='Pode acompanhar o roteiro e as etapas compartilhadas.'));
 const reply='Recebi a orientação sobre o roteiro.';
 await http('/api/collaboration/messages',f.session,'POST',{...thread,body:reply,expectedAuthorUserId:f.user.id},201);
 const staffThread=await http(threadUrl,adminSession);
 assert.ok(staffThread.messages.some(message=>message.author_role==='client'&&message.body===reply));
 const clientAssignments='/api/workflow/client-actions?'+new URLSearchParams({projectId:f.projectId,expectedAuthorUserId:f.user.id});
 const assignment=(await http(clientAssignments,f.session)).assignments.find(a=>a.id===release.assignment.id);
 assert.ok(assignment);
 await http('/api/workflow/client-actions/submit',f.session,'POST',{assignmentId:assignment.id,driveUrl:'https://drive.google.com/file/d/synthetic-sharing/view',note:'Entrega sintética',requestKey:'sharing-drive-'+randomUUID(),expectedAuthorUserId:f.user.id});
 const staffAssignments='/api/workflow/client-actions/project?'+new URLSearchParams({projectId:f.projectId,expectedAuthorUserId:admin.id});
 const submitted=(await http(staffAssignments,adminSession)).assignments.find(a=>a.id===assignment.id);
 assert.equal(submitted?.deliveries.length,1);
 await http('/api/workflow/client-actions/review',adminSession,'POST',{assignmentId:assignment.id,submissionId:submitted.deliveries[0].id,decision:'validated',feedback:'Material validado',expectedAuthorUserId:admin.id});
 const reviewed=(await http(clientAssignments,f.session)).assignments.find(a=>a.id===assignment.id);
 assert.equal(reviewed?.status,'validated');
 const notices=await http('/api/workflow/notifications',f.session);assert.ok(notices.unreadCount>=1);const otherNotices=await http('/api/workflow/notifications',other.session);assert.equal(otherNotices.unreadCount,0);assert.deepEqual(errors,[]);
 report.status='passed';report.checks=['explicit description opt-in','per-step checklist privacy','real persisted checklist progress','focus refresh with modal open','reload persistence','client write/RPC denial','two-tenant isolation','overview counts and real priorities','desktop/mobile light/dark','assignment Drive review','bilateral message notifications'];await context.close();
}finally{writeFileSync(join(output,'sharing-report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log('PASS new sharing regression: '+report.checks.join(', '));
