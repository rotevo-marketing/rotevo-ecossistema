
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createRequire}=require("node:module");
const root=path.resolve(__dirname,"../..");
const dependencyRoot=process.env.ROTEVO_TEST_DEPENDENCY_ROOT||root;
const dependencyRequire=createRequire(path.join(dependencyRoot,"package.json"));
const ts=dependencyRequire("typescript");
const {JSDOM}=dependencyRequire("jsdom");
const dom=new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>",{url:"http://127.0.0.1:3000"});
for(const key of ["window","document","HTMLElement","HTMLInputElement","HTMLTextAreaElement","HTMLSelectElement","Event","MouseEvent"])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,"navigator",{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
process.env.NEXT_PUBLIC_ROTEVO_GOOGLE_CALENDAR_ENABLED="true";
const React=dependencyRequire("react");
const {act}=React;
const {createRoot}=dependencyRequire("react-dom/client");
let dirtyFlag=false,requestCalls=[],responseStatus=200,savedPayload,confirmedData={operationalAgenda:[]};
const cache=new Map();
const fixtures={
 "@/hooks/useUnsavedChanges":{useUnsavedChanges(value){dirtyFlag=value;},confirmDiscardChanges(){return true;}},
 "@/hooks/useCompactLayout":{useCompactLayout(){return false;}},
 "@/lib/supabase":{supabase:{auth:{async getSession(){return {data:{session:{access_token:"synthetic-token",user:{id:"user-a"}}}};}}}},
 "@/lib/operations/api":{request:async(...args)=>{requestCalls.push(args);if(args[0].endsWith("/events"))return {[args[2]?.scope==="personal"?"agenda":"project"]:{data:confirmedData,updated_at:"synthetic-updated"}};if(args[0].startsWith("/api/admin/agenda"))return {agenda:{data:{operationalAgenda:[]},updated_at:null}};return {busy:false};}},
 "@/Components/admin/ProjectOnboarding":{default:()=>null},
 "@/Components/admin/GoogleCalendarConnection":{default:()=>null},
 "@/Components/ui/DialogFocus":{default:()=>null},
 "next/link":{default:({children,...props})=>React.createElement("a",props,children)}
};
function load(relative){
 const full=path.join(root,relative);
 if(cache.has(full))return cache.get(full).exports;
 const module={exports:{}};cache.set(full,module);
 const output=ts.transpileModule(fs.readFileSync(full,"utf8"),{fileName:full,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const localRequire=name=>{
  if(fixtures[name])return {__esModule:true,...fixtures[name]};
  if(name.startsWith("@/"))return load("src/"+name.slice(2)+(fs.existsSync(path.join(root,"src/"+name.slice(2)+".tsx"))?".tsx":".ts"));
  if(name.startsWith(".")){const resolved=path.resolve(path.dirname(full),name);return load(path.relative(root,resolved).replaceAll("\\","/"));}
  return dependencyRequire(name);
 };
 new Function("require","module","exports",output)(localRequire,module,module.exports);
 return module.exports;
}
const Agenda=load("src/Components/admin/OperationalAgenda.tsx").default;
const Hub=load("src/Components/admin/OperationalHubs.tsx").AdminMeetingsHub;
let rendered;
const container=document.getElementById("app");
async function mount(Component,props){await act(async()=>{rendered=createRoot(container);rendered.render(React.createElement(Component,props));});}
async function unmount(){await act(async()=>rendered.unmount());requestCalls=[];savedPayload=undefined;responseStatus=200;}
const button=(text)=>[...container.querySelectorAll("button")].find(item=>item.textContent.trim()===text);
const input=(label)=>[...container.querySelectorAll("label")].find(item=>{const copy=item.cloneNode(true);copy.querySelectorAll("input,textarea,select").forEach(field=>field.remove());return copy.textContent.trim()===label;})?.querySelector("input,textarea,select");
async function change(element,value){
 assert.ok(element,"field must exist");
 const prototype=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:element instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
 await act(async()=>{Object.getOwnPropertyDescriptor(prototype,"value").set.call(element,value);element.dispatchEvent(new Event("input",{bubbles:true}));element.dispatchEvent(new Event("change",{bubbles:true}));});
}
async function click(element){assert.ok(element,"action must exist");await act(async()=>element.click());}
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
 assert.ok(["/api/admin/project/update","/api/admin/agenda"].includes(url),"test may never send external requests");
 savedPayload=JSON.parse(init.body);
 if(responseStatus!==200)return new Response(null,{status:responseStatus});
 confirmedData=structuredClone(savedPayload.data);
 return Response.json({[url==="/api/admin/agenda"?"agenda":"project"]:{data:confirmedData,updated_at:"synthetic-updated"}});
};
const base={projectId:"synthetic-project",projectData:{operationalAgenda:[]},updatedAt:"synthetic-before",onSaved(){},startNew:true};
test("compact scheduling and preserved meeting record, using synthetic server responses",async t=>{
 await t.test("general agenda saves a private meeting without selecting a client project or sharing with clients",async()=>{
  await mount(Hub,{userId:"user-a",projects:[{id:"synthetic-project",title:"Synthetic project",updated_at:"synthetic-before",clients:{name:"Synthetic client",slug:"synthetic"},data:{}}],onChanged(){}});
  await click(button("Novo compromisso"));
  assert.equal(container.querySelector('[aria-label="Projeto do novo compromisso"]').value,"");
  await change(input("Título"),"Synthetic unlinked event");
  await click(button("Salvar compromisso"));
  assert.equal(container.querySelector('[role="alert"]'),null);
  assert.equal(savedPayload.projectId,undefined);
  assert.equal(savedPayload.expectedUserId,"user-a");
  assert.equal(savedPayload.expectedUpdatedAt,null);
  assert.equal(savedPayload.data.operationalAgenda[0].visibleToClient,false);
  assert.equal(container.textContent.includes("Compartilhar compromisso com o cliente"),false);
  assert.equal(requestCalls.filter(args=>args[0].endsWith("/events")).length,0);
  await click(button("Sincronizar com Google Calendar"));
  const sync=requestCalls.find(args=>args[0].endsWith("/events"));
  assert.equal(sync[2].scope,"personal");assert.equal(sync[2].projectId,null);
  assert.equal(sync[2].expectedOwnerUserId,"user-a");assert.equal(sync[2].notify,false);
  await unmount();
 });
 await t.test("quick mode has one description, no editable duration and no meeting record fields",async()=>{
  await mount(Agenda,base);
  assert.equal(container.querySelectorAll("textarea").length,1);
  assert.ok(input("Descrição"));
  assert.equal(input("Duração"),undefined);
  assert.equal(input("Ata e decisões"),undefined);
  assert.equal(container.querySelector("details.rv-meeting-more").open,false);
  assert.equal(dirtyFlag,false);
  await unmount();
 });
 await t.test("required and optional guests, derived duration and description are saved without invitations",async()=>{
  let onSaved=0;
  await mount(Agenda,{...base,onSaved(){onSaved++;}});
  await change(input("Título"),"Synthetic scheduling");
  await change(input("Data"),"2027-01-20");
  await change(input("Horário de início"),"14:00");
  await change(input("Horário de término"),"15:30");
  await change(input("Descrição"),"Shared description");
  await change(input("Adicionar convidados"),"required@example.test");
  assert.equal(dirtyFlag,true);
  await click(button("Adicionar"));
  await change(container.querySelector('[aria-label="Tipo do novo convidado"]'),"optional");
  await change(input("Adicionar convidados"),"optional@example.test");
  await click(button("Salvar compromisso"));
  const saved=savedPayload.data.operationalAgenda[0];
  assert.deepEqual(saved.googleOptions.guests,["required@example.test"]);
  assert.deepEqual(saved.googleOptions.optionalGuests,["optional@example.test"]);
  assert.equal(saved.googleOptions.description,"Shared description");
  assert.equal(saved.duration,"90 min");
  assert.equal(saved.visibleToClient,false);
  assert.equal(saved.agendaVisibleToClient,false);
  assert.equal(saved.minutesVisibleToClient,false);
  assert.equal(onSaved,1);
  assert.equal(requestCalls.length,0,"save must not sync or invite implicitly");
  assert.ok(input("Ata e decisões"),"server-confirmed save opens meeting record");
  await unmount();
 });
 await t.test("server failure keeps title and pending attendee draft for retry",async()=>{
  await mount(Agenda,base);
  await change(input("Título"),"Keep on failure");
  await change(input("Adicionar convidados"),"retry@example.test");
  responseStatus=409;
  await click(button("Salvar compromisso"));
  assert.match(container.querySelector('[role="alert"]').textContent,/outra sessão/);
  assert.equal(input("Título").value,"Keep on failure");
  assert.equal(input("Adicionar convidados").value,"retry@example.test");
  await unmount();
 });
 await t.test("editing preserves separate historical agenda, minutes, private notes, recurrence and confirmed Meet",async()=>{
  const item={id:"synthetic-existing",title:"Existing meeting",kind:"meeting",date:"2027-01-20",time:"14:00",status:"planned",notes:"Historical agenda",minutes:"Historical minutes",internalNotes:"Private historical notes",minutesHistory:[{version:1,text:"Earlier minutes",changedAt:"2027-01-19",changedBy:"synthetic"}],actionItems:[{id:"synthetic-action",title:"Existing action",owner:"Synthetic owner",dueDate:"2027-01-25"}],googleLink:{userId:"synthetic-user",calendarId:"synthetic-calendar",account:"synthetic@example.test",etag:"etag",localHash:"hash",meetUrl:"https://meet.google.com/aaa-bbbb-ccc"},googleOptions:{guests:[],description:"Historical shared description",recurrence:"RRULE:FREQ=WEEKLY;COUNT=3",reminders:[{method:"email",minutes:30}],meet:true}};
  const data={operationalAgenda:[item]};
  await mount(Agenda,{...base,startNew:false,projectData:data});
  await click(button("Editar"));
  assert.equal(input("Descrição").value,"Historical shared description");
  assert.equal(input("Link da reunião (opcional)"),undefined);
  assert.equal(container.querySelectorAll('a[href="https://meet.google.com/aaa-bbbb-ccc"]').length,1);
  await change(input("Título"),"Updated title");
  await click(button("Salvar compromisso"));
  const saved=savedPayload.data.operationalAgenda[0];
  for(const key of ["notes","minutes","internalNotes","minutesHistory","actionItems","googleLink"])assert.deepEqual(saved[key],item[key],key);
  assert.deepEqual(saved.googleOptions,load("src/lib/googleCalendar/eventSync.ts").eventOptions(item.googleOptions));
  assert.equal(input("Pauta").value,"Historical agenda");
  await change(input("Pauta"),"Updated agenda");
  await click(button("Editar agendamento"));
  await click(button("Registro da reunião"));
  assert.equal(input("Pauta").value,"Updated agenda","switching sections retains unsaved record");
  await unmount();
 });
 globalThis.fetch=originalFetch;
});
