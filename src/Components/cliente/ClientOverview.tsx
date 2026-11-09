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
 const today=todayInBrazil();
 const nextTask=[...tasks].filter(t=>!["completed","cancelled"].includes(t.status??"planned")&&t.dueDate).sort((a,b)=>(a.dueDate??"").localeCompare(b.dueDate??""))[0];
 const campaigns=allowed("campaigns")?projects.flatMap(p=>(p.data?.marketingCampaigns??[]).filter(i=>i.visibleToClient===true).map(i=>({...i,projectId:p.id}))):[];
 const activeCampaigns=campaigns.filter(c=>c.status==="active");
 const nextMeetings=allowed("meetings")?projects.flatMap(p=>(p.data?.operationalAgenda??[]).filter(m=>m.visibleToClient===true&&m.status==="planned"&&m.date>=today).map(m=>({...m,projectId:p.id}))).sort((a,b)=>(a.date+"T"+(a.time||"23:59")).localeCompare(b.date+"T"+(b.time||"23:59"))):[];

 const campaignCount=activeCampaigns.length;
 const meetingsMonth=nextMeetings.filter(m=>m.date.startsWith(month));
 const monthEntries=[
  ...monthContent.filter(x=>x.publishDate).map(x=>({key:"content:"+x.projectId+":"+x.id,date:x.publishDate??"",title:x.title,kind:"Conteúdo",kindId:"content" as PortalModule,projectId:x.projectId,contentId:x.id})),
  ...tasks.filter(x=>x.dueDate?.slice(0,7)===month).map(x=>({key:"execution:"+x.projectId+":"+x.id,date:x.dueDate??"",title:x.title,kind:"Entrega",kindId:"execution" as PortalModule,projectId:x.projectId,contentId:undefined as string|undefined})),
  ...meetingsMonth.map(x=>({key:"meeting:"+x.projectId+":"+x.id,date:x.date,title:x.title,kind:"Reunião",kindId:"meetings" as PortalModule,projectId:x.projectId,contentId:undefined as string|undefined}))
 ].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
 const events=(!approvalsLoading&&!approvalsFailed?[...ideas.map(d=>({...d,phase:"Ideia"})),...final.map(d=>({...d,phase:"Material final"}))]:[])
   .filter(d=>publishedContent.some(i=>i.projectId===d.project_id&&i.id===d.content_id))
   .sort((a,b)=>b.decided_at.localeCompare(a.decided_at)).slice(0,4);
 const mostRecent=[...projects].sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
 const shiftMonth=(delta:number)=>setMonth(prev=>{const y=Number(prev.slice(0,4)),m=Number(prev.slice(5));const next=new Date(y,m-1+delta,1);return next.getFullYear()+"-"+String(next.getMonth()+1).padStart(2,"0")});
 const card="rv-ui3-client-overview-panel bg-white py-4";
 const actionLabel=(item:Attention)=>item.kind==="idea"?"Revisar ideia":item.kind==="final"?"Revisar material":"Ver cobrança";
 return <div className="rv-ui2-module rv-ui2-client-overview space-y-4 pb-5">
  <div className="space-y-2">
   {(allowed("content")||allowed("finance"))&&<section className={card+" min-w-0"}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[#323647]"><span className="text-[#D99523]">{icon("alert-circle",22)}</span>Precisa da sua atenção</h2><span className="rounded-lg bg-[#FFF5E5] px-2 py-1 text-[11px] font-semibold text-[#966017]">{approvalsLoading?"…":attention.length+" pendência(s)"}</span></div>
    {attention.length?<div className="mt-4 space-y-2.5">{attention.slice(0,5).map((a,i)=><div key={a.contentId??a.title+":"+i} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E6ED] py-3 last:border-b-0 hover:bg-[#FAFBFE]">
     <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#1A2640]">{a.title}</p><p className="mt-1 text-xs text-[#78859B]">{a.meta}</p></div><button type="button" onClick={()=>onNavigate(a.module,a.projectId,a.contentId)} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-medium text-[#5949D1] hover:bg-[#EDEAFF] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"><span className="inline-flex items-center gap-1.5"><ContentTablerIcon name="eye" size={16}/>{actionLabel(a)}</span></button>
    </div>)}</div>:<p className="mt-3 border-t border-[#E3E6ED] py-4 text-sm text-[#687487]">{approvalsLoading?"Conferindo pendências…":approvalsFailed||financeError?"Não foi possível confirmar todas as pendências.":"Nenhuma ação pendente registrada."}</p>}
    {attention.length>5&&<button type="button" onClick={()=>onNavigate("content")} className={"mt-3 "+linkClass}><span className="inline-flex items-center gap-1.5"><ContentTablerIcon name="eye" size={16}/>Ver outras pendências</span></button>}
   </section>}

  </div>
  <div className="rv-ui3-client-status flex flex-wrap gap-x-5 gap-y-2 border-y border-[#E3E6ED] py-3" aria-label="Resumo dos serviços compartilhados">
    {allowed("execution")&&<button type="button" onClick={()=>onNavigate("execution")} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-[#687487] hover:bg-[#F6F7FB]">{icon("chart-dots-3",16)}Entregas <strong className="tabular-nums text-[#323647]">{tasks.length?completed+"/"+tasks.length:"—"}</strong></button>}
    {allowed("content")&&<button type="button" onClick={()=>onNavigate("content")} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-[#687487] hover:bg-[#F6F7FB]">{icon("calendar",16)}Conteúdos do mês <strong className="tabular-nums text-[#323647]">{monthContent.length}</strong></button>}
    {allowed("campaigns")&&<button type="button" onClick={()=>onNavigate("campaigns")} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-[#687487] hover:bg-[#F6F7FB]">{icon("rocket",16)}Campanhas ativas <strong className="tabular-nums text-[#323647]">{campaignCount}</strong></button>}
  </div>
  {(allowed("content")||allowed("execution")||allowed("meetings"))&&<section className={card}>
   <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-[14px] font-semibold text-[#323647]">{icon("calendar",17)} Atividades do mês</h2><div className="flex items-center gap-1" aria-label="Filtrar atividades por mês"><button type="button" onClick={()=>shiftMonth(-1)} aria-label="Mês anterior" className="min-h-9 min-w-9 rounded-lg text-sm text-[#687487] hover:bg-[#F6F7FB]">‹</button><span className="min-w-[120px] text-center text-xs font-medium capitalize text-[#687487]">{monthLabel(month)}</span><button type="button" onClick={()=>shiftMonth(1)} aria-label="Próximo mês" className="min-h-9 min-w-9 rounded-lg text-sm text-[#687487] hover:bg-[#F6F7FB]">›</button></div></div>
   {monthEntries.length?<div className="mt-3 divide-y divide-[#E3E6ED]">{monthEntries.map(e=><button type="button" key={e.key} onClick={()=>onNavigate(e.kindId,e.projectId,e.contentId)} className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left hover:bg-[#FAFBFE]"><p className="text-xs font-medium text-[#687487]">{displayDate(e.date)} · {e.kind}</p><p className="line-clamp-2 text-sm font-medium text-[#323647]">{e.title}</p></button>)}</div>:
    <div className="mt-4 rounded-lg bg-[#F7F8FB] p-4 text-sm text-[#758198]">Nenhuma atividade compartilhada para o período selecionado.</div>}
   <p className="mt-3 text-xs text-[#7D899D]">Reúne publicações, entregas e reuniões compartilhadas. A data prevista não confirma que a atividade foi realizada.</p>
  </section>}
  <div className="grid gap-4 md:grid-cols-2">
   {allowed("execution")&&<section className={card}>
    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#323647]">{icon("list-check",17)} Entregas a acompanhar</h2>
    {nextTask?<div className="mt-3"><p className="text-sm font-medium text-[#323647]">{nextTask.title}</p><p className={`mt-1 text-xs ${nextTask.dueDate&&nextTask.dueDate<today?"font-medium text-[#B33A4D]":"text-[#687487]"}`}>{nextTask.dueDate&&nextTask.dueDate<today?"Prazo vencido · ":"Prazo · "}{displayDate(nextTask.dueDate??"")}</p></div>:<p className="mt-3 text-sm text-[#687487]">Nenhuma entrega aberta com prazo informado.</p>}
    <button type="button" onClick={()=>onNavigate("execution",nextTask?.projectId)} className={`mt-4 ${linkClass}`}>Consultar entregas</button>
   </section>}
   {allowed("meetings")&&<section className={card}>
    <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[#323647]">{icon("calendar",20)} Reuniões</h2>
    {nextMeetings[0]?<div className="mt-3"><p className="text-sm font-semibold">{nextMeetings[0].title}</p><p className="mt-1 text-xs text-[#758198]">{displayDate(nextMeetings[0].date)}{nextMeetings[0].time?" · "+nextMeetings[0].time:""}</p></div>:<p className="mt-3 text-sm text-[#758198]">Nenhuma reunião futura compartilhada.</p>}
    <button type="button" onClick={()=>onNavigate("meetings")} className={"mt-4 "+linkClass}><span className="inline-flex items-center gap-1.5"><ContentTablerIcon name="eye" size={16}/>Ver reuniões</span></button>
   </section>}
   {allowed("finance")&&<section className={card}>
    <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[#323647]">{icon("currency-dollar",20)} Financeiro</h2>
    <p className="mt-3 text-sm text-[#758198]">{financeError?"Informações financeiras indisponíveis.":!finance?"Conferindo lançamentos…":invoices.length?invoices.length+" lançamento(s) em aberto.":"Nenhum lançamento pendente identificado."}</p>
    <button type="button" onClick={()=>onNavigate("finance")} className={"mt-4 "+linkClass}><span className="inline-flex items-center gap-1.5"><ContentTablerIcon name="eye" size={16}/>Ver financeiro</span></button>
   </section>}
  </div>
  <section className={card}>
   <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[#323647]">{icon("clock",20)} Atualizações recentes</h2></div>
   {events.length?<div className="mt-3 divide-y divide-[#E9EDF3]">{events.map((e,i)=><button type="button" key={e.project_id+e.content_id+i} onClick={()=>onNavigate("content",e.project_id,e.content_id)} className="block w-full cursor-pointer py-3 text-left"><p className="text-sm font-semibold">{e.phase} · {e.decision==="approved"?"Aprovação registrada":"Ajustes solicitados"}</p><p className="mt-1 text-xs text-[#758198]">{new Date(e.decided_at).toLocaleString("pt-BR")}</p></button>)}</div>:
   <p className="mt-3 text-sm text-[#758198]">{approvalsLoading?"Consultando movimentações…":approvalsFailed?"Histórico de aprovações indisponível.":mostRecent?"Ainda não há decisões editoriais registradas. Última atualização do projeto: "+new Date(mostRecent.updated_at).toLocaleDateString("pt-BR"):"Nenhuma atualização compartilhada."}</p>}
  </section>
 </div>;
}
