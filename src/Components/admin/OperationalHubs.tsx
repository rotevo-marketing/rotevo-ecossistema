"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import ProjectOnboarding, {type OnboardingData} from "@/Components/admin/ProjectOnboarding";
import OperationalAgenda, {type AgendaItem} from "@/Components/admin/OperationalAgenda";

export type HubProject={id:string;title:string;updated_at:string;data:OnboardingData & {operationalAgenda?:AgendaItem[];executionTimeline?:{id:string;title:string}[]};clients:{name:string;slug:string}|{name:string;slug:string}[]|null};
const client=(p:HubProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
const dateKey=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const monthTitle=(d:Date)=>new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(d);
function Picker({projects,selected,onSelect}:{projects:HubProject[];selected:string;onSelect:(value:string)=>void}){
 return <label className="block text-sm font-medium text-[#525B70]">Projeto
   <select aria-label="Selecionar projeto operacional" className="mt-2 w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-3 text-sm" value={selected} onChange={e=>onSelect(e.target.value)}>
    {projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}
   </select>
 </label>;
}
export function AdminOnboardingHub({projects,onChanged}:{projects:HubProject[];onChanged:(id:string,data:OnboardingData,updatedAt:string)=>void}){
 const [selected,setSelected]=useState("");
 const project=projects.find(p=>p.id===selected)??projects[0];
 if(!project)return <p className="mt-8 rounded-xl bg-white p-6 text-sm">Cadastre um planejamento para iniciar o onboarding.</p>;
 const items=Array.isArray(project.data?.onboardingChecklist)?project.data.onboardingChecklist:[];
 const done=items.filter(x=>x.done).length;
 const completed=projects.filter(p=>{const rows=p.data?.onboardingChecklist;return Array.isArray(rows)&&rows.length>0&&rows.every(x=>x.done)}).length;
 return <div className="mt-7 space-y-5">
  <div className="grid gap-3 sm:grid-cols-3">
   <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#697386]">Projetos com onboarding</p><p className="mt-2 text-3xl font-semibold">{projects.filter(p=>Array.isArray(p.data?.onboardingChecklist)&&p.data.onboardingChecklist.length>0).length}</p></div>
   <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#697386]">Onboardings concluídos</p><p className="mt-2 text-3xl font-semibold">{completed}</p></div>
   <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#697386]">Etapas do projeto selecionado</p><p className="mt-2 text-3xl font-semibold">{done}/{items.length}</p></div>
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><Picker projects={projects} selected={project.id} onSelect={setSelected}/><p className="mt-3 text-xs text-[#697386]">As alterações são salvas somente no planejamento selecionado.</p></section>
  <ProjectOnboarding key={project.id} projectId={project.id} data={project.data} updatedAt={project.updated_at} onSaved={(data,updatedAt)=>onChanged(project.id,data,updatedAt)}/>
 </div>;
}
export function AdminMeetingsHub({projects,onChanged}:{projects:HubProject[];onChanged:(id:string,data:HubProject["data"],updatedAt:string)=>void}){
 const [selected,setSelected]=useState("");
 const [month,setMonth]=useState(()=>new Date());
 const [activeDay,setActiveDay]=useState(()=>dateKey(new Date()));
 const project=projects.find(p=>p.id===selected)??projects[0];
 const rows=useMemo(()=>projects.flatMap(p=>(Array.isArray(p.data?.operationalAgenda)?p.data.operationalAgenda:[]).filter(x=>x&&typeof x.date==="string"&&typeof x.title==="string").map(item=>({item,project:p}))),[projects]);
 const days=useMemo(()=>{
  const first=new Date(month.getFullYear(),month.getMonth(),1);
  const offset=(first.getDay()+6)%7;
  const length=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  return [...Array(offset).fill(null),...Array.from({length},(_,i)=>dateKey(new Date(month.getFullYear(),month.getMonth(),i+1))) ] as (string|null)[];
 },[month]);
 const dayItems=rows.filter(x=>x.item.date===activeDay).sort((a,b)=>(a.item.time??"23:59").localeCompare(b.item.time??"23:59"));
 const planned=rows.filter(x=>x.item.status==="planned");
 if(!project)return <p className="mt-8 rounded-xl bg-white p-6 text-sm">Cadastre um planejamento para organizar suas reuniões.</p>;
 return <div className="mt-7 space-y-5">
  <div className="grid gap-3 sm:grid-cols-3">
   <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#697386]">Compromissos planejados</p><p className="mt-2 text-3xl font-semibold">{planned.length}</p></div>
   <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#697386]">Reuniões planejadas</p><p className="mt-2 text-3xl font-semibold">{planned.filter(x=>x.item.kind==="meeting").length}</p></div>
   <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#697386]">Compromissos no dia</p><p className="mt-2 text-3xl font-semibold">{dayItems.length}</p></div>
  </div>
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
   <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
    <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-semibold capitalize">{monthTitle(month)}</h2><div className="flex items-center gap-2"><button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={()=>{setMonth(new Date());setActiveDay(dateKey(new Date()));}}>Hoje</button><button type="button" aria-label="Mês anterior" className="rounded-lg border px-3 py-2" onClick={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}>‹</button><button type="button" aria-label="Próximo mês" className="rounded-lg border px-3 py-2" onClick={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}>›</button></div></div>
    <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs text-[#697386]">{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(x=><span key={x}>{x}</span>)}</div>
    <div className="mt-2 grid grid-cols-7 gap-1">{days.map((day,i)=>day?<button key={day} type="button" aria-label={day} aria-pressed={activeDay===day} onClick={()=>setActiveDay(day)} className={`min-h-14 rounded-lg border px-1 py-2 text-sm ${activeDay===day?"border-[#6D35F5] bg-[#F0ECFF] font-semibold":"border-[#E3E7F0]"}`}><span>{Number(day.slice(-2))}</span>{rows.some(x=>x.item.date===day)&&<span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-[#6D35F5]"/>}</button>:<div key={`empty-${i}`}/>)}</div>
   </section>
   <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><h2 className="text-lg font-semibold">Agenda de {activeDay.slice(8,10)}/{activeDay.slice(5,7)}</h2>{dayItems.length===0?<p className="mt-4 text-sm text-[#697386]">Nenhum compromisso nesta data.</p>:<div className="mt-3 divide-y">{dayItems.map(({item,project:p})=><div key={p.id+":"+item.id} className="py-3"><p className="text-sm font-semibold">{item.time??"Sem horário"} · {item.title}</p><p className="mt-1 text-xs text-[#697386]">{client(p)?.name??"Cliente"} · {p.title}</p><p className="mt-1 text-xs text-[#697386]">{item.status==="completed"?"Concluído":item.status==="cancelled"?"Cancelado":"Planejado"}</p>{client(p)?.slug&&<Link className="mt-1 inline-block text-xs font-semibold text-[#6D35F5]" href={`/admin/planejamentos/${client(p)?.slug}?projectId=${encodeURIComponent(p.id)}`}>Abrir projeto →</Link>}</div>)}</div>}</section>
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><Picker projects={projects} selected={project.id} onSelect={setSelected}/><p className="mt-3 text-xs text-[#697386]">Novo compromisso, edição e exclusão acontecem no projeto escolhido. Não são enviados convites externos automaticamente.</p></section>
  <OperationalAgenda key={project.id} projectId={project.id} projectData={project.data} updatedAt={project.updated_at} onSaved={(data,updatedAt)=>onChanged(project.id,{...project.data,...data} as HubProject["data"],updatedAt)}/>
 </div>;
}
