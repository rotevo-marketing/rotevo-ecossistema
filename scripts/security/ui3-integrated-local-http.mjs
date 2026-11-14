// Real GoTrue, PostgREST, Storage and original Next.js HTTP routes, synthetic data only.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {validWorkspace} from '../../src/lib/operations/model.ts';
const api=process.env.API_URL,app=process.env.ROTEVO_LOCAL_APP_URL;
function local(value){const u=new URL(value);assert.ok(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname),'refuse non-loopback URL');return u;}
assert.equal(process.env.ROTEVO_LOCAL_API_TESTS,'YES_LOCAL_ONLY');
local(api);local(app);assert.ok(process.env.ANON_KEY&&process.env.SERVICE_ROLE_KEY);
// Defense against accidental remote requests from this test process, including signed URLs.
const realFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{local(typeof input==='string'||input instanceof URL?String(input):input.url);return realFetch(input,init);};
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(api,process.env.SERVICE_ROLE_KEY,options);
const cA='a1000000-0000-4000-8000-000000000001',cB='a2000000-0000-4000-8000-000000000002';
const pA='b1000000-0000-4000-8000-000000000001',pB='b2000000-0000-4000-8000-000000000002';
const must=async(p,label)=>{const r=await p;assert.equal(r.error,null,label+': '+(r.error?.message??''));return r.data;};
let groups=0;
function pass(label){groups++;console.log('PASS integrated:',label);}
async function user(label,role,clientId=null,reset=false){
 const email=label+'@synthetic.invalid',password='Local-Synthetic-Only-2026!'+label;
 const data=await must(service.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{rotevo_password_reset_required:reset}}),'create synthetic Auth identity');
 const id=data.user.id;
 await must(service.from('profiles').upsert({id,role,client_id:clientId,full_name:'Synthetic '+label,email}),'profile');
 const db=createClient(api,process.env.ANON_KEY,options);
 const login=await must(db.auth.signInWithPassword({email,password}),'local GoTrue login');
 return {id,db,token:login.session.access_token};
}
async function request(path,who,{method='GET',body,status=200}={}){
 const headers=who?{Authorization:'Bearer '+who.token}:{};
 if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const result=await fetch(new URL(path,app),{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
 const value=await result.json();
 assert.equal(result.status,status,path+': '+JSON.stringify(value).slice(0,250));
 return value;
}
await must(service.from('clients').insert([{id:cA,name:'Synthetic A',slug:'integrated-a'},{id:cB,name:'Synthetic B',slug:'integrated-b'}]),'synthetic clients');
const admin=await user('admin','strategist'),a=await user('client-a','client',cA),b=await user('client-b','client',cB);
const reader=await user('reader','staff'),denied=await user('denied','staff'),reset=await user('reset','client',cA,true);
await must(service.from('team_members').insert([{user_id:admin.id,display_name:'Synthetic admin',role:'admin',active:true},{user_id:reader.id,display_name:'Synthetic reader',role:'finance',active:true},{user_id:denied.id,display_name:'Synthetic no permissions',role:'producer',active:true}]),'synthetic team');
await must(service.from('team_member_permissions').insert([{user_id:reader.id,permission:'projects.read'},{user_id:reader.id,permission:'finance.read'}]),'synthetic permissions');
const workspaceA={modules:['planning','finance','content','contract'],contracts:[],folders:[]};
const workspaceB={modules:['planning','finance'],contracts:[],folders:[]};
assert.ok(validWorkspace(workspaceA)&&validWorkspace(workspaceB),'synthetic workspaces must satisfy the original validator');
await must(service.from('client_workspaces').insert([{client_id:cA,data:workspaceA},{client_id:cB,data:workspaceB}]),'synthetic workspaces');
const oldRich={format:'blocknote-v1',blocks:[{id:'old',type:'paragraph',content:'Previously published synthetic release'}]};
const base={internalNotes:'PRIVATE_SYNTHETIC_ONLY',planningClientAccessEnabled:true,ecosystem2027:{version:1,selectedDocumentCodes:['01.06'],presentedDocumentCodes:['01.06'],documents:{'01.06':{content:'Previously published synthetic release',richContent:oldRich,reviewStatus:'approved',updatedAt:'2026-11-01T00:00:00Z',publishedAt:'2026-11-01T00:00:00Z',publishedContent:'Previously published synthetic release',publishedRichContent:oldRich}}}};
await must(service.from('planning_projects').insert([{id:pA,client_id:cA,title:'Synthetic A',slug:'integrated-a',status:'published',data:base},{id:pB,client_id:cB,title:'Synthetic B',slug:'integrated-b',status:'published',data:base}]),'synthetic projects');
await must(service.from('team_project_assignments').insert([{user_id:reader.id,project_id:pA},{user_id:denied.id,project_id:pA}]),'synthetic assignments');
await request('/api/admin/project?id='+pA,null,{status:401});
await request('/api/admin/project?id='+pA,a,{status:403});
await request('/api/presentation/project?slug=integrated-a',b,{status:404});
await request('/api/presentation/project?slug=integrated-a',reset,{status:403});
await request('/api/client/projects',reset,{status:403});
const access=await request('/api/team/my-access',reader);assert.deepEqual(access.projects.map(p=>p.id),[pA]);
const noAccess=await request('/api/team/my-access',denied);assert.deepEqual(noAccess.projects,[]);assert.equal(noAccess.assignedProjectCount,1);
await request('/api/admin/project?id='+pA,reader,{status:403});
const raw=await a.db.from('planning_projects').select('id,data');assert.ok(raw.error,'raw private JSON denied by actual grants');
const metadata=await must(a.db.from('planning_projects').select('id,title'),'client metadata');assert.deepEqual(metadata.map(x=>x.id),[pA]);
pass('real Auth, HTTP identity/first-password/tenant restrictions, staff assignments and RLS/column grants');

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hAAAAABJRU5ErkJggg==','base64');
const form=new FormData();form.set('file',new File([png],'synthetic.png',{type:'image/png'}));form.set('purpose','planning');form.set('projectId',pA);
const asset=await request('/api/assets',admin,{method:'POST',body:form,status:201});
assert.ok(asset.id);local(asset.url);
let current=(await request('/api/admin/project?id='+pA,admin)).project;
const initialStamp=current.updated_at;
let rich;
for(const repeats of [2,1600]){
 rich={format:'blocknote-v1',blocks:[{id:'html',type:'visualHtml',props:{label:'Synthetic visual',description:'Local test only',height:400,markup:'<section>'+('<p>Ação 🧠 &amp; revisão</p>'.repeat(repeats))+'</section>',stylesheet:'.card{color:#687487}\n'.repeat(200)},children:[]},{id:'asset',type:'image',props:{url:'asset://'+asset.id}}]};
 const payload={projectId:pA,code:'01.06',action:'save',expectedUpdatedAt:current.updated_at,richContent:rich};
 current=(await request('/api/admin/planning/document',admin,{method:'PATCH',body:payload})).project;
 const reopened=(await request('/api/admin/project?id='+pA,admin)).project;
 assert.deepEqual(reopened.data.ecosystem2027.documents['01.06'].richContent,rich);
 assert.deepEqual(reopened.data.ecosystem2027.documents['01.06'].publishedRichContent,oldRich);
 assert.equal(reopened.data.internalNotes,base.internalNotes);
 current=reopened;
}
await request('/api/admin/planning/document',admin,{method:'PATCH',body:{projectId:pA,code:'01.06',action:'save',expectedUpdatedAt:initialStamp,richContent:rich},status:409});
for(const action of ['review','approve','publish'])current=(await request('/api/admin/planning/document',admin,{method:'PATCH',body:{projectId:pA,code:'01.06',action,expectedUpdatedAt:current.updated_at}})).project;
const presentation=await request('/api/presentation/project?slug=integrated-a',a);
assert.deepEqual(presentation.project.data.ecosystem2027.documents['01.06'].richContent,rich);
assert.ok(!JSON.stringify(presentation).includes('PRIVATE_SYNTHETIC_ONLY'));
pass('original document HTTP save/reopen/CAS/review/approve/publish with short and extensive HTML/CSS, preserved prior release and client published projection');
const resolved=await request('/api/assets/resolve',a,{method:'POST',body:{ids:[asset.id]}});
local(resolved.links[asset.id]);const downloaded=await fetch(resolved.links[asset.id]);assert.equal(downloaded.status,200);assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),png);
await request('/api/assets/resolve',b,{method:'POST',body:{ids:[asset.id]},status:403});
const path=(await must(service.from('project_assets').select('storage_path').eq('id',asset.id).single(),'asset metadata')).storage_path;
const direct=await a.db.storage.from('rotevo-private').download(path);assert.ok(direct.error,'private storage cannot be downloaded directly');
pass('real private Storage upload through API, published-reference signed resolution, byte integrity and cross-tenant/direct-object denial');

