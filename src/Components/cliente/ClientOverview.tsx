"use client";
import {useEffect,useMemo,useState} from "react";
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
const clamp=(value:string,length=120)=>value.length>length?value.slice(0,length-1)+"…":value;

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
 const firstName=(clientName??"").trim().split(/\s+/)[0];
 const primaryFocus=nextTask?.title??activeCampaigns[0]?.title??(pendingIdeas.length||pendingFinal.length?"Validação das propostas e materiais editoriais":"Acompanhamento das entregas do projeto");
 const firstProject=projects[0];

 return <div className="space-y-4 pb-5">
  <header className="flex flex-wrap items-center justify-between gap-4">
   <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8490A4]">Portal do cliente / Painel executivo</p>
    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#11182B] sm:text-3xl">{firstName?"Olá, "+firstName+".":"Seu espaço de acompanhamento."}</h2>
    <p className="mt-1 text-sm text-[#69778E]">Veja o que avançou e o que precisa da sua atenção.</p>
   </div>
   {allowed("content")&&<div className="flex items-center gap-2 rounded-xl border border-[#E3E8F0] bg-white p-1.5" aria-label="Período dos indicadores editoriais">
    <button type="button" onClick={()=>shiftMonth(-1)} aria-label="Mês anterior" className="cursor-pointer rounded-lg bg-[#F1F3F8] px-3 py-2 text-sm hover:bg-[#E9EAF4]">‹</button>
    <span className="min-w-[118px] text-center text-xs font-semibold capitalize">{monthLabel(month)}</span>
    <button type="button" onClick={()=>shiftMonth(1)} aria-label="Próximo mês" className="cursor-pointer rounded-lg bg-[#F1F3F8] px-3 py-2 text-sm hover:bg-[#E9EAF4]">›</button>
   </div>}
  </header>
  <section className="relative overflow-hidden rounded-2xl bg-[#0B142A] px-5 py-6 text-white sm:px-7 sm:py-7">
   <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10 shadow-[0_0_0_48px_rgba(255,255,255,0.025),0_0_0_96px_rgba(255,255,255,0.015)]"/>
   <div className="relative grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#ADE60A]">Direção e acompanhamento</p>
     <h3 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">{firstProject?"Estratégia em movimento.":"Bem-vindo ao seu espaço."}</h3>
     <p className="mt-2 max-w-xl text-sm leading-6 text-[#CFD7E6]">{firstProject?"Prioridade registrada: "+clamp(primaryFocus,145):"As informações do projeto aparecerão assim que forem compartilhadas."}</p>
     {allowed("execution")&&<button type="button" onClick={()=>onNavigate("execution",nextTask?.projectId)} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-[#ADE60A] hover:bg-white/10">Ver execução {icon("chart-dots-3",16)}</button>}
    </div>
    {allowed("content")&&!approvalsFailed&&<div className="relative flex min-w-32 flex-col items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-center">
     <strong className="text-4xl font-extrabold tracking-tight text-[#ADE60A]">{approvalsLoading?"…":contentAttention.length.toString().padStart(2,"0")}</strong><span className="mt-2 text-xs leading-5 text-[#D4DEEB]">conteúdos aguardando<br/>sua decisão</span>
    </div>}
   </div>
  </section>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
   {[
    ...(allowed("content")?[{label:"Aprovações pendentes",value:approvalsLoading?"…":approvalsFailed?"—":contentAttention.length.toString().padStart(2,"0"),note:"Em todos os meses",tone:"#E8AD3C",go:"content" as const},
      {label:"Conteúdos do mês",value:String(monthContent.length).padStart(2,"0"),note:monthLabel(month),tone:"#6D35F5",go:"content" as const}]:[]),
    ...(allowed("execution")?[{label:"Entregas concluídas",value:tasks.length?completed+"/"+tasks.length:"—",note:tasks.length?"Do plano de execução":"Sem entregas compartilhadas",tone:"#3D8AD8",go:"execution" as const}]:[]),
    ...(allowed("content")?[{label:"Publicações agendadas",value:String(stageCounts[3].value).padStart(2,"0"),note:"No mês selecionado",tone:"#299E74",go:"content" as const}]:[]),
    ...(!allowed("content")&&allowed("campaigns")?[{label:"Campanhas ativas",value:String(activeCampaigns.length),note:"Compartilhadas pela equipe",tone:"#6D35F5",go:"campaigns" as const}]:[])
   ].map(card=><button type="button" key={card.label} onClick={()=>onNavigate(card.go)} className={statClass+" cursor-pointer text-left transition-colors hover:border-[#C9B5FC]"}><div className="mb-3 h-[3px] w-9 rounded-full" style={{backgroundColor:card.tone}}/><p className="text-xs font-semibold text-[#65738A]">{card.label}</p><strong className="mt-2 block text-3xl font-extrabold tracking-tight">{card.value}</strong><p className="mt-1 text-[11px] text-[#8591A2]">{card.note}</p></button>)}
  </div>
  <div className="grid items-stretch gap-4 xl:grid-cols-[1.12fr_.88fr]">
   {(allowed("content")||allowed("finance"))&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-base font-extrabold">{icon("alert-circle",19)} Precisa da sua atenção</h3>{attention.length>0&&<span className="rounded-full bg-[#FFF2D8] px-3 py-1 text-[11px] font-bold text-[#9C6710]">{attention.length} pendência(s)</span>}</div>
    {attention.length?<div className="mt-4 space-y-2.5">{attention.slice(0,6).map((item,i)=><div key={item.contentId??item.title+":"+i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8ECF3] p-3.5">
     <div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center gap-2">{item.kind!=="finance"?<ContentTablerIcon name={editorialChannelIcon(publishedContent.find(x=>x.id===item.contentId&&x.projectId===item.projectId)?.channel??"")} size={15}/>:icon("currency-dollar",15)}<span className="text-[10px] font-bold uppercase text-[#8F729B]">{item.kind==="idea"?"Ideia para aprovação":item.kind==="final"?"Material para aprovação":"Financeiro"}</span></div>
      <p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#7A8598]">{item.meta}</p></div>
     <button type="button" onClick={()=>onNavigate(item.module,item.projectId,item.contentId)} className="cursor-pointer rounded-lg border border-[#D8CBF9] bg-[#F3EEFF] px-3 py-2 text-xs font-bold text-[#6133C6] hover:bg-[#E9DEFF]">Analisar ↗</button></div>)}</div>:
     <p className="mt-4 rounded-xl bg-[#F7F8FB] p-4 text-sm text-[#758198]">{approvalsLoading?"Conferindo aprovações…":approvalsFailed||financeError?"Algumas pendências não puderam ser verificadas. Consulte o módulo correspondente.":"Nenhuma ação pendente identificada nos registros compartilhados."}</p>}
    {attention.length>6&&<p className="mt-3 text-xs text-[#697386]">Há mais pendências. Consulte os módulos correspondentes.</p>}
   </section>}
   {allowed("execution")&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5 sm:p-6">
    <div className="flex justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-extrabold">{icon("chart-dots-3",19)} Andamento da execução</h3><span className="text-[11px] text-[#7E899A]">Plano de ação</span></div>
    <div className="mt-6 flex items-end justify-between"><div><p className="text-xs text-[#77839A]">Entregas compartilhadas</p><strong className="mt-1 block text-2xl font-extrabold">{tasks.length?progress+"%":"Sem dados"}</strong></div><p className="text-xs font-semibold text-[#697386]">{completed} de {tasks.length}</p></div>
    <div role="progressbar" aria-label="Progresso das entregas compartilhadas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-[#E9EDF5]"><div className="h-full rounded-full bg-[#6D35F5]" style={{width:progress+"%"}}/></div>
    {nextTask?<div className="mt-5 rounded-xl border-l-4 border-[#6D35F5] bg-[#F7F8FB] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#79849B]">Próxima entrega registrada</p><p className="mt-1 text-sm font-semibold">{nextTask.title}</p><p className="mt-1 text-xs text-[#758198]">{nextTask.dueDate&&nextTask.dueDate<today?"Prazo em revisão · ":""}{displayDate(nextTask.dueDate??"")}</p></div>:
      <p className="mt-5 rounded-xl bg-[#F7F8FB] p-4 text-sm text-[#697386]">Nenhuma próxima entrega com data definida.</p>}
    <button type="button" onClick={()=>onNavigate("execution",nextTask?.projectId)} className={"mt-4 "+linkClass}>Ver plano de execução ↗</button>
   </section>}
  </div>
  <div className="grid gap-4 xl:grid-cols-2">
   {allowed("content")&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-extrabold">{icon("brand-instagram",19)} Produção editorial</h3><span className="text-[11px] capitalize text-[#7B879B]">{monthLabel(month)}</span></div>
    <p className="mt-2 text-xs text-[#718096]">Panorama dos conteúdos previstos no período.</p>
    {monthContent.length?<><div className="mt-6 grid grid-cols-5 gap-2">{stageCounts.map((s,i)=><div key={s.label} className="min-w-0"><div className={"mb-2 h-2 rounded-full "+(i===0?"bg-[#9E75F7]":"bg-[#EBEFF6]")}/><strong className="block text-lg font-extrabold">{s.value}</strong><span className="mt-1 block break-words text-[10px] text-[#738097]">{s.label}</span></div>)}</div><p className="mt-5 text-xs text-[#7B879B]">{monthContent.length} conteúdo(s) no mês selecionado.</p></>:
      <p className="mt-5 rounded-xl bg-[#F7F8FB] p-5 text-sm text-[#758198]">Nenhuma publicação compartilhada neste mês.</p>}
    <button type="button" onClick={()=>onNavigate("content")} className={"mt-5 "+linkClass}>Abrir calendário editorial ↗</button>
   </section>}
   {allowed("campaigns")&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5 sm:p-6">
    <h3 className="flex items-center gap-2 text-base font-extrabold">{icon("rocket",19)} Campanhas e iniciativas</h3>
    <div className="mt-6 flex items-center gap-4"><strong className="text-4xl font-extrabold tracking-tight">{String(activeCampaigns.length).padStart(2,"0")}</strong><span className="text-xs text-[#718096]">Campanhas ativas<br/>compartilhadas</span></div>
    {activeCampaigns.length?<div className="mt-4 space-y-2">{activeCampaigns.slice(0,2).map(c=><div key={c.id} className="rounded-xl bg-[#F7F8FB] p-3"><p className="text-sm font-semibold">{c.title}</p>{c.nextStep&&<p className="mt-1 text-xs text-[#758198]">Próximo movimento: {c.nextStep}</p>}</div>)}</div>:
      <p className="mt-4 text-sm leading-6 text-[#758198]">Nenhuma campanha ativa compartilhada neste momento.</p>}
    <button type="button" onClick={()=>onNavigate("campaigns")} className={"mt-5 "+linkClass}>Ver campanhas ↗</button>
   </section>}
  </div>
  {(allowed("meetings")||allowed("finance")||events.length>0||mostRecent)&&<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
   {allowed("meetings")&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5">
    <span className="inline-flex rounded-lg bg-[#F1EBFF] p-2 text-[#6934CD]">{icon("calendar",21)}</span><h3 className="mt-3 text-sm font-extrabold">Próximas reuniões</h3>
    {nextMeetings[0]?<><p className="mt-2 text-sm font-semibold">{nextMeetings[0].title}</p><p className="mt-1 text-xs text-[#77849A]">{displayDate(nextMeetings[0].date)}{nextMeetings[0].time?" · "+nextMeetings[0].time:""}</p></>:<p className="mt-2 text-xs leading-5 text-[#718096]">Nenhuma reunião futura compartilhada.</p>}
    <button type="button" onClick={()=>onNavigate("meetings")} className={"mt-4 "+linkClass}>Ver agenda ↗</button>
   </section>}
   {allowed("finance")&&<section className="rounded-2xl border border-[#E3E8F0] bg-white p-5">
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
