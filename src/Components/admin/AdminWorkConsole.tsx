"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {overviewClient,overviewDate,overviewProjectHref,overviewToday,type OperationsProject} from "@/lib/overview/model";

type WorkRow={key:string;title:string;project:OperationsProject;kind:"Tarefa"|"Reunião"|"Acompanhamento"|"Marco";date?:string;time?:string;assignedToMe:boolean;owner:string;priority:number;status:string;blocked:boolean};
type View="today"|"overdue"|"week"|"delegated"|"unscheduled"|"all";
const tabs:{id:View;label:string}[]=[{id:"today",label:"Hoje"},{id:"overdue",label:"Atrasadas"},{id:"week",label:"Esta semana"},{id:"delegated",label:"Delegadas"},{id:"unscheduled",label:"Sem prazo"},{id:"all",label:"Todas"}];
const valid=(date?:string)=>!!date&&/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+"T12:00:00Z"));
const futureWeek=(today:string)=>{const d=new Date(today+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+6);return d.toISOString().slice(0,10);};
const priorityName=(p:number)=>p===0?"Urgente":p===1?"Alta":p===2?"Normal":"Baixa";
const icon=(name:"calendar"|"alert-circle"|"users"|"list-check"|"hourglass",size=18)=><RotevoTablerIcon name={name} size={size}/>;
export default function AdminWorkConsole({projects,userId,onOpenTasks,onOpenMeetings}:{projects:OperationsProject[];userId?:string|null;onOpenTasks?:()=>void;onOpenMeetings?:()=>void}){
 const [view,setView]=useState<View>("today"),[client,setClient]=useState("all"),[owner,setOwner]=useState("all");
 const today=overviewToday(),end=futureWeek(today);
 const {rows,unlinked}=useMemo(()=>{
  const list:WorkRow[]=[];let unlinked=0;
  for(const p of projects.filter(x=>!["archived","closed","cancelled"].includes(x.status))){
   const tasks=Array.isArray(p.data?.executionTimeline)?p.data.executionTimeline:[];
   const seen=new Set<string>();
   for(const t of tasks){
    if(!t||!t.id||!t.title||seen.has(t.id)||["completed","cancelled"].includes(t.status??""))continue;
    seen.add(t.id);
    if(t.owner?.trim()&&!t.ownerUserId)unlinked++;
    list.push({key:p.id+":task:"+t.id,title:t.title,project:p,kind:"Tarefa",date:valid(t.dueDate)?t.dueDate:undefined,assignedToMe:!!userId&&t.ownerUserId===userId,owner:t.owner?.trim()||"Não atribuído",priority:({urgent:0,high:1,normal:2,low:3})[t.priority??"normal"],status:t.status??"planned",blocked:t.status==="blocked"});
   }
   const meetings=Array.isArray(p.data?.operationalAgenda)?p.data.operationalAgenda:[];
   const seenMeetings=new Set<string>();
   for(const m of meetings){
    if(!m||!m.id||!m.title||m.status!=="planned"||seenMeetings.has(m.id))continue;
    seenMeetings.add(m.id);
    const linked=tasks.find(t=>t.id===m.relatedTaskId);
    list.push({key:p.id+":agenda:"+m.id,title:m.title,project:p,kind:m.kind==="meeting"?"Reunião":m.kind==="followup"?"Acompanhamento":"Marco",date:valid(m.date)?m.date:undefined,time:m.time,assignedToMe:!!userId&&linked?.ownerUserId===userId,owner:m.owner?.trim()||"Responsável não informado",priority:2,status:m.status,blocked:false});
   }
  }
  return {rows:list,unlinked};
 },[projects,userId]);
 const filter=(r:WorkRow,v:View)=>{
  if(v==="today")return r.date===today;
  if(v==="overdue")return !!r.date&&r.date<today;
  if(v==="week")return !!r.date&&r.date>=today&&r.date<=end;
  if(v==="delegated")return r.kind==="Tarefa"&&!!r.owner&&r.owner!=="Não atribuído"&&!r.assignedToMe;
  if(v==="unscheduled")return !r.date;
  return true;
 };
 const validClient=(r:WorkRow)=>client==="all"||r.project.id===client;
 const owners=[...new Set(rows.map(x=>x.owner).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
 const visible=rows.filter(r=>filter(r,view)&&validClient(r)&&(owner==="all"||r.owner===owner)).sort((a,b)=>Number(b.blocked)-Number(a.blocked)||(a.date??"9999").localeCompare(b.date??"9999")||a.priority-b.priority||(a.time??"23:59").localeCompare(b.time??"23:59"));
 const counts={today:rows.filter(x=>x.date===today).length,overdue:rows.filter(x=>!!x.date&&x.date<today).length,week:rows.filter(x=>!!x.date&&x.date>=today&&x.date<=end).length,delegated:rows.filter(x=>x.kind==="Tarefa"&&x.owner!=="Não atribuído"&&!x.assignedToMe).length,unscheduled:rows.filter(x=>!x.date).length,all:rows.length};
 return <section aria-labelledby="operations-console-title" className="rv-ui3-work-console min-w-0 bg-white py-4">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="operations-console-title" className="flex items-center gap-2 text-sm font-semibold"><span className="text-[#687487]">{icon("list-check",17)}</span>Central de trabalho</h2><p className="sr-only">Tarefas e compromissos de todos os projetos, sem duplicar os cadastros.</p></div>{onOpenTasks&&<button type="button" onClick={onOpenTasks} className="min-h-9 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium text-[#5949D1] hover:bg-[#EDEAFF]">Abrir central de tarefas</button>}</div>
  <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-[#E3E6ED] pb-3">{tabs.map(t=><button type="button" key={t.id} aria-pressed={view===t.id} onClick={()=>setView(t.id)} className={"min-h-9 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium "+(view===t.id?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]")}>{t.label} <span className="opacity-70">{counts[t.id]}</span></button>)}</div>
  <div className="mt-3 flex flex-wrap gap-2"><label className="min-w-0 max-w-full flex-[1_1_220px] text-xs font-semibold text-[#637087]">Cliente / projeto<select aria-label="Filtrar por projeto" value={client} onChange={e=>setClient(e.target.value)} className="mt-1 block w-full min-w-0 max-w-[260px] rounded-lg border border-[#E0E4ED] bg-white px-3 py-2 text-sm text-[#1A2640]"><option value="all">Todos os projetos</option>{projects.map(p=><option key={p.id} value={p.id}>{overviewClient(p)?.name??p.title} · {p.title}</option>)}</select></label><label className="min-w-0 max-w-full flex-[1_1_220px] text-xs font-semibold text-[#637087]">Responsável<select aria-label="Filtrar por responsável" value={owner} onChange={e=>setOwner(e.target.value)} className="mt-1 block w-full min-w-0 max-w-[260px] rounded-lg border border-[#E0E4ED] bg-white px-3 py-2 text-sm text-[#1A2640]"><option value="all">Todas as atribuições</option>{owners.map(name=><option key={name} value={name}>{name}</option>)}</select></label></div>
  {visible.length?<ul className="mt-4 divide-y divide-[#E9ECF3]">{visible.slice(0,25).map(r=><li key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase text-[#7257A4]">{r.kind}</span>{r.blocked&&<span className="rounded-md bg-[#FFF3D9] px-2 py-0.5 text-[10px] text-[#8B5C12]">Bloqueada</span>}{r.assignedToMe&&<span className="rounded-md bg-[#E8F4EC] px-2 py-0.5 text-[10px] text-[#176B42]">Minha</span>}</div><p className="mt-1 text-sm font-semibold">{r.title}</p><p className="mt-1 text-xs text-[#687487]">{overviewClient(r.project)?.name??"Cliente não informado"} · {r.project.title} · {r.owner}</p><p className="mt-1 text-xs text-[#687487]">{overviewDate(r.date)}{r.time?" · "+r.time:""}{r.kind==="Tarefa"?" · "+priorityName(r.priority):""}</p></div>{overviewProjectHref(r.project)?<Link href={overviewProjectHref(r.project)!} className="shrink-0 text-xs font-semibold text-[#6332C7] hover:underline">Abrir projeto ↗</Link>:<span className="text-xs text-[#687487]">Sem vínculo</span>}</li>)}</ul>:<p className="mt-4 rounded-lg bg-[#F7F8FB] px-4 py-4 text-sm text-[#69778E]">Nenhuma atividade para os filtros selecionados.</p>}
  {visible.length>25&&<p className="mt-3 text-xs text-[#69778E]">Exibindo os primeiros 25 registros. Use os filtros ou a Central de Tarefas para consultar os demais.</p>}
  {unlinked>0&&<p className="mt-3 text-xs text-[#90621C]">Atenção: {unlinked} tarefa(s) usam apenas o nome do responsável. A atribuição à conta precisa ser vinculada para a visão pessoal ser confiável.</p>}
  <p className="mt-3 text-xs text-[#7A8799]">“Hoje”, “Atrasadas” e “Esta semana” usam a data de São Paulo. “Delegadas” é uma visão gerencial de tarefas atribuídas a terceiros e não implica que tenham sido delegadas pessoalmente por você.</p>
  {onOpenMeetings&&<button type="button" onClick={onOpenMeetings} className="mt-3 cursor-pointer text-xs font-semibold text-[#6D35F5]">Ver agenda completa ↗</button>}
 </section>;
}
