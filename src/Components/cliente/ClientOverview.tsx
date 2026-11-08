"use client";
import {useEffect,useState} from "react";
import {RotevoTablerIcon,type RotevoIconName} from "@/Components/RotevoTablerIcon";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
import {editorialChannelIcon} from "@/lib/editorial/channels";
import {supabase} from "@/lib/supabase";
import type {ClientWorkspace,PortalModule} from "@/lib/operations/model";
import type {ExecutionItem} from "./ProjectTimeline";
import type {EditorialItem} from "./EditorialCalendar";
import type {AgendaItem} from "@/Components/admin/OperationalAgenda";
import type {CampaignRecord} from "@/Components/admin/CampaignsHub";
import {balance,brl,displayDate,todayInBrazil,type ClientFinanceState} from "@/lib/finance/model";

type Project={id:string;title:string;status:string;updated_at:string;data:{planningStages?:{id:string;title:string;dueDate:string;status:string;visibleToClient?:boolean}[];executionTimeline?:ExecutionItem[];editorialCalendar?:EditorialItem[];operationalAgenda?:AgendaItem[];marketingCampaigns?:CampaignRecord[]}|null};
type Decision={project_id:string;content_id:string;content_version:string;decision:"approved"|"changes_requested";decided_at:string;comment?:string|null};
type Attention={title:string;meta:string;kind:"idea"|"final"|"finance";projectId?:string;contentId?:string;module:PortalModule};
const icon=(name:RotevoIconName,size=19)=><RotevoTablerIcon name={name} size={size} stroke={1.8}/>;
const monthLabel=(month:string)=>new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(Number(month.slice(0,4)),Number(month.slice(5))-1,1));
const statClass="rounded-2xl border border-[#E3E8F0] bg-white px-4 py-4 sm:px-5";
const linkClass="cursor-pointer text-xs font-semibold text-[#6533CF] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D35F5]";


