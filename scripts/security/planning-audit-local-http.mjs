import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
if(process.env.ROTEVO_LOCAL_API_TESTS!=='YES_LOCAL_ONLY'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321'||process.env.ROTEVO_LOCAL_APP_URL!=='http://127.0.0.1:3000/')throw Error('Exact local targets required');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const tag=randomUUID(),password='Synthetic-'+randomUUID()+'!',users=[],clients=[],projects=[];
let checks=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
async function insert(table,row){const r=await db.from(table).insert(row);assert.ifError(r.error);}
async function identity(role,clientId){const email=`planning-${role}-${randomUUID()}@rotevo.invalid`;const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(error);users.push(data.user.id);await insert('profiles',{id:data.user.id,email,role,client_id:clientId??null,full_name:'Synthetic planning audit'});if(role==='strategist')await insert('team_members',{user_id:data.user.id,display_name:'Synthetic planning audit',role:'admin',active:true});const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);const session=await auth.auth.signInWithPassword({email,password});assert.ifError(session.error);return session.data.session.access_token;}
async function call(path,jwt,body){const r=await fetch('http://127.0.0.1:3000'+path,{method:body?'PATCH':'GET',redirect:'error',headers:{'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});return {status:r.status,data:await r.json()};}
try{
 for(const label of ['a','b']){const id=randomUUID();clients.push(id);await insert('clients',{id,name:'Synthetic planning '+label,slug:'planning-'+tag+'-'+label});}
 const owner=await identity('strategist'),a=await identity('client',clients[0]),b=await identity('client',clients[1]);
 const pid=randomUUID(),slug='planning-'+tag;projects.push(pid);
 const stages=[{id:'diagnosis',title:'Diagnóstico sintético',dueDate:'2026-11-05',status:'in_progress',visibleToClient:true},{id:'private',title:'Etapa interna sintética',dueDate:'',status:'pending',visibleToClient:false}];
 await insert('planning_projects',{id:pid,client_id:clients[0],slug,title:'Synthetic planning audit',status:'published',data:{planningStages:stages,ecosystem2027:{version:1,selectedDocumentCodes:['01.02','01.03'],presentedDocumentCodes:['01.02','01.03'],documents:{'01.02':{content:'PRIVATE_DRAFT',updatedAt:new Date().toISOString(),reviewStatus:'draft',publishedContent:'AUTHORIZED_RELEASE',publishedAt:new Date().toISOString()},'01.03':{content:'NEVER_PUBLISHED',updatedAt:new Date().toISOString(),reviewStatus:'draft'}}}}});
 const endpoint='/api/presentation/project?slug='+slug;
 check((await call(endpoint,null)).status,401,'anonymous presentation denied');
 check((await call(endpoint,b)).status,404,'other tenant presentation hidden');
 const presentation=await call(endpoint,a);check(presentation.status,200,'own release readable');
 check(presentation.data.project.data.ecosystem2027.documents['01.02'].content,'AUTHORIZED_RELEASE','released snapshot only');
 check(JSON.stringify(presentation.data).includes('PRIVATE_DRAFT'),false,'private draft excluded');
 check(JSON.stringify(presentation.data).includes('NEVER_PUBLISHED'),false,'unpublished document excluded');
 const listing=await call('/api/client/projects',a);check(listing.status,200,'client listing available');
 check(listing.data.projects[0].data.planningStages.map(s=>s.id),['diagnosis'],'only visible stages');
 check((await call('/api/client/projects',b)).data.projects.length,0,'other tenant listing isolated');
 const current=await call('/api/admin/project?id='+pid,owner);check(current.status,200,'authorized administrator read');
 const body={projectId:pid,expectedUpdatedAt:current.data.project.updated_at,data:current.data.project.data};
 check((await call('/api/admin/project/update',a,body)).status,403,'client write forbidden');
 check((await call('/api/admin/project/update',null,body)).status,401,'anonymous write forbidden');
 check((await call('/api/admin/project/update',owner,{...body,data:{...body.data,planningStages:[{...stages[0],dueDate:'2026-02-30'}]}})).status,400,'invalid calendar date rejected');
 check((await call('/api/admin/project/update',owner,{...body,data:{...body.data,planningStages:[stages[0],stages[0]]}})).status,400,'duplicate stage IDs rejected');
 const valid=await call('/api/admin/project/update',owner,{...body,data:{...body.data,planningStages:[{...stages[0],dueDate:'2028-02-29'},stages[1]]}});check(valid.status,200,'valid schedule saved');
 check(valid.data.project.data.planningStages[0].dueDate,'2028-02-29','saved response retains valid date');
 check((await call('/api/admin/project/update',owner,body)).status,409,'stale version rejected');
 check((await call(endpoint,a)).data.project.data.ecosystem2027.documents['01.02'].content,'AUTHORIZED_RELEASE','schedule save preserves released document');
 console.log('PASS: '+checks+' local planning HTTP checks; synthetic data only');
}finally{
 if(projects.length){const r=await db.from('planning_projects').delete().in('id',projects);assert.ifError(r.error);}
 for(const id of users){const r=await db.auth.admin.deleteUser(id);assert.ifError(r.error);}
 if(clients.length){const r=await db.from('clients').delete().in('id',clients);assert.ifError(r.error);}
 console.log('Synthetic planning HTTP fixtures removed');
}
