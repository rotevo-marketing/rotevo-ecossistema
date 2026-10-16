"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {ecosystemDocuments} from "@/data/ecosystem2027";
import type {ExecutionItem} from "@/Components/cliente/ProjectTimeline";

type Client={id:string;name:string;slug:string};
export type TaskProject={id:string;title:string;updated_at:string;data:{executionTimeline?:ExecutionItem[]}|null;clients:Client|Client[]|null};
type Status="planned"|"in_progress"|"blocked"|"completed"|"cancelled";
const columns:{id:Status;name:string}[]=[{id:"planned",name:"Planejado"},{id:"in_progress",name:"Em andamento"},{id:"blocked",name:"Aguardando"},{id:"completed",name:"Concluído"},{id:"cancelled",name:"Cancelado"}];
const label=(s?:string)=>columns.find(c=>c.id===s)?.name??"Planejado";
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const getClient=(p:TaskProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
const date=(value?:string)=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(value??"");return m?`${m[3]}/${m[2]}/${m[1]}`:"Sem prazo";};
export default function CentralTarefas({projects,onChanged}:{projects:TaskProject[];onChanged:(id:string,data:TaskProject["data"],updatedAt:string)=>void}){
 const [customer,setCustomer]=useState("all"),[responsible,setResponsible]=useState("all"),[status,setStatus]=useState("all");
 const [search,setSearch]=useState(""),[view,setView]=useState<"list"|"board">("list");
 const [deadline,setDeadline]=useState<"all"|"overdue"|"today"|"upcoming"|"undated">("all");
 const [documentScope,setDocumentScope]=useState<"all"|"linked"|"unlinked">("all");
 const [working,setWorking]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState("");
 const tasks=useMemo(()=>projects.flatMap(p=>(Array.isArray(p.data?.executionTimeline)?p.data.executionTimeline:[])
 .filter(t=>t&&typeof t.id==="string"&&typeof t.title==="string")
 .map(t=>({task:t,project:p,client:getClient(p)}))),[projects]);
 const owners=useMemo(()=>[...new Set(tasks.map(t=>t.task.owner?.trim()).filter((x):x is string=>!!x))].sort(),[tasks]);
 const filtered=useMemo(()=>tasks.filter(({task,project,client})=>
  (customer==="all"||project.id===customer)&&(responsible==="all"||(responsible==="unassigned"?!task.owner?.trim():task.owner?.trim()===responsible))&&
  (status==="all"||(task.status??"planned")===status)&&
  (documentScope==="all"||(documentScope==="linked"?!!task.documentCode:!task.documentCode))&&
  (deadline==="all"||(deadline==="undated"?!task.dueDate:deadline==="overdue"?!!task.dueDate&&task.dueDate<today()&&!["completed","cancelled"].includes(task.status??"planned"):deadline==="today"?task.dueDate===today():!!task.dueDate&&task.dueDate>today()))&&
  (`${task.title} ${client?.name??""} ${project.title} ${task.owner??""} ${task.documentCode??""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))))
 .sort((a,b)=>(a.task.dueDate??"9999").localeCompare(b.task.dueDate??"9999")),[tasks,customer,responsible,status,search,deadline,documentScope]);
 async function change(project:TaskProject,task:ExecutionItem,next:Status){
  if(working)return;
  setWorking(task.id);setError("");setMessage("");
  const nextData={...(project.data??{}),executionTimeline:(project.data?.executionTimeline??[]).map(t=>t.id===task.id?{...t,status:next}:t)};
  try {
    const {data:session,error:sessionError}=await supabase.auth.getSession();
    const token=session.session?.access_token;
    if(sessionError||!token)throw new Error("Sessão expirada. Entre novamente.");
    const response=await fetch("/api/admin/project/update",{
      method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
      body:JSON.stringify({projectId:project.id,expectedUpdatedAt:project.updated_at,data:nextData}),
      cache:"no-store"
    });
    if(response.status===409)throw new Error("O projeto foi atualizado em outra sessão. Atualize a página antes de alterar o status.");
    if(!response.ok)throw new Error("Não foi possível atualizar a tarefa autorizada.");
    const result=await response.json();
    if(!result?.project||typeof result.project.updated_at!=="string")throw new Error("Não foi possível confirmar a alteração.");
    onChanged(project.id,result.project.data as TaskProject["data"],result.project.updated_at);
  }catch(e){
    setError(e instanceof Error?e.message:"Não foi possível atualizar a tarefa.");
    setWorking("");
    return;
  }
  setWorking("");
  setMessage("Situação atualizada. O cliente visualizará a alteração nos itens autorizados.");
 }
 const tile=(entry:typeof tasks[number])=>{
  const {task,project,client}=entry;
  const overdue=task.dueDate&&task.dueDate<today()&&task.status!=="completed"&&task.status!=="cancelled";
  return <article key={project.id+":"+task.id} className="rounded-xl border border-[#E3E7F0] bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0"><h3 className="text-sm font-semibold">{task.title}</h3>
      <p className="mt-1 text-xs text-[#697386]">{client?.name??"Cliente sem nome"} · {project.title}</p>{task.documentCode&&<p className="mt-1 text-xs font-medium text-[#6D35F5]">{task.documentCode} — {ecosystemDocuments.find(d=>d.code===task.documentCode)?.title??"Documento estratégico"}</p>}</div>
      {overdue&&<span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Atrasada</span>}
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#697386]">
      <span>Prazo: {date(task.dueDate)}</span><span>Responsável: {task.owner?.trim()||"Não atribuído"}</span>
      <span>{task.visibleToClient===false?"Uso interno":"Visível ao cliente"}</span>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF0F5] pt-3">
      <label className="text-xs font-medium text-[#525B70]">Situação
        <select aria-label={`Situação de ${task.title}`} value={task.status??"planned"} disabled={!!working}
          onChange={e=>void change(project,task,e.target.value as Status)}
          className="ml-2 cursor-pointer rounded-lg border border-[#D9DCE5] bg-white px-2 py-2 text-xs disabled:opacity-50">
          {columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      {client?.slug?<Link href={`/admin/planejamentos/${client.slug}`} className="text-xs font-semibold text-[#6D35F5] hover:underline">Abrir projeto →</Link>:null}
    </div>
  </article>;
 };
 return <div className="mt-7 space-y-5">
  <div className="grid gap-3 sm:grid-cols-3">
   {[{name:"Todas as tarefas",count:tasks.length},{name:"Em andamento",count:tasks.filter(t=>t.task.status==="in_progress").length},{name:"Atrasadas",count:tasks.filter(t=>t.task.dueDate&&t.task.dueDate<today()&&!["completed","cancelled"].includes(t.task.status??"planned")).length}].map(metric=>
    <div key={metric.name} className={`rounded-2xl border p-5 ${metric.name==="Todas as tarefas"?"border-[#BDE7CB] bg-[#EAF8EF]":metric.name==="Em andamento"?"border-[#F3D5AD] bg-[#FFF1DC]":"border-[#F3C6C7] bg-[#FFF0F0]"}`}><p className="text-sm text-[#525B70]">{metric.name}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{metric.count}</p></div>)}
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
   <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="text-lg font-semibold">Central de tarefas</h2><p className="mt-1 text-sm text-[#697386]">Uma única visão das atividades cadastradas em todos os projetos.</p></div>
    <div className="flex items-center gap-2"><RotevoTablerIcon name="report" size={22}/><button type="button" onClick={()=>setView(view==="list"?"board":"list")} className="cursor-pointer rounded-xl border border-[#E3E7F0] px-4 py-2 text-sm font-medium">{view==="list"?"Ver Kanban":"Ver lista"}</button></div>
   </div>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <input aria-label="Buscar tarefas" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar tarefa ou cliente" className="rounded-xl border border-[#E3E7F0] px-3 py-3 text-sm"/>
    <select aria-label="Filtrar projeto" value={customer} onChange={e=>setCustomer(e.target.value)} className="cursor-pointer rounded-xl border border-[#E3E7F0] px-3 py-3 text-sm"><option value="all">Todos os projetos</option>{projects.map(p=><option key={p.id} value={p.id}>{getClient(p)?.name??"Cliente"} · {p.title}</option>)}</select>
    <select aria-label="Filtrar responsável" value={responsible} onChange={e=>setResponsible(e.target.value)} className="cursor-pointer rounded-xl border border-[#E3E7F0] px-3 py-3 text-sm"><option value="all">Todos os responsáveis</option><option value="unassigned">Não atribuído</option>{owners.map(x=><option key={x} value={x}>{x}</option>)}</select>
    <select aria-label="Filtrar situação" value={status} onChange={e=>setStatus(e.target.value)} className="cursor-pointer rounded-xl border border-[#E3E7F0] px-3 py-3 text-sm"><option value="all">Todas as situações</option>{columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
   </div>
   <div className="mt-3 flex flex-wrap gap-3">
    <select aria-label="Filtrar prazo" value={deadline} onChange={e=>setDeadline(e.target.value as typeof deadline)} className="rounded-xl border border-[#E3E7F0] px-3 py-2 text-sm"><option value="all">Todos os prazos</option><option value="overdue">Atrasadas em aberto</option><option value="today">Vencem hoje</option><option value="upcoming">Prazos futuros</option><option value="undated">Sem prazo</option></select>
    <select aria-label="Filtrar vínculo estratégico" value={documentScope} onChange={e=>setDocumentScope(e.target.value as typeof documentScope)} className="rounded-xl border border-[#E3E7F0] px-3 py-2 text-sm"><option value="all">Todos os vínculos</option><option value="linked">Com documento 2027</option><option value="unlinked">Sem documento vinculado</option></select>
    <button type="button" onClick={()=>{setCustomer("all");setResponsible("all");setStatus("all");setDeadline("all");setDocumentScope("all");setSearch("");}} className="rounded-xl border border-[#E3E7F0] px-3 py-2 text-sm font-medium">Limpar filtros</button>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {message&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
   <p className="mt-4 text-xs text-[#697386]">{filtered.length} atividade(s) encontrada(s)</p>
   {filtered.length===0?<div className="mt-4 rounded-xl bg-[#F6F7FB] p-5 text-sm text-[#697386]">Nenhuma tarefa corresponde aos filtros. Para cadastrar novas entregas, abra um projeto na seção Projetos.</div>:
    view==="list"?<div className="mt-4 grid gap-3 xl:grid-cols-2">{filtered.map(tile)}</div>:
    <div className="mt-4 flex gap-3 overflow-x-auto pb-3">{columns.map(col=><div key={col.id} className="w-64 shrink-0 rounded-xl bg-[#F6F7FB] p-3">
      <h3 className="mb-3 text-sm font-semibold">{col.name} <span className="text-[#697386]">({filtered.filter(t=>(t.task.status??"planned")===col.id).length})</span></h3>
      <div className="space-y-3">{filtered.filter(t=>(t.task.status??"planned")===col.id).map(tile)}</div>
     </div>)}</div>}
  </section>
 </div>;
}
