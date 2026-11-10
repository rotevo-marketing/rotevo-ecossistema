"use client";
import { useMemo, useState } from "react";
import { RotevoTablerIcon } from "@/Components/RotevoTablerIcon";
import { TaskAvatar } from "@/Components/admin/TaskGridCells";

export type ExecutionItem = {
  id:string;
  title:string;
  description?:string;
  projectTitle?:string;
  projectKey?:string;
  projectAvatarUrl?:string;
  documentCode?:string;
  priority?:"low"|"normal"|"high"|"urgent";
  phase?:string;
  owner?:string;
  ownerAvatarUrl?:string;
  ownerUserId?:string;
  startDate?:string;
  dueDate?:string;
  completedAt?:string;
  archivedAt?:string;
  deletedAt?:string;
  status?:"planned"|"in_progress"|"blocked"|"completed"|"cancelled";
  kind?:"deliverable"|"milestone"|"task";
  dependencies?:string[];
  driveUrl?:string;
  referenceUrl?:string;
  checklist?:{id:string;text:string;done:boolean}[];
  activityLog?:{at:string;summary:string}[];
  visibleToClient?:boolean;
};
type Project={id:string;title:string;clientAvatarUrl?:string|null;data:{executionTimeline?:ExecutionItem[];deliverySchedule?:Record<string,string>|null}|null};
const labels:Record<string,string>={
  planned:"Planejado",in_progress:"Em andamento",blocked:"Aguardando",completed:"Concluído",cancelled:"Cancelado"
};
const colors:Record<string,string>={
  planned:"bg-[#ECEFF5] text-[#566073]",in_progress:"bg-[#FFF0D9] text-[#94610A]",
  blocked:"bg-[#EDE8FF] text-[#6437C3]",completed:"bg-[#DFF4E6] text-[#176A3B]",cancelled:"bg-[#F2E9EA] text-[#9C4C59]"
};
const mondayStatus:Record<string,string>={planned:"#929BAB",in_progress:"#4089DD",blocked:"#EDAC45",completed:"#12A873",cancelled:"#B2778B"};
const mondayPriority:Record<string,{name:string;color:string}>={urgent:{name:"Urgente",color:"#D9415C"},high:{name:"Alta",color:"#E89639"},normal:{name:"Normal",color:"#5C80C7"},low:{name:"Baixa",color:"#9CA5B2"}};
function formatted(value?:string){if(!value)return "A definir";const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(value);return match?`${match[3]}/${match[2]}/${match[1]}`:"A definir";}
function safeLink(url?:string){if(!url)return null;try{const parsed=new URL(url);return parsed.protocol==="https:"?parsed.href:null;}catch{return null;}}
function isExecutionItem(value:unknown):value is ExecutionItem{
  return typeof value==="object"&&value!==null&&typeof (value as ExecutionItem).id==="string"&&typeof (value as ExecutionItem).title==="string";
}
export default function ProjectTimeline({projects}:{projects:Project[]}){
 const [filter,setFilter]=useState("active");
 const [completedMonth,setCompletedMonth]=useState("");
 const [page,setPage]=useState(1);
 const pageSize=15;
 const [view,setView]=useState<"timeline"|"list"|"board">("list");
 const items=useMemo(()=>{
   const items:ExecutionItem[]=[];
   for(const project of projects){
     for(const item of project.data?.executionTimeline??[]){
       if(!isExecutionItem(item)||item.visibleToClient!==true||item.archivedAt||item.deletedAt)continue;
       items.push({...item,projectTitle:project.title,projectKey:project.id,projectAvatarUrl:project.clientAvatarUrl??undefined});
     }
   }
   items.sort((a,b)=>(a.dueDate??"9999").localeCompare(b.dueDate??"9999"));
   return items;
 },[projects]);
 const visible=items.filter(item=>filter==="active"?item.status!=="completed"&&item.status!=="cancelled":filter==="completed"?item.status==="completed"&&(!completedMonth||item.completedAt?.startsWith(completedMonth)):item.status===filter).sort((a,b)=>filter==="completed"?(b.completedAt??"").localeCompare(a.completedAt??""):(a.dueDate??"9999").localeCompare(b.dueDate??"9999"));
 const pages=Math.max(1,Math.ceil(visible.length/pageSize));
 const shown=visible.slice((Math.min(page,pages)-1)*pageSize,Math.min(page,pages)*pageSize);
 const completed=items.filter(item=>item.status==="completed").length;
 const planned=items.filter(item=>!item.status||item.status==="planned").length;
 const inProgress=items.filter(item=>item.status==="in_progress").length;
 const waiting=items.filter(item=>item.status==="blocked").length;
 const now=new Date();
 const localToday=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
 const next=items.find(item=>item.status!=="completed"&&item.status!=="cancelled"&&item.dueDate&&item.dueDate>=localToday);
 return <div className="rv-ui2-module rv-ui2-client-execution space-y-4">
   <section aria-label="Resumo da execução" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
     {[{label:"Planejadas",value:planned,tone:"border-[#E3E7F0] bg-white text-[#566073]"},{label:"Em andamento",value:inProgress,tone:"border-[#F3D6A6] bg-[#FFFAF0] text-[#94610A]"},{label:"Aguardando",value:waiting,tone:"border-[#DDD2FF] bg-[#F7F3FF] text-[#6437C3]"},{label:"Concluídas",value:completed,tone:"border-[#BCE7CA] bg-[#F2FBF5] text-[#176A3B]"}].map(stat=><div key={stat.label} className={`rounded-2xl border p-4 sm:p-5 ${stat.tone}`}><p className="text-xs font-medium">{stat.label}</p><strong className="mt-2 block text-[28px] leading-9 font-semibold tracking-tight tabular-nums">{stat.value}</strong></div>)}
   </section>
   <section className="rv-ui2-client-section rounded-xl border border-[#E3E6ED] bg-white p-4 sm:p-5">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Tarefas</h2>
       <p className="mt-1 text-sm text-[#697386]">Acompanhe as atividades e entregas compartilhadas pela Rotevo. O calendário de conteúdo é independente.</p></div>
      <div className="flex rounded-lg border border-[#E3E6ED] bg-[#F8F9FC] p-1" aria-label="Modo de visualização">
       {(["list","board"] as const).map(mode=><button type="button" key={mode} onClick={()=>setView(mode)}
        aria-pressed={view===mode} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold ${view===mode?"bg-white text-[#0B142A] shadow-sm":"text-[#697386]"}`}>{mode==="list"?"Lista":"Kanban"}</button>)}
      </div>
     </div>
     {items.length>0?<div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar entregas">
       {[["active","Ativas"],["planned","Planejadas"],["in_progress","Em andamento"],["blocked","Aguardando"],["completed","Concluídas"]].map(([value,label])=>
        <button key={value} type="button" onClick={()=>{setFilter(value);setPage(1);}} aria-pressed={filter===value}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium ${filter===value?"border-[#6D35F5] bg-[#F0EBFF] text-[#6D35F5]":"border-[#E3E7F0] text-[#525B70] hover:bg-[#F6F7FB]"}`}>{label}</button>)}
      </div>:null}
     {filter==="completed"&&<div className="mt-4 flex flex-wrap items-center gap-2"><label className="text-xs font-medium text-[#697386]">Mês de conclusão <input type="month" value={completedMonth} onChange={e=>{setCompletedMonth(e.target.value);setPage(1);}} className="ml-2 rounded-lg border border-[#E3E7F0] p-2 text-xs"/></label><button type="button" onClick={()=>{setCompletedMonth("");setPage(1);}} className="cursor-pointer text-xs font-semibold text-[#5949D1] hover:underline">Todos os períodos</button></div>}
     {items.length===0?<div className="mt-5 rounded-xl bg-[#F6F7FB] p-5">
       <p className="text-sm font-semibold">Nenhuma entrega operacional cadastrada.</p>
       <p className="mt-2 text-sm leading-6 text-[#697386]">Quando a Rotevo disponibilizar as entregas do projeto, você poderá acompanhar aqui o andamento e os próximos passos.</p>
      </div>:visible.length===0?<p className="mt-6 text-sm text-[#697386]">Nenhuma entrega corresponde a este filtro.</p>:
      view==="list"?<div className="mt-5 overflow-x-auto rounded-lg border border-[#E3E6ED]"><table className="w-full min-w-[750px] border-collapse text-left text-sm"><thead className="bg-[#F8F9FC] text-xs font-semibold text-[#687487]"><tr>{["Tarefa","Projeto","Responsável","Situação","Prioridade","Prazo"].map(label=><th scope="col" key={label} className="border-b border-[#E3E7F0] px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#ECEEF4]">{shown.map(item=>{const state=item.status??"planned";const pri=mondayPriority[item.priority??"normal"]??mondayPriority.normal;const url=safeLink(item.driveUrl);return <tr key={`${item.projectKey}:${item.id}`} className="hover:bg-[#FAFAFF]">
       <td className="max-w-[300px] border-l-[3px] px-3 py-3 text-xs font-semibold text-[#1C2942]" style={{borderLeftColor:mondayStatus[state]??mondayStatus.planned}}><span className="block">{item.title}</span>{url&&<a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] text-[#6D35F5] hover:underline">Ver material</a>}</td>
       <td className="px-3 py-3"><span className="inline-flex max-w-[155px] items-center gap-2"><TaskAvatar name={item.projectTitle??"Projeto"} src={item.projectAvatarUrl} size={26}/><span className="truncate text-xs" title={item.projectTitle}>{item.projectTitle}</span></span></td>
       <td className="px-3 py-3">{item.owner?<span className="inline-flex min-w-[110px] items-center gap-2"><TaskAvatar name={item.owner} src={item.ownerAvatarUrl} size={26}/><span className="max-w-[120px] truncate text-xs" title={item.owner}>{item.owner}</span></span>:<span className="text-xs text-[#697386]">Não atribuído</span>}</td>
       <td className="px-3 py-3"><span className="block rounded-md px-3 py-2 text-center text-xs font-semibold text-white" style={{backgroundColor:mondayStatus[state]??mondayStatus.planned}}>{labels[state]??labels.planned}</span></td>
       <td className="px-3 py-3"><span className="flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold text-white" style={{backgroundColor:pri.color}}><RotevoTablerIcon name="flag" size={14}/>{pri.name}</span></td>
       <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-[#525B70]">{formatted(item.dueDate)}</td>
      </tr>;})}</tbody></table></div>:view==="board"?<div className="mt-5 flex gap-3 overflow-x-auto pb-3">{(["planned","in_progress","blocked","completed","cancelled"] as const).map(state=><section key={state} className="w-[252px] shrink-0 rounded-xl border border-[#EDF0F5] bg-[#F7F8FA] p-2.5"><h3 className="mb-2 flex items-center justify-between gap-2 px-1 text-xs font-semibold text-[#475467]"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{backgroundColor:mondayStatus[state]}}/>{labels[state]}</span><span>{shown.filter(t=>(t.status??"planned")===state).length}</span></h3><div className="space-y-2">{shown.filter(t=>(t.status??"planned")===state).map(item=><article key={item.projectKey+":"+item.id} className="rounded-xl border border-[#E2E6ED] bg-white p-3 shadow-[0_1px_2px_rgba(9,13,28,0.035)]"><p className="text-[13px] font-medium leading-5 text-[#283247]">{item.title}</p><p className="mt-2 truncate text-[11px] text-[#697386]">{item.projectTitle}</p><div className="mt-2 flex items-center justify-between border-t border-[#F0F1F5] pt-2"><span className="inline-flex items-center gap-1 text-[11px] text-[#697386]"><RotevoTablerIcon name="calendar-week" size={13}/>{formatted(item.dueDate)}</span><span className="inline-flex items-center gap-1 text-[11px]" style={{color:mondayPriority[item.priority??"normal"].color}}><RotevoTablerIcon name="flag" size={14} stroke={1.7}/>{mondayPriority[item.priority??"normal"].name}</span></div></article>)}</div></section>)}</div>:<div className="mt-6 border-l-2 border-[#E4E8F0] pl-5">
       {shown.map(item=>{const url=safeLink(item.driveUrl);const state=item.status??"planned";return <article key={`${item.projectKey}:${item.id}`} className="relative mb-6 rounded-xl border border-[#E3E7F0] p-4">
         <span aria-hidden="true" className="absolute -left-[29px] top-5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-[#6D35F5]"/>
         <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{item.projectTitle}{item.phase?` · ${item.phase}`:""}</p></div>
          <span className="rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{backgroundColor:mondayStatus[state]??mondayStatus.planned}}>{labels[state]??labels.planned}</span>
         </div>
         {item.description&&<p className="mt-3 text-sm text-[#525B70]">{item.description}</p>}
         <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#697386]">
          <span>Prazo: {formatted(item.dueDate)}</span>
          {item.owner&&<span className="inline-flex items-center gap-2"><TaskAvatar name={item.owner} src={item.ownerAvatarUrl} size={22}/>Responsável: {item.owner}</span>}
          {item.dependencies?.length?<span>Dependências: {item.dependencies.length}</span>:null}
         </div>
         {url&&<a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex cursor-pointer text-sm font-semibold text-[#6D35F5] hover:underline">Ver material no Drive ↗</a>}
       </article>})}
      </div>}
     {visible.length>pageSize&&<nav aria-label="Páginas de tarefas" className="mt-4 flex items-center justify-end gap-2"><button type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="cursor-pointer rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Anterior</button><span className="text-xs text-[#697386]">Página {Math.min(page,pages)} de {pages}</span><button type="button" disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="cursor-pointer rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Próxima</button></nav>}
   </section>

 </div>;
}
