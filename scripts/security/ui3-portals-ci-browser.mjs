// Authenticated browser tests against an unlinked loopback Supabase only. No mocks or hosted data.
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
const report={auth:'real disposable Supabase Auth; loopback HTTP only',portals:[],status:'running'};
const must=async(p,label)=>{const r=await p;assert.equal(r.error,null,label+': '+(r.error?.message??''));return r.data;};
const identity=async(label)=>{const email=label+'-'+suffix+'@synthetic.invalid',password='Local-Portal-'+suffix+'!';const {user}=await must(service.auth.admin.createUser({email,password,email_confirm:true}),'create synthetic identity');return {id:user.id,email,password};};
const login=async(user)=>{const client=createClient(api,process.env.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});return (await must(client.auth.signInWithPassword({email:user.email,password:user.password}),'authenticate synthetic identity')).session;};
async function http(path,session,method='GET',body,status=200){const response=await fetch(new URL(path,app),{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(response.status,status,method+' '+path.split('?')[0]);return response.json();}
const admin=await identity('admin');await must(service.from('profiles').insert({id:admin.id,email:admin.email,full_name:'Estrategista sintético',role:'strategist'}),'synthetic admin profile');await must(service.from('team_members').insert({user_id:admin.id,display_name:'Estrategista sintético',role:'admin',active:true}),'synthetic G2 administrator');const adminSession=await login(admin);
const labels=['Empresa Alfa','Empresa Beta','Empresa Gama','Empresa Delta','Empresa Épsilon'],fixtures=[];
const date=new Date();
const day=offset=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date.getTime()+offset*86400000));
const month=day(0).slice(0,7);
const [year,monthNumber]=month.split('-').map(Number);
const nextMonthDay=new Date(Date.UTC(year,monthNumber,1)).toISOString().slice(0,10);
const alternateDay=month+(day(0).endsWith('-15')?'-16':'-15');
const emptyDay=month+(day(0).endsWith('-05')?'-06':'-05');
const agendaItem=(id,title,date,extra={})=>({id,title,date,kind:'meeting',status:'planned',time:'14:00',...extra});
const foreignOwner=await identity('other-agenda-owner');
await must(service.from('rotevo_user_agendas').insert([
 {user_id:admin.id,data:{operationalAgenda:[agendaItem('private','Compromisso privado do estrategista',alternateDay,{meetingUrl:'javascript:alert(1)'})]}},
 {user_id:foreignOwner.id,data:{operationalAgenda:[agendaItem('foreign','Agenda privada de outro usuário',alternateDay)]}}
]),'synthetic private agendas owned by distinct accounts');
for(const [i,label] of labels.entries()){
 const user=await identity('client-'+i),clientId=randomUUID(),projectId=randomUUID();
 await must(service.from('clients').insert({id:clientId,name:'Homologação · '+label,slug:'portal-'+i+'-'+suffix}),'synthetic client');
 await must(service.rpc('rotevo_provision_client_profile',{p_user_id:user.id,p_client_id:clientId,p_full_name:'Cliente sintético '+i,p_email:user.email,p_enroll_notifications:true}),'atomic profile, link and enrollment');
 await must(service.from('client_workspaces').insert({client_id:clientId,data:{modules:['execution','content','meetings'],contracts:[],folders:[]}}),'synthetic workspace');
 const tasks=Array.from({length:i===1?18:2},(_,j)=>({id:'task-'+(j+1),kind:'task',title:'Atividade sintética '+(j+1),status:'planned',owner:'Estrategista sintético',priority:'normal',dueDate:j===0?day(0):day(-1),ownerUserId:admin.id,visibleToClient:false,description:'PRIVATE_DESCRIPTION_'+i,clientSummary:'Resumo seguro de acompanhamento',checklist:[{id:'a',text:'PRIVATE_CHECKLIST',done:true}]}));
 tasks.push({...tasks[0],id:'deleted',title:'Tarefa excluída sintética '+i,deletedAt:date.toISOString()});
 tasks.push({id:'confidential',kind:'task',title:'PRIVATE_CONFIDENTIAL_'+i,clientVisibility:'confidential',clientConfidentialReason:'Teste sintético'});
 await must(service.from('planning_projects').insert({id:projectId,client_id:clientId,title:'Projeto sintético '+i,slug:'portal-'+i+'-'+suffix,status:'draft',data:{internalNotes:'PRIVATE_ROOT_'+i,portalModules:['execution','content','meetings'],executionTimeline:tasks,editorialCalendar:[{id:'content-1',title:'Material sintético '+i,visibleToClient:true,version:'01',channel:'Instagram',format:'Reels',status:'idea'},
 {id:'approval-live',title:'Aprovação sintética '+i,visibleToClient:true,version:'01',channel:'Instagram',format:'Reels',status:'awaiting_client'},
 {id:'approval-deleted',title:'Aprovação excluída '+i,visibleToClient:true,version:'01',channel:'Instagram',format:'Reels',status:'awaiting_client',deletedAt:date.toISOString()}],
 operationalAgenda:[
 agendaItem('today','Compromisso de hoje '+i,day(0),{visibleToClient:true,notes:'Pauta sintética '+i,meetingUrl:'https://meet.google.com/synthetic-'+i}),
 agendaItem('alternate','Compromisso selecionado '+i,alternateDay,{status:'cancelled',visibleToClient:true}),
 agendaItem('next-month','Compromisso do próximo mês '+i,nextMonthDay,{visibleToClient:true}),
 agendaItem('internal','PRIVATE_MEETING_'+i,alternateDay,{visibleToClient:false})
 ]}}),'synthetic project');
 const release=await http('/api/workflow/client-actions',adminSession,'POST',{projectId,resourceType:'content',resourceId:'content-1',resourceVersion:'01',clientUserId:user.id,actionType:'send_material',instructions:'Enviar material sintético '+i,dueDate:null,requestKey:'portal-release-'+randomUUID(),expectedAuthorUserId:admin.id});
 const todayAction=await http('/api/workflow/client-actions',adminSession,'POST',{projectId,resourceType:'task',resourceId:'task-1',clientUserId:user.id,actionType:'provide_information',instructions:'Enviar informações de cadastro sintéticas '+i,dueDate:day(0),requestKey:'portal-today-'+randomUUID(),expectedAuthorUserId:admin.id});
 const overdueAction=await http('/api/workflow/client-actions',adminSession,'POST',{projectId,resourceType:'task',resourceId:'task-2',clientUserId:user.id,actionType:'review_material',instructions:'Revisar material sintético '+i,dueDate:day(-1),requestKey:'portal-overdue-'+randomUUID(),expectedAuthorUserId:admin.id});
 await http('/api/collaboration/messages',adminSession,'POST',{projectId,resourceType:'task',resourceId:'task-1',body:'Orientação sintética '+i,expectedAuthorUserId:admin.id},201);
 fixtures.push({i,label,user,projectId,assignmentId:release.assignment.id,todayAssignmentId:todayAction.assignment.id,overdueAssignmentId:overdueAction.assignment.id,expectedTasks:i===1?18:2});
}
const browser=await chromium.launch();let activePage;
async function loginPage(user,routeName){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(url.hostname)||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});
 const page=await context.newPage();activePage=page;
 await page.goto(app);await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Acessar Ecossistema',exact:true}).click();
 await page.waitForURL('**/'+routeName,{timeout:60000});
 return {page,context};
}
async function captureOverview(page,label,index){
 const region=name=>page.getByRole('region',{name,exact:true});
 const current=region('Para hoje');
 const isClient=label.startsWith('cliente');
 await current.getByRole('button',{name:isClient?'Fornecer informações':'Atividade sintética 1',exact:true}).first().waitFor({timeout:60000});
 await region('Atrasadas').getByRole('button',{name:isClient?'Revisar material':'Atividade sintética 2',exact:true}).first().waitFor();
 if(isClient){assert.equal(await current.getByRole('button',{name:'Atividade sintética 1',exact:true}).count(),0);assert.equal(await region('Atrasadas').getByRole('button',{name:'Atividade sintética 2',exact:true}).count(),0);}
 await region('Aprovações').getByRole('button',{name:'Aprovação sintética '+index,exact:true}).waitFor();
 assert.doesNotMatch(await page.locator('main').first().innerText(),/Aprovação excluída|Tarefa excluída sintética/);
 assert.equal(await current.locator('table').count(),1);
 await current.getByRole('button',{name:'Kanban',exact:true}).click();
 assert.equal(await current.locator('table').count(),0);
 await current.getByRole('button',{name:isClient?'Fornecer informações':'Atividade sintética 1',exact:true}).first().waitFor();
 await current.getByRole('button',{name:'Lista',exact:true}).click();
 if(label.startsWith('cliente'))assert.equal(await region('Aprovações').getByRole('button',{name:'Aprovação sintética '+((index+1)%fixtures.length),exact:true}).count(),0);
 await exerciseCalendar(page,region('Agenda'),label,index);
}
async function exerciseCalendar(page,agenda,label,index){
 const strategist=label==='estrategista';
 const calendar=agenda.getByRole('region',{name:'Calendário de reuniões'});
 const panel=agenda.locator('aside');
 const title=date=>'Agenda de '+date.split('-').reverse().join('/');
 const select=date=>calendar.getByRole('button',{name:strategist?date:'Ver agenda de '+date,exact:true});
 await panel.getByRole('heading',{name:title(day(0)),exact:true}).waitFor();
 await panel.getByText('Compromisso de hoje '+index,{exact:true}).waitFor();
 assert.equal(await select(day(0)).getAttribute('aria-pressed'),'true');
 assert.equal(await agenda.getByRole('region',{name:'Google Calendar',exact:true}).count(),0);
 assert.equal(await agenda.getByRole('button',{name:/Novo compromisso|Criar compromisso|Gerenciar|Sincronizar|Conectar conta/}).count(),0);
 await select(alternateDay).click();
 await panel.getByRole('heading',{name:title(alternateDay),exact:true}).waitFor();
 await panel.getByText('Compromisso selecionado '+index,{exact:true}).waitFor();
 assert.equal(await panel.getByText('Compromisso de hoje '+index,{exact:true}).count(),0);
 if(strategist){
  const privateCard=panel.getByRole('article').filter({hasText:'Compromisso privado do estrategista'});
  await privateCard.waitFor();
  assert.equal(await privateCard.getByRole('link').count(),0);
  assert.equal(await agenda.getByText('Agenda privada de outro usuário',{exact:true}).count(),0);
 }else{
  assert.doesNotMatch(await agenda.innerText(),/PRIVATE_MEETING|Compromisso privado|Agenda privada de outro usuário/);
  for(const [other] of labels.entries())if(other!==index){
   assert.equal(await agenda.getByText('Compromisso de hoje '+other,{exact:true}).count(),0);
   assert.equal(await agenda.getByText('Compromisso selecionado '+other,{exact:true}).count(),0);
  }
 }
 await select(emptyDay).click();
 await panel.getByRole('heading',{name:title(emptyDay),exact:true}).waitFor();
 assert.equal(await panel.getByRole('article').count(),0);
 await agenda.getByRole('button',{name:'Próximo mês',exact:true}).click();
 await panel.getByRole('heading',{name:title(nextMonthDay),exact:true}).waitFor();
 await panel.getByText('Compromisso do próximo mês '+index,{exact:true}).waitFor();
 await agenda.getByRole('button',{name:'Mês anterior',exact:true}).click();
 await panel.getByRole('heading',{name:title(day(0)),exact:true}).waitFor();
 await select(alternateDay).click();
 await agenda.getByRole('button',{name:'Hoje',exact:true}).click();
 await panel.getByRole('heading',{name:title(day(0)),exact:true}).waitFor();
 assert.equal(await panel.getByRole('article').filter({hasText:'Compromisso de hoje '+index}).getByRole('link').getAttribute('href'),'https://meet.google.com/synthetic-'+index);
 if(!strategist){
  await panel.getByRole('button',{name:'Visualizar',exact:true}).click();
  const details=page.getByRole('dialog',{name:'Compromisso de hoje '+index});
  await details.getByText('Pauta sintética '+index,{exact:true}).waitFor();
  await details.getByRole('button',{name:'Fechar detalhes',exact:true}).click();
 }
 for(const width of [1440,390])for(const mode of ['light','dark']){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.documentElement.dataset.rotevoAppearance=theme;},mode);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),label+' has horizontal page overflow at '+width+'px');
  const left=await calendar.boundingBox(),right=await panel.boundingBox();
  assert.ok(left&&right);
  assert.ok(width===1440?right.x>=left.x+left.width&&Math.abs(right.y-left.y)<=2:right.y>=left.y+left.height,label+' calendar and agenda layout at '+width+'px');
  assert.ok(right.x+right.width<=width+1,label+' agenda clipped at '+width+'px');
  const contrast=await panel.getByText('Compromisso de hoje '+index,{exact:true}).evaluate(el=>{
   const luminance=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255)
    .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4)
    .reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0);
   const foreground=luminance(getComputedStyle(el).color);
   const background=luminance(getComputedStyle(el.closest('article')).backgroundColor);
   return (Math.max(foreground,background)+0.05)/(Math.min(foreground,background)+0.05);
  });
  assert.ok(contrast>=4.5,label+' meeting title contrast '+mode+': '+contrast);
  await agenda.screenshot({path:join(output,'agenda-'+label+'-'+width+'-'+mode+'.png'),style:'.rv-ui2-topbar {position: static !important;} nextjs-portal {display:none!important;}'});
 }
 await page.setViewportSize({width:1440,height:1000});
 await agenda.getByRole('button',{name:'Ver agenda',exact:true}).click();
 await page.getByRole('region',{name:'Calendário de reuniões'}).waitFor();
 if(strategist){
  await page.getByRole('region',{name:'Google Calendar',exact:true}).waitFor();
  await page.getByRole('button',{name:'Novo compromisso',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'Novo compromisso',exact:true});
  await editor.waitFor();
  await editor.getByRole('button',{name:'Fechar janela',exact:true}).click();
 }
 await page.getByRole('button',{name:'Visão geral',exact:true}).click();
 await page.getByRole('region',{name:'Agenda',exact:true}).waitFor();
}

