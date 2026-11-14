import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const host=process.env.NEXT_PUBLIC_SUPABASE_URL,app='http://127.0.0.1:3000';
assert.equal(host,'http://127.0.0.1:54321','only the disposable local stack is allowed');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(host,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const ids=[],clients=[],prefix='finance-ci-'+randomUUID().slice(0,8),password='Synthetic-'+randomUUID()+'!';
const createdAccountNames=[];let passed=0;
async function user(label,role,cid=null){
 const email=prefix+'-'+label+'@rotevo.invalid';
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(error);ids.push(data.user.id);
 const {error:pe}=await admin.from('profiles').insert({id:data.user.id,role,client_id:cid,email,full_name:'Synthetic '+label});assert.ifError(pe);
 const auth=createClient(host,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
 const {data:session,error:se}=await auth.auth.signInWithPassword({email,password});assert.ifError(se);
 return {id:data.user.id,token:session.session.access_token};
}
async function request(path,token,body,method){
 const r=await fetch(app+path,{method:method??(body?'POST':'GET'),headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});
 return {status:r.status,body:await r.json().catch(()=>null)};
}
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);passed++;console.log('PASS:',label);};
try{
 execFileSync('docker',['exec','supabase_db_rotevo-security-local','psql','-U','postgres','-d','postgres','-c',"notify pgrst, 'reload schema';"],{stdio:'pipe'});
 for(const label of ['a','b']){const {data,error}=await admin.from('clients').insert({name:prefix+' '+label,slug:prefix+'-'+label}).select('id').single();assert.ifError(error);clients.push(data.id);}
 const owner=await user('admin','strategist');
 const {error:me}=await admin.from('team_members').insert({user_id:owner.id,display_name:'Synthetic finance admin',role:'admin',active:true});assert.ifError(me);
 const a=await user('a','client',clients[0]),b=await user('b','client',clients[1]);
 check((await request('/api/admin/finance')).status,401,'anonymous internal API denied');
 check((await request('/api/client/finance')).status,401,'anonymous portal API denied');
 check((await request('/api/admin/finance',a.token)).status,403,'client cannot read internal API');
 check((await request('/api/admin/finance',a.token,{action:'account.create',input:{name:'Never created'},requestId:randomUUID()})).status,403,'client cannot write internal API');
 check((await request('/api/client/finance',a.token,{action:'invoice.settle'})).status,405,'client endpoint has no write method');
 check((await request('/api/admin/finance',owner.token)).status,200,'active admin reads internal API');
 const mutate=async(action,input)=>request('/api/admin/finance',owner.token,{action,input,requestId:randomUUID()});
 const accountName=prefix+' bank';createdAccountNames.push(accountName);
 check((await mutate('account.create',{name:accountName,opening_cents:0})).status,200,'account created through authenticated API');
 for(let index=0;index<2;index++)check((await mutate('invoice.create',{client_id:clients[index],title:prefix+' invoice '+index,counterparty:prefix,category:'Mensalidade',direction:'in',competence:'2026-10',due_date:'2026-10-20',amount_cents:10000})).status,200,'synthetic monthly invoice '+index+' created');
 const read=await request('/api/admin/finance',owner.token),account=read.body.accounts.find(x=>x.name===accountName),invoice=read.body.invoices.find(x=>x.client_id===clients[0]);
 check((await mutate('invoice.settle',{id:invoice.id,version:invoice.version,amount_cents:5000,paid_on:'2026-01-01',account_id:account.id,method:'Pix',reference:'PRIVATE_TEST_REFERENCE'})).status,200,'manual partial receipt through HTTP and database');
 const av=await request('/api/client/finance',a.token),bv=await request('/api/client/finance',b.token);
 check(av.status,200,'client A portal API succeeds');check(bv.status,200,'client B portal API succeeds');
 check(av.body.invoices.length,1,'client A only has own invoice');check(bv.body.invoices.length,1,'client B only has own invoice');
 check(av.body.invoices[0].paid_cents,5000,'confirmed partial payment reaches client API');
 check(av.body.invoices[0].id===bv.body.invoices[0].id,false,'tenant invoice IDs differ');
 check(JSON.stringify(av.body).includes('PRIVATE_TEST_REFERENCE'),false,'portal excludes internal receipt reference');
 check((await request('/api/client/finance?client_id='+clients[1],a.token)).body.invoices[0].id,invoice.id,'browser-supplied client ID cannot change scope');
 check((await mutate('supplier.save',{name:prefix+' supplier',email:'finance@example.com',notes:'PRIVATE_SUPPLIER_NOTE'})).status,200,'supplier created through HTTP');
 let snapshot=(await request('/api/admin/finance',owner.token)).body;
 const supplier=snapshot.suppliers.find(x=>x.name===prefix+' supplier');
 check((await mutate('subscription.save',{supplier_id:supplier.id,title:prefix+' subscription',category:'Ferramentas',amount_cents:10000,start_date:'2027-01-01',end_date:'2027-06-30',due_day:31})).status,200,'subscription created through HTTP');
 snapshot=(await request('/api/admin/finance',owner.token)).body;const subscription=snapshot.subscriptions.find(x=>x.title===prefix+' subscription');
 check((await mutate('subscription.generate',{month:'2027-02'})).status,200,'subscription obligations emitted');
 check((await mutate('subscription.generate',{month:'2027-02'})).status,200,'repeated emission succeeds without duplication');
 snapshot=(await request('/api/admin/finance',owner.token)).body;const expense=snapshot.invoices.find(x=>x.subscription_id===subscription.id);
 check(snapshot.invoices.filter(x=>x.subscription_id===subscription.id).length,1,'only one subscription obligation per month');
 check(expense.due_date,'2027-02-28','subscription due day clamps to February');
 check((await mutate('supplier.status',{id:supplier.id,version:1,active:false})).status,400,'active subscription blocks supplier archive');
 const edited={id:expense.id,version:1,title:expense.title,counterparty:expense.counterparty,category:expense.category,amount_cents:11000,due_date:'2027-02-27',notes:'PRIVATE_EXPENSE_NOTE',document_reference:'PRIVATE_FAT'};
 check((await mutate('invoice.update',edited)).status,200,'unpaid expense edited through API');
 check((await mutate('invoice.update',edited)).status,409,'stale invoice version rejected');
 check((await mutate('invoice.settle',{id:expense.id,version:2,amount_cents:1000,paid_on:'2026-01-01',account_id:account.id,method:'Pix'})).status,200,'manual partial expense payment');
 check((await mutate('invoice.update',{...edited,version:3})).status,400,'paid expense cannot be edited before reversal');
 check((await mutate('subscription.status',{id:subscription.id,version:1,status:'paused'})).status,200,'subscription paused');
 check((await mutate('subscription.generate',{month:'2027-03'})).status,200,'generation accepts paused subscription without emission');
 snapshot=(await request('/api/admin/finance',owner.token)).body;
 check(snapshot.invoices.filter(x=>x.subscription_id===subscription.id).length,1,'pause preserves history and stops new obligations');
 check((await mutate('supplier.status',{id:supplier.id,version:1,active:false})).status,200,'supplier archived after pause');
 check((await mutate('subscription.status',{id:subscription.id,version:2,status:'active'})).status,400,'archived supplier blocks subscription reactivation');
 check(JSON.stringify((await request('/api/client/finance',a.token)).body).includes('PRIVATE_'),false,'supplier, subscription and notes stay out of portal');
 check((await request('/api/admin/finance',a.token,{action:'supplier.save',input:{name:'Forbidden'},requestId:randomUUID()})).status,403,'client cannot create supplier');
 check((await mutate('account.update',{id:account.id,name:accountName,active:false})).status,200,'account archived without removing its history');
 check((await mutate('invoice.settle',{id:expense.id,version:3,amount_cents:1000,paid_on:'2026-01-01',account_id:account.id,method:'Pix'})).status,400,'archived account rejects new payments');
 const {error:inactive}=await admin.from('team_members').update({active:false}).eq('user_id',owner.id);assert.ifError(inactive);
 check((await request('/api/admin/finance',owner.token)).status,403,'inactivated admin rejected with existing token');
 console.log('HTTP checks passed:',passed);
}finally{
 // IDs are generated by this local run. No hosted project or real fixture is accepted.
 const quoted=values=>values.map(x=>{assert.match(x,/^[0-9a-f-]{36}$/);return "'"+x+"'";}).join(',');
 if(ids.length){const uid=quoted(ids),cid=quoted(clients);const sql=`begin;
 delete from rotevo_finance.settlements where actor_id in (${uid});
 delete from rotevo_finance.audit where actor_id in (${uid});
 ${clients.length?`delete from rotevo_finance.invoices where client_id in (${cid}); delete from rotevo_finance.contract_projects where contract_id in (select id from rotevo_finance.contracts where client_id in (${cid})); delete from rotevo_finance.contracts where client_id in (${cid});`:''}
 delete from rotevo_finance.invoices where supplier_id in (select id from rotevo_finance.suppliers where name='${prefix} supplier');
 delete from rotevo_finance.subscriptions where supplier_id in (select id from rotevo_finance.suppliers where name='${prefix} supplier');
 delete from rotevo_finance.suppliers where name='${prefix} supplier';
 delete from rotevo_finance.accounts where name='${prefix} bank';
 delete from public.team_member_permissions where user_id in (${uid});delete from public.team_members where user_id in (${uid});
 delete from public.profiles where id in (${uid});${clients.length?`delete from public.clients where id in (${cid});`:''}commit;`;
 execFileSync('docker',['exec','-i','supabase_db_rotevo-security-local','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','pipe','pipe']});
 }
 for(const id of ids){const {error}=await admin.auth.admin.deleteUser(id);assert.ifError(error);}
 console.log('Synthetic HTTP fixtures removed.');
}
