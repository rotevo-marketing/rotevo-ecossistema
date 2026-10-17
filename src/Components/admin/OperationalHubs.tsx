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
   {[{label:"Em onboarding",value:totals.started-totals.completed,icon:"lifebuoy" as const},{label:"Concluídos",value:totals.completed,icon:"circle-check" as const},{label:"Etapas pendentes",value:totals.pending,icon:"alert-circle" as const},{label:"Não iniciados",value:totals.notStarted,icon:"clock" as const}].map(k=><div key={k.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-[#697386]">{k.label}</p><RotevoTablerIcon name={k.icon} size={19} stroke={1.9} className="text-[#6D35F5]"/></div><p className="mt-2 text-3xl font-bold text-[#090D1C]">{k.value}</p></div>)}
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Acompanhamento de entrada</h2><p className="mt-1 text-xs text-[#697386]">Todos os clientes e projetos, com o progresso de cada checklist.</p></div><button type="button" disabled={projects.length===0} onClick={()=>{setStarterId(unstarted[0]?.project.id??projects[0]?.id??"");setStarterOpen(true);}} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#ADE60A] px-4 py-2.5 text-xs font-semibold text-[#090D1C] disabled:cursor-not-allowed disabled:opacity-50"><RotevoTablerIcon name="square-rounded-plus" size={18}/> + Iniciar onboarding</button></div>
   <div className="mt-4 flex flex-wrap gap-2"><label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#E3E7F0] bg-white px-3"><RotevoTablerIcon name="search" size={17} className="text-[#697386]"/><input aria-label="Buscar onboarding por cliente ou projeto" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente ou projeto" className="w-full bg-transparent py-2.5 text-sm outline-none"/></label><select aria-label="Filtrar situação do onboarding" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)} className="cursor-pointer rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-xs"><option value="all">Todas as situações</option><option value="not_started">Não iniciados</option><option value="pending">Em preparação</option><option value="done">Concluídos</option></select></div>
   {visible.length===0?<p className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">{projects.length===0?"Cadastre um projeto para iniciar o onboarding.":"Nenhum onboarding corresponde aos filtros."}</p>:
   <div className="mt-4 overflow-x-auto rounded-lg border border-[#E3E7F0]"><table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead className="bg-[#F6F7FB] text-[#525B70]"><tr>{<><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="user-check" size={17}/>Cliente / projeto</span></th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="clock" size={17}/>Situação</span></th><th scope="col" className="border-b px-3 py-3">Progresso</th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="alert-circle" size={17}/>Pendentes</span></th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="square-rounded-plus" size={17}/>Próxima ação</span></th></>}</tr></thead><tbody className="divide-y divide-[#E3E7F0]">{visible.map(p=><tr key={p.project.id} className={project?.id===p.project.id?"bg-[#F7F4FF]":"hover:bg-[#F9FAFC]"}><td className="px-3 py-3"><p className="font-semibold text-[#090D1C]">{client(p.project)?.name??"Cliente"}</p><p className="mt-1 max-w-[200px] truncate text-[#697386]">{p.project.title}</p></td><td className="px-3 py-3"><span className={p.status==="done"?"rounded-lg bg-[#E0F5E8] px-2 py-1 text-[#176F40]":"rounded-lg bg-[#ECE8FF] px-2 py-1 text-[#6034B7]"}>{labels[p.status]}</span></td><td className="px-3 py-3"><div className="flex min-w-[110px] items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9ECF4]"><div className="h-full rounded-full bg-[#ADE60A]" style={{width:`${p.percent}%`}}/></div><strong>{p.percent}%</strong></div><span className="mt-1 block text-[#697386]">{p.done}/{p.steps.length} etapas</span></td><td className="px-3 py-3">{p.pending}</td><td className="px-3 py-3"><button type="button" onClick={()=>{setSelected(p.project.id);setDrawerOpen(true);}} className="cursor-pointer rounded-lg border border-[#D9C9FA] bg-white px-3 py-2 font-semibold text-[#6034B7] hover:bg-[#EEE8FF]">{p.steps.length?"Gerenciar":"Iniciar"} →</button></td></tr>)}</tbody></table></div>}
  </section>
  {starterOpen&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#090D1C]/55 p-4" role="dialog" aria-modal="true" aria-label="Selecionar projeto para iniciar onboarding">
   <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
    <h3 className="text-lg font-bold">Iniciar onboarding</h3><p className="mt-2 text-sm text-[#697386]">Escolha o projeto. Se houver um checklist antigo, você poderá aplicar o modelo de 10 etapas com confirmação, sem modificar nada automaticamente.</p>
    <label className="mt-4 block text-xs font-semibold">Projeto<select value={starterId} onChange={e=>setStarterId(e.target.value)} className="mt-2 w-full rounded-lg border border-[#E3E7F0] px-3 py-3 text-sm">{overview.map(p=><option key={p.project.id} value={p.project.id}>{client(p.project)?.name??"Cliente"} · {p.project.title}{p.steps.length?" (checklist existente)":" (novo)"}</option>)}</select></label>
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
    <ProjectOnboarding key={project.id} projectId={project.id} data={project.data} updatedAt={project.updated_at} onSaved={(data,updatedAt)=>onChanged(project.id,data,updatedAt)}/>
   </aside>
  </div>}
 </div>;
}
export function AdminMeetingsHub({projects,onChanged}:{projects:HubProject[];onChanged:(id:string,data:HubProject["data"],updatedAt:string)=>void}){
 const [projectFilter,setProjectFilter]=useState("all");
 const [statusFilter,setStatusFilter]=useState("all");
 const [view,setView]=useState<"calendar"|"list">("calendar");
 const [month,setMonth]=useState(()=>new Date());
 const [activeDay,setActiveDay]=useState(()=>dateKey(new Date()));
 const [editingProject,setEditingProject]=useState("");
 const [newOpen,setNewOpen]=useState(false);
 const [search,setSearch]=useState("");
 const [kindFilter,setKindFilter]=useState("all");
 const rows=useMemo(()=>projects.flatMap(p=>(Array.isArray(p.data?.operationalAgenda)?p.data.operationalAgenda:[]).filter(x=>x&&typeof x.id==="string"&&typeof x.date==="string"&&typeof x.title==="string").map(item=>({item,project:p}))),[projects]);
 const filtered=rows.filter(x=>(projectFilter==="all"||x.project.id===projectFilter)&&(statusFilter==="all"||x.item.status===statusFilter)&&(kindFilter==="all"||x.item.kind===kindFilter)&&(`${x.item.title} ${client(x.project)?.name??""} ${x.project.title}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
 const sorted=[...filtered].sort((a,b)=>`${a.item.date}T${a.item.time||"23:59"}`.localeCompare(`${b.item.date}T${b.item.time||"23:59"}`));
 const selectedProject=projects.find(p=>p.id===editingProject);
 const days=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const offset=(first.getDay()+6)%7;const length=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();return [...Array(offset).fill(null),...Array.from({length},(_,i)=>dateKey(new Date(month.getFullYear(),month.getMonth(),i+1))) ] as (string|null)[];},[month]);
 const dayItems=sorted.filter(x=>x.item.date===activeDay);
 const inMonth=sorted.filter(x=>x.item.date.startsWith(dateKey(new Date(month.getFullYear(),month.getMonth(),1)).slice(0,7)));
 const labelDate=(value:string)=>value.slice(8,10)+"/"+value.slice(5,7)+"/"+value.slice(0,4);
 const statusName=(status:string)=>status==="completed"?"Realizada":status==="cancelled"?"Cancelada":"Agendada";
 const closeEditor=()=>{setEditingProject("");setNewOpen(false);};
 const openProject=(id:string)=>{setEditingProject(id);setNewOpen(false);};
 if(!projects.length)return <div className="mt-8 rounded-2xl border border-[#E3E7F0] bg-white p-6"><h2 className="text-lg font-bold">Agenda de reuniões</h2><p className="mt-2 text-sm text-[#697386]">Cadastre um projeto para registrar compromissos, reuniões e acompanhamentos.</p></div>;
 return <div className="mt-7 space-y-5">
  <div className="grid gap-3 sm:grid-cols-3">
   {[{label:"Agendados",value:filtered.filter(x=>x.item.status==="planned").length},{label:"Realizados",value:filtered.filter(x=>x.item.status==="completed").length},{label:"Cancelados",value:filtered.filter(x=>x.item.status==="cancelled").length}].map(x=><div key={x.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><p className="text-sm text-[#697386]">{x.label}</p><p className="mt-2 text-3xl font-bold text-[#090D1C]">{x.value}</p></div>)}
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#090D1C]">Agenda de reuniões</h2><p className="mt-1 text-xs text-[#697386]">Todos os projetos por padrão. Compromissos vinculados a cada cliente, sem convites externos automáticos.</p></div><button type="button" onClick={()=>{setEditingProject("");setNewOpen(true);}} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#ADE60A] px-4 py-2.5 text-sm font-semibold text-[#090D1C]"><RotevoTablerIcon name="square-rounded-plus" size={18}/>Novo compromisso</button></div>
   <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <label className="text-xs font-semibold text-[#525B70]">Projeto<select aria-label="Filtrar projeto das reuniões" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todos os projetos</option>{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>
    <label className="text-xs font-semibold text-[#525B70]">Situação<select aria-label="Filtrar situação das reuniões" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todas as situações</option><option value="planned">Agendadas</option><option value="completed">Realizadas</option><option value="cancelled">Canceladas</option></select></label>
    <label className="text-xs font-semibold text-[#525B70]">Tipo<select aria-label="Filtrar tipo de compromisso" value={kindFilter} onChange={e=>setKindFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todos os tipos</option><option value="meeting">Reuniões</option><option value="followup">Acompanhamentos</option><option value="checkpoint">Marcos</option></select></label>
    <label className="text-xs font-semibold text-[#525B70]">Buscar<input type="search" aria-label="Buscar reuniões" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Título, cliente ou projeto" className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"/></label>
   </div>
   <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={()=>{setMonth(new Date());setActiveDay(dateKey(new Date()));}} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-3 py-2 text-xs font-semibold">Hoje</button><button type="button" aria-label="Mês anterior" onClick={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1))} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-3 py-2">‹</button><strong className="min-w-[135px] text-center text-sm capitalize">{monthTitle(month)}</strong><button type="button" aria-label="Próximo mês" onClick={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1))} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-3 py-2">›</button></div><div role="group" aria-label="Visualização da agenda" className="flex overflow-hidden rounded-lg border border-[#E3E7F0]"><button type="button" aria-pressed={view==="calendar"} onClick={()=>setView("calendar")} className={`cursor-pointer px-3 py-2 text-xs font-semibold ${view==="calendar"?"bg-[#EEE8FF] text-[#6034B7]":"bg-white text-[#525B70]"}`}>Calendário</button><button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")} className={`cursor-pointer border-l border-[#E3E7F0] px-3 py-2 text-xs font-semibold ${view==="list"?"bg-[#EEE8FF] text-[#6034B7]":"bg-white text-[#525B70]"}`}>Lista</button></div></div>
   {view==="calendar"?<div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(270px,1fr)]">
    <div><div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#697386]">{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(day=><span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{days.map((day,i)=>day?<button type="button" key={day} onClick={()=>setActiveDay(day)} aria-label={day} aria-pressed={day===activeDay} className={`min-h-[68px] cursor-pointer rounded-lg border px-1 py-2 text-sm ${day===activeDay?"border-[#6D35F5] bg-[#F0ECFF]":"border-[#E3E7F0] bg-white hover:bg-[#F6F7FB]"}`}><span>{Number(day.slice(-2))}</span>{sorted.filter(x=>x.item.date===day).slice(0,3).map(x=><span key={x.project.id+":"+x.item.id} title={x.item.title} className={`mt-1 block truncate rounded-sm px-1 text-[10px] ${x.item.status==="completed"?"bg-[#E0F5E8] text-[#176F40]":x.item.status==="cancelled"?"bg-[#FFE4E6] text-[#8E2736]":"bg-[#EEE8FF] text-[#6034B7]"}`}>{x.item.time?x.item.time+" ":""}{x.item.title}</span>)}</button>:<span key={`empty-${i}`}/>)}</div></div>
    <div className="rounded-xl border border-[#E3E7F0] bg-[#FAFBFD] p-4"><h3 className="text-sm font-bold">Agenda de {labelDate(activeDay)}</h3>{dayItems.length===0?<p className="mt-4 text-xs text-[#697386]">Nenhum compromisso nesta data.</p>:<div className="mt-3 space-y-3">{dayItems.map(x=><div key={x.project.id+":"+x.item.id} className="rounded-lg border border-[#E3E7F0] bg-white p-3"><p className="text-sm font-semibold">{x.item.time||"Sem horário"} · {x.item.title}</p><p className="mt-1 text-xs text-[#697386]">{client(x.project)?.name??"Cliente"} · {x.project.title}</p><span className="mt-1 block text-xs text-[#6034B7]">{statusName(x.item.status)}</span>{x.item.meetingUrl&&<a href={x.item.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs font-semibold text-[#6034B7]">Abrir reunião ↗</a>}<button type="button" onClick={()=>openProject(x.project.id)} className="mt-2 block text-xs font-semibold text-[#6034B7] underline">Gerenciar no projeto →</button></div>)}</div>}</div>
   </div>:<div className="mt-4">{inMonth.length===0?<p className="rounded-xl bg-[#F6F7FB] p-5 text-sm text-[#697386]">Nenhum compromisso encontrado neste mês com os filtros atuais.</p>:<div className="divide-y divide-[#E3E7F0] rounded-xl border border-[#E3E7F0]">{inMonth.map(x=><div key={x.project.id+":"+x.item.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-semibold text-[#090D1C]">{x.item.title}</p><p className="mt-1 text-xs text-[#697386]">{labelDate(x.item.date)} · {x.item.time||"Sem horário"} · {client(x.project)?.name??"Cliente"} · {x.project.title}</p><p className="mt-1 text-xs text-[#6034B7]">{statusName(x.item.status)}</p></div><button type="button" onClick={()=>openProject(x.project.id)} className="cursor-pointer rounded-lg border border-[#D9C9FA] px-3 py-2 text-xs font-semibold text-[#6034B7]">Gerenciar</button></div>)}</div>}</div>}
  </section>
  {(newOpen||selectedProject)&&<section aria-label="Gerenciar compromisso" className="rounded-2xl border border-[#E3E7F0] bg-[#F6F7FB] p-5">
   <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-[#090D1C]">{newOpen?"Novo compromisso":"Gerenciar compromissos do projeto"}</h2><button type="button" onClick={closeEditor} className="cursor-pointer rounded-lg border border-[#E3E7F0] bg-white px-3 py-2 text-xs">Fechar</button></div>
   {newOpen&&<label className="mt-4 block text-xs font-semibold">Selecione o projeto<select aria-label="Projeto do novo compromisso" value={editingProject} onChange={e=>setEditingProject(e.target.value)} className="mt-2 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="">Selecione...</option>{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>}
   {selectedProject&&<OperationalAgenda key={selectedProject.id+(newOpen?"-new":"-edit")} startNew={newOpen} projectId={selectedProject.id} projectData={selectedProject.data} updatedAt={selectedProject.updated_at} onSaved={(data,updatedAt)=>onChanged(selectedProject.id,{...selectedProject.data,...data} as HubProject["data"],updatedAt)}/>}
  </section>}
 </div>;
}
