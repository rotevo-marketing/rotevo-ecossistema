"use client";
import {useCompactLayout} from "@/hooks/useCompactLayout";
import DialogFocus from "@/Components/ui/DialogFocus";
import {Fragment,useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
import {editorialChannelIcon} from "@/lib/editorial/channels";
import EditorialDecision from "@/Components/cliente/EditorialDecision";
export type EditorialItem={id:string;title:string;channel:string;format:string;publishDate:string;caption?:string;driveUrl?:string;version?:string;status:"idea"|"idea_pending"|"idea_approved"|"production"|"recording"|"review"|"awaiting_client"|"changes_requested"|"approved"|"scheduled"|"published";visibleToClient?:boolean;reviewNotes?:string;owner?:string;priority?:"low"|"normal"|"high"|"urgent";relatedTaskId?:string;ideaSummary?:string;objective?:string;audience?:string;funnelStage?:string;keyMessage?:string;cta?:string;briefUrl?:string;references?:{url:string;note:string}[]};
export type EditorialProject={id:string;title:string;clients?:{name:string}|{name:string}[]|null;data:{editorialCalendar?:EditorialItem[]}|null};
export const editorialStatuses:Record<EditorialItem["status"],string>={idea:"Ideia",idea_pending:"Ideia aguardando aprovação",idea_approved:"Ideia aprovada",production:"Em produção",recording:"Em gravação",review:"Revisão interna",awaiting_client:"Aguardando aprovação",changes_requested:"Ajustes solicitados",approved:"Aprovado",scheduled:"Agendado",published:"Publicado"};
const projectLabel=(p:EditorialProject)=>{const c=Array.isArray(p.clients)?p.clients[0]:p.clients;return c?.name?`${c.name} · ${p.title}`:p.title;};
const fmt=(d:string)=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d);return m?`${m[3]}/${m[2]}/${m[1]}`:"Sem data"};
const safe=(s?:string)=>{try{const x=new URL(s??"");return x.protocol==="https:"?x.href:null;}catch{return null;}};
export default function EditorialCalendar({projects,clientView=false,onNew,onEdit,focusItem}:{projects:EditorialProject[];clientView?:boolean;onNew?:(projectId:string)=>void;onEdit?:(projectId:string,item:EditorialItem)=>void;focusItem?:{projectId:string;contentId:string;channel:string;publishDate:string;nonce:number}}){
 const [month,setMonth]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;});
 const [preferredView,setView]=useState<"month"|"list">("month");
 const compact=useCompactLayout();
 const view=compact?"list":preferredView;
 const [selected,setSelected]=useState<string|null>(null);
 const [projectFilter,setProjectFilter]=useState("all");
 const [statusFilter,setStatusFilter]=useState("all");
 const [channelFilter,setChannelFilter]=useState("all");
 const [dayFilter,setDayFilter]=useState("");
 const [listSearch,setListSearch]=useState("");
 useEffect(()=>{if(!focusItem)return;setProjectFilter(focusItem.projectId);setChannelFilter(focusItem.channel);if(focusItem.publishDate)setMonth(focusItem.publishDate.slice(0,7));setDayFilter("");setView("month");setSelected(null);},[focusItem]);
 const [clientDecisions,setClientDecisions]=useState<{project_id:string;content_id:string;content_version:string;decision:"approved"|"changes_requested";comment?:string|null;decided_at?:string}[]>([]);
 const [ideaDecisions,setIdeaDecisions]=useState<typeof clientDecisions>([]);
 const items=useMemo(()=>projects.flatMap(p=>(Array.isArray(p.data?.editorialCalendar)?p.data.editorialCalendar:[])
  .filter(i=>i&&typeof i.id==="string"&&typeof i.title==="string"&&(!clientView||i.visibleToClient===true))
  .map(i=>({...i,projectTitle:projectLabel(p),projectId:p.id}))),[projects,clientView]);
 useEffect(()=>{let alive=true;const ids=[...new Set(projects.map(p=>p.id))];if(!ids.length){void Promise.resolve().then(()=>{if(alive){setClientDecisions([]);setIdeaDecisions([]);}});return()=>{alive=false;};}void (async()=>{const {data,error}=await supabase.from("editorial_approvals").select("project_id,content_id,content_version,decision,comment,decided_at").in("project_id",ids).limit(200);const ideas=await supabase.from("editorial_idea_approvals").select("project_id,content_id,content_version,decision,comment,decided_at").in("project_id",ids).limit(200);if(alive){setClientDecisions(error?[]:(data??[]) as typeof clientDecisions);setIdeaDecisions(ideas.error?[]:(ideas.data??[]) as typeof clientDecisions);}})();return()=>{alive=false;};},[projects]);
 const decisionStatus=(item:EditorialItem & {projectId:string})=>{const decision=clientDecisions.find(r=>r.project_id===item.projectId&&r.content_id===item.id&&r.content_version===(item.version??""));const idea=ideaDecisions.find(r=>r.project_id===item.projectId&&r.content_id===item.id&&r.content_version===(item.version??""));return decision?decision.decision:item.status==="idea_pending"&&idea?.decision==="approved"?"idea_approved":item.status==="idea_pending"&&idea?.decision==="changes_requested"?"changes_requested":item.status;};
 const active=items.find(i=>i.projectId+":"+i.id===selected);
 const channels=[...new Set(items.filter(i=>projectFilter==="all"||i.projectId===projectFilter).map(i=>i.channel).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
 const filteredItems=items.filter(i=>(projectFilter==="all"||i.projectId===projectFilter)&&(channelFilter==="all"||i.channel===channelFilter)&&(statusFilter==="all"||decisionStatus(i)===statusFilter));
 const [y,m]=month.split("-").map(Number);
 const offset=new Date(y,m-1,1).getDay();
 const days=new Date(y,m,0).getDate();
 const calendarDays=Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>i-offset+1);
 const monthItems=filteredItems.filter(i=>i.publishDate?.startsWith(month));
 const listItems=monthItems.filter(i=>(!dayFilter||i.publishDate===dayFilter)&&(!listSearch.trim()||[i.title,i.projectTitle,i.channel,i.owner??""].join(" ").toLocaleLowerCase("pt-BR").includes(listSearch.trim().toLocaleLowerCase("pt-BR")))).sort((a,b)=>a.publishDate.localeCompare(b.publishDate));
 const groupedList=Object.entries(listItems.reduce<Record<string,typeof listItems>>((acc,i)=>{const p=projects.find(p=>p.id===i.projectId);const c=Array.isArray(p?.clients)?p?.clients[0]:p?.clients;const name=c?.name??"Cliente";(acc[name]??=[]).push(i);return acc;},{}));
 const prev=()=>{setDayFilter("");const d=new Date(y,m-2,1);setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);};
 const next=()=>{setDayFilter("");const d=new Date(y,m,1);setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);};
 return <div className="rv-ui3-editorial-calendar space-y-3">
  <div className="rv-ui3-editorial-surface bg-white py-3">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="sr-only">Calendário editorial</h2><p className="text-xs text-[#687487]">{filteredItems.length} conteúdos · {monthItems.length} no mês</p></div>
   <div className="flex items-center gap-2">
    <button type="button" disabled={compact} onClick={()=>{setView("month");setDayFilter("");}} aria-pressed={view==="month"} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium disabled:hidden ${view==="month"?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]"}`}>Mês</button>
    <button type="button" onClick={()=>{setView("list");setDayFilter("");}} aria-pressed={view==="list"} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium disabled:hidden ${view==="list"?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]"}`}>Lista</button>
   </div>
  </div>
  
   <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-[#E3E6ED] pb-3" role="group" aria-label="Filtrar conteúdos por canal">
     <button type="button" aria-pressed={channelFilter==="all"} onClick={()=>{setChannelFilter("all");setDayFilter("");}} className={`min-h-9 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium ${channelFilter==="all"?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]"}`}>Todos os canais</button>
     {channels.map(channel=><button key={channel} type="button" aria-pressed={channelFilter===channel} onClick={()=>{setChannelFilter(channel);setDayFilter("");}} className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${channelFilter===channel?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]"}`}><ContentTablerIcon name={editorialChannelIcon(channel)} size={15}/>{channel}</button>)}
   </div>
   {!clientView&&<div className="mb-4 flex flex-wrap items-center gap-3"><label className="min-w-[185px] flex-1 text-xs font-semibold text-[#525B70]">Projeto<select aria-label="Filtrar projeto editorial" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)} className="mt-1 block w-full cursor-pointer rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todos os projetos</option>{projects.map(p=><option key={p.id} value={p.id}>{projectLabel(p)}</option>)}</select></label><label className="min-w-[185px] flex-1 text-xs font-semibold text-[#525B70]">Situação<select aria-label="Filtrar situação editorial" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 block w-full cursor-pointer rounded-lg border border-[#E3E7F0] bg-white px-3 py-2.5 text-sm"><option value="all">Todas as situações</option>{Object.entries(editorialStatuses).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>{onNew&&<button type="button" disabled={projects.length===0} onClick={()=>onNew(projectFilter==="all"?"":projectFilter)} className="cursor-pointer rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#5949D1] disabled:opacity-40">+ Novo conteúdo</button>}</div>}
   <div className="mb-4 flex items-center justify-between gap-3">
    <button type="button" aria-label="Mês anterior" onClick={prev} className="cursor-pointer rounded-lg border px-3 py-2">‹</button>
    <h3 className="text-sm font-semibold capitalize">{new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))}</h3>
    <button type="button" aria-label="Próximo mês" onClick={next} className="cursor-pointer rounded-lg border px-3 py-2">›</button>
   </div>
   {view==="list"&&dayFilter&&<p className="mb-3 text-sm text-[#525B70]">Publicações de {fmt(dayFilter)} <button type="button" className="ml-2 font-semibold text-[#5949D1]" onClick={()=>setDayFilter("")}>Ver o mês inteiro</button></p>}
   {view==="list"&&<label className="mb-3 block text-xs text-[#697386]">Pesquisar conteúdo<input value={listSearch} onChange={e=>setListSearch(e.target.value)} placeholder="Conteúdo, cliente, canal ou responsável" className="mt-1 block min-h-10 w-full rounded-lg border border-[#E3E7F0] bg-white px-3 text-sm text-[#323647] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"/></label>}
   {view==="month"?<div className="grid grid-cols-7 gap-1">
    {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><p key={d} className="py-2 text-center text-[10px] font-semibold text-[#697386] sm:text-xs">{d}</p>)}
    {calendarDays.map((d,i)=>{const key=`${month}-${String(d).padStart(2,"0")}`;const rows=d>0&&d<=days?monthItems.filter(item=>item.publishDate===key):[];return <div key={i} className="min-h-14 overflow-hidden rounded-lg border border-[#E3E7F0] p-1 sm:min-h-24 sm:p-2">
      <span className="text-xs text-[#697386]">{d>0&&d<=days?d:""}</span>
      {rows.slice(0,2).map(item=><button type="button" key={item.projectId+item.id} onClick={()=>setSelected(item.projectId+":"+item.id)}
       title={item.title} className={`mt-1 block w-full cursor-pointer truncate rounded-md px-1 py-1 text-left text-[10px] font-medium transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D35F5] sm:px-2 sm:text-xs ${decisionStatus(item)==="approved"||decisionStatus(item)==="scheduled"||decisionStatus(item)==="published"?"bg-[#E0F5E8] text-[#176F40]":decisionStatus(item)==="changes_requested"?"bg-[#FFF1D4] text-[#875400]":decisionStatus(item)==="awaiting_client"?"bg-[#EEE8FF] text-[#6034B7]":"bg-[#EDF0F6] text-[#525B70]"}`}>{item.title}</button>)}
      {rows.length>2&&<button type="button" aria-label={`Ver os ${rows.length} conteúdos de ${fmt(key)}`} onClick={()=>{setView("list");setDayFilter(key);}} className="mt-1 block min-h-8 text-xs font-semibold text-[#5949D1]">+{rows.length-2} · Ver todos</button>}
    </div>})}
   </div>:<div className="overflow-x-auto rounded-xl border border-[#E3E7F0] bg-white">
    <table className="w-full min-w-[860px] border-collapse text-left text-xs">
     <thead className="bg-[#F7F8FC] text-[#596579]"><tr>{["Conteúdo","Projeto","Responsável","Situação","Prioridade","Prazo"].map(head=><th key={head} scope="col" className="border-b border-r border-[#E3E7F0] px-3 py-3 font-semibold">{head}</th>)}</tr></thead>
     <tbody>{groupedList.map(([clientName,rows])=><Fragment key={clientName}>
      <tr className="bg-[#F5F2FF]"><th colSpan={6} className="border-b border-[#E3E7F0] px-3 py-2.5 text-sm font-semibold text-[#6034B7]">{clientName} <span className="ml-2 font-normal text-[#687487]">({rows.length} conteúdos)</span></th></tr>
      {rows.map(item=><tr key={item.projectId+":"+item.id} className="hover:bg-[#F9FAFE]">
       <td className="max-w-[340px] border-b border-r border-[#E9ECF3] px-3 py-3"><button type="button" onClick={()=>setSelected(item.projectId+":"+item.id)} className="max-w-full cursor-pointer text-left font-semibold text-[#5949D1] hover:underline focus-visible:outline-2 focus-visible:outline-[#6C5CE7]">{item.title}</button><p className="mt-1 text-[11px] text-[#788398]">{item.channel} · {item.format}</p></td>
       <td className="max-w-[170px] border-b border-r border-[#E9ECF3] px-3 py-3 text-[#525B70]" title={item.projectTitle}>{projects.find(p=>p.id===item.projectId)?.title??item.projectTitle}</td>
       <td className="border-b border-r border-[#E9ECF3] px-3 py-3 text-[#525B70]">{item.owner?.trim()||"Não atribuído"}</td>
       <td className="border-b border-r border-[#E9ECF3] px-3 py-3"><span className="inline-flex rounded-md bg-[#EEE8FF] px-2 py-1.5 font-medium text-[#6034B7]">{editorialStatuses[decisionStatus(item) as EditorialItem["status"]]??decisionStatus(item)}</span></td>
       <td className="border-b border-r border-[#E9ECF3] px-3 py-3"><span className={"inline-flex rounded-md px-2 py-1.5 font-medium "+(item.priority==="urgent"?"bg-[#FCE5E8] text-[#AA354A]":item.priority==="high"?"bg-[#FFF0D6] text-[#966200]":item.priority==="low"?"bg-[#EAF1FF] text-[#285CBA]":"bg-[#F1F3F7] text-[#525B70]")}>{({low:"Baixa",normal:"Normal",high:"Alta",urgent:"Urgente"} as const)[item.priority??"normal"]}</span></td>
       <td className="whitespace-nowrap border-b border-[#E9ECF3] px-3 py-3 text-[#525B70]">{fmt(item.publishDate)}</td>
      </tr>)}
     </Fragment>)}</tbody>
    </table>
    {listItems.length===0&&<p className="p-6 text-center text-sm text-[#697386]">Nenhum conteúdo corresponde aos filtros deste mês.</p>}
   </div>}
   {view==="month"&&monthItems.length===0&&<p className="mt-4 text-center text-xs text-[#697386]">Nenhuma publicação cadastrada para este período.</p>}
  </div>
  {active&&<div className="fixed inset-0 z-[110] flex justify-end">
   <button type="button" aria-label="Fechar detalhes do conteúdo" onClick={()=>setSelected(null)} className="absolute inset-0 bg-[#090D1C]/50"/>
   <aside role="dialog" aria-modal="true" aria-label="Detalhes do conteúdo" className="relative z-10 h-full w-full max-w-[600px] overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
    <DialogFocus onClose={()=>setSelected(null)}/><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#6D35F5]">Conteúdo · {fmt(active.publishDate)}</p><h3 className="mt-1 text-xl font-bold text-[#090D1C]">{active.title}</h3><p className="mt-1 text-xs text-[#697386]">{active.projectTitle} · {active.channel} · {active.format}</p></div><button type="button" aria-label="Fechar" onClick={()=>setSelected(null)} className="cursor-pointer rounded-lg border border-[#E3E7F0] p-2"><RotevoTablerIcon name="x" size={19}/></button></div>
    <div className="mt-5 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-[#EEE8FF] px-3 py-1.5 text-xs font-semibold text-[#6034B7]">{editorialStatuses[decisionStatus(active) as EditorialItem["status"]]??decisionStatus(active)}</span><span className="rounded-lg bg-[#F6F7FB] px-3 py-1.5 text-xs text-[#525B70]">Versão {active.version||"Não informada"}</span></div>
    <h4 className="mt-6 text-sm font-semibold">Legenda</h4><div className="mt-2 min-h-[90px] whitespace-pre-wrap rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4 text-sm text-[#344056]">{active.caption||"Nenhuma legenda cadastrada."}</div>
    <h4 className="mt-5 text-sm font-semibold">Material</h4>{safe(active.driveUrl)?<a href={safe(active.driveUrl)!} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#D9C9FA] px-4 py-2.5 text-sm font-semibold text-[#6034B7]"><RotevoTablerIcon name="link" size={18}/> Abrir material no Drive ↗</a>:<p className="mt-2 text-sm text-[#697386]">Nenhum link de material disponível.</p>}
    {!clientView&&onEdit&&<button type="button" onClick={()=>{onEdit(active.projectId,active);setSelected(null);}} className="mt-5 cursor-pointer rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5949D1]">Editar conteúdo e situação</button>}
    {!clientView&&clientDecisions.some(row=>row.project_id===active.projectId&&row.content_id===active.id&&row.content_version===(active.version??""))&&<section className="mt-5 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4"><h4 className="text-sm font-semibold">Última decisão do cliente</h4>{clientDecisions.filter(row=>row.project_id===active.projectId&&row.content_id===active.id&&row.content_version===(active.version??"")).map(row=><div key={row.project_id+row.content_id+row.content_version}><p className="mt-2 text-sm text-[#525B70]">{row.decision==="approved"?"Versão aprovada":"Ajustes solicitados"}{row.decided_at?" · "+new Date(row.decided_at).toLocaleString("pt-BR"):""}</p>{row.comment&&<p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-[#344056]">{row.comment}</p>}</div>)}</section>}
    {active.reviewNotes&&<div className="mt-5 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4"><h4 className="text-sm font-semibold">Observações de revisão</h4><p className="mt-2 whitespace-pre-wrap text-sm text-[#525B70]">{active.reviewNotes}</p></div>}
    {clientView&&<EditorialDecision key={active.projectId+":"+active.id+":"+(active.version??"")} projectId={active.projectId} item={active} onDecision={decision=>setClientDecisions(prev=>[...prev.filter(row=>!(row.project_id===active.projectId&&row.content_id===active.id&&row.content_version===(active.version??""))),{project_id:active.projectId,content_id:active.id,content_version:active.version??"",decision}])}/>}
   </aside>
  </div>}
 </div>;
}