async function mutate(action,input,who=admin,requestId=randomUUID(),status=200){return request('/api/admin/finance',who,{method:'POST',body:{action,input,requestId},status});}
await mutate('account.create',{name:'Synthetic bank',opening_cents:0});
await mutate('invoice.create',{client_id:cA,title:'Synthetic A invoice',counterparty:'Synthetic A',category:'Mensalidade',direction:'in',competence:'2026-11',due_date:'2026-11-20',amount_cents:10000});
await mutate('invoice.create',{client_id:cB,title:'TENANT_B_PRIVATE',counterparty:'Synthetic B',category:'Mensalidade',direction:'in',competence:'2026-11',due_date:'2026-11-20',amount_cents:30000});
await mutate('invoice.create',{title:'INTERNAL_EXPENSE_PRIVATE',counterparty:'INTERNAL_SUPPLIER_PRIVATE',category:'Equipe',direction:'out',competence:'2026-11',due_date:'2026-11-20',amount_cents:5000});
let finance=await request('/api/admin/finance',admin);
const invoice=finance.invoices.find(i=>i.title==='Synthetic A invoice'),bank=finance.accounts.find(i=>i.name==='Synthetic bank');
assert.ok(invoice&&bank);
const settlement={id:invoice.id,version:invoice.version,account_id:bank.id,amount_cents:4000,paid_on:new Date(Date.now()-24*60*60*1000).toISOString().slice(0,10),method:'Pix'},requestId=randomUUID();
await mutate('invoice.settle',settlement,admin,requestId);await mutate('invoice.settle',settlement,admin,requestId);
finance=await request('/api/admin/finance',admin);assert.equal(finance.invoices.find(i=>i.id===invoice.id).paid_cents,4000);
await request('/api/admin/finance',reader);
await mutate('account.create',{name:'Forbidden'},reader,randomUUID(),403);
await mutate('account.create',{name:'Forbidden'},a,randomUUID(),403);
await request('/api/client/finance',reset,{status:403});
const clientFinance=await request('/api/client/finance',a);
assert.ok(clientFinance.invoices.some(i=>i.id===invoice.id));
assert.ok(!/TENANT_B_PRIVATE|INTERNAL_EXPENSE_PRIVATE|INTERNAL_SUPPLIER_PRIVATE/.test(JSON.stringify(clientFinance)));
pass('original financial HTTP routes and SQL: partial settlement/idempotency, read-only staff, client write denial and expense/other-tenant privacy');
// Contract and invoice documents exercise their separate authorization branches.
const pdf=Buffer.from('%PDF-1.4\n% SYNTHETIC DISPOSABLE STORAGE FIXTURE ONLY\n%%EOF\n');
async function uploadPdf(purpose){
 const form=new FormData();form.set('file',new File([pdf],'synthetic-'+purpose+'.pdf',{type:'application/pdf'}));
 form.set('purpose',purpose);form.set('clientId',cA);form.set('visibleToClient','true');
 if(purpose==='invoice')form.set('invoiceId',invoice.id);
 return request('/api/assets',admin,{method:'POST',body:form,status:201});
}
const contractAsset=await uploadPdf('contract'),invoiceAsset=await uploadPdf('invoice');
const contracts=[{id:'synthetic-contract',title:'Synthetic contract',status:'active',service:'Synthetic service',summary:'Synthetic only',scope:[],startDate:'2026-11-01',endDate:'',signedDate:'',documentUrl:'asset://'+contractAsset.id,visibleToClient:true,history:[]}];
const contractWorkspace={...workspaceA,contracts};assert.ok(validWorkspace(contractWorkspace));
await must(service.from('client_workspaces').update({data:contractWorkspace}).eq('client_id',cA),'share synthetic contract');
const ownWorkspace=await request('/api/client/workspace',a);assert.equal(ownWorkspace.workspace.contracts[0].documentUrl,'asset://'+contractAsset.id);
const ownFinance=await request('/api/client/finance',a);assert.ok(ownFinance.documents.some(x=>x.id===invoiceAsset.id));
for(const id of [contractAsset.id,invoiceAsset.id]){
 const permitted=await request('/api/assets/resolve',a,{method:'POST',body:{ids:[id]}});
 local(permitted.links[id]);const file=await fetch(permitted.links[id]);assert.equal(file.status,200);assert.deepEqual(Buffer.from(await file.arrayBuffer()),pdf);
 await request('/api/assets/resolve',b,{method:'POST',body:{ids:[id]},status:403});
 if(id===contractAsset.id)await request('/api/assets/resolve',reader,{method:'POST',body:{ids:[id]},status:403});
}
pass('contract/invoice synthetic document links and private byte retrieval, separate authorization branches and tenant/staff denials (not PDF rendering or signing)');
await must(service.from('client_workspaces').delete().eq('client_id',cB),'remove synthetic workspace for fail-closed check');
await request('/api/presentation/project?slug=integrated-b',b,{status:404});
await request('/api/client/finance',b,{status:403});
await request('/api/assets/resolve',reset,{method:'POST',body:{ids:[asset.id]},status:403});
pass('missing workspace and initial-password boundaries remain closed across presentation/finance/assets');
// Direct PostgREST RPCs must match the protected HTTP access rules, not only the React UI.
const items=[
 {id:'rpc-final',version:'v1',status:'awaiting_client',visibleToClient:true},
 {id:'rpc-idea',version:'v1',status:'idea_pending',visibleToClient:true}
];
const projectA=await must(service.from('planning_projects').select('data').eq('id',pA).single(),'read synthetic project for RPC checks');
const projectB=await must(service.from('planning_projects').select('data').eq('id',pB).single(),'read synthetic project B for RPC checks');
await must(service.from('planning_projects').update({data:{...projectA.data,editorialCalendar:items}}).eq('id',pA),'synthetic editorial fixtures');
await must(service.from('planning_projects').update({data:{...projectB.data,editorialCalendar:items}}).eq('id',pB),'synthetic editorial fixtures B');
const rpcArgs=(id)=>({p_project_id:pA,p_content_id:id,p_content_version:'v1',p_decision:'approved',p_comment:null});
const blockedReset=await reset.db.rpc('rotevo_editorial_decide',rpcArgs('rpc-final'));
assert.equal(blockedReset.error?.code,'42501','pending initial-password direct RPC must be denied');
const blockedMissing=await b.db.rpc('rotevo_editorial_idea_decide',{...rpcArgs('rpc-idea'),p_project_id:pB});
assert.equal(blockedMissing.error?.code,'42501','direct RPC without workspace must be denied');
const allowedFinal=await a.db.rpc('rotevo_editorial_decide',rpcArgs('rpc-final'));
assert.equal(allowedFinal.error,null,'authorized client final approval must still work: '+allowedFinal.error?.message);
const allowedIdea=await a.db.rpc('rotevo_editorial_idea_decide',rpcArgs('rpc-idea'));
assert.equal(allowedIdea.error,null,'authorized client idea approval must still work: '+allowedIdea.error?.message);
pass('real GoTrue/PostgREST direct editorial RPCs: missing workspace and initial-password denied, legitimate final and idea approvals preserved');
console.log('PASS integrated:',groups,'groups. Synthetic disposable local stack only; not a hosted schema mirror or browser UI test.');
