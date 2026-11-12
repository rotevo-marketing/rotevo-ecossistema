"use client";
import {useMemo,useState} from "react";
import {todayInBrazil} from "@/lib/finance/model";
import type {EditorialItem} from "./EditorialCalendar";

type Item=EditorialItem&{projectId:string};
type Props={items:Item[];onSelect:(projectId:string,contentId:string)=>void};
const tone:Record<EditorialItem["status"],string>={idea:"#E5E7EB",idea_pending:"#FAEED5",idea_approved:"#DCF3E8",production:"#D9D5FA",recording:"#DDE8FF",review:"#E7DFFA",awaiting_client:"#F6E9D7",changes_requested:"#F9E4D9",approved:"#DEF3E6",scheduled:"#DFE9FF",published:"#E1E6EB"};
export default function ClientEditorialMiniCalendar({items,onSelect}:Props){
 const [month,setMonth]=useState(()=>todayInBrazil().slice(0,7));
 const [channel,setChannel]=useState("all");
 const [year,m]=month.split("-").map(Number);
 const channels=useMemo(()=>[...new Set(items.map(i=>i.channel).filter(Boolean))],[items]);
 const offset=new Date(year,m-1,1).getDay();
 const days=new Date(year,m,0).getDate();
 const cells=Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>i-offset+1);
 const scoped=items.filter(i=>i.publishDate?.startsWith(month)&&(channel==="all"||i.channel===channel));
 const shift=(step:number)=>{const d=new Date(year,m-1+step,1);setMonth(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));};
 return <section aria-label="Calendário editorial resumido" className="rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h3 className="text-[15px] font-semibold text-[#263146]">Calendário de conteúdo</h3><p className="mt-1 text-xs text-[#697386]">Programação editorial compartilhada.</p></div>
   <div className="flex items-center gap-2"><button type="button" aria-label="Mês anterior" onClick={()=>shift(-1)} className="rounded-md border border-[#E3E7F0] px-2 py-1.5 text-xs">‹</button><strong className="min-w-32 text-center text-xs font-medium capitalize">{new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(year,m-1,1))}</strong><button type="button" aria-label="Próximo mês" onClick={()=>shift(1)} className="rounded-md border border-[#E3E7F0] px-2 py-1.5 text-xs">›</button></div>
  </div>
  <nav className="mt-3 flex flex-wrap gap-2" aria-label="Filtrar canais editoriais"><button type="button" aria-pressed={channel==="all"} onClick={()=>setChannel("all")} className={"rounded-md px-3 py-1.5 text-xs "+(channel==="all"?"bg-[#EDEAFF] font-medium text-[#5949D1]":"text-[#697386]")}>Todos os canais</button>{channels.map(ch=><button type="button" key={ch} aria-pressed={channel===ch} onClick={()=>setChannel(ch)} className={"rounded-md px-3 py-1.5 text-xs "+(channel===ch?"bg-[#EDEAFF] font-medium text-[#5949D1]":"text-[#697386]")}>{ch}</button>)}</nav>
  <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-[#697386]">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(day=><span key={day} className="py-2">{day}</span>)}</div>
  <div className="grid grid-cols-7 gap-1">{cells.map((day,i)=>{const valid=day>0&&day<=days;const date=month+"-"+String(day).padStart(2,"0");const events=valid?scoped.filter(x=>x.publishDate===date):[];return <div key={i} className={"min-h-[72px] min-w-0 rounded-md border border-[#E3E7F0] p-1.5 sm:min-h-[92px] "+(valid?"bg-white":"bg-[#FBFCFE]")}><span className="block text-[10px] text-[#697386]">{valid?day:""}</span>{events.slice(0,3).map(item=><button type="button" key={item.projectId+":"+item.id} title={item.title} onClick={()=>onSelect(item.projectId,item.id)} style={{backgroundColor:tone[item.status]??"#E5E7EB"}} className="mt-1 block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium leading-4 text-[#222833] hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]">{item.title}</button>)}{events.length>3&&<span className="block text-[10px] text-[#697386]">+{events.length-3}</span>}</div>;})}</div>
 </section>;
}
