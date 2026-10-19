import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildOperationsOverview as build,overviewProjectHref,overviewToday} from '../../src/lib/overview/model.ts';
import {loadOverviewDecisions} from '../../src/lib/overview/approvals.ts';
const today='2026-10-19',now=new Date('2026-10-19T15:00:00Z');
const task=(id,extra={})=>({id,title:id,status:'planned',...extra});
const project=(id,data={},status='draft')=>({id,title:id,slug:id,status,updated_at:'2026-10-19T00:00:00Z',clients:{id:'client-'+id,name:'Cliente '+id,slug:'cliente-'+id},data});
const view=(projects,user='uid-a',decisions=[],source='ready')=>build(projects,user,decisions,source,today,now);
test('active projects use operational status, not every registered project',()=>{
 const m=view(['draft','in_progress','published','archived','closed','cancelled'].map(status=>project(status,{},status)));assert.equal(m.activeProjects,2);
});
test('open overdue tasks are deduplicated per project; completed and canceled excluded',()=>{
 const past={dueDate:'2026-10-18'};const p=project('a',{executionTimeline:[task('same',past),task('same',past),task('done',{...past,status:'completed'}),task('canceled',{...past,status:'cancelled'})]});
 assert.equal(view([p,project('b',{executionTimeline:[task('same',past)]})]).overdueTasks,2);
 assert.equal(view([p,project('archived',{executionTimeline:[task('old',past)]},'archived')]).overdueTasks,1);
});
test('one task combines overdue, blocked and dependency reasons without duplicate alerts',()=>{
 const m=view([project('a',{executionTimeline:[task('wait',{status:'blocked',dueDate:'2026-10-18',dependencies:['before'],priority:'urgent'}),task('before')]})]);
 const item=m.attention.find(x=>x.title==='wait');assert.equal(m.attention.length,1);assert.equal(item.priority,1);assert.ok(item.reasons.includes('Prazo vencido'));assert.ok(item.reasons.some(x=>x.includes('bloqueada')));assert.ok(item.reasons.some(x=>x.includes('pré-requisito')));assert.equal(m.projectAttention[0].items.length,1);
});
test('attention priorities follow recorded deadlines and blocking, sorted by urgency',()=>{
 const m=view([project('a',{executionTimeline:[task('normal',{dependencies:['prior']}),task('prior'),task('soon',{dueDate:'2026-10-21'}),task('late',{dueDate:'2026-10-18'}),task('blocked',{status:'blocked'})]})]);
 assert.deepEqual(m.attention.map(x=>x.priority),[1,1,2,3]);assert.equal(m.attention[0].title,'late');
});
test('personal routine uses user IDs; a matching free-text name never grants ownership',()=>{
 const m=view([project('a',{executionTimeline:[task('mine',{ownerUserId:'uid-a',owner:'Ana',dueDate:today}),task('namesake',{owner:'Ana',dueDate:'2026-10-18'}),task('other',{ownerUserId:'uid-b',owner:'Ana'})],operationalAgenda:[{id:'linked',title:'Linked meeting',status:'planned',kind:'meeting',date:'2026-10-20',relatedTaskId:'mine'},{id:'by-name',title:'By name',status:'planned',kind:'meeting',date:'2026-10-20',owner:'Ana'}]})]);
 assert.deepEqual(m.routine.map(x=>x.title),['mine','Linked meeting']);assert.equal(m.unlinkedOwners,1);assert.equal(view([project('a',{executionTimeline:[task('mine',{ownerUserId:'uid-a'})]})],null).routine.length,0);
});
test('routine orders late then today then future deadlines; priority breaks same-date ties',()=>{
 const m=view([project('a',{executionTimeline:[task('future',{dueDate:'2026-10-23',ownerUserId:'uid-a'}),task('today',{dueDate:today,ownerUserId:'uid-a'}),task('late',{dueDate:'2026-10-18',ownerUserId:'uid-a'}),task('urgent',{dueDate:today,ownerUserId:'uid-a',priority:'urgent'})]})]);
 assert.deepEqual(m.routine.map(x=>x.title),['late','urgent','today','future']);
});
test('editorial decisions match project, content and current version; unrelated open work is not a decision',()=>{
 const editorial=(id,status='awaiting_client',version='v2')=>({id,title:id,status,version,visibleToClient:true,publishDate:'2026-10-25'});
 const p=project('a',{editorialCalendar:[editorial('approved'),editorial('changed'),editorial('pending'),editorial('old-version'),editorial('draft','production'),{...editorial('hidden'),visibleToClient:false}],executionTimeline:[task('ordinary')]});
 const decision=(id,version='v2',value='approved')=>({id,project_id:'a',content_id:id,content_version:version,decision:value,decided_at:'2026-10-18T12:00:00Z'});
 const m=view([p],'uid-a',[decision('approved'),decision('changed','v2','changes_requested'),decision('old-version','v1')]);assert.equal(m.pendingDecisions,2);assert.deepEqual(m.attention.map(x=>x.title).sort(),['old-version','pending']);
});
test('unavailable or forbidden approval source is not silently replaced by zero',()=>{
 const p=project('a',{editorialCalendar:[{id:'pending',title:'Pending',status:'awaiting_client',visibleToClient:true,publishDate:today}]});
 for(const source of ['unavailable','forbidden','loading']){const m=view([p],'uid-a',[],source);assert.equal(m.pendingDecisions,null);assert.equal(m.attention.length,0);}
});
test('only formal document reviews count, never draft, empty or approved documents',()=>{
 const p=project('a',{ecosystem2027:{selectedDocumentCodes:['01.01','01.02','01.03','01.04','01.01'],documents:{'01.01':{content:'Review',reviewStatus:'review'},'01.02':{content:'Draft',reviewStatus:'draft'},'01.03':{content:'',reviewStatus:'review'},'01.04':{content:'Approved',reviewStatus:'approved'}}}});assert.equal(view([p]).pendingDecisions,1);
});
test('meetings cover seven days, are chronological, exclude canceled/completed and passed times',()=>{
 const meeting=(id,date,time='10:00',status='planned')=>({id,title:id,kind:'meeting',date,time,status});
 const m=view([project('a',{operationalAgenda:[meeting('later','2026-10-26'),meeting('today',today,'16:00'),meeting('earlier','2026-10-20'),meeting('outside','2026-10-27'),meeting('cancelled','2026-10-20','10:00','cancelled'),meeting('done','2026-10-20','10:00','completed'),meeting('past-time',today,'09:00'),meeting('earlier','2026-10-20')]})]);
 assert.deepEqual(m.meetings.map(x=>x.title),['today','earlier','later']);assert.equal(m.attention[0].title,'past-time');
});
test('missing or invalid sources and dates do not fabricate zero values or deadlines',()=>{
 const m=view([project('missing',null),project('bad',{executionTimeline:[task('bad-date',{dueDate:'2026-02-30'})]})]);assert.equal(m.overdueTasks,null);assert.equal(m.pendingDecisions,null);assert.equal(m.invalidDates,1);assert.equal(m.attention.length,0);
 assert.equal(view([]).activeProjects,0);assert.equal(view([]).overdueTasks,0);
});
test('project record links preserve exact project and client identity, with encoded values',()=>{
 const p=project('id/with?symbols');p.clients.slug='cliente com espaço';assert.equal(overviewProjectHref(p),'/admin/planejamentos/cliente%20com%20espa%C3%A7o?projectId=id%2Fwith%3Fsymbols');assert.equal(overviewProjectHref({...p,clients:null}),null);
});
test('dashboard dates consistently follow Sao Paulo at UTC day boundaries',()=>{
 assert.equal(overviewToday(new Date('2026-10-20T01:00:00Z')),'2026-10-19');
});
test('approval loading paginates instead of treating a truncated first page as complete',async()=>{
 const p=project('a',{editorialCalendar:[{id:'pending',title:'Pending',status:'awaiting_client',visibleToClient:true}]});let calls=0,scope=[];
 const db={from(){return {select(){return this;},in(_key,ids){scope=ids;return this;},order(){return this;},async range(){calls++;return {error:null,data:calls===1?Array.from({length:1000},(_,i)=>({id:String(i)})):[]};}};}};
 assert.equal((await loadOverviewDecisions(db,[p])).length,1000);assert.equal(calls,2);assert.deepEqual(scope,['a']);
 const failing={from(){return {select(){return this;},in(){return this;},order(){return this;},async range(){return {error:{code:'42501'},data:null};}};}};await assert.rejects(()=>loadOverviewDecisions(failing,[p]));
});
test('financial summary never queries finance or uses sample money; old decorative sections removed',()=>{
 const source=readFileSync(new URL('../../src/Components/admin/AdminOperationsOverview.tsx',import.meta.url),'utf8');
 assert.match(source,/Aguardando integração financeira/);assert.doesNotMatch(source,/financeRequest|makeFinanceDemo|\/api\/.*finance|from\(["'].*finance|R\$\s*\d|Distribuição da carga|Próximas publicações/);
 for(const label of ['Projetos ativos','Tarefas atrasadas','Aguardando decisão','Recebimentos vencidos','Central de Atenção','Minha Rotina','Próximas Reuniões','Projetos em Atenção','Resumo Financeiro'])assert.ok(source.includes(label),label);
 const admin=readFileSync(new URL('../../src/app/admin/page.tsx',import.meta.url),'utf8');assert.match(admin,/setUserId\(userData.user.id\)/);assert.match(admin,/userId=\{userId\}/);assert.match(admin,/<FinanceHub\/>/);assert.doesNotMatch(admin,/<EditorialOperations /);
});
test('meetings retain Sunday-first offset consistent with header and real date alignment',()=>{
 const source=readFileSync(new URL('../../src/Components/admin/OperationalHubs.tsx',import.meta.url),'utf8');assert.match(source,/const offset=first.getDay\(\)/);assert.ok(source.includes('["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]'));assert.equal(new Date(2026,10,1).getDay(),0);assert.equal(new Date(2026,9,1).getDay(),4);
});