export default function ClientOverview({projects,workspace,onNavigate,clientName}:{projects:Project[];workspace:ClientWorkspace;clientName?:string;onNavigate:(module:PortalModule,projectId?:string,contentId?:string)=>void}){
 const allowed=(module:PortalModule)=>workspace.modules.includes(module);
 const [month,setMonth]=useState(()=>todayInBrazil().slice(0,7));
 const [result,setResult]=useState<{key:string;final:Decision[];ideas:Decision[];failed:boolean}|null>(null);
 const [finance,setFinance]=useState<ClientFinanceState|null>(null);
 const [financeError,setFinanceError]=useState(false);
 const decisionKey=projects.map(x=>x.id).sort().join("|")+":"+String(allowed("content"));
 const approvalsLoading=allowed("content")&&projects.length>0&&result?.key!==decisionKey;
 const approvalsFailed=allowed("content")&&result?.key===decisionKey&&result.failed;
 const final=result?.key===decisionKey?result.final:[];
 const ideas=result?.key===decisionKey?result.ideas:[];

 useEffect(()=>{
  let active=true;
  const ids=projects.map(p=>p.id);
  if(allowed("content")&&ids.length){
   void (async()=>{
    const [a,b]=await Promise.all([
     supabase.from("editorial_approvals").select("project_id,content_id,content_version,decision,decided_at,comment").in("project_id",ids),
     supabase.from("editorial_idea_approvals").select("project_id,content_id,content_version,decision,decided_at,comment").in("project_id",ids)
    ]);
    if(active)setResult({key:decisionKey,final:(a.data??[]) as Decision[],ideas:(b.data??[]) as Decision[],failed:!!a.error||!!b.error});
   })();
  }else if(active)setResult({key:decisionKey,final:[],ideas:[],failed:false});
  if(allowed("finance"))void import("@/lib/finance/api").then(x=>x.financeRequest(true)).then(value=>{if(active)setFinance(value)}).catch(()=>{if(active)setFinanceError(true)});
  return()=>{active=false};
 },[decisionKey,projects,workspace]);

 const publishedContent=allowed("content")?projects.flatMap(p=>(p.data?.editorialCalendar??[]).filter(i=>i.visibleToClient===true).map(i=>({...i,projectId:p.id}))):[];
 const monthContent=publishedContent.filter(i=>i.publishDate?.slice(0,7)===month);
 const hasDecision=(rows:Decision[],item:(typeof publishedContent)[number],type?:"approved"|"changes_requested")=>rows.some(d=>d.project_id===item.projectId&&d.content_id===item.id&&d.content_version===(item.version??"")&&(!type||d.decision===type));
 const pendingIdeas=publishedContent.filter(i=>i.status==="idea_pending"&&!hasDecision(ideas,i));
 const pendingFinal=publishedContent.filter(i=>i.status==="awaiting_client"&&!hasDecision(final,i));
 const contentAttention:Attention[]=!approvalsLoading&&!approvalsFailed?[
  ...pendingIdeas.map(i=>({title:i.title,meta:i.channel+" · "+i.format+" · Aprovação de ideia · Versão "+(i.version||"não informada"),kind:"idea" as const,projectId:i.projectId,contentId:i.id,module:"content" as const})),
  ...pendingFinal.map(i=>({title:i.title,meta:i.channel+" · "+i.format+" · Aprovação final · Versão "+(i.version||"não informada"),kind:"final" as const,projectId:i.projectId,contentId:i.id,module:"content" as const}))
 ]:[];
 const invoices=finance?.invoices.filter(i=>!i.cancelled&&balance(i)>0)??[];
 const financeAttention:Attention[]=allowed("finance")?invoices.filter(i=>i.due_date<todayInBrazil()).map(i=>({title:"Mensalidade vencida: "+i.title,meta:brl(balance(i))+" · pagamento pendente",kind:"finance" as const,module:"finance" as const})):[];
 const attention=[...contentAttention,...financeAttention];
 const tasks=allowed("execution")?projects.flatMap(p=>(p.data?.executionTimeline??[]).filter(t=>t.visibleToClient===true).map(t=>({...t,projectId:p.id}))):[];
 const completed=tasks.filter(t=>t.status==="completed").length;
 const progress=tasks.length?Math.round(completed/tasks.length*100):0;
 const today=todayInBrazil();
 const nextTask=[...tasks].filter(t=>!["completed","cancelled"].includes(t.status??"planned")&&t.dueDate).sort((a,b)=>(a.dueDate??"").localeCompare(b.dueDate??""))[0];
 const campaigns=allowed("campaigns")?projects.flatMap(p=>(p.data?.marketingCampaigns??[]).filter(i=>i.visibleToClient===true).map(i=>({...i,projectId:p.id}))):[];
 const activeCampaigns=campaigns.filter(c=>c.status==="active");
 const nextMeetings=allowed("meetings")?projects.flatMap(p=>(p.data?.operationalAgenda??[]).filter(m=>m.visibleToClient===true&&m.status==="planned"&&m.date>=today).map(m=>({...m,projectId:p.id}))).sort((a,b)=>(a.date+"T"+(a.time||"23:59")).localeCompare(b.date+"T"+(b.time||"23:59"))):[];
 const stageCounts=[
  {label:"Ideias",value:monthContent.filter(i=>i.status==="idea"||i.status==="idea_pending").length},
  {label:"Produção",value:monthContent.filter(i=>["idea_approved","production","recording","review"].includes(i.status)||hasDecision(ideas,i,"approved")&&i.status==="idea_pending").length},
  {label:"Aprovação",value:monthContent.filter(i=>i.status==="awaiting_client"&&!hasDecision(final,i)).length},
  {label:"Agendados",value:monthContent.filter(i=>i.status==="scheduled").length},
  {label:"Publicados",value:monthContent.filter(i=>i.status==="published").length}
 ];
 const events=(!approvalsLoading&&!approvalsFailed?[...ideas.map(d=>({...d,kind:"Ideia"})),...final.map(d=>({...d,kind:"Material final"}))]:[])
  .filter(d=>publishedContent.some(i=>i.projectId===d.project_id&&i.id===d.content_id))
  .sort((a,b)=>b.decided_at.localeCompare(a.decided_at)).slice(0,3);
 const mostRecent=[...projects].sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
 const shiftMonth=(delta:number)=>setMonth(prev=>{const y=Number(prev.slice(0,4)),m=Number(prev.slice(5));const next=new Date(y,m-1+delta,1);return next.getFullYear()+"-"+String(next.getMonth()+1).padStart(2,"0")});
 const focus=nextTask?.title??activeCampaigns[0]?.title??(contentAttention.length?"Ideias e materiais aguardando validação":null);
 const nextMove=contentAttention.length?"Sua avaliação permite avançar com os conteúdos compartilhados.":nextTask?"Acompanhe a próxima entrega registrada no plano de execução.":activeCampaigns[0]?.nextStep??null;
 const projectUpdate=[...projects].sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
 const hasExecutionData=tasks.length>0;
 const visibleCampaigns=activeCampaigns.length>0;
 const statusTone=["#AE84FA","#5C8EE7","#E7AB42","#31A27A","#0B142A"];

 return <div className="space-y-4 pb-5">
  <header className="flex flex-wrap items-center justify-between gap-4">
   <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8490A4]">Portal do cliente / Painel executivo</p>
    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#11182B] sm:text-3xl">Visão geral do projeto</h2>
    <p className="mt-1 text-sm text-[#69778E]">{clientName||"Seu espaço de acompanhamento"} · Entregas, decisões e próximos movimentos.</p>
   </div>
   {allowed("content")&&<div className="flex items-center gap-2 rounded-xl border border-[#E3E8F0] bg-white p-1.5" aria-label="Período dos conteúdos e publicações">
    <button type="button" onClick={()=>shiftMonth(-1)} aria-label="Mês anterior" className="cursor-pointer rounded-lg bg-[#F1F3F8] px-3 py-2 text-sm hover:bg-[#E9EAF4]">‹</button>
    <span className="min-w-[118px] text-center text-xs font-semibold capitalize">{monthLabel(month)}</span>
    <button type="button" onClick={()=>shiftMonth(1)} aria-label="Próximo mês" className="cursor-pointer rounded-lg bg-[#F1F3F8] px-3 py-2 text-sm hover:bg-[#E9EAF4]">›</button>
   </div>}
  </header>
  <section className="relative overflow-hidden rounded-2xl bg-[#0B142A] px-5 py-6 text-white sm:px-7 sm:py-7">
   <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10 shadow-[0_0_0_48px_rgba(255,255,255,0.025),0_0_0_96px_rgba(255,255,255,0.015)]"/>
   <div className="relative space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#ADE60A]">Panorama do projeto</p><p className="text-xs text-[#BCC7DB]">{projectUpdate?"Última atualização registrada: "+new Date(projectUpdate.updated_at).toLocaleDateString("pt-BR"):"Informações compartilhadas pela Rotevo"}</p></div>
    <div><h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">{focus?"O que está em foco":"Acompanhamento do projeto"}</h3>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D4DEEB]">{focus??"As próximas entregas e decisões aparecerão aqui conforme forem registradas e compartilhadas."}</p></div>
    {nextMove&&<div className="max-w-3xl border-t border-white/15 pt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#ADE60A]">Próximo movimento</p><p className="mt-1 text-sm text-[#E2E9F3]">{nextMove}</p></div>}
    <div className="flex flex-wrap gap-3">{allowed("content")&&contentAttention.length>0&&<button type="button" onClick={()=>onNavigate("content",contentAttention[0].projectId,contentAttention[0].contentId)} className="cursor-pointer rounded-lg bg-[#ADE60A] px-4 py-2 text-xs font-extrabold text-[#0B142A] hover:bg-[#C4EF50]">Revisar conteúdo pendente ↗</button>}{hasExecutionData&&<button type="button" onClick={()=>onNavigate("execution",nextTask?.projectId)} className="cursor-pointer rounded-lg border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">Ver execução ↗</button>}</div>
   </div>
  </section>
  {(allowed("content")||hasExecutionData)&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
   {[
    ...(allowed("content")?[{label:"Conteúdos do mês",value:String(monthContent.length).padStart(2,"0"),note:monthLabel(month),tone:"#6D35F5",go:"content" as const},
      {label:"Aguardando sua decisão",value:approvalsLoading?"…":approvalsFailed?"—":contentAttention.length.toString().padStart(2,"0"),note:"Pendências de todos os meses",tone:"#E8AD3C",go:"content" as const}]:[]),
    ...(hasExecutionData?[{label:"Entregas concluídas",value:completed+"/"+tasks.length,note:"Plano de execução compartilhado",tone:"#3D8AD8",go:"execution" as const}]:[])
   ].map(card=><button type="button" key={card.label} onClick={()=>onNavigate(card.go)} className={statClass+" cursor-pointer text-left transition-colors hover:border-[#C9B5FC]"}><div className="mb-3 h-[3px] w-9 rounded-full" style={{backgroundColor:card.tone}}/><p className="text-xs font-semibold text-[#65738A]">{card.label}</p><strong className="mt-2 block text-3xl font-extrabold tracking-tight">{card.value}</strong><p className="mt-1 text-xs text-[#758198]">{card.note}</p></button>)}
  </div>}
  <div className={"grid items-stretch gap-4 "+(hasExecutionData?"xl:grid-cols-[1.12fr_.88fr]":"grid-cols-1")}>
   {(allowed("content")||allowed("finance"))&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-base font-extrabold">{icon("alert-circle",19)} Precisa da sua atenção</h3>{attention.length>0&&<span className="rounded-full bg-[#FFF2D8] px-3 py-1 text-[11px] font-bold text-[#9C6710]">{attention.length} pendência(s)</span>}</div>
    {attention.length?<div className="mt-4 space-y-2.5">{attention.slice(0,6).map((item,i)=><div key={item.contentId??item.title+":"+i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8ECF3] p-3.5">
     <div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center gap-2">{item.kind!=="finance"?<ContentTablerIcon name={editorialChannelIcon(publishedContent.find(x=>x.id===item.contentId&&x.projectId===item.projectId)?.channel??"")} size={15}/>:icon("currency-dollar",15)}<span className="text-[10px] font-bold uppercase text-[#8F729B]">{item.kind==="idea"?"Ideia para aprovação":item.kind==="final"?"Material para aprovação":"Financeiro"}</span></div>
      <p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#7A8598]">{item.meta}</p></div>
     <button type="button" onClick={()=>onNavigate(item.module,item.projectId,item.contentId)} className="cursor-pointer rounded-lg border border-[#D8CBF9] bg-[#F3EEFF] px-3 py-2 text-xs font-bold text-[#6133C6] hover:bg-[#E9DEFF]">{item.kind==="idea"?"Revisar ideia":item.kind==="final"?"Revisar material":"Ver cobrança"} ↗</button></div>)}</div>:
     <p className="mt-4 rounded-xl bg-[#F7F8FB] p-4 text-sm text-[#758198]">{approvalsLoading?"Conferindo aprovações…":approvalsFailed||financeError?"Algumas pendências não puderam ser verificadas. Consulte o módulo correspondente.":"Nenhuma ação pendente identificada nos registros compartilhados."}</p>}
    {attention.length>6&&<p className="mt-3 text-xs text-[#697386]">Há mais pendências. Consulte os módulos correspondentes.</p>}
   </section>}
   {hasExecutionData&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5 sm:p-6">
    <div className="flex justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-extrabold">{icon("chart-dots-3",19)} Andamento da execução</h3><span className="text-[11px] text-[#7E899A]">Plano de ação</span></div>
    <div className="mt-6 flex items-end justify-between"><div><p className="text-xs text-[#77839A]">Entregas compartilhadas</p><strong className="mt-1 block text-2xl font-extrabold">{tasks.length?progress+"%":"Sem dados"}</strong></div><p className="text-xs font-semibold text-[#697386]">{completed} de {tasks.length}</p></div>
    <div role="progressbar" aria-label="Progresso das entregas compartilhadas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-[#E9EDF5]"><div className="h-full rounded-full bg-[#6D35F5]" style={{width:progress+"%"}}/></div>
    {nextTask?<div className="mt-5 rounded-xl border-l-4 border-[#6D35F5] bg-[#F7F8FB] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#79849B]">Próxima entrega registrada</p><p className="mt-1 text-sm font-semibold">{nextTask.title}</p><p className="mt-1 text-xs text-[#758198]">{nextTask.dueDate&&nextTask.dueDate<today?"Prazo em revisão · ":""}{displayDate(nextTask.dueDate??"")}</p></div>:
      <p className="mt-5 rounded-xl bg-[#F7F8FB] p-4 text-sm text-[#697386]">Nenhuma próxima entrega com data definida.</p>}
    <button type="button" onClick={()=>onNavigate("execution",nextTask?.projectId)} className={"mt-4 "+linkClass}>Ver plano de execução ↗</button>
   </section>}
  </div>
  <div className={"grid gap-4 "+(visibleCampaigns?"xl:grid-cols-2":"grid-cols-1")}>
   {allowed("content")&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-extrabold">{icon("calendar",19)} Produção editorial</h3><span className="text-[11px] capitalize text-[#7B879B]">{monthLabel(month)}</span></div>
    <p className="mt-2 text-xs text-[#718096]">Panorama dos conteúdos previstos no período.</p>
    {monthContent.length?<><div className="mt-6 grid grid-cols-5 gap-2">{stageCounts.map((s,i)=><div key={s.label} className="min-w-0"><div className="mb-2 h-1.5 rounded-full" style={{backgroundColor:s.value>0?statusTone[i]:"#E8EDF5"}}/><strong className="block text-lg font-extrabold">{s.value}</strong><span className="mt-1 block break-words text-[10px] text-[#738097]">{s.label}</span></div>)}</div><p className="mt-5 text-xs text-[#64738A]">{monthContent.length} conteúdo(s) no mês selecionado.</p></>:
      <p className="mt-5 rounded-xl bg-[#F7F8FB] p-5 text-sm text-[#758198]">Nenhuma publicação compartilhada neste mês.</p>}
    <button type="button" onClick={()=>onNavigate("content")} className={"mt-5 "+linkClass}>Abrir calendário editorial ↗</button>
   </section>}
   {allowed("campaigns")&&visibleCampaigns&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5 sm:p-6">
    <h3 className="flex items-center gap-2 text-base font-extrabold">{icon("rocket",19)} Campanhas e iniciativas</h3>
    <div className="mt-6 flex items-center gap-4"><strong className="text-4xl font-extrabold tracking-tight">{String(activeCampaigns.length).padStart(2,"0")}</strong><span className="text-xs text-[#718096]">Campanhas ativas<br/>compartilhadas</span></div>
    {activeCampaigns.length?<div className="mt-4 space-y-2">{activeCampaigns.slice(0,2).map(c=><div key={c.id} className="rounded-xl bg-[#F7F8FB] p-3"><p className="text-sm font-semibold">{c.title}</p>{c.nextStep&&<p className="mt-1 text-xs text-[#758198]">Próximo movimento: {c.nextStep}</p>}</div>)}</div>:
      <p className="mt-4 text-sm leading-6 text-[#758198]">Nenhuma campanha ativa compartilhada neste momento.</p>}
    <button type="button" onClick={()=>onNavigate("campaigns")} className={"mt-5 "+linkClass}>Ver campanhas ↗</button>
   </section>}
  </div>
  {(nextMeetings.length>0||invoices.length>0||events.length>0||mostRecent)&&<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
   {allowed("meetings")&&nextMeetings.length>0&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5">
    <span className="inline-flex rounded-lg bg-[#F1EBFF] p-2 text-[#6934CD]">{icon("calendar",21)}</span><h3 className="mt-3 text-sm font-extrabold">Próximas reuniões</h3>
    {nextMeetings[0]?<><p className="mt-2 text-sm font-semibold">{nextMeetings[0].title}</p><p className="mt-1 text-xs text-[#77849A]">{displayDate(nextMeetings[0].date)}{nextMeetings[0].time?" · "+nextMeetings[0].time:""}</p></>:<p className="mt-2 text-xs leading-5 text-[#718096]">Nenhuma reunião futura compartilhada.</p>}
    <button type="button" onClick={()=>onNavigate("meetings")} className={"mt-4 "+linkClass}>Ver agenda ↗</button>
   </section>}
   {allowed("finance")&&(invoices.length>0||financeError)&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5">
    <span className="inline-flex rounded-lg bg-[#F1EBFF] p-2 text-[#6934CD]">{icon("currency-dollar",21)}</span><h3 className="mt-3 text-sm font-extrabold">Financeiro</h3>
    <p className="mt-2 text-xs leading-5 text-[#718096]">{financeError?"Consulta financeira indisponível.":!finance?"Consultando lançamentos…":invoices.length?invoices.length+" lançamento(s) em aberto.":"Nenhum lançamento pendente identificado."}</p>
    <button type="button" onClick={()=>onNavigate("finance")} className={"mt-4 "+linkClass}>Ver financeiro ↗</button>
   </section>}
   <section className="rounded-2xl border border-[#E3E8F0] bg-white p-5">
    <span className="inline-flex rounded-lg bg-[#F1EBFF] p-2 text-[#6934CD]">{icon("clock",21)}</span><h3 className="mt-3 text-sm font-extrabold">Últimas movimentações</h3>
    {events.length?<div className="mt-3 space-y-3">{events.map((e,i)=><button type="button" key={i} onClick={()=>onNavigate("content",e.project_id,e.content_id)} className="block w-full cursor-pointer text-left"><span className="text-xs font-semibold">{e.kind}: {e.decision==="approved"?"aprovada":"ajustes solicitados"}</span><span className="mt-1 block text-[11px] text-[#77849A]">{new Date(e.decided_at).toLocaleDateString("pt-BR")}</span></button>)}</div>:
      <p className="mt-2 text-xs leading-5 text-[#718096]">{approvalsLoading?"Consultando histórico…":approvalsFailed?"Não foi possível consultar decisões.":mostRecent?"Projeto "+mostRecent.title+" atualizado em "+new Date(mostRecent.updated_at).toLocaleDateString("pt-BR"):"Nenhuma movimentação compartilhada."}</p>}
    {allowed("content")&&<button type="button" onClick={()=>onNavigate("content")} className={"mt-4 "+linkClass}>Ver conteúdos ↗</button>}
   </section>
  </div>}
 </div>;
}
