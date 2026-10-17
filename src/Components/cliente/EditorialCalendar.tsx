"use client";
import {useMemo,useState} from "react";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import EditorialDecision from "@/Components/cliente/EditorialDecision";
export type EditorialItem={id:string;title:string;channel:string;format:string;publishDate:string;caption?:string;driveUrl?:string;version?:string;status:"idea"|"production"|"review"|"awaiting_client"|"changes_requested"|"approved"|"scheduled"|"published";visibleToClient?:boolean;reviewNotes?:string};
export type EditorialProject={id:string;title:string;data:{editorialCalendar?:EditorialItem[]}|null};
export const editorialStatuses:Record<EditorialItem["status"],string>={idea:"Ideia",production:"Em produção",review:"Revisão interna",awaiting_client:"Aguardando aprovação",changes_requested:"Ajustes solicitados",approved:"Aprovado",scheduled:"Agendado",published:"Publicado"};
const fmt=(d:string)=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d);return m?`${m[3]}/${m[2]}/${m[1]}`:"Sem data"};
const safe=(s?:string)=>{try{const x=new URL(s??"");return x.protocol==="https:"?x.href:null;}catch{return null;}};
export default function EditorialCalendar({projects,clientView=false}:{projects:EditorialProject[];clientView?:boolean}){
 const [month,setMonth]=useState(()=>new Date().toISOString().slice(0,7));
 const [view,setView]=useState<"month"|"list">("month");
 const [selected,setSelected]=useState<string|null>(null);
 const items=useMemo(()=>projects.flatMap(p=>(Array.isArray(p.data?.editorialCalendar)?p.data.editorialCalendar:[])
  .filter(i=>i&&typeof i.id==="string"&&typeof i.title==="string"&&(!clientView||i.visibleToClient===true))
  .map(i=>({...i,projectTitle:p.title,projectId:p.id}))),[projects,clientView]);
 const active=items.find(i=>i.projectId+":"+i.id===selected);
 const [y,m]=month.split("-").map(Number);
 const offset=new Date(y,m-1,1).getDay();
 const days=new Date(y,m,0).getDate();
 const calendarDays=Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>i-offset+1);
 const monthItems=items.filter(i=>i.publishDate?.startsWith(month));
 const prev=()=>setMonth(new Date(y,m-2,1).toISOString().slice(0,7));
 const next=()=>setMonth(new Date(y,m,1).toISOString().slice(0,7));
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-xl font-semibold">Calendário editorial</h2><p className="mt-1 text-sm text-[#697386]">Produção, datas de publicação e materiais compartilhados.</p></div>
   <div className="flex items-center gap-2">
    <button type="button" onClick={()=>setView("month")} aria-pressed={view==="month"} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold ${view==="month"?"bg-[#6D35F5] text-white":"border border-[#E3E7F0]"}`}>Mês</button>
    <button type="button" onClick={()=>setView("list")} aria-pressed={view==="list"} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold ${view==="list"?"bg-[#6D35F5] text-white":"border border-[#E3E7F0]"}`}>Lista</button>
   </div>
  </div>
  <div className="rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-6">
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
       title={item.title} className="mt-1 block w-full cursor-pointer truncate rounded-md bg-[#F0EBFF] px-1 py-1 text-left text-[10px] font-medium text-[#6437C3] sm:px-2 sm:text-xs">{item.title}</button>)}
      {rows.length>2&&<span className="block text-[10px] text-[#697386]">+{rows.length-2}</span>}
    </div>})}
   </div>:monthItems.length?<div className="space-y-2">{monthItems.sort((a,b)=>a.publishDate.localeCompare(b.publishDate)).map(item=><button type="button" key={item.projectId+item.id} onClick={()=>setSelected(item.projectId+":"+item.id)} className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E3E7F0] p-3 text-left hover:bg-[#F6F7FB]"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{item.projectTitle} · {item.channel} · {item.format}</p></div><div className="text-right text-xs"><p>{fmt(item.publishDate)}</p><p className="mt-1 text-[#6D35F5]">{editorialStatuses[item.status]??item.status}</p></div></button>)}</div>:
    <p className="py-8 text-center text-sm text-[#697386]">Nenhum conteúdo neste mês.</p>}
   {view==="month"&&monthItems.length===0&&<p className="mt-4 text-center text-xs text-[#697386]">Nenhuma publicação cadastrada para este período.</p>}
  </div>
  {active&&<section className="rounded-2xl border border-[#DCD3F5] bg-white p-5">
   <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{active.title}</h3><p className="mt-1 text-xs text-[#697386]">{active.projectTitle} · {active.channel} · {active.format}</p></div><button type="button" onClick={()=>setSelected(null)} className="cursor-pointer rounded-lg border px-3 py-2 text-sm">Fechar</button></div>
   <p className="mt-4 text-sm text-[#525B70]">Publicação: {fmt(active.publishDate)} · Situação: {editorialStatuses[active.status]??active.status} · Versão: {active.version||"Não informada"}</p>
   {active.caption&&<p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#F6F7FB] p-3 text-sm">{active.caption}</p>}
   {active.reviewNotes&&<p className="mt-3 text-sm text-[#525B70]">Observação: {active.reviewNotes}</p>}
   {safe(active.driveUrl)&&<a href={safe(active.driveUrl)!} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#6D35F5]"><RotevoTablerIcon name="brand-instagram" size={20}/>Abrir material no Drive ↗</a>}
   {clientView&&<EditorialDecision projectId={active.projectId} item={active}/>}
  </section>}
 </div>;
}
