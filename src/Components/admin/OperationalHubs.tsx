"use client";
import {confirmDiscardChanges} from "@/hooks/useUnsavedChanges";
import {useMeetingCalendar} from "@/hooks/useMeetingCalendar";
import {safeLink} from "@/lib/operations/model";
import {useCompactLayout} from "@/hooks/useCompactLayout";
import DialogFocus from "@/Components/ui/DialogFocus";
import {useEffect,useMemo,useState} from "react";
import {request} from "@/lib/operations/api";
import Link from "next/link";
import ProjectOnboarding, {type OnboardingData} from "@/Components/admin/ProjectOnboarding";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import GoogleCalendarConnection from "@/Components/admin/GoogleCalendarConnection";
import OperationalAgenda, {type AgendaItem} from "@/Components/admin/OperationalAgenda";

export type HubProject={id:string;title:string;updated_at:string;data:OnboardingData & {operationalAgenda?:AgendaItem[];executionTimeline?:{id:string;title:string}[]};clients:{name:string;slug:string}|{name:string;slug:string}[]|null};
const client=(p:HubProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
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
 const [clientPhotos,setClientPhotos]=useState<Record<string,string>>({});
 useEffect(()=>{
  let mounted=true;
  async function loadPhotos(){
   try{
    const result=await request<{clients:{slug:string;cover_image_url:string|null}[]}>("/api/admin/clients");
    const list=result.clients??[];
    const ids=[...new Set(list.map(c=>c.cover_image_url??"").filter(url=>url.startsWith("asset://")).map(url=>url.slice(8)))];
    let resolved:Record<string,string>={};
    if(ids.length)resolved=(await request<{links:Record<string,string>}>("/api/assets/resolve","POST",{ids})).links??{};
    if(mounted)setClientPhotos(Object.fromEntries(list.map(c=>[c.slug,c.cover_image_url?.startsWith("asset://")?resolved[c.cover_image_url.slice(8)]??"":c.cover_image_url??""])));
   }catch{/* The project remains usable with initial-letter avatars when a photo cannot be resolved. */}
  }
  void loadPhotos();
  return()=>{mounted=false;};
 },[]);

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
 const visible=overview.filter(x=>(filter==="all"||x.status===filter)&&(`${(x.project?client(x.project)?.name:"")??""} ${x.project?.title??"Minha agenda"}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))));
 const labels:Record<string,string>={not_started:"Não iniciado",pending:"Em preparação",done:"Concluído"};
 return <div className="rv-ui2-module rv-ui2-onboarding mt-5 space-y-4">
  <section className="rv-ui2-section rv-ui3-onboarding-surface bg-white">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="sr-only">Acompanhamento de entrada</h2><p className="text-xs text-[#687487]">{overview.length} projetos · {totals.started-totals.completed} em andamento · {totals.completed} concluídos · {totals.notStarted} não iniciados</p></div><button type="button" disabled={projects.length===0} onClick={()=>{setStarterId(unstarted[0]?.project.id??projects[0]?.id??"");setStarterOpen(true);}} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#5949D1] disabled:cursor-not-allowed disabled:opacity-50"><RotevoTablerIcon name="square-rounded-plus" size={18}/> + Iniciar onboarding</button></div>
   <div className="mt-4 flex flex-wrap gap-2"><label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#E3E7F0] bg-white px-3"><RotevoTablerIcon name="search" size={17} className="text-[#697386]"/><input aria-label="Buscar onboarding por cliente ou projeto" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente ou projeto" className="w-full bg-transparent py-2.5 text-sm outline-none"/></label><select aria-label="Filtrar situação do onboarding" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)} className="cursor-pointer rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-xs"><option value="all">Todas as situações</option><option value="not_started">Não iniciados</option><option value="pending">Em preparação</option><option value="done">Concluídos</option></select></div>
   {visible.length===0?<p className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">{projects.length===0?"Cadastre um projeto para iniciar o onboarding.":"Nenhum onboarding corresponde aos filtros."}</p>:
   <div className="mt-4 overflow-x-auto border-y border-[#E3E6ED]"><table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead className="bg-[#F6F7FB] text-[#525B70]"><tr>{<><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="user-check" size={17}/>Cliente / projeto</span></th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="clock" size={17}/>Situação</span></th><th scope="col" className="border-b px-3 py-3">Progresso</th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="alert-circle" size={17}/>Pendentes</span></th><th scope="col" className="border-b px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><RotevoTablerIcon name="square-rounded-plus" size={17}/>Próxima ação</span></th></>}</tr></thead><tbody className="divide-y divide-[#E3E7F0]">{visible.map(p=><tr key={p.project.id} className="hover:bg-[#FAFBFE]"><td className="px-3 py-3"><div className="flex min-w-[210px] items-center gap-3"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E3E6ED] bg-[#F2EFFD] text-xs font-semibold text-[#6034B7]">{clientPhotos[client(p.project)?.slug??""]?<img src={clientPhotos[client(p.project)?.slug??""]} alt="" className="h-full w-full object-cover"/>:(client(p.project)?.name??"C").trim().charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block font-semibold text-[#323647]">{client(p.project)?.name??"Cliente"}</span><span className="mt-1 block max-w-[200px] truncate text-[#697386]">{p.project.title}</span></span></div></td><td className="px-3 py-3"><span data-rv-tone={p.status==="done"?"green":p.status==="pending"?"violet":"neutral"} className={p.status==="done"?"rounded-lg bg-[#E0F5E8] px-2 py-1 text-[#176F40]":"rounded-lg bg-[#ECE8FF] px-2 py-1 text-[#6034B7]"}>{labels[p.status]}</span></td><td className="px-3 py-3"><div className="flex min-w-[110px] items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9ECF4]"><div className="h-full rounded-full bg-[#6C5CE7]" style={{width:`${p.percent}%`}}/></div><strong>{p.percent}%</strong></div><span className="mt-1 block text-[#697386]">{p.done}/{p.steps.length} etapas</span></td><td className="px-3 py-3">{p.pending}</td><td className="px-3 py-3"><button type="button" onClick={()=>{setSelected(p.project.id);setDrawerOpen(true);}} className="cursor-pointer rounded-lg px-3 py-2 font-medium text-[#5949D1] hover:bg-[#EDEAFF] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]">{p.steps.length?"Gerenciar":"Iniciar"} <RotevoTablerIcon name="external-link" size={15} className="ml-1 inline-block align-text-bottom"/></button></td></tr>)}</tbody></table></div>}
  </section>
  {starterOpen&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#090D1C]/55 p-4" role="dialog" aria-modal="true" aria-label="Selecionar projeto para iniciar onboarding">
   <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
    <DialogFocus onClose={()=>setStarterOpen(false)}/><h3 className="text-lg font-bold">Iniciar onboarding</h3><p className="mt-2 text-sm text-[#697386]">Escolha o projeto. Se houver um checklist antigo, você poderá aplicar o modelo de 10 etapas com confirmação, sem modificar nada automaticamente.</p>
    <label className="mt-4 block text-xs font-semibold">Projeto<select value={starterId} onChange={e=>setStarterId(e.target.value)} className="mt-2 w-full rounded-lg border border-[#E3E7F0] px-3 py-3 text-sm">{overview.map(p=><option key={p.project.id} value={p.project.id}>{client(p.project)?.name??"Cliente"} · {p.project.title}{p.steps.length?" (checklist existente)":" (novo)"}</option>)}</select></label>
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setStarterOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={!starterId} onClick={()=>{setSelected(starterId);setStarterOpen(false);setDrawerOpen(true);}} className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5949D1] disabled:opacity-50">Continuar</button></div>
   </section>
  </div>}
  {drawerOpen&&project&&<div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
   <button type="button" aria-label="Fechar painel de onboarding" className="absolute inset-0 bg-[#090D1C]/55" onClick={()=>{if(confirmDiscardChanges())setDrawerOpen(false);}}/>
   <section role="dialog" aria-modal="true" aria-labelledby="ui3-onboarding-dialog-title" className="relative z-10 max-h-[92dvh] w-full max-w-[860px] overflow-y-auto rounded-2xl border border-[#E3E7F0] bg-white p-5 shadow-2xl sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E7F0] pb-4">
     <div><h2 id="ui3-onboarding-dialog-title" className="text-lg font-semibold text-[#323647]">Gerenciar onboarding</h2><p className="mt-1 text-sm text-[#525B70]">{client(project)?.name??"Cliente"} · {project.title}</p></div>
     <div className="flex items-center gap-2">{client(project)?.slug&&<Link href={`/admin/planejamentos/${client(project)?.slug}?projectId=${encodeURIComponent(project.id)}`} className="inline-flex items-center gap-1 rounded-lg border border-[#E3E7F0] px-3 py-2 text-xs font-semibold text-[#6034B7]"><RotevoTablerIcon name="folder" size={16}/> Projeto</Link>}<button type="button" aria-label="Fechar" onClick={()=>{if(confirmDiscardChanges())setDrawerOpen(false);}} className="cursor-pointer rounded-lg border border-[#E3E7F0] p-2 text-[#525B70]"><RotevoTablerIcon name="x" size={19}/></button></div>
    </div>
    <DialogFocus onClose={()=>{if(confirmDiscardChanges())setDrawerOpen(false);}}/><ProjectOnboarding key={project.id} projectId={project.id} data={project.data} updatedAt={project.updated_at} onSaved={(data,updatedAt)=>onChanged(project.id,data,updatedAt)}/>
   </section>
  </div>}
 </div>;
}
type MeetingsHubMode=
 | {embeddedCalendar:true;onOpenAgenda?:()=>void;onChanged?:never}
 | {embeddedCalendar?:false;onOpenAgenda?:never;onChanged:(id:string,data:HubProject["data"],updatedAt:string)=>void};

export function AdminMeetingsHub({projects,onChanged,userId,embeddedCalendar,onOpenAgenda}:{userId:string|null;projects:HubProject[]}&MeetingsHubMode){
 const [privateState,setPrivateState]=useState<{ownerId:string;data:{operationalAgenda?:AgendaItem[]};updated_at:string|null}|null>(null);
 const [privateError,setPrivateError]=useState(""),[privateReload,setPrivateReload]=useState(0);
 useEffect(()=>{
  if(!userId)return;
  let active=true;
  void request<{agenda:{data:{operationalAgenda?:AgendaItem[]};updated_at:string|null}}>("/api/admin/agenda?expectedUserId="+encodeURIComponent(userId))
   .then(result=>{if(active){setPrivateState({ownerId:userId,...result.agenda});setPrivateError("");}})
   .catch(()=>{if(active)setPrivateError("Não foi possível carregar sua agenda privada.");});
  return()=>{active=false;};
 },[userId,privateReload]);
 const privateAgenda=privateState?.ownerId===userId?privateState:null;
 const [projectFilter,setProjectFilter]=useState("all");
 const [statusFilter,setStatusFilter]=useState("all");
 const [preferredView,setView]=useState<"calendar"|"list">("calendar");
 const compact=useCompactLayout();
 const view=embeddedCalendar?"calendar":compact?"list":preferredView;
 const {month,monthTitle,offset,days,selectedDay:activeDay,selectDay:setActiveDay,shiftMonth,goToToday}=useMeetingCalendar();
 const [editingProject,setEditingProject]=useState("");
 const [newOpen,setNewOpen]=useState(false);
 const [savedNew,setSavedNew]=useState(false);
 const [search,setSearch]=useState("");
 const [kindFilter,setKindFilter]=useState("all");
 const rows=useMemo(()=>[
  ...projects.flatMap(p=>(Array.isArray(p.data?.operationalAgenda)?p.data.operationalAgenda:[]).filter(x=>x&&typeof x.id==="string"&&typeof x.date==="string"&&typeof x.title==="string").map(item=>({item,project:p as HubProject|null}))),
  ...(privateAgenda?.data.operationalAgenda??[]).map(item=>({item,project:null as HubProject|null}))
 ],[projects,privateAgenda]);
 const filtered=rows.filter(x=>(projectFilter==="all"||(x.project?.id??"personal")===projectFilter)&&(statusFilter==="all"||x.item.status===statusFilter)&&(kindFilter==="all"||x.item.kind===kindFilter)&&(`${x.item.title} ${(x.project?client(x.project)?.name:"")??""} ${x.project?.title??"Minha agenda"}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
 const sorted=[...filtered].sort((a,b)=>`${a.item.date}T${a.item.time||"23:59"}`.localeCompare(`${b.item.date}T${b.item.time||"23:59"}`));
 const selectedProject=projects.find(p=>p.id===editingProject);
 const selectedPrivate=editingProject==="personal";
 const calendarDays=[...Array<null>(offset).fill(null),...Array.from({length:days},(_,i)=>month+"-"+String(i+1).padStart(2,"0"))];
 const dayItems=sorted.filter(x=>x.item.date===activeDay);
 const inMonth=sorted.filter(x=>x.item.date.startsWith(month));
 const labelDate=(value:string)=>value.slice(8,10)+"/"+value.slice(5,7)+"/"+value.slice(0,4);
 const statusName=(status:string)=>status==="completed"?"Realizada":status==="cancelled"?"Cancelada":"Agendada";
 const closeEditor=()=>{if(!confirmDiscardChanges())return;setEditingProject("");setNewOpen(false);};
 const openProject=(id:string)=>{if(!confirmDiscardChanges())return;setEditingProject(id);setNewOpen(false);};

 return <div className="rv-ui2-module rv-ui2-meetings rv-ui3-meetings mt-3 space-y-3">
  {privateError&&<div role="alert" className="text-sm">{privateError}<button type="button" className="ml-2 underline" onClick={()=>setPrivateReload(value=>value+1)}>Tentar novamente</button></div>}
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#E3E6ED] pb-3 text-xs text-[#687487]" aria-label="Resumo da agenda"><span>{filtered.filter(x=>x.item.status==="planned").length} agendadas</span><span>{filtered.filter(x=>x.item.status==="completed").length} realizadas</span><span>{filtered.filter(x=>x.item.status==="cancelled").length} canceladas</span></div>
  <section className="rv-ui3-meetings-surface bg-white py-3">
   {!embeddedCalendar&&process.env.NEXT_PUBLIC_ROTEVO_GOOGLE_CALENDAR_ENABLED==="true"&&!newOpen&&!selectedProject&&!selectedPrivate&&<GoogleCalendarConnection/>}
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="sr-only">Agenda de reuniões</h2><p className="text-xs text-[#687487]">Minha agenda e projetos · sem convites externos automáticos</p></div>{!embeddedCalendar&&<button type="button" onClick={()=>{if(!confirmDiscardChanges())return;setEditingProject("");setSavedNew(false);setNewOpen(true);}} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#5949D1]"><RotevoTablerIcon name="square-rounded-plus" size={18}/>Novo compromisso</button>}</div>
   <div className="mt-3 grid gap-2 border-b border-[#E3E6ED] pb-3 sm:grid-cols-2 xl:grid-cols-4">
    <label className="text-xs font-semibold text-[#525B70]">Projeto<select aria-label="Filtrar projeto das reuniões" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Toda a agenda</option><option value="personal">Sem projeto</option>{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>
    <label className="text-xs font-semibold text-[#525B70]">Situação<select aria-label="Filtrar situação das reuniões" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todas as situações</option><option value="planned">Agendadas</option><option value="completed">Realizadas</option><option value="cancelled">Canceladas</option></select></label>
    <label className="text-xs font-semibold text-[#525B70]">Tipo<select aria-label="Filtrar tipo de compromisso" value={kindFilter} onChange={e=>setKindFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todos os tipos</option><option value="meeting">Reuniões</option><option value="followup">Acompanhamentos</option><option value="checkpoint">Marcos</option></select></label>
    <label className="text-xs font-semibold text-[#525B70]">Buscar<input type="search" aria-label="Buscar reuniões" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Título, cliente ou projeto" className="mt-1 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"/></label>
   </div>
   <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={goToToday} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-3 py-2 text-xs font-semibold">Hoje</button><button type="button" aria-label="Mês anterior" onClick={()=>shiftMonth(-1)} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-3 py-2">‹</button><strong className="min-w-[135px] text-center text-sm capitalize">{monthTitle}</strong><button type="button" aria-label="Próximo mês" onClick={()=>shiftMonth(1)} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-3 py-2">›</button></div>{!embeddedCalendar&&<div role="group" aria-label="Visualização da agenda" className="flex overflow-hidden rounded-lg border border-[#E3E7F0]"><button type="button" disabled={compact} aria-pressed={view==="calendar"} onClick={()=>setView("calendar")} className={`cursor-pointer px-3 py-2 text-xs font-semibold disabled:hidden ${view==="calendar"?"bg-[#EEE8FF] text-[#6034B7]":"bg-white text-[#525B70]"}`}>Calendário</button><button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")} className={`cursor-pointer border-l border-[#E3E7F0] px-3 py-2 text-xs font-semibold ${view==="list"?"bg-[#EEE8FF] text-[#6034B7]":"bg-white text-[#525B70]"}`}>Lista</button></div>}</div>
   {view==="calendar"?<div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(270px,1fr)]">
    <section aria-label="Calendário de reuniões" className="min-w-0"><div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#697386]">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(day=><span key={day}>{day}</span>)}</div><div className="rv-ui3-meetings-calendar mt-2 grid grid-cols-7 gap-1">{calendarDays.map((day,i)=>day?<button type="button" key={day} onClick={()=>setActiveDay(day)} aria-label={day} aria-pressed={day===activeDay} className={`min-w-0 min-h-[68px] cursor-pointer rounded-lg border px-1 py-2 text-sm ${day===activeDay?"border-[#6D35F5] bg-[#F0ECFF]":"border-[#E3E7F0] bg-white hover:bg-[#F6F7FB]"}`}><span>{Number(day.slice(-2))}</span>{sorted.filter(x=>x.item.date===day).slice(0,3).map(x=><span key={(x.project?.id??"personal")+":"+x.item.id} title={x.item.title} className={`rv-ui3-meeting-event mt-1 block truncate rounded-sm px-1 text-[10px] ${x.item.status==="completed"?"bg-[#E0F5E8] text-[#176F40]":x.item.status==="cancelled"?"bg-[#FFE4E6] text-[#8E2736]":"bg-[#EEE8FF] text-[#6034B7]"}`}>{x.item.time?x.item.time+" ":""}{x.item.title}</span>)}</button>:<span key={`empty-${i}`}/>)}</div></section>
     <aside className="min-w-0 rounded-xl border border-[#E3E7F0] bg-white p-4"><div className="flex items-center gap-2"><RotevoTablerIcon name="calendar-week" size={18} stroke={1.6}/><h3 className="text-sm font-semibold text-[#323647]">Agenda de {labelDate(activeDay)}</h3></div>{dayItems.length===0?<p className="mt-4 text-xs text-[#697386]">Nenhum compromisso nesta data.</p>:<div className="mt-3 space-y-3">{dayItems.map(x=><article key={(x.project?.id??"personal")+":"+x.item.id} className="rounded-xl border border-[#E5E8F0] bg-[#FBFCFE] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-[13px] font-semibold leading-5 text-[#263146]">{x.item.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-[#697386]"><RotevoTablerIcon name="clock" size={15} stroke={1.6}/>{x.item.time||"Sem horário"}</p></div><span className={"inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold "+(x.item.status==="completed"?"bg-[#E7F7ED] text-[#176F40]":x.item.status==="cancelled"?"bg-[#FFF0F1] text-[#9A3A4B]":"bg-[#F0EBFF] text-[#6034B7]")}><RotevoTablerIcon name={x.item.status==="completed"?"circle-check":x.item.status==="cancelled"?"x":"calendar-week"} size={13} stroke={1.7}/>{statusName(x.item.status)}</span></div><p className="mt-2 line-clamp-2 text-xs text-[#697386]">{x.project?(client(x.project)?.name??"Cliente")+" · "+x.project.title:"Minha agenda · Sem projeto"}</p><div className="mt-3 flex flex-wrap items-center gap-2">{safeLink(x.item.meetingUrl,false)&&<a href={x.item.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#6C5CE7] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5949D1]"><RotevoTablerIcon name="external-link" size={16} stroke={1.7}/>Entrar na reunião<RotevoTablerIcon name="external-link" size={13}/></a>}<button type="button" onClick={embeddedCalendar?onOpenAgenda:()=>openProject(x.project?.id??"personal")} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E3E7F0] bg-white px-3 py-2 text-xs font-semibold text-[#6034B7] hover:bg-[#F6F3FF]"><RotevoTablerIcon name="report" size={16} stroke={1.6}/>{embeddedCalendar?"Ver na agenda":"Gerenciar"}</button></div></article>)}</div>}</aside>
   </div>:<div className="mt-4">{inMonth.length===0?<p className="rounded-xl bg-[#F6F7FB] p-5 text-sm text-[#697386]">Nenhum compromisso encontrado neste mês com os filtros atuais.</p>:<div className="divide-y divide-[#E3E6ED] border-y border-[#E3E6ED]">{inMonth.map(x=><div key={(x.project?.id??"personal")+":"+x.item.id} className="flex flex-wrap items-center justify-between gap-3 px-2 py-3"><div><p className="text-sm font-semibold text-[#090D1C]">{x.item.title}</p><p className="mt-1 text-xs text-[#697386]">{labelDate(x.item.date)} · {x.item.time||"Sem horário"} · {x.project?(client(x.project)?.name??"Cliente")+" · "+x.project.title:"Minha agenda · Sem projeto"}</p><span className={"mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold "+(x.item.status==="completed"?"bg-[#E7F7ED] text-[#176F40]":x.item.status==="cancelled"?"bg-[#FFF0F1] text-[#9A3A4B]":"bg-[#F0EBFF] text-[#6034B7]")}><RotevoTablerIcon name={x.item.status==="completed"?"circle-check":x.item.status==="cancelled"?"x":"calendar-week"} size={13}/>{statusName(x.item.status)}</span></div><div className="flex flex-wrap gap-2">{safeLink(x.item.meetingUrl,false)&&<a href={x.item.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#6C5CE7] px-3 py-2 text-xs font-semibold text-white"><RotevoTablerIcon name="external-link" size={16}/>Entrar</a>}<button type="button" onClick={()=>openProject(x.project?.id??"personal")} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#D9C9FA] px-3 py-2 text-xs font-semibold text-[#6034B7]"><RotevoTablerIcon name="report" size={16}/>Gerenciar</button></div></div>)}</div>}</div>}
  </section>
  {!embeddedCalendar&&(newOpen||selectedProject||selectedPrivate)&&<div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6"><button type="button" onClick={closeEditor} aria-label="Fechar editor de compromissos" className="absolute inset-0 bg-[#101828]/45"/><section role="dialog" aria-modal="true" aria-label={newOpen?(savedNew?"Detalhes do compromisso":"Novo compromisso"):"Gerenciar compromissos do projeto"} className="relative z-10 flex max-h-[min(92dvh,940px)] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[#E3E7F0] bg-white shadow-2xl"><DialogFocus onClose={closeEditor}/>
   <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E3E7F0] px-5 py-4 sm:px-6"><div className="flex items-center gap-2"><span className="rounded-lg bg-[#F2EEFF] p-2 text-[#6034B7]"><RotevoTablerIcon name="calendar-week" size={19} stroke={1.7}/></span><h2 className="text-base font-semibold text-[#090D1C]">{newOpen?(savedNew?"Detalhes do compromisso":"Novo compromisso"):"Gerenciar compromissos"}</h2></div><button type="button" aria-label="Fechar janela" onClick={closeEditor} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#E3E7F0] text-[#596579] hover:bg-[#F6F7FB] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"><RotevoTablerIcon name="x" size={18}/></button></div><div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">

   {(newOpen||selectedProject||selectedPrivate)&&<OperationalAgenda key={newOpen?"new":(selectedProject?.id??"personal")+"-edit"} startNew={newOpen} projectId={selectedProject?.id??""} projectData={selectedProject?.data??privateAgenda?.data??{}} updatedAt={selectedProject?selectedProject.updated_at:(privateAgenda?.updated_at??null)} privateOwnerId={selectedProject?undefined:userId??undefined} privateReady={!!privateAgenda}
    projectPicker={newOpen&&!savedNew?<label className="block text-xs font-semibold">Cliente e projeto<select aria-label="Projeto do novo compromisso" value={editingProject} onChange={e=>setEditingProject(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Sem projeto · Minha agenda</option>{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>:undefined}
    onSaved={(data,updatedAt)=>{if(selectedProject)onChanged?.(selectedProject.id,{...selectedProject.data,...data} as HubProject["data"],updatedAt);else if(userId)setPrivateState({ownerId:userId,data,updated_at:updatedAt});if(newOpen)setSavedNew(true);}}/>}

  </div></section></div>}
 </div>;
}
