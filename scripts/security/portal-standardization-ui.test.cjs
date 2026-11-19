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
const Bell=load("src/Components/shared/WorkflowNotificationBell.tsx").default,Timeline=load("src/Components/cliente/ProjectTimeline.tsx").default,Conversation=load("src/Components/shared/ProjectConversation.tsx").default,{projectForClient}=load("src/lib/security/projectForClient.ts"),{usePortalRefresh}=load("src/hooks/usePortalRefresh.ts");
const container=document.getElementById("app");let mounted;
const tick=()=>new Promise(r=>setTimeout(r,15));
async function mount(Component,props){await act(async()=>{mounted=createRoot(container);mounted.render(React.createElement(Component,props));await tick();});await act(async()=>{await tick();});}
async function unmount(){if(mounted){await act(async()=>mounted.unmount());mounted=null;}requests=[];failStatus=0;notifications=[];}
async function click(button){assert.ok(button);await act(async()=>{button.click();await tick();});}
const button=label=>[...container.querySelectorAll("button")].find(b=>b.textContent.trim()===label);
test("five client inboxes remain available: unread, empty, access restriction, technical error and acknowledgment",async()=>{
 try{for(let i=0;i<5;i++){actor="00000000-0000-4000-8000-"+String(21+i).padStart(12,"0");notifications=[{notification_id:"notice-1",event_id:"e",project_id:"p",project_title:"Projeto sintético",resource_id:"t",resource_version:null,event_type:"message_sent",event_phase:"task",occurred_at:"2026-11-18T12:00:00Z",read_at:null}];
 await mount(Bell,{userId:actor});assert.ok(container.querySelector('[aria-label="Notificações: 1 não lidas"]'));await click(container.querySelector('[aria-haspopup="dialog"]'));assert.match(container.textContent,/Nova mensagem em uma tarefa/);await click(button("Marcar como lida"));assert.equal(notifications[0].read_at,"2026-11-18T12:01:00Z");assert.ok(container.querySelector('[aria-label="Notificações"]'));await unmount();}
 actor="00000000-0000-4000-8000-000000000021";await mount(Bell,{userId:actor});await click(container.querySelector("button"));assert.match(container.textContent,/Nenhuma notificação/);await unmount();
 failStatus=403;await mount(Bell,{userId:actor});assert.ok(container.querySelector('[aria-label="Notificações não habilitadas"]'));await click(container.querySelector("button"));assert.match(container.textContent,/não habilitadas/);await unmount();
 failStatus=503;await mount(Bell,{userId:actor});assert.ok(container.querySelector('[aria-label="Notificações indisponíveis"]'));await click(container.querySelector("button"));assert.ok(button("Tentar novamente"));await unmount();
 }finally{await unmount();}
});
test("five project task views contain no operational editing controls and use the same projected record",async()=>{
 try{for(let i=0;i<5;i++){actor="00000000-0000-4000-8000-"+String(21+i).padStart(12,"0");const p=projectForClient({id:"p"+i,client_id:"c"+i,title:"Projeto "+i,slug:"synthetic-"+i,description:null,status:"draft",updated_at:"",data:{executionTimeline:[{id:"t"+i,title:"Atividade "+i,kind:"task",status:"planned",owner:"Equipe sintética",visibleToClient:false,description:"PRIVATE_DESCRIPTION",internalNotes:"PRIVATE_NOTE"}]}},["execution"]);
 await mount(Timeline,{projects:[p],clientName:"Cliente "+i,assignmentUserId:actor});assert.match(container.textContent,new RegExp("Atividade "+i));assert.doesNotMatch(container.textContent,/PRIVATE_|Nova tarefa|Editar tarefa|Excluir tarefa|Arquivar tarefa/);assert.equal(requests.filter(r=>r.method!=="GET").length,0);await unmount();}}
 finally{await unmount();}
});
test("messages survive re-opening the same conversation; publishing a message never sends an operational task update",async()=>{
 try{actor="00000000-0000-4000-8000-000000000021";await mount(Conversation,{projectId:"synthetic-p",resourceType:"task",resourceId:"synthetic-t"});
 const input=container.querySelector("textarea");await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(input,"Mensagem sintética persistente");input.dispatchEvent(new Event("input",{bubbles:true}));});await click(button("Enviar mensagem"));assert.match(container.textContent,/Mensagem sintética persistente/);assert.equal(requests.filter(r=>r.method==="POST").every(r=>r.url.includes("/messages")),true);await unmount();await mount(Conversation,{projectId:"synthetic-p",resourceType:"task",resourceId:"synthetic-t"});assert.match(container.textContent,/Mensagem sintética persistente/);assert.match(container.textContent,/Cliente sintético/);}
 finally{await unmount();}
});
test("focus, visibility and confirmed-mutation refreshes coalesce without concurrent reads",async()=>{
 let calls=0,active=0,max=0,resolve;
 const pending=new Promise(r=>resolve=r);
 function Probe(){usePortalRefresh(async()=>{calls++;active++;max=Math.max(max,active);await pending;active--;});return null;}
 try{await mount(Probe,{});await act(async()=>{window.dispatchEvent(new Event("focus"));window.dispatchEvent(new Event("focus"));});assert.equal(calls,1);await act(async()=>{resolve();await tick();});assert.equal(calls,2);assert.equal(max,1);
 Object.defineProperty(document,"visibilityState",{value:"hidden",configurable:true});await act(async()=>{window.dispatchEvent(new Event("rotevo:operational-change"));});assert.equal(calls,2);Object.defineProperty(document,"visibilityState",{value:"visible",configurable:true});await act(async()=>{window.dispatchEvent(new Event("rotevo:operational-change"));await tick();});assert.equal(calls,3);}
 finally{Object.defineProperty(document,"visibilityState",{value:"visible",configurable:true});await unmount();}
});
