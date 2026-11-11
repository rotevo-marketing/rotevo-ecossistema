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
 const [meetingDay,setMeetingDay]=useState("");
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
 const openTasks=tasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").sort((a,b)=>(a.dueDate??"9999").localeCompare(b.dueDate??"9999"));
 const meetingsInMonth=allowed("meetings")?projects.flatMap(p=>(p.data?.operationalAgenda??[]).filter(m=>m.visibleToClient===true&&m.status==="planned"&&m.date?.startsWith(month)).map(m=>({...m,projectId:p.id}))).sort((a,b)=>(a.date+"T"+(a.time||"23:59")).localeCompare(b.date+"T"+(b.time||"23:59"))):[];
 const [year,mm]=month.split("-").map(Number);
 const offset=new Date(year,mm-1,1).getDay();
 const count=new Date(year,mm,0).getDate();
 const slots=[...Array.from({length:offset},()=>null as number|null),...Array.from({length:count},(_,i)=>i+1)];
 const shownMeetings=meetingDay&&meetingDay.startsWith(month)?meetingsInMonth.filter(m=>m.date===meetingDay):meetingsInMonth.slice(0,5);
 const receivable=invoices.reduce((n,i)=>n+balance(i),0);
 const overdueInvoices=invoices.filter(i=>i.due_date<today);
 const card="rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-5";
 const action="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2 text-xs font-semibold text-[#6034B7] hover:bg-[#F3EEFF] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]";
 const metrics:{title:string;value:string;subtitle:string;module:PortalModule;icon:RotevoIconName}[]=[
  ...(allowed("execution")?[{title:"Entregas",value:String(openTasks.length),subtitle:"Em andamento",module:"execution" as PortalModule,icon:"list-check" as RotevoIconName}]:[]),
  ...(allowed("content")?[{title:"Conteúdos",value:String(monthContent.length),subtitle:"Previstos para o mês",module:"content" as PortalModule,icon:"calendar-week" as RotevoIconName}]:[]),
  ...(allowed("meetings")?[{title:"Reuniões",value:String(nextMeetings.length),subtitle:"Próximos encontros",module:"meetings" as PortalModule,icon:"calendar" as RotevoIconName}]:[]),
  ...(allowed("finance")?[{title:"Financeiro",value:finance?brl(receivable):"—",subtitle:"Saldo em aberto",module:"finance" as PortalModule,icon:"currency-dollar" as RotevoIconName}]:[])
 ];
 return <main aria-label="Visão geral do cliente" className="rv-ui3-client-daily-dashboard space-y-4 pb-6 text-[#323647]">
  <header><p className="text-xs capitalize text-[#697386]">{new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date())}</p><h2 className="mt-1 text-xl font-semibold text-[#111827]">Seu projeto em um só lugar</h2><p className="mt-1 text-xs text-[#697386]">{clientName?clientName+" · ":""}Entregas, reuniões e serviços compartilhados.</p></header>
  <section aria-label="Indicadores do projeto" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric=><button type="button" key={metric.title} onClick={()=>onNavigate(metric.module)} className="cursor-pointer rounded-xl border border-[#E3E7F0] bg-white p-4 text-left hover:border-[#C5B9F5] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"><span className="flex items-center justify-between text-xs text-[#697386]"><span>{metric.title}</span>{icon(metric.icon,18)}</span><strong className={"mt-3 block font-semibold tabular-nums text-[#111827] "+(metric.title==="Financeiro"?"text-lg":"text-[28px]")}>{metric.value}</strong><span className="mt-1 block text-[11px] text-[#697386]">{metric.subtitle}</span></button>)}</section>
  <div className="grid gap-4 xl:grid-cols-2">
   {allowed("execution")&&<section className={card}><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold">{icon("list-check",18)} Próximas entregas</h3><button type="button" className={action} onClick={()=>onNavigate("execution")}>Ver entregas →</button></div>{openTasks.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{openTasks.slice(0,5).map(t=><li key={t.projectId+":"+t.id}><button type="button" onClick={()=>onNavigate("execution",t.projectId)} className="flex w-full cursor-pointer items-center justify-between gap-2 py-3 text-left hover:bg-[#FAF9FE]"><span><span className="block text-sm font-medium">{t.title}</span><span className="mt-1 block text-xs text-[#697386]">{t.dueDate?"Prazo · "+displayDate(t.dueDate):"Sem prazo definido"}</span></span>{icon("chevron-right",16)}</button></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma entrega compartilhada em aberto.</p>}</section>}
   {allowed("meetings")&&<section className={card}><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold">{icon("calendar-week",18)} Próximas reuniões</h3><button type="button" className={action} onClick={()=>onNavigate("meetings")}>Ver reuniões →</button></div>{nextMeetings.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{nextMeetings.slice(0,4).map(m=><li key={m.projectId+":"+m.id}><button type="button" onClick={()=>onNavigate("meetings",m.projectId)} className="flex w-full cursor-pointer items-center gap-3 py-3 text-left hover:bg-[#FAF9FE]"><span className="rounded-lg bg-[#F6F7FB] p-2 text-xs font-semibold text-[#525B70]">{displayDate(m.date).slice(0,5)}</span><span><span className="block text-sm font-medium">{m.title}</span><span className="mt-1 block text-xs text-[#697386]">{m.time||"Horário a confirmar"}</span></span></button></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma reunião futura compartilhada.</p>}</section>}
  </div>
  {allowed("meetings")&&<section className={card} aria-labelledby="client-calendar-title"><div className="flex flex-wrap items-center justify-between gap-2"><h3 id="client-calendar-title" className="flex items-center gap-2 text-sm font-semibold">{icon("calendar",18)} Calendário de reuniões</h3><div className="flex items-center gap-1"><button type="button" aria-label="Mês anterior" onClick={()=>{shiftMonth(-1);setMeetingDay("");}} className="min-h-9 min-w-9 cursor-pointer rounded-lg hover:bg-[#F6F7FB]">{icon("chevron-left",17)}</button><span className="min-w-[140px] text-center text-xs font-medium capitalize">{monthLabel(month)}</span><button type="button" aria-label="Próximo mês" onClick={()=>{shiftMonth(1);setMeetingDay("");}} className="min-h-9 min-w-9 cursor-pointer rounded-lg hover:bg-[#F6F7FB]">{icon("chevron-right",17)}</button></div></div>
  <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><span key={d} className="py-2 text-[11px] text-[#697386]">{d}</span>)}{slots.map((day,i)=>{if(day===null)return <span key={"blank-"+i} aria-hidden="true"/>;const date=month+"-"+String(day).padStart(2,"0"),qty=meetingsInMonth.filter(m=>m.date===date).length,selected=meetingDay===date;return <button type="button" key={date} aria-pressed={selected} aria-label={day+" de "+monthLabel(month)+", "+qty+" reunião(ões)"} onClick={()=>setMeetingDay(selected?"":date)} className={"flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-lg border focus-visible:outline-2 focus-visible:outline-[#6C5CE7] "+(selected?"border-[#B8A7F2] bg-[#F3EEFF] text-[#6034B7]":date===today?"border-[#D5C9FD] font-semibold":"border-transparent hover:bg-[#F7F8FB]")}>{day}{qty>0&&<span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-[#6C5CE7]"/>}</button>})}</div>
  <div className="mt-4 border-t border-[#EDF0F6] pt-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{meetingDay?"Reuniões de "+displayDate(meetingDay):"Reuniões do período"}</p>{meetingDay&&<button type="button" onClick={()=>setMeetingDay("")} className={action}>Mostrar todas</button>}</div>{shownMeetings.length?<div className="mt-2 divide-y divide-[#EDF0F6]">{shownMeetings.map(m=><button type="button" key={m.projectId+":"+m.id} onClick={()=>onNavigate("meetings",m.projectId)} className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left hover:bg-[#FAF9FE]"><span><span className="block text-sm font-medium">{m.title}</span><span className="mt-1 block text-xs text-[#697386]">{displayDate(m.date)} · {m.time||"Hora não informada"}</span></span>{icon("chevron-right",16)}</button>)}</div>:<p className="mt-3 text-xs text-[#697386]">Nenhuma reunião compartilhada {meetingDay?"nessa data":"nesse mês"}.</p>}</div>
  </section>}
  <div className="grid gap-4 xl:grid-cols-2">
   {allowed("finance")&&<section className={card}><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold">{icon("currency-dollar",18)} Resumo financeiro</h3><button type="button" onClick={()=>onNavigate("finance")} className={action}>Ver financeiro →</button></div><div className="mt-4 grid grid-cols-2 gap-3">{[{label:"Saldo em aberto",value:finance?brl(receivable):"—"},{label:"Vencimentos atrasados",value:finance?String(overdueInvoices.length):"—"}].map(x=><div key={x.label} className="rounded-lg bg-[#FAFBFD] p-3"><p className="text-xs text-[#697386]">{x.label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{x.value}</p></div>)}</div>{!finance&&<p className="mt-3 text-xs text-[#697386]">{financeError?"Informações indisponíveis.":"Consultando cobranças…"}</p>}</section>}
   {allowed("content")&&<section className={card}><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold">{icon("calendar-week",18)} Conteúdos do mês</h3><button type="button" onClick={()=>onNavigate("content")} className={action}>Ver conteúdos →</button></div>{monthContent.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{monthContent.slice().sort((a,b)=>(a.publishDate??"").localeCompare(b.publishDate??"")).slice(0,4).map(i=><li key={i.projectId+":"+i.id}><button type="button" onClick={()=>onNavigate("content",i.projectId,i.id)} className="flex w-full cursor-pointer items-center justify-between gap-2 py-3 text-left hover:bg-[#FAF9FE]"><span><span className="block text-sm font-medium">{i.title}</span><span className="mt-1 block text-xs text-[#697386]">{displayDate(i.publishDate??"")} · {i.channel}</span></span>{icon("chevron-right",16)}</button></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhum conteúdo compartilhado para o mês selecionado.</p>}</section>}
  </div>
  <section className={card}><h3 className="flex items-center gap-2 text-sm font-semibold">{icon("history",18)} Atualizações recentes</h3>{events.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{events.map((event,i)=><li key={event.project_id+event.content_id+i}><button type="button" onClick={()=>onNavigate("content",event.project_id,event.content_id)} className="w-full cursor-pointer py-3 text-left hover:bg-[#FAF9FE]"><span className="block text-sm font-medium">{event.phase} · {event.decision==="approved"?"Aprovação registrada":"Ajustes solicitados"}</span><span className="mt-1 block text-xs text-[#697386]">{new Date(event.decided_at).toLocaleString("pt-BR")}</span></button></li>)}</ul>:<p className="mt-3 text-xs text-[#697386]">{approvalsLoading?"Consultando atualizações…":approvalsFailed?"Histórico indisponível.":mostRecent?"Última atualização do projeto: "+new Date(mostRecent.updated_at).toLocaleDateString("pt-BR"):"Nenhuma atualização compartilhada."}</p>}</section>
 </main>;
}
