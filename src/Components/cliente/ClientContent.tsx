const ui3FallbackCollaborationEnabled=()=>false;
"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {ContentTablerIcon,type ContentIconName} from "@/Components/ContentTablerIcon";
import {supabase} from "@/lib/supabase";
import EditorialDecision from "./EditorialDecision";
import ProjectConversation from "@/Components/shared/ProjectConversation";
import EditorialIdeaDecision from "./EditorialIdeaDecision";
import {type EditorialItem,type EditorialProject} from "./EditorialCalendar";
import {editorialChannelIcon} from "@/lib/editorial/channels";
type Status="draft"|"idea_pending"|"idea_approved"|"production"|"recording"|"review"|"awaiting"|"changes"|"approved"|"scheduled"|"published";
type Item={id:string;title:string;channel:string;format:string;date:string;status:Status;caption:string;material:string;projectId:string;source:EditorialItem};
const statuses:Record<Status,string>={draft:"Ideia",idea_pending:"Ideia",idea_approved:"Ideia aprovada",production:"Em produção",recording:"Em gravação",review:"Revisão interna",awaiting:"Aguardando aprovação",changes:"Ajustes solicitados",approved:"Aprovado",scheduled:"Agendado",published:"Publicado"};
const statusColor:Record<Status,string>={draft:"bg-[#EDF0F5] text-[#475467]",idea_pending:"bg-[#FFF2DB] text-[#92600C]",idea_approved:"bg-[#E0F5E8] text-[#176F40]",production:"bg-[#EAF1FF] text-[#245CC5]",recording:"bg-[#EAF1FF] text-[#245CC5]",review:"bg-[#EEE8FF] text-[#6034B7]",awaiting:"bg-[#FFF2DB] text-[#92600C]",changes:"bg-[#EEE8FF] text-[#6034B7]",approved:"bg-[#E0F5E8] text-[#176F40]",scheduled:"bg-[#EAF1FF] text-[#245CC5]",published:"bg-[#EDF0F5] text-[#475467]"};
const filters=[["all","Todos"],["idea","Ideias"],["idea_approved","Ideias aprovadas"],["production","Em produção"],["awaiting","Aguardando aprovação"],["changes","Ajustes solicitados"],["approved","Aprovados"],["scheduled","Agendados"],["published","Publicados"]];
const matchesFilter=(item:Item,filter:string)=>filter==="all"||filter==="idea"&&["draft","idea_pending"].includes(item.status)||filter==="production"&&["production","recording","review"].includes(item.status)||item.status===filter;
const fmt=(d:string)=>d.split("-").reverse().join("/");
const channelIcon=(v:string):ContentIconName=>editorialChannelIcon(v);
export default function ClientContent({projects,focusContentId,onFocusHandled}:{projects:EditorialProject[];focusContentId?:string|null;onFocusHandled?:()=>void}){
 const [decisions,setDecisions]=useState<{project_id:string;content_id:string;content_version:string;decision:"approved"|"changes_requested";comment:string|null;decided_at:string}[]>([]);
 const [ideaDecisions,setIdeaDecisions]=useState<{project_id:string;content_id:string;content_version:string;decision:"approved"|"changes_requested";comment:string|null;decided_at:string}[]>([]);
 const [revision,setRevision]=useState(0),[loadError,setLoadError]=useState("");
 useEffect(()=>{let alive=true;const ids=projects.map(p=>p.id);if(!ids.length)return;void (async()=>{const r=await supabase.from("editorial_approvals").select("project_id,content_id,content_version,decision,comment,decided_at").in("project_id",ids);const ideas=await supabase.from("editorial_idea_approvals").select("project_id,content_id,content_version,decision,comment,decided_at").in("project_id",ids);if(alive){if(r.error||ideas.error)setLoadError("Não foi possível conferir as aprovações. Atualize antes de decidir.");else{setLoadError("");setDecisions(r.data??[]);setIdeaDecisions(ideas.data??[]);}}})();return()=>{alive=false;};},[projects,revision]);
 const items=useMemo<Item[]>(()=>projects.flatMap(p=>(p.data?.editorialCalendar??[]).filter(i=>i.visibleToClient===true).map(i=>{const decision=decisions.find(d=>d.project_id===p.id&&d.content_id===i.id&&d.content_version===(i.version??""));const ideaDecision=ideaDecisions.find(d=>d.project_id===p.id&&d.content_id===i.id&&d.content_version===(i.version??""));const state=decision?.decision??(i.status==="idea_pending"&&ideaDecision?.decision==="approved"?"idea_approved":i.status==="idea_pending"&&ideaDecision?.decision==="changes_requested"?"changes_requested":i.status);return {id:p.id+":"+i.id,projectId:p.id,source:i,title:i.title,channel:i.channel,format:i.format,date:i.publishDate,status:state==="approved"?"approved":state==="published"?"published":state==="scheduled"?"scheduled":state==="changes_requested"?"changes":state==="awaiting_client"?"awaiting":state==="idea_pending"?"idea_pending":state==="idea_approved"?"idea_approved":state==="production"?"production":state==="recording"?"recording":state==="review"?"review":"draft",caption:i.caption??"",material:i.driveUrl??""};})),[projects,decisions,ideaDecisions]);
 const [filter,setFilter]=useState("all"),[month,setMonth]=useState(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}),[selected,setSelected]=useState<string|null>(null);
 const [view,setView]=useState<"month"|"list"|"approvals">("month"),[channel,setChannel]=useState("all");
 const dialog=useRef<HTMLDialogElement>(null);
 const active=items.find(x=>x.id===selected);
 useEffect(()=>{if(!focusContentId)return;const match=items.find(x=>x.source.id===focusContentId);if(match){setSelected(match.id);onFocusHandled?.();}},[focusContentId,items,onFocusHandled]);
 useEffect(()=>{const d=dialog.current;if(selected&&!d?.open)d?.showModal();if(!selected&&d?.open)d.close();},[selected]);
 const close=()=>setSelected(null);
 const open=(id:string)=>setSelected(id);
 const [year,mm]=month.split("-").map(Number);
 const first=new Date(year,mm-1,1).getDay(),days=new Date(year,mm,0).getDate();
 const cells=Array.from({length:Math.ceil((first+days)/7)*7},(_,i)=>i-first+1);
 const channels=[...new Set(items.map(x=>x.channel).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
 const scoped=items.filter(x=>channel==="all"||x.channel===channel);
 const monthItems=scoped.filter(x=>x.date?.startsWith(month));
 const displayed=monthItems.filter(x=>matchesFilter(x,filter));
 const approvals=scoped.filter(x=>x.status==="idea_pending"||x.status==="awaiting");
 const byMonth=displayed.filter(x=>x.date.startsWith(month));
 const shift=(n:number)=>{const d=new Date(year,mm-1+n,1);setMonth(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));setFilter("all");};
 return <section className="rv-ui2-module rv-ui2-client-content-module rv-ui3-client-editorial space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E6ED] pb-3">
   <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Visualização de conteúdos">
    {([{id:"month",label:"Calendário"},{id:"list",label:"Lista"},{id:"approvals",label:"Aprovações"}] as const).map(tab=><button key={tab.id} type="button" aria-pressed={view===tab.id} onClick={()=>setView(tab.id)} className={`min-h-10 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium ${view===tab.id?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]"}`}>{tab.label}{tab.id==="approvals"&&<span className="ml-1 text-[11px] tabular-nums">{loadError?"—":approvals.length}</span>}</button>)}
   </div>
   <span className="text-xs text-[#687487]">Somente materiais compartilhados</span>
  </div>
  <div className="flex flex-wrap items-center gap-1 border-b border-[#E3E6ED] pb-3" role="group" aria-label="Filtrar conteúdos por canal">
   <button type="button" aria-pressed={channel==="all"} onClick={()=>setChannel("all")} className={`min-h-9 cursor-pointer rounded-lg px-3 text-xs font-medium ${channel==="all"?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]"}`}>Todos os canais</button>
   {channels.map(name=><button key={name} type="button" aria-pressed={channel===name} onClick={()=>setChannel(name)} className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium ${channel===name?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]"}`}><ContentTablerIcon name={channelIcon(name)} size={15}/>{name}</button>)}
  </div>
  {view!=="approvals"&&<div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2">
     <button type="button" aria-label="Mês anterior" onClick={()=>shift(-1)} className="min-h-9 min-w-9 rounded-lg border border-[#E3E6ED] text-[#687487] hover:bg-[#F6F7FB]">‹</button>
     <strong className="min-w-[135px] text-center text-xs font-semibold capitalize text-[#323647]">{new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(year,mm-1,1))}</strong>
     <button type="button" aria-label="Próximo mês" onClick={()=>shift(1)} className="min-h-9 min-w-9 rounded-lg border border-[#E3E6ED] text-[#687487] hover:bg-[#F6F7FB]">›</button>
    </div>
    <label className="text-xs text-[#687487]">Situação <select aria-label="Filtrar situação de conteúdos" value={filter} onChange={e=>setFilter(e.target.value)} className="ml-2 min-h-9 rounded-lg border border-[#E3E6ED] bg-white px-2 text-xs text-[#323647]">{filters.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   </div>}
  {view==="month"&&<div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-[#E3E6ED] bg-[#E3E6ED]">
   {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><span key={d} className="bg-[#F8F9FB] py-2 text-center text-[10px] font-medium text-[#687487]">{d}</span>)}
   {cells.map((day,i)=>{const date=month+"-"+String(day).padStart(2,"0");const rows=day>0&&day<=days?byMonth.filter(x=>x.date===date):[];return <div key={i} className="min-h-14 min-w-0 bg-white p-1 sm:min-h-24 sm:p-2">
    <span className="text-[11px] text-[#687487]">{day>0&&day<=days?day:""}</span>
    {rows.slice(0,2).map(x=><button key={x.id} type="button" title={x.title} onClick={()=>open(x.id)} className={`mt-1 flex w-full min-w-0 cursor-pointer items-center gap-1 overflow-hidden rounded px-1 py-1 text-left hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[#6C5CE7] ${statusColor[x.status]}`}><ContentTablerIcon name={channelIcon(x.channel)} size={13}/><span className="min-w-0 truncate text-[10px]">{x.title}</span></button>)}
    {rows.length>2&&<button type="button" aria-label={`Ver mais conteúdos de ${fmt(date)}`} onClick={()=>{setView("list");}} className="mt-1 text-[10px] font-medium text-[#5949D1]">+{rows.length-2} conteúdos</button>}
   </div>})}
  </div>}
  {view!=="month"&&<div className="border-y border-[#E3E6ED]">
   {(view==="approvals"?approvals:displayed).length?(view==="approvals"?approvals:displayed).slice().sort((a,b)=>a.date.localeCompare(b.date)).map(x=><button key={x.id} type="button" onClick={()=>open(x.id)} className="flex w-full flex-wrap items-center gap-3 border-b border-[#E3E6ED] px-2 py-3 text-left last:border-b-0 hover:bg-[#FAFBFE] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F6F7FB] text-[#687487]"><ContentTablerIcon name={channelIcon(x.channel)} size={17}/></span>
    <span className="min-w-0 flex-1"><strong className="block text-[13px] font-medium text-[#323647]">{x.title}</strong><span className="mt-1 block text-[11px] text-[#687487]">{x.channel} · {x.format} · {fmt(x.date)}</span></span>
    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${statusColor[x.status]}`}>{statuses[x.status]}</span>
   </button>):<p className="px-2 py-8 text-sm text-[#687487]">{view==="approvals"?"Nenhuma aprovação pendente neste canal.":"Nenhum conteúdo encontrado para este mês e filtro."}</p>}
  </div>}
  {view==="month"&&displayed.length===0&&<p className="py-3 text-xs text-[#687487]">Nenhum conteúdo neste período.</p>}
  <dialog ref={dialog} aria-labelledby="client-content-title" onClose={close} className="m-auto max-h-[90vh] w-[min(720px,calc(100%-24px))] overflow-y-auto rounded-2xl bg-white p-0 text-[#090D1C] shadow-2xl backdrop:bg-[#090D1C]/70">{active&&<><div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#E3E7F0] bg-white p-5 sm:p-6"><div><p className="flex items-center gap-2 text-xs font-semibold text-[#6D35F5]"><ContentTablerIcon name={channelIcon(active.channel)} size={18}/>{active.channel} · {active.format}</p><h2 id="client-content-title" className="mt-2 text-xl font-bold">{active.title}</h2><p className="mt-1 text-xs text-[#697386]">Publicação prevista para {fmt(active.date)}</p></div><button type="button" aria-label="Fechar" onClick={close} className="cursor-pointer rounded-lg border px-3 py-2">✕</button></div>
    <div className="space-y-5 p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[active.status]}`}>{statuses[active.status]}</span><span className="text-xs text-[#697386]">Versão {active.source.version||"não informada"}</span></div>{(active.source.ideaSummary||active.source.objective||active.source.audience||active.source.funnelStage||active.source.keyMessage||active.source.cta)&&<section className="rounded-xl border border-[#E3E7F0] p-4"><h3 className="text-sm font-bold">Sobre este conteúdo</h3>
 {active.source.ideaSummary&&<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#344056]">{active.source.ideaSummary}</p>}
 <div className="mt-3 grid gap-3 sm:grid-cols-2">{active.source.objective&&<div><p className="text-xs font-semibold text-[#697386]">Objetivo</p><p className="mt-1 text-sm">{active.source.objective}</p></div>}
 {active.source.audience&&<div><p className="text-xs font-semibold text-[#697386]">Público</p><p className="mt-1 text-sm">{active.source.audience}</p></div>}
 {active.source.funnelStage&&<div><p className="text-xs font-semibold text-[#697386]">Etapa do funil</p><p className="mt-1 text-sm">{active.source.funnelStage}</p></div>}
 {active.source.keyMessage&&<div><p className="text-xs font-semibold text-[#697386]">Mensagem principal</p><p className="mt-1 text-sm">{active.source.keyMessage}</p></div>}
 {active.source.cta&&<div><p className="text-xs font-semibold text-[#697386]">CTA</p><p className="mt-1 text-sm">{active.source.cta}</p></div>}</div></section>}{active.source.references?.some(ref=>ref.url.startsWith("https://"))&&<section className="rounded-xl border border-[#E3E7F0] p-4"><h3 className="flex items-center gap-2 text-sm font-bold"><ContentTablerIcon name="link" size={18}/>Referências criativas</h3><div className="mt-3 space-y-3">{active.source.references.filter(ref=>ref.url.startsWith("https://")).map((ref,i)=><div key={i} className="rounded-lg bg-[#F7F8FB] p-3"><a href={ref.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-semibold text-[#6D35F5]">Ver referência {i+1} ↗</a>{ref.note&&<p className="mt-1 whitespace-pre-wrap text-sm text-[#525B70]">{ref.note}</p>}</div>)}</div></section>}<section><h3 className="text-sm font-bold">Texto da publicação</h3><p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#F6F7FB] p-4 text-sm leading-7 text-[#344056]">{active.caption}</p></section><section className="rounded-xl border border-[#E3E7F0] p-4"><div className="flex items-center gap-2"><ContentTablerIcon name="link" size={19}/><h3 className="text-sm font-bold">Roteiro e materiais</h3></div><div className="mt-3 flex flex-wrap gap-4">{active.source.briefUrl?.startsWith("https://")&&<a href={active.source.briefUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#6D35F5]">Abrir roteiro/briefing ↗</a>}{active.material?.startsWith("https://")&&<a href={active.material} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#6D35F5]">Abrir material da publicação ↗</a>}</div>{!active.source.briefUrl&&!active.material&&<p className="mt-2 text-sm text-[#697386]">Materiais ainda não disponibilizados.</p>}</section>
    {ui3FallbackCollaborationEnabled()&&<ProjectConversation key={active.projectId+":"+active.id} projectId={active.projectId} resourceType="content" resourceId={active.source.id}/>}{!loadError&&<EditorialIdeaDecision key={"idea:"+active.id+active.source.version} projectId={active.projectId} item={active.source} onDecision={()=>setRevision(n=>n+1)}/>}{!loadError&&<EditorialDecision key={active.id+active.source.version} projectId={active.projectId} item={active.source} onDecision={()=>setRevision(n=>n+1)}/>}<details className="rounded-xl border border-[#E3E7F0] p-4"><summary className="cursor-pointer text-sm font-semibold">Histórico das versões</summary>{decisions.filter(d=>d.project_id===active.projectId&&d.content_id===active.source.id&&d.content_version!==(active.source.version??"")).map(d=><div key={d.content_version} className="mt-3 border-t border-[#E3E7F0] pt-3 text-sm"><p className="font-semibold">Versão {d.content_version} · {d.decision==="approved"?"Aprovada":"Ajustes solicitados"}</p><p className="mt-1 text-xs text-[#697386]">{new Date(d.decided_at).toLocaleString("pt-BR")}</p>{d.comment&&<p className="mt-2 whitespace-pre-wrap text-[#525B70]">{d.comment}</p>}</div>)}{!decisions.some(d=>d.project_id===active.projectId&&d.content_id===active.source.id&&d.content_version!==(active.source.version??""))&&<p className="mt-3 text-sm text-[#697386]">Nenhuma decisão de versão anterior.</p>}</details></div></>}</dialog>
 {loadError&&<p role="alert" className="text-sm text-red-700">{loadError}</p>}</section>;
}
