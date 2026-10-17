"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
import type {ExecutionItem} from "@/Components/cliente/ProjectTimeline";
import type {AgendaItem} from "@/Components/admin/OperationalAgenda";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
type Client={id:string;name:string;slug:string};
export type TaskProject={id:string;title:string;updated_at:string;data:{executionTimeline?:ExecutionItem[];operationalAgenda?:AgendaItem[]}|null;clients:Client|Client[]|null};
type Status="planned"|"in_progress"|"blocked"|"completed"|"cancelled";
type Priority="low"|"normal"|"high"|"urgent";
const statuses:{id:Status;name:string;chip:string;bar:string}[]=[
 {id:"planned",name:"Pendente",chip:"bg-[#EDF0F6] text-[#4A5368]",bar:"bg-[#A2ACBD]"},
 {id:"in_progress",name:"Em andamento",chip:"bg-[#DCEBFF] text-[#1659A8]",bar:"bg-[#4C9CF0]"},
 {id:"blocked",name:"Aguardando",chip:"bg-[#FFF1D4] text-[#875400]",bar:"bg-[#E9AE39]"},
 {id:"completed",name:"Concluída",chip:"bg-[#DFF6E7] text-[#176F40]",bar:"bg-[#37B36E]"},
 {id:"cancelled",name:"Cancelada",chip:"bg-[#F3E8EA] text-[#995666]",bar:"bg-[#BB7D8C]"}
];
const priorities:{id:Priority;name:string;chip:string}[]=[
 {id:"urgent",name:"Urgente",chip:"bg-[#FFE4E6] text-[#AE183D]"},
 {id:"high",name:"Alta",chip:"bg-[#FFEBD7] text-[#A54B07]"},
 {id:"normal",name:"Normal",chip:"bg-[#EEEAFE] text-[#6738BC]"},
 {id:"low",name:"Baixa",chip:"bg-[#E7F1FF] text-[#356DAA]"}
];
const getClient=(p:TaskProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const formatted=(s?:string)=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s)?`${s.slice(8,10)}/${s.slice(5,7)}`:"Sem prazo";
const isOpen=(t:ExecutionItem)=>t.status!=="completed"&&t.status!=="cancelled";
const selectClass="max-w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2 text-xs font-medium text-[#31394B] focus:outline-none focus:ring-2 focus:ring-[#6D35F5]";
const buttonClass="inline-flex items-center gap-2 rounded-lg border border-[#E1E5EE] bg-white px-3 py-2 text-xs font-semibold text-[#344056] hover:bg-[#F7F7FC]";
type Item={task:ExecutionItem;project:TaskProject;client:Client|null};
export default function CentralTarefas({projects,onChanged}:{projects:TaskProject[];onChanged:(id:string,data:TaskProject["data"],updatedAt:string)=>void}){
 const [projectId,setProjectId]=useState("all"),[owner,setOwner]=useState("all"),[status,setStatus]=useState("all"),[priority,setPriority]=useState("all");
 const [deadline,setDeadline]=useState<"all"|"today"|"overdue"|"upcoming">("all");
 const [query,setQuery]=useState(""),[showSearch,setShowSearch]=useState(false),[showFilters,setShowFilters]=useState(false);
 const [view,setView]=useState<"list"|"board">("list"),[order,setOrder]=useState<"urgency"|"due"|"priority">("urgency");
 const [working,setWorking]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [creating,setCreating]=useState(false),[draft,setDraft]=useState({title:"",projectId:"",ownerUserId:"",priority:"normal" as Priority,dueDate:"",description:""});
 const [members,setMembers]=useState<{user_id:string;display_name:string}[]>([]);
 const [teamReady,setTeamReady]=useState(false);
 const [detailKey,setDetailKey]=useState<string|null>(null);
 const [detailDraft,setDetailDraft]=useState<{title:string;description:string;driveUrl:string;dueDate:string;visibleToClient:boolean}|null>(null);
 useEffect(()=>{let active=true;void (async()=>{const {data,error}=await supabase.from("team_members").select("user_id,display_name").eq("active",true).order("display_name");if(active){setTeamReady(!error);setMembers(error?[]:(data??[]));}})();return()=>{active=false};},[]);
 const tasks=useMemo<Item[]>(()=>projects.flatMap(project=>(Array.isArray(project.data?.executionTimeline)?project.data.executionTimeline:[])
  .filter(task=>task&&typeof task.id==="string"&&typeof task.title==="string")
  .map(task=>({task,project,client:getClient(project)??null}))),[projects]);
 const selected=tasks.find(x=>x.project.id+":"+x.task.id===detailKey);
 const openDetails=(x:Item)=>{setDetailKey(x.project.id+":"+x.task.id);setDetailDraft({title:x.task.title,description:x.task.description??"",driveUrl:x.task.driveUrl??"",dueDate:x.task.dueDate??"",visibleToClient:x.task.visibleToClient===true});setError("");};
 const owners=useMemo(()=>[...new Set(tasks.map(x=>x.task.owner?.trim()).filter((x):x is string=>!!x))].sort(),[tasks]);
 const appointments=useMemo(()=>projects.flatMap(project=>(Array.isArray(project.data?.operationalAgenda)?project.data.operationalAgenda:[])
  .filter(item=>item&&item.status==="planned"&&typeof item.date==="string"&&typeof item.title==="string")
  .map(appointment=>({appointment,project,client:getClient(project)}))),[projects]);
 const todayAppointments=appointments.filter(x=>x.appointment.date===today()).sort((a,b)=>(a.appointment.time??"23:59").localeCompare(b.appointment.time??"23:59"));
 const filtered=useMemo(()=>tasks.filter(({task,project,client})=>
  (projectId==="all"||project.id===projectId)&&
  (owner==="all"||(owner==="unassigned"?!task.owner?.trim():task.owner?.trim()===owner))&&
  (status==="all"||(task.status??"planned")===status)&&
  (priority==="all"||(task.priority??"normal")===priority)&&
  (deadline==="all"||(deadline==="today"?task.dueDate===today()&&isOpen(task):deadline==="overdue"?!!task.dueDate&&task.dueDate<today()&&isOpen(task):!!task.dueDate&&task.dueDate>today()&&isOpen(task)))&&
  (`${task.title} ${project.title} ${client?.name??""} ${task.owner??""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
 ).sort((a,b)=>{
  const weights:Record<Priority,number>={urgent:0,high:1,normal:2,low:3};
  const priorityScore=(t:ExecutionItem)=>weights[t.priority??"normal"];
  const dateScore=(t:ExecutionItem)=>t.dueDate??"9999-99-99";
  const openScore=(t:ExecutionItem)=>isOpen(t)?0:1;
  const urgencyScore=(t:ExecutionItem)=>!isOpen(t)?4:t.dueDate&&t.dueDate<today()?0:t.status==="blocked"?1:t.dueDate===today()?2:3;
  return openScore(a.task)-openScore(b.task)+(order==="priority"?priorityScore(a.task)-priorityScore(b.task)||dateScore(a.task).localeCompare(dateScore(b.task)):
   order==="due"?dateScore(a.task).localeCompare(dateScore(b.task))||priorityScore(a.task)-priorityScore(b.task):
   urgencyScore(a.task)-urgencyScore(b.task)||priorityScore(a.task)-priorityScore(b.task)||dateScore(a.task).localeCompare(dateScore(b.task)));
 }),[tasks,projectId,owner,status,priority,deadline,query,order]);
 async function persist(project:TaskProject,nextTasks:ExecutionItem[],key:string,success:string){
  if(working)return false;
  setWorking(key);setError("");setNotice("");
  try{
   const {data:session,error:authError}=await supabase.auth.getSession();
   const token=session.session?.access_token;
   if(authError||!token)throw new Error("Sessão expirada. Entre novamente.");
   const response=await fetch("/api/admin/project/update",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({projectId:project.id,expectedUpdatedAt:project.updated_at,data:{...(project.data??{}),executionTimeline:nextTasks}}),cache:"no-store"});
   if(response.status===409)throw new Error("O projeto mudou em outra sessão. Atualize a página para evitar sobrescrever alterações.");
   if(!response.ok)throw new Error("Não foi possível salvar a tarefa. Verifique as permissões.");
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string")throw new Error("Não foi possível confirmar a gravação.");
   onChanged(project.id,result.project.data as TaskProject["data"],result.project.updated_at);
   setNotice(success);
   return true;
  }catch(e){setError(e instanceof Error?e.message:"Falha de conexão.");return false;}
  finally{setWorking("");}
 }
 async function updateTask(project:TaskProject,task:ExecutionItem,patch:Partial<ExecutionItem>){
  const timeline=project.data?.executionTimeline??[];
  const next=patch.status??task.status??"planned";
  if(next==="completed"&&(task.dependencies??[]).some(id=>timeline.find(t=>t.id===id)?.status!=="completed")){setError("Conclua os pré-requisitos antes desta tarefa.");return;}
  if(next!=="completed"&&task.status==="completed"&&timeline.some(t=>t.status==="completed"&&(t.dependencies??[]).includes(task.id))){setError("Reabra primeiro as tarefas que dependem desta.");return;}
  await persist(project,timeline.map(t=>t.id===task.id?{...t,...patch}:t),project.id+":"+task.id,"Tarefa atualizada.");
 }
 async function createTask(){
  const project=projects.find(p=>p.id===draft.projectId);
  if(!project){setError("Selecione um projeto válido.");return;}
  if(draft.title.trim().length<3||draft.title.trim().length>140){setError("Informe um título entre 3 e 140 caracteres.");return;}
  if(draft.description.length>2000){setError("A descrição excede 2.000 caracteres.");return;}
  if(draft.dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate)){setError("Informe um prazo válido.");return;}
  const member=members.find(x=>x.user_id===draft.ownerUserId);
  if(draft.ownerUserId&&!member){setError("Escolha um responsável válido.");return;}
  const task:ExecutionItem={id:crypto.randomUUID(),title:draft.title.trim(),description:draft.description.trim(),kind:"task",status:"planned",priority:draft.priority,owner:member?.display_name??"",ownerUserId:member?.user_id??"",dueDate:draft.dueDate,dependencies:[],visibleToClient:false};
  const ok=await persist(project,[...(project.data?.executionTimeline??[]),task],project.id+":create","Tarefa criada no projeto selecionado.");
  if(ok){setCreating(false);setDraft({title:"",projectId:"",ownerUserId:"",priority:"normal",dueDate:"",description:""});}
 }
 async function saveDetails(){
  if(!selected||!detailDraft)return;
  const title=detailDraft.title.trim(),driveUrl=detailDraft.driveUrl.trim();
  if(title.length<3||title.length>140){setError("O título deve ter entre 3 e 140 caracteres.");return;}
  if(detailDraft.description.length>2000){setError("A descrição deve ter no máximo 2.000 caracteres.");return;}
  if(driveUrl){try{if(new URL(driveUrl).protocol!=="https:"){setError("O material deve usar HTTPS.");return;}}catch{setError("Informe um link HTTPS válido.");return;}}
  if(detailDraft.dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(detailDraft.dueDate)){setError("Informe uma data válida.");return;}
  const patch:Partial<ExecutionItem>={title,description:detailDraft.description.trim(),driveUrl,dueDate:detailDraft.dueDate,visibleToClient:detailDraft.visibleToClient};
  const previous=selected.project.data?.executionTimeline??[];
  const ok=await persist(selected.project,previous.map(x=>x.id===selected.task.id?{...x,...patch}:x),selected.project.id+":"+selected.task.id,"Detalhes da tarefa atualizados.");
  if(ok){setDetailKey(null);setDetailDraft(null);}
 }
 const reset=()=>{setProjectId("all");setOwner("all");setStatus("all");setPriority("all");setDeadline("all");setQuery("");};
 const overdue=tasks.filter(x=>x.task.dueDate&&x.task.dueDate<today()&&isOpen(x.task)).length;
 const todayCount=tasks.filter(x=>x.task.dueDate===today()&&isOpen(x.task)).length;
 const chipStatus=(task:ExecutionItem)=>statuses.find(s=>s.id===(task.status??"planned"))??statuses[0];
 const chipPriority=(task:ExecutionItem)=>priorities.find(p=>p.id===(task.priority??"normal"))??priorities[2];
 const projectLink=(project:TaskProject)=>`/admin/planejamentos/${getClient(project)?.slug??""}?projectId=${encodeURIComponent(project.id)}`;
 const taskControls=(x:Item,compact=false)=><div className={compact?"flex flex-wrap gap-1":"flex flex-wrap items-center gap-2"}>
  <select aria-label={`Situação de ${x.task.title}`} value={x.task.status??"planned"} disabled={!!working} onChange={e=>void updateTask(x.project,x.task,{status:e.target.value as Status})} className={selectClass}>
   {statuses.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
  </select>
  <select aria-label={`Prioridade de ${x.task.title}`} value={x.task.priority??"normal"} disabled={!!working} onChange={e=>void updateTask(x.project,x.task,{priority:e.target.value as Priority})} className={selectClass}>
   {priorities.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
 </div>;
 return <div className="mt-7 space-y-4">
  <section aria-label="Prioridades e reuniões do dia" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E3E7F0] bg-white p-4">
   <div><h2 className="text-sm font-bold">Minha visão do dia</h2><p className="mt-1 text-xs text-[#697386]">Tarefas e reuniões dos projetos · {formatted(today())}</p></div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>{setDeadline("today");setStatus("all");}} className={buttonClass}>Hoje <strong>{todayCount}</strong></button>
    <button type="button" onClick={()=>{setDeadline("overdue");setStatus("all");}} className={buttonClass}>Atrasadas <strong>{overdue}</strong></button>
    <button type="button" onClick={()=>{setDeadline("all");setStatus("all");}} className={buttonClass}>Todas <strong>{tasks.length}</strong></button>
    <span className="inline-flex items-center gap-2 rounded-lg bg-[#F5F3FF] px-3 py-2 text-xs font-semibold text-[#6034B7]"><RotevoTablerIcon name="calendar-week" size={16} stroke={1.9}/> Reuniões hoje: {todayAppointments.length}</span>
   </div>
  </section>
  {todayAppointments.length>0&&<section className="rounded-xl border bg-white p-4"><h3 className="text-sm font-semibold">Agenda de hoje</h3><div className="mt-2 flex flex-wrap gap-2">{todayAppointments.map(({appointment,project})=><Link key={project.id+":"+appointment.id} href={projectLink(project)} className="rounded-lg bg-[#F6F7FB] px-3 py-2 text-xs">{appointment.time??"Sem horário"} · {appointment.title} · {project.title}</Link>)}</div></section>}
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Central de tarefas</h2><p className="mt-1 text-xs text-[#697386]">Todos os projetos · {filtered.length} tarefa(s) encontrada(s)</p></div>
    <div className="flex flex-wrap items-center gap-2">
     <button type="button" onClick={()=>{setDraft(d=>({...d,projectId:projectId!=="all"?projectId:projects[0]?.id??""}));setCreating(true);setError("");}} className="inline-flex items-center gap-2 rounded-lg bg-[#6D35F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5825D6]"><RotevoTablerIcon name="square-rounded-plus" size={17} stroke={1.9}/> Nova tarefa</button>
     <button type="button" aria-label="Buscar tarefas" aria-expanded={showSearch} onClick={()=>setShowSearch(v=>!v)} className={buttonClass}><RotevoTablerIcon name="search" size={17} stroke={1.9}/> <span className="hidden sm:inline">Buscar</span></button>
     <button type="button" aria-label="Mostrar filtros" aria-expanded={showFilters} onClick={()=>setShowFilters(v=>!v)} className={buttonClass}><RotevoTablerIcon name="filter" size={17} stroke={1.9}/> <span className="hidden sm:inline">Filtros</span></button>
     <RotevoTablerIcon name="arrows-sort" size={18} stroke={1.9}/><select aria-label="Ordenar tarefas" className={selectClass} value={order} onChange={e=>setOrder(e.target.value as typeof order)}><option value="urgency">Prioridades primeiro</option><option value="due">Prazo</option><option value="priority">Prioridade</option></select>
     <div className="flex overflow-hidden rounded-lg border border-[#E1E5EE]"><button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")} className={`inline-flex items-center gap-2 px-3 py-2 text-xs ${view==="list"?"bg-[#EDE8FF] font-semibold text-[#6034B7]":""}`}><RotevoTablerIcon name="list" size={16} stroke={1.9}/> <span className="hidden sm:inline">Lista</span></button><button type="button" aria-pressed={view==="board"} onClick={()=>setView("board")} className={`inline-flex items-center gap-2 border-l px-3 py-2 text-xs ${view==="board"?"bg-[#EDE8FF] font-semibold text-[#6034B7]":""}`}><RotevoTablerIcon name="layout-kanban" size={16} stroke={1.9}/> <span className="hidden sm:inline">Kanban</span></button></div>
    </div>
   </div>
   {showSearch&&<input autoFocus aria-label="Buscar por tarefa, projeto, cliente ou responsável" className="mt-4 w-full rounded-lg border border-[#E1E5EE] px-4 py-3 text-sm" placeholder="Buscar tarefa, projeto, cliente ou responsável..." type="search" value={query} onChange={e=>setQuery(e.target.value)}/>}
   <div className={`mt-4 flex flex-wrap gap-2 ${showFilters?"":"items-center"}`}>
    <RotevoTablerIcon name="folder" size={17} stroke={1.9}/><select aria-label="Filtrar projeto" value={projectId} onChange={e=>setProjectId(e.target.value)} className={selectClass}><option value="all">Todos os projetos</option>{projects.map(p=><option key={p.id} value={p.id}>{getClient(p)?.name??"Cliente"} · {p.title}</option>)}</select>
    <RotevoTablerIcon name="user-check" size={17} stroke={1.9}/><select aria-label="Filtrar responsável" value={owner} onChange={e=>setOwner(e.target.value)} className={selectClass}><option value="all">Todas as pessoas</option><option value="unassigned">Não atribuído</option>{owners.map(x=><option key={x} value={x}>{x}</option>)}</select>
    <RotevoTablerIcon name="flag" size={17} stroke={1.9}/><select aria-label="Filtrar prioridade" value={priority} onChange={e=>setPriority(e.target.value)} className={selectClass}><option value="all">Todas as prioridades</option>{priorities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
    {showFilters&&<><select aria-label="Filtrar situação" value={status} onChange={e=>setStatus(e.target.value)} className={selectClass}><option value="all">Todas as situações</option>{statuses.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select aria-label="Filtrar prazo" value={deadline} onChange={e=>setDeadline(e.target.value as typeof deadline)} className={selectClass}><option value="all">Todos os prazos</option><option value="today">Hoje</option><option value="overdue">Atrasadas</option><option value="upcoming">Futuras</option></select></>}
    <button type="button" className={buttonClass} onClick={reset}>Limpar</button>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {notice&&<p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
   {creating&&<section aria-label="Nova tarefa" className="mt-4 rounded-xl border border-[#DDD4FB] bg-[#FCFAFF] p-4"><h3 className="text-base font-semibold">Nova tarefa</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-medium sm:col-span-2">Nome da tarefa *<input value={draft.title} maxLength={140} onChange={e=>setDraft({...draft,title:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
     <label className="text-xs font-medium">Projeto *<select value={draft.projectId} onChange={e=>setDraft({...draft,projectId:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"><option value="">Selecione um projeto</option>{projects.map(p=><option key={p.id} value={p.id}>{getClient(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>
     <label className="text-xs font-medium">Responsável<select disabled={!teamReady||members.length===0} value={draft.ownerUserId} onChange={e=>setDraft({...draft,ownerUserId:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"><option value="">Não atribuído</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
     <label className="text-xs font-medium">Prioridade<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value as Priority})} className="mt-1 w-full rounded-lg border p-3 text-sm">{priorities.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
     <label className="text-xs font-medium">Prazo<input type="date" value={draft.dueDate} onChange={e=>setDraft({...draft,dueDate:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">Descrição opcional<textarea rows={2} maxLength={2000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
    </div><div className="mt-4 flex justify-end gap-2"><button type="button" disabled={!!working} className={buttonClass} onClick={()=>setCreating(false)}>Cancelar</button><button type="button" disabled={!!working||projects.length===0} className="rounded-lg bg-[#0B142A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" onClick={()=>void createTask()}>{working?"Salvando...":"Criar tarefa"}</button></div></section>}
   {filtered.length===0?<div className="mt-4 rounded-lg bg-[#F6F7FB] p-5 text-sm text-[#697386]">Nenhuma tarefa corresponde aos filtros. Use “Nova tarefa” para cadastrar uma atividade em um projeto.</div>:view==="list"?
   <div className="mt-4 overflow-x-auto rounded-xl border border-[#E3E7F0]"><table className="w-full min-w-[820px] border-collapse text-left text-sm"><thead className="bg-[#F7F8FC] text-xs font-semibold text-[#525B70]"><tr>{["Tarefa","Projeto","Responsável","Situação","Prioridade","Prazo"].map(x=><th key={x} className="border-b border-[#E3E7F0] px-3 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-[#EEF0F5]">{filtered.map(({task,project,client})=>{
    const statusChip=chipStatus(task),priorityChip=chipPriority(task);
    return <tr key={project.id+":"+task.id} className="hover:bg-[#FBFAFF]">
     <td className="max-w-[280px] border-l-4 px-3 py-3 font-medium" style={{borderLeftColor:task.status==="completed"?"#37B36E":task.priority==="urgent"?"#E04961":task.priority==="high"?"#E9AE39":"#9C78F4"}}><button type="button" onClick={()=>openDetails({task,project,client})} className="block max-w-full truncate text-left text-[#242A3A] hover:text-[#6D35F5] hover:underline">{task.title}</button>{(task.dependencies??[]).length>0&&<span className="mt-1 block text-[10px] text-[#697386]">Pré-requisitos: {(task.dependencies??[]).length}</span>}</td>
     <td className="px-3 py-3"><Link className="block max-w-[180px] truncate text-xs font-semibold text-[#6034B7] hover:underline" href={projectLink(project)}>{project.title}</Link><span className="block max-w-[180px] truncate text-[10px] text-[#697386]">{client?.name??"Cliente"}</span></td>
     <td className="px-3 py-3">{teamReady&&members.length>0?<select aria-label={`Responsável por ${task.title}`} className={selectClass} disabled={!!working} value={task.ownerUserId&&members.some(m=>m.user_id===task.ownerUserId)?task.ownerUserId:""} onChange={e=>{const m=members.find(x=>x.user_id===e.target.value);void updateTask(project,task,{ownerUserId:m?.user_id??"",owner:m?.display_name??""});}}><option value="">Não atribuído</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select>:<span className="text-xs text-[#525B70]">{task.owner||"Não atribuído"}</span>}</td>
     <td className="px-3 py-3"><select aria-label={`Situação de ${task.title}`} disabled={!!working} value={task.status??"planned"} onChange={e=>void updateTask(project,task,{status:e.target.value as Status})} className={`max-w-[150px] rounded-lg px-2 py-2 text-xs font-semibold ${statusChip.chip}`}>{statuses.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
     <td className="px-3 py-3"><select aria-label={`Prioridade de ${task.title}`} disabled={!!working} value={task.priority??"normal"} onChange={e=>void updateTask(project,task,{priority:e.target.value as Priority})} className={`rounded-lg px-2 py-2 text-xs font-semibold ${priorityChip.chip}`}>{priorities.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
     <td className={`whitespace-nowrap px-3 py-3 text-xs ${task.dueDate&&task.dueDate<today()&&isOpen(task)?"font-bold text-[#BB3041]":"text-[#525B70]"}`}>{formatted(task.dueDate)}</td>
    </tr>;
   })}</tbody></table></div>:
   <div className="mt-4 flex gap-3 overflow-x-auto pb-3">{statuses.map(col=><section key={col.id} className="w-64 shrink-0 rounded-xl bg-[#F6F7FB] p-3"><h3 className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${col.bar}`}/>{col.name}</span><span>{filtered.filter(x=>(x.task.status??"planned")===col.id).length}</span></h3><div className="space-y-2">{filtered.filter(x=>(x.task.status??"planned")===col.id).map(x=><article key={x.project.id+":"+x.task.id} className="rounded-lg border bg-white p-3"><button type="button" onClick={()=>openDetails(x)} className="text-left text-xs font-semibold hover:text-[#6D35F5] hover:underline">{x.task.title}</button><Link href={projectLink(x.project)} className="mt-2 block truncate text-[11px] text-[#6034B7] hover:underline">{x.project.title}</Link><div className="mt-2 flex justify-between gap-1 text-[11px] text-[#697386]"><span>{x.task.owner||"Não atribuído"}</span><span>{formatted(x.task.dueDate)}</span></div><div className="mt-3">{taskControls(x,true)}</div></article>)}</div></section>)}</div>}
  </section>
 </div>;
}