try{
 const strategist=await loginPage(admin,'admin');
 await captureOverview(strategist.page,'estrategista',0);
 const todaySection=strategist.page.getByRole('region',{name:'Para hoje',exact:true});
 await todaySection.getByRole('button',{name:'Criar tarefa',exact:true}).click();
 await strategist.page.getByRole('button',{name:'Mostrar checklist e dependências'}).click();
 assert.equal(await strategist.page.getByText('Tarefa excluída sintética 0',{exact:true}).count(),0);
 assert.equal(await strategist.page.getByPlaceholder('Adicionar etapa...').inputValue(),'');
 await strategist.page.getByRole('button',{name:'Cancelar',exact:true}).click();
 await strategist.context.close();
 for(const f of fixtures){const session=await login(f.user);const projected=await http('/api/client/projects',session);assert.equal(projected.projects.length,1);assert.equal(projected.projects[0].id,f.projectId);assert.equal(projected.projects[0].data.executionTimeline.length,f.expectedTasks);assert.doesNotMatch(JSON.stringify(projected),/PRIVATE_/);
  await http('/api/admin/project/update',session,'PATCH',{projectId:f.projectId,data:{executionTimeline:[]},expectedUpdatedAt:projected.projects[0].updated_at},403);
  const {page,context}=await loginPage(f.user,'cliente');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByText('Carregando seu ambiente...').waitFor({state:'hidden',timeout:60000});
  if(f.i<2)await captureOverview(page,'cliente-'+f.i,f.i);
  const bell=page.getByRole('button',{name:/^Notificações/});await bell.waitFor();await bell.click();await page.getByRole('dialog',{name:'Central de notificações'}).waitFor();await page.getByText('Nova mensagem em uma tarefa',{exact:true}).waitFor();await page.getByRole('button',{name:'Marcar como lida',exact:true}).first().click();await page.getByRole('dialog',{name:'Central de notificações'}).getByRole('button',{name:'Fechar',exact:true}).click();
  await page.getByRole('navigation',{name:'Navegação do portal'}).getByRole('button',{name:'Tarefas',exact:true}).click();await page.getByRole('button',{name:'Atividade sintética 1',exact:true}).waitFor();assert.doesNotMatch(await page.locator('body').innerText(),/PRIVATE_/);
  assert.equal(await page.getByRole('button',{name:/Nova tarefa|Editar tarefa|Excluir tarefa|Arquivar tarefa/}).count(),0);
  for(const width of [1440,390])for(const theme of ['light','dark']){await page.setViewportSize({width,height:1000});await page.evaluate(mode=>{document.documentElement.dataset.rotevoAppearance=mode;},theme);await page.waitForTimeout(250);const dimensions=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.viewport+2,'horizontal overflow '+f.label+' '+width+' '+theme);if(theme==='dark')assert.equal(await page.locator('main.rv-ui3').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');await page.screenshot({path:join(output,'client-'+f.i+'-'+width+'-'+theme+'.png'),fullPage:true});}
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Atividade sintética 1',exact:true}).click();const details=page.getByRole('dialog',{name:'Detalhes da tarefa Atividade sintética 1'});await details.getByText('Resumo seguro de acompanhamento',{exact:true}).waitFor();await details.getByText('Orientação sintética '+f.i,{exact:true}).waitFor();await details.getByLabel('Nova mensagem',{exact:true}).fill('Resposta sintética '+f.i);await details.getByRole('button',{name:'Enviar mensagem',exact:true}).click();await details.getByText('Resposta sintética '+f.i,{exact:true}).waitFor();assert.equal(await details.getByRole('button',{name:/Salvar tarefa|Excluir|Arquivar/}).count(),0);await page.screenshot({path:join(output,'client-'+f.i+'-task-details.png'),fullPage:true});await details.getByRole('button',{name:'Fechar',exact:true}).click();
  if(f.i===0){await page.getByRole('button',{name:/Enviar material.*Material sintético 0/}).click();const delivery=page.locator('[data-ui3-client-actions]');await delivery.getByLabel('Link do arquivo no Google Drive').fill('https://drive.google.com/file/d/synthetic-portal/view');await delivery.getByRole('button',{name:'Enviar link para validação',exact:true}).click();await delivery.getByText('Aguardando validação',{exact:true}).waitFor();const list=await http('/api/workflow/client-actions/project?'+new URLSearchParams({projectId:f.projectId,expectedAuthorUserId:admin.id}),adminSession);const assignment=list.assignments.find(x=>x.id===f.assignmentId);assert.equal(assignment.deliveries.length,1);await http('/api/workflow/client-actions/review',adminSession,'POST',{assignmentId:f.assignmentId,submissionId:assignment.deliveries[0].id,decision:'validated',feedback:'Entrega sintética validada',expectedAuthorUserId:admin.id});await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('button',{name:'Concluídas',exact:true}).click();await page.getByRole('button',{name:/Enviar material.*Material sintético 0/}).waitFor({timeout:35000});}
  assert.deepEqual(errors,[],'browser page errors');report.portals.push({client:f.label,authentication:'passed',projection:'passed',readOnly:'passed',notifications:'passed',conversation:'passed',screenshots:5,viewports:[1440,390],themes:['light','dark']});await context.close();console.log('PASS authenticated synthetic portal '+(f.i+1)+'/5');
 }
 report.status='passed';
}catch(error){report.status='failed';report.error=error instanceof Error?error.message:'Unknown browser test failure';if(activePage)await activePage.screenshot({path:join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
finally{writeFileSync(join(output,'result.json'),JSON.stringify(report,null,2));await browser.close();}
