"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import ProjectOnboarding, {type OnboardingData} from "@/Components/admin/ProjectOnboarding";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
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
 const [drawerOpen,setDrawerOpen]=useState(false);
 const [starterOpen,setStarterOpen]=useState(false);
 const [starterId,setStarterId]=useState("");
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState<"all"|"pending"|"done"|"not_started">("all");
 const project=projects.find(p=>p.id===selected)??projects[0];
 const overview=useMemo(()=>projects.map(p=>{
  const steps=Array.isArray(p.data?.onboardingChecklist)?p.data.onboardingChecklist:[];
  const done=steps.filter(item=>item.done).length;
  const pending=steps.length-done;
  const status=steps.length===0?"not_started":done===steps.length?"done":"pending";
  return {project:p,steps,done,pending,status,percent:steps.length?Math.round(done/steps.length*100):0};
 }),[projects]);
 const totals={started:overview.filter(p=>p.steps.length>0).length,completed:overview.filter(p=>p.status==="done").length,pending:overview.reduce((sum,p)=>sum+p.pending,0),notStarted:overview.filter(p=>p.status==="not_started").length};
 const unstarted=overview.filter(p=>p.status==="not_started");
 const visible=overview.filter(x=>(filter==="all"||x.status===filter)&&(`${client(x.project)?.name??""} ${x.project.title}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))));
 const labels:Record<string,string>={not_started:"Não iniciado",pending:"Em preparação",done:"Concluído"};
 return <div className="mt-7 space-y-5">
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {[{label:"Em onboarding",value:totals.started-totals.completed,icon:"lifebuoy" as const},{label:"Concluídos",value:totals.completed,icon:"circle-check" as const},{label:"Etapas pendentes",value:totals.pending,icon:"hourglass" as const},{label:"Não iniciados",value:totals.notStarted,icon:"clock" as const}].map(k=><div key={k.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-[#697386]">{k.label}</p><RotevoTablerIcon name={k.icon} size={19} stroke={1.9} className="text-[#6D35F5]"/></div><p className="mt-2 text-3xl font-bold text-[#090D1C]">{k.value}</p></div>)}
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Acompanhamento de entrada</h2><p className="mt-1 text-xs text-[#697386]">Todos os clientes e projetos, com o progresso de cada checklist.</p></div><button type="button" disabled={unstarted.length===0} onClick={()=>{setStarterId(unstarted[0]?.project.id??"");setStarterOpen(true);}} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#ADE60A] px-4 py-2.5 text-xs font-semibold text-[#090D1C] disabled:cursor-not-allowed disabled:opacity-50"><RotevoTablerIcon name="square-rounded-plus" size={18}/> + Iniciar onboarding</button></div>
   <div className="mt-4 flex flex-wrap gap-2"><label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#E3E7F0] bg-white px-3"><RotevoTablerIcon name="search" size={17} className="text-[#697386]"/><input aria-label="Buscar onboarding por cliente ou projeto" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente ou projeto" className="w-full bg-transparent py-2.5 text-sm outline-none"/></label><select aria-label="Filtrar situação do onboarding" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)} className="cursor-pointer rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-xs"><option value="all">Todas as situações</option><option value="not_started">Não iniciados</option><option value="pending">Em preparação</option><option value="done">Concluídos</option></select></div>
   {visible.length===0?<p className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">{projects.length===0?"Cadastre um projeto para iniciar o onboarding.":"Nenhum onboarding corresponde aos filtros."}</p>:
   <div className="mt-4 overflow-x-auto rounded-lg border border-[#E3E7F0]"><table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead className="bg-[#F6F7FB] text-[#525B70]"><tr>{<><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="user-check" size={17}/>Cliente / projeto</span></th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="clock" size={17}/>Situação</span></th><th scope="col" className="border-b px-3 py-3">Progresso</th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="hourglass" size={17}/>Pendentes</span></th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="square-rounded-plus" size={17}/>Próxima ação</span></th></>}</tr></thead><tbody className="divide-y divide-[#E3E7F0]">{visible.map(p=><tr key={p.project.id} className={project?.id===p.project.id?"bg-[#F7F4FF]":"hover:bg-[#F9FAFC]"}><td className="px-3 py-3"><p className="font-semibold text-[#090D1C]">{client(p.project)?.name??"Cliente"}</p><p className="mt-1 max-w-[200px] truncate text-[#697386]">{p.project.title}</p></td><td className="px-3 py-3"><span className={p.status==="done"?"rounded-lg bg-[#E0F5E8] px-2 py-1 text-[#176F40]":"rounded-lg bg-[#ECE8FF] px-2 py-1 text-[#6034B7]"}>{labels[p.status]}</span></td><td className="px-3 py-3"><div className="flex min-w-[110px] items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9ECF4]"><div className="h-full rounded-full bg-[#ADE60A]" style={{width:`${p.percent}%`}}/></div><strong>{p.percent}%</strong></div><span className="mt-1 block text-[#697386]">{p.done}/{p.steps.length} etapas</span></td><td className="px-3 py-3">{p.pending}</td><td className="px-3 py-3"><button type="button" onClick={()=>{setSelected(p.project.id);setDrawerOpen(true);}} className="cursor-pointer rounded-lg border border-[#D9C9FA] bg-white px-3 py-2 font-semibold text-[#6034B7] hover:bg-[#EEE8FF]">{p.steps.length?"Gerenciar":"Iniciar"} →</button></td></tr>)}</tbody></table></div>}
  </section>
  {starterOpen&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#090D1C]/55 p-4" role="dialog" aria-modal="true" aria-label="Selecionar projeto para iniciar onboarding">
   <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
    <h3 className="text-lg font-bold">Iniciar onboarding</h3><p className="mt-2 text-sm text-[#697386]">Selecione o projeto. O checklist padrão de 10 etapas será criado somente ao confirmar no painel seguinte.</p>
    <label className="mt-4 block text-xs font-semibold">Projeto<select value={starterId} onChange={e=>setStarterId(e.target.value)} className="mt-2 w-full rounded-lg border border-[#E3E7F0] px-3 py-3 text-sm">{unstarted.map(p=><option key={p.project.id} value={p.project.id}>{client(p.project)?.name??"Cliente"} · {p.project.title}</option>)}</select></label>
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setStarterOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={!starterId} onClick={()=>{setSelected(starterId);setStarterOpen(false);setDrawerOpen(true);}} className="rounded-lg bg-[#ADE60A] px-4 py-2 text-sm font-semibold text-[#090D1C] disabled:opacity-50">Continuar</button></div>
   </section>
  </div>}
  {drawerOpen&&project&&<div className="fixed inset-0 z-[100] flex justify-end">
   <button type="button" aria-label="Fechar painel de onboarding" className="absolute inset-0 bg-[#090D1C]/55" onClick={()=>setDrawerOpen(false)}/>
   <aside role="dialog" aria-modal="true" aria-label="Gerenciar onboarding" className="relative z-10 h-full w-full max-w-[680px] overflow-y-auto bg-[#F6F7FB] p-4 shadow-2xl sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E3E7F0] bg-white p-4">
     <div><h2 className="text-lg font-bold text-[#090D1C]">Gerenciar onboarding</h2><p className="mt-1 text-sm text-[#525B70]">{client(project)?.name??"Cliente"} · {project.title}</p></div>
     <div className="flex items-center gap-2">{client(project)?.slug&&<Link href={`/admin/planejamentos/${client(project)?.slug}?projectId=${encodeURIComponent(project.id)}`} className="inline-flex items-center gap-1 rounded-lg border border-[#E3E7F0] px-3 py-2 text-xs font-semibold text-[#6034B7]"><RotevoTablerIcon name="folder" size={16}/> Projeto</Link>}<button type="button" aria-label="Fechar" onClick={()=>setDrawerOpen(false)} className="cursor-pointer rounded-lg border border-[#E3E7F0] p-2 text-[#525B70]"><RotevoTablerIcon name="x" size={19}/></button></div>
    </div>
    <p className="mt-3 text-xs leading-5 text-[#697386]">Checklist simples de 10 etapas por projeto. Marque as etapas concluídas para atualizar o progresso.</p>
    <ProjectOnboarding key={project.id} projectId={project.id} data={project.data} updatedAt={project.updated_at} onSaved={(data,updatedAt)=>onChanged(project.id,data,updatedAt)}/>
   </aside>
  </div>}
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
