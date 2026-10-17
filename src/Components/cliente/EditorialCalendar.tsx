"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import EditorialDecision from "@/Components/cliente/EditorialDecision";
export type EditorialItem={id:string;title:string;channel:string;format:string;publishDate:string;caption?:string;driveUrl?:string;version?:string;status:"idea"|"production"|"review"|"awaiting_client"|"changes_requested"|"approved"|"scheduled"|"published";visibleToClient?:boolean;reviewNotes?:string;relatedTaskId?:string};
export type EditorialProject={id:string;title:string;data:{editorialCalendar?:EditorialItem[]}|null};
export const editorialStatuses:Record<EditorialItem["status"],string>={idea:"Ideia",production:"Em produção",review:"Revisão interna",awaiting_client:"Aguardando aprovação",changes_requested:"Ajustes solicitados",approved:"Aprovado",scheduled:"Agendado",published:"Publicado"};
const fmt=(d:string)=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d);return m?`${m[3]}/${m[2]}/${m[1]}`:"Sem data"};
const safe=(s?:string)=>{try{const x=new URL(s??"");return x.protocol==="https:"?x.href:null;}catch{return null;}};
export default function EditorialCalendar({projects,clientView=false}:{projects:EditorialProject[];clientView?:boolean}){
 const [month,setMonth]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;});
 const [view,setView]=useState<"month"|"list">("month");
 const [selected,setSelected]=useState<string|null>(null);
 const [projectFilter,setProjectFilter]=useState("all");
 const [statusFilter,setStatusFilter]=useState("all");
 const [clientDecisions,setClientDecisions]=useState<{project_id:string;content_id:string;content_version:string;decision:"approved"|"changes_requested"}[]>([]);
 const items=useMemo(()=>projects.flatMap(p=>(Array.isArray(p.data?.editorialCalendar)?p.data.editorialCalendar:[])
  .filter(i=>i&&typeof i.id==="string"&&typeof i.title==="string"&&(!clientView||i.visibleToClient===true))
  .map(i=>({...i,projectTitle:p.title,projectId:p.id}))),[projects,clientView]);
 useEffect(()=>{let alive=true;const ids=[...new Set(projects.map(p=>p.id))];if(!ids.length){setClientDecisions([]);return;}void (async()=>{const {data,error}=await supabase.from("editorial_approvals").select("project_id,content_id,content_version,decision").in("project_id",ids).limit(200);if(alive)setClientDecisions(error?[]:(data??[]) as typeof clientDecisions);})();return()=>{alive=false;};},[projects]);
 const decisionStatus=(item:EditorialItem & {projectId:string})=>{const decision=clientDecisions.find(r=>r.project_id===item.projectId&&r.content_id===item.id&&r.content_version===(item.version??""));return decision?decision.decision:item.status;};
 const active=items.find(i=>i.projectId+":"+i.id===selected);
 const filteredItems=items.filter(i=>(projectFilter==="all"||i.projectId===projectFilter)&&(statusFilter==="all"||decisionStatus(i)===statusFilter));
 const [y,m]=month.split("-").map(Number);
 const offset=new Date(y,m-1,1).getDay();
 const days=new Date(y,m,0).getDate();
 const calendarDays=Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>i-offset+1);
 const monthItems=filteredItems.filter(i=>i.publishDate?.startsWith(month));
 const prev=()=>{const d=new Date(y,m-2,1);setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);};
 const next=()=>{const d=new Date(y,m,1);setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);};
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-xl font-semibold">Calendário editorial</h2><p className="mt-1 text-sm text-[#697386]">Produção, datas de publicação e materiais compartilhados.</p></div>
   <div className="flex items-center gap-2">
    <button type="button" onClick={()=>setView("month")} aria-pressed={view==="month"} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold ${view==="month"?"bg-[#6D35F5] text-white":"border border-[#E3E7F0]"}`}>Mês</button>
    <button type="button" onClick={()=>setView("list")} aria-pressed={view==="list"} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold ${view==="list"?"bg-[#6D35F5] text-white":"border border-[#E3E7F0]"}`}>Lista</button>
   </div>
  </div>
  <div className="rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-6">
   {!clientView&&<div className="mb-4 flex flex-wrap items-center gap-3"><label className="min-w-[185px] flex-1 text-xs font-semibold text-[#525B70]">Projeto<select aria-label="Filtrar projeto editorial" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)} className="mt-1 block w-full cursor-pointer rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todos os projetos</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label className="min-w-[185px] flex-1 text-xs font-semibold text-[#525B70]">Situação<select aria-label="Filtrar situação editorial" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 block w-full cursor-pointer rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todas as situações</option>{Object.entries(editorialStatuses).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>}
   <div className="mb-4 flex items-center justify-between gap-3">
    <button type="button" aria-label="Mês anterior" onClick={prev} className="cursor-pointer rounded-lg border px-3 py-2">‹</button>
    <h3 className="text-sm font-semibold capitalize">{new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))}</h3>
    <button type="button" aria-label="Próximo mês" onClick={next} className="cursor-pointer rounded-lg border px-3 py-2">›</button>
   </div>
   {view==="month"?<div className="grid grid-cols-7 gap-1">
    {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><p key={d} className="py-2 text-center text-[10px] font-semibold text-[#697386] sm:text-xs">{d}</p>)}
    {calendarDays.map((d,i)=>{const key=`${month}-${String(d).padStart(2,"0")}`;const rows=d>0&&d<=days?monthItems.filter(item=>item.publishDate===key):[];return <div key={i} className="min-h-14 overflow-hidden rounded-lg border border-[#E3E7F0] p-1 sm:min-h-24 sm:p-2">
      <span className="text-xs text-[#697386]">{d>0&&d<=days?d:""}</span>
      {rows.slice(0,2).map(item=><button type="button" key={item.projectId+item.id} onClick={()=>setSelected(item.projectId+":"+item.id)}
       title={item.title} className={`mt-1 block w-full cursor-pointer truncate rounded-md px-1 py-1 text-left text-[10px] font-medium transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D35F5] sm:px-2 sm:text-xs ${decisionStatus(item)==="approved"||decisionStatus(item)==="scheduled"||decisionStatus(item)==="published"?"bg-[#E0F5E8] text-[#176F40]":decisionStatus(item)==="changes_requested"?"bg-[#FFF1D4] text-[#875400]":decisionStatus(item)==="awaiting_client"?"bg-[#EEE8FF] text-[#6034B7]":"bg-[#EDF0F6] text-[#525B70]"}`}>{item.title}</button>)}
      {rows.length>2&&<span className="block text-[10px] text-[#697386]">+{rows.length-2}</span>}
    </div>})}
   </div>:monthItems.length?<div className="space-y-2">{monthItems.sort((a,b)=>a.publishDate.localeCompare(b.publishDate)).map(item=><button type="button" key={item.projectId+item.id} onClick={()=>setSelected(item.projectId+":"+item.id)} className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E3E7F0] p-3 text-left hover:bg-[#F6F7FB]"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{item.projectTitle} · {item.channel} · {item.format}</p></div><div className="text-right text-xs"><p>{fmt(item.publishDate)}</p><p className="mt-1 text-[#6D35F5]">{editorialStatuses[decisionStatus(item) as EditorialItem["status"]]??decisionStatus(item)}</p></div></button>)}</div>:
    <p className="py-8 text-center text-sm text-[#697386]">Nenhum conteúdo neste mês.</p>}
   {view==="month"&&monthItems.length===0&&<p className="mt-4 text-center text-xs text-[#697386]">Nenhuma publicação cadastrada para este período.</p>}
  </div>
  {active&&<div className="fixed inset-0 z-[110] flex justify-end">
   <button type="button" aria-label="Fechar detalhes do conteúdo" onClick={()=>setSelected(null)} className="absolute inset-0 bg-[#090D1C]/50"/>
   <aside role="dialog" aria-modal="true" aria-label="Detalhes do conteúdo" className="relative z-10 h-full w-full max-w-[600px] overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#6D35F5]">Conteúdo · {fmt(active.publishDate)}</p><h3 className="mt-1 text-xl font-bold text-[#090D1C]">{active.title}</h3><p className="mt-1 text-xs text-[#697386]">{active.projectTitle} · {active.channel} · {active.format}</p></div><button type="button" aria-label="Fechar" onClick={()=>setSelected(null)} className="cursor-pointer rounded-lg border border-[#E3E7F0] p-2"><RotevoTablerIcon name="x" size={19}/></button></div>
    <div className="mt-5 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-[#EEE8FF] px-3 py-1.5 text-xs font-semibold text-[#6034B7]">{editorialStatuses[decisionStatus(active) as EditorialItem["status"]]??decisionStatus(active)}</span><span className="rounded-lg bg-[#F6F7FB] px-3 py-1.5 text-xs text-[#525B70]">Versão {active.version||"Não informada"}</span></div>
    <h4 className="mt-6 text-sm font-semibold">Legenda</h4><div className="mt-2 min-h-[90px] whitespace-pre-wrap rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4 text-sm text-[#344056]">{active.caption||"Nenhuma legenda cadastrada."}</div>
    <h4 className="mt-5 text-sm font-semibold">Material</h4>{safe(active.driveUrl)?<a href={safe(active.driveUrl)!} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#D9C9FA] px-4 py-2.5 text-sm font-semibold text-[#6034B7]"><RotevoTablerIcon name="link" size={18}/> Abrir material no Drive ↗</a>:<p className="mt-2 text-sm text-[#697386]">Nenhum link de material disponível.</p>}
    {active.reviewNotes&&<div className="mt-5 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4"><h4 className="text-sm font-semibold">Observações de revisão</h4><p className="mt-2 whitespace-pre-wrap text-sm text-[#525B70]">{active.reviewNotes}</p></div>}
    {clientView&&<EditorialDecision key={active.projectId+":"+active.id+":"+(active.version??"")} projectId={active.projectId} item={active}/>}
   </aside>
  </div>}
 </div>;
}
