const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const {JSDOM}=require("jsdom"),dom=new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>",{url:"http://127.0.0.1:3000"});
for(const k of ["window","document","HTMLElement","Element","HTMLInputElement","HTMLTextAreaElement","HTMLSelectElement","Event","MouseEvent","MutationObserver"])globalThis[k]=dom.window[k];
Object.defineProperty(globalThis,"navigator",{value:dom.window.navigator,configurable:true});
Object.defineProperty(document,"visibilityState",{value:"visible",configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require("react"),{act}=React,{createRoot}=require("react-dom/client"),root=path.resolve(__dirname,"../..");
let actor="00000000-0000-4000-8000-000000000021",notifications=[],messages=[],requests=[],failStatus=0,authListeners=[];
class RequestError extends Error{constructor(message,status){super(message);this.status=status;}}
const api={RequestError,async request(url,method="GET",body){requests.push({url,method,body});if(failStatus)throw new RequestError("Synthetic failure",failStatus);
 if(url.includes("/notifications")){if(method==="PATCH"){notifications=notifications.map(n=>n.notification_id===body.notificationId?{...n,read_at:"2026-11-18T12:01:00Z"}:n);return {read:true};}return {notifications,unreadCount:notifications.filter(n=>!n.read_at).length};}
 if(url.includes("/client-actions"))return {assignments:[]};
 if(url.includes("/messages")){if(method==="POST"){messages.push({id:"message-1",author_role:"client",author_name:"Cliente sintético",author_avatar_url:null,body:body.body,created_at:"2026-11-18T12:00:00Z",content_version:"01"});return {message:messages.at(-1)};}return {messages:structuredClone(messages),nextCursor:null};}
 throw Error("Unexpected request "+url);
}};
const mocks={"@/lib/operations/api":api,"@/lib/supabase":{supabase:{auth:{getUser:async()=>({data:{user:{id:actor}},error:null}),onAuthStateChange:fn=>{authListeners.push(fn);return {data:{subscription:{unsubscribe(){authListeners=authListeners.filter(x=>x!==fn);}}}};}}}},
 "@/Components/RotevoTablerIcon":{RotevoTablerIcon:()=>null},"@/Components/admin/TaskGridCells":{TaskAvatar:({name})=>React.createElement("span",{},name)},"@/Components/ui/DialogFocus":{default:()=>null}};
const cache=new Map();
function load(file){const full=path.resolve(root,file);if(cache.has(full))return cache.get(full).exports;const m={exports:{}};cache.set(full,m);const code=ts.transpileModule(fs.readFileSync(full,"utf8"),{fileName:full,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const req=name=>{if(mocks[name])return {__esModule:true,...mocks[name]};if(name.endsWith(".css"))return new Proxy({},{get:(_,k)=>k});let rel;if(name.startsWith("@/"))rel="src/"+name.slice(2);else if(name.startsWith("."))rel=path.relative(root,path.resolve(path.dirname(full),name));else return require(name);if(!fs.existsSync(path.join(root,rel)))rel+=fs.existsSync(path.join(root,rel+".tsx"))?".tsx":".ts";return load(rel);};new Function("require","module","exports",code)(req,m,m.exports);return m.exports;}

mocks['@/lib/supabase'].supabase.from=()=>({select(){return this},in:async()=>({data:[],error:null})});
const Timeline=load('src/Components/cliente/ProjectTimeline.tsx').default,Overview=load('src/Components/cliente/ClientOverview.tsx').default,Sharing=load('src/Components/admin/TaskClientSharingFields.tsx').default,{projectForClient}=load('src/lib/security/projectForClient.ts'),{usePortalRefresh}=load('src/hooks/usePortalRefresh.ts');
const container=document.getElementById("app");let mounted;
const tick=()=>new Promise(r=>setTimeout(r,15));
async function mount(Component,props){await act(async()=>{mounted=createRoot(container);mounted.render(React.createElement(Component,props));await tick();});await act(async()=>{await tick();});}
async function unmount(){if(mounted){await act(async()=>mounted.unmount());mounted=null;}requests=[];failStatus=0;notifications=[];}
async function click(button){assert.ok(button);await act(async()=>{button.click();await tick();});}
const button=label=>[...container.querySelectorAll("button")].find(b=>b.textContent.trim()===label);
const rawTask=()=>({id:'task-safe',title:'Roteiro compartilhado',kind:'task',status:'in_progress',clientProjectionVersion:1,clientSummary:'Resumo aprovado',checklist:[{id:'a',text:'Briefing recebido',done:true,visibleToClient:true},{id:'b',text:'PRIVATE_STEP',done:true},{id:'c',text:'Validar roteiro',done:false,visibleToClient:true}]});
const row=t=>({id:'project-safe',client_id:'client-safe',title:'Projeto sintético',slug:'synthetic',description:null,status:'draft',updated_at:'2026-11-19T12:00:00Z',data:{portalModules:['execution','content'],executionTimeline:[t],editorialCalendar:[]}});
test('open read-only task updates checklist and progress on focus and on confirmed strategist changes, without closing the dialog',async()=>{
 let source=row(rawTask());
 function Panel(){const [project,setProject]=React.useState(()=>projectForClient(source));usePortalRefresh(()=>setProject(projectForClient(source)));return React.createElement(Timeline,{projects:[project],assignmentUserId:actor});}
 try{await mount(Panel,{});await click(button('Roteiro compartilhado'));let dialog=container.querySelector('[role="dialog"]');assert.ok(dialog);assert.match(dialog.textContent,/Briefing recebido|Validar roteiro/);assert.doesNotMatch(dialog.textContent,/PRIVATE_STEP/);assert.equal(dialog.querySelectorAll('input[type="checkbox"]').length,0);assert.equal(dialog.querySelector('progress').value,2);assert.equal(dialog.querySelector('progress').max,3);
 source.data.executionTimeline[0].checklist[2].done=true;source.data.executionTimeline[0].clientSummary='Resumo atualizado';await act(async()=>{window.dispatchEvent(new Event('focus'));await tick();});dialog=container.querySelector('[role="dialog"]');assert.match(dialog.textContent,/Resumo atualizado/);assert.equal(dialog.querySelector('progress').value,3);assert.equal(dialog.querySelectorAll('[data-checklist-done="true"]').length,2);
 source.data.executionTimeline[0].checklist[0].done=false;await act(async()=>{window.dispatchEvent(new Event('rotevo:operational-change'));await tick();});assert.equal(dialog.querySelector('progress').value,2);assert.equal(requests.filter(r=>r.url.includes('/admin/project/update')).length,0);
 await unmount();await mount(Panel,{});await click(button('Roteiro compartilhado'));assert.equal(container.querySelector('progress').value,2);
 }finally{await unmount();}
});
test('strategist opts into description and individual steps; old flags remain private until selected',async()=>{
 let result;
 function Editor(){const [value,setValue]=React.useState({clientSummary:'Resumo',checklist:rawTask().checklist});result=value;return React.createElement(Sharing,{value,onChange:patch=>setValue(v=>({...v,...patch}))});}
 try{await mount(Editor,{});const toggle=[...container.querySelectorAll('input')].find(i=>i.getAttribute('aria-label')==='Compartilhar etapa: PRIVATE_STEP');assert.equal(toggle.checked,false);await click(toggle);assert.equal(result.checklist[1].visibleToClient,true);const description=container.querySelector('input');await click(description);assert.equal(result.clientDescriptionApproved,true);assert.equal(container.querySelector('textarea').disabled,true);await click(toggle);assert.equal(result.checklist[1].visibleToClient,false);
 }finally{await unmount();}
});
test('today, overdue and approval rows preserve counts and targets and show only real priority flags',async()=>{
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const p=row(rawTask());p.data.executionTimeline=[{...rawTask(),id:'today-urgent',title:'Hoje urgente',visibleToClient:true,dueDate:date,priority:'urgent'},{...rawTask(),id:'today-none',title:'Hoje sem prioridade',visibleToClient:true,dueDate:date},{...rawTask(),id:'late',title:'Entrega atrasada',visibleToClient:true,dueDate:'2020-01-01',priority:'high'}];
 p.data.editorialCalendar=[{id:'content-1',title:'Aprovação com prioridade',channel:'Instagram',format:'Reels',publishDate:date,status:'awaiting_client',visibleToClient:true,priority:'low',version:'01'},{id:'content-2',title:'Aprovação sem prioridade',channel:'Instagram',format:'Reels',publishDate:date,status:'awaiting_client',visibleToClient:true,version:'01'}];
 const calls=[];try{await mount(Overview,{projects:[p],workspace:{modules:['execution','content']},onNavigate:(...args)=>calls.push(args)});const lists=container.querySelectorAll('.rv-ui3-client-summary-list');assert.equal(lists.length,3);assert.deepEqual([...lists].map(x=>x.children.length),[2,1,2]);assert.equal(container.querySelector('[aria-label="Entregas para hoje"]').textContent,'2');assert.equal(container.querySelector('[aria-label="Aprovações pendentes"]').textContent,'2');assert.equal(lists[2].querySelectorAll('[role="img"]').length,1);assert.equal(lists[0].children[1].querySelector('[role="img"]'),null);await click(lists[0].querySelector('button'));assert.deepEqual(calls[0],['execution','project-safe','today-urgent']);await click(lists[2].querySelector('button'));assert.deepEqual(calls[1],['content','project-safe','content-1']);assert.equal(lists[0].querySelector('[aria-label="Prioridade Urgente"]').style.color,'rgb(218, 53, 83)');}
 finally{await unmount();}
});
