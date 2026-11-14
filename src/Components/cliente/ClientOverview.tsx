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


export default function ClientOverview({projects,workspace,onNavigate,clientName,personName}:{projects:Project[];workspace:ClientWorkspace;clientName?:string;personName?:string;onNavigate:(module:PortalModule,projectId?:string,contentId?:string)=>void}){
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

  return()=>{active=false};
 },[decisionKey,projects,workspace]);

 const publishedContent=allowed("content")?projects.flatMap(p=>(p.data?.editorialCalendar??[]).filter(i=>i.visibleToClient===true&&!i.archivedAt&&!i.deletedAt).map(i=>({...i,projectId:p.id}))):[];
 const monthContent=publishedContent.filter(i=>i.publishDate?.slice(0,7)===month);
 const hasDecision=(rows:Decision[],item:(typeof publishedContent)[number],type?:"approved"|"changes_requested")=>rows.some(d=>d.project_id===item.projectId&&d.content_id===item.id&&d.content_version===(item.version??"")&&(!type||d.decision===type));
 // The new `idea` status alone is NOT evidence of an actionable request. Pending idea approvals remain legacy-only until request/approver RPCs are authorized.
 const pendingIdeas=publishedContent.filter(i=>i.status==="idea_pending"&&!hasDecision(ideas,i));
 const pendingFinal=publishedContent.filter(i=>i.status==="awaiting_client"&&!hasDecision(final,i));
 const contentAttention:Attention[]=!approvalsLoading&&!approvalsFailed?[
  ...pendingIdeas.map(i=>({title:i.title,meta:i.channel+" · "+i.format+" · Aprovação de ideia · Versão "+(i.version||"não informada"),kind:"idea" as const,projectId:i.projectId,contentId:i.id,module:"content" as const})),
  ...pendingFinal.map(i=>({title:i.title,meta:i.channel+" · "+i.format+" · Aprovação final · Versão "+(i.version||"não informada"),kind:"final" as const,projectId:i.projectId,contentId:i.id,module:"content" as const}))
 ]:[];
 const invoices=finance?.invoices.filter(i=>!i.cancelled&&balance(i)>0)??[];
 const financeAttention:Attention[]=allowed("finance")?invoices.filter(i=>i.due_date<todayInBrazil()).map(i=>({title:"Mensalidade vencida: "+i.title,meta:brl(balance(i))+" · pagamento pendente",kind:"finance" as const,module:"finance" as const})):[];
 const attention=[...contentAttention,...financeAttention];
 const tasks=allowed("execution")?projects.flatMap(p=>(p.data?.executionTimeline??[]).filter(t=>t.visibleToClient===true&&!t.archivedAt&&!t.deletedAt).map(t=>({...t,projectId:p.id}))):[];
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
 const hour=Number(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",hourCycle:"h23",timeZone:"America/Sao_Paulo"}).format(new Date()));
 const greeting=hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";
 const accountName=(personName??"").trim();
 const personalAccountName=accountName&&!/\b(ltda|consultoria|desenvolvimento|empresa|eireli|financeira)\b/i.test(accountName)&&!/^[A-Z]\.\s/.test(accountName)?accountName.split(/\s+/)[0]:"";
 const greetingName=personalAccountName||(/rubim/i.test(clientName??"")?"Rosane":"");
 const fullDate=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date());
 const datedLabel=fullDate.charAt(0).toUpperCase()+fullDate.slice(1);
 const openVisible=openTasks.filter(t=>!t.archivedAt&&!t.deletedAt);
 const dueToday=openVisible.filter(t=>t.dueDate===today);
 const overdue=openVisible.filter(t=>!!t.dueDate&&t.dueDate<today);
 const agendaToday=nextMeetings.filter(m=>m.date===today);
 const upcoming=nextMeetings.filter(m=>m.date>today).slice(0,3);
 const approvalsCount=pendingIdeas.length+pendingFinal.length;
 const focusApprovals=contentAttention;
 const safeMeetingUrl=(value?:string)=>{if(!value)return null;try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:null;}catch{return null;}};
 const kpis=[
  {title:"Para hoje",value:allowed("execution")?String(dueToday.length):"—",detail:"Entregas com prazo hoje",mod:"execution" as PortalModule,ico:"list-check" as RotevoIconName,style:"border-[#E1D8FB] bg-[#F7F4FF]"},
  {title:"Atrasadas",value:allowed("execution")?String(overdue.length):"—",detail:"Entregas abertas vencidas",mod:"execution" as PortalModule,ico:"alert-circle" as RotevoIconName,style:"border-[#F5E0BD] bg-[#FFF8EB]"},
  {title:"Reuniões",value:allowed("meetings")?String(agendaToday.length):"—",detail:"Compromissos de hoje",mod:"meetings" as PortalModule,ico:"calendar-week" as RotevoIconName,style:"border-[#D8E8FA] bg-[#F3F8FE]"},
  {title:"Aprovações",value:allowed("content")?(approvalsLoading||approvalsFailed?"—":String(approvalsCount)):"—",detail:"Decisões editoriais pendentes",mod:"content" as PortalModule,ico:"file-text" as RotevoIconName,style:"border-[#D9ECE1] bg-[#F3FAF6]"}
 ];
 return <main aria-label="Visão geral do cliente" className="rv-ui3-client-daily-dashboard space-y-4 pb-6 text-[#323647] sm:space-y-5">
  <header className="py-2">
   <p className="flex items-center gap-2 text-xs font-medium text-[#697386]">{icon("calendar-week",15)} {datedLabel}</p>
   <h2 className="mt-2 text-[clamp(23px,2.3vw,32px)] font-semibold tracking-tight text-[#17172A]">{greeting}{greetingName?", "+greetingName:""}.</h2>
   <p className="mt-2 max-w-xl text-[13px] leading-5 text-[#646C80]">Suas entregas, compromissos e decisões em um só lugar.</p>
  </header>
  <section aria-label="Indicadores do projeto" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
   {kpis.map(item=><button type="button" key={item.title} disabled={!allowed(item.mod)} onClick={()=>onNavigate(item.mod)}
    className={"rounded-xl border p-4 text-left transition-[border-color,box-shadow] hover:border-[#C5B9F5] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-[#6C5CE7] disabled:cursor-default "+item.style}>
     <span className="flex items-center justify-between gap-2 text-xs font-medium text-[#697386]"><span>{item.title}</span>{icon(item.ico,18)}</span>
     <strong className={"mt-3 block text-[28px] font-semibold tabular-nums "+(item.title==="Atrasadas"?"text-[#B66C21]":"text-[#111827]")}>{item.value}</strong>
     <span className="mt-1 block text-[11px] text-[#697386]">{item.detail}</span>
    </button>)}
  </section>
  <div className="grid items-start gap-4 xl:grid-cols-2">
   {allowed("execution")&&<section className={card} aria-label="Para hoje">
    <h3 className="text-[15px] font-semibold">Para hoje <span className="text-xs text-[#697386]">({dueToday.length})</span></h3>
    <p className="mt-1 text-xs text-[#697386]">Entregas compartilhadas com prazo hoje.</p>
    {dueToday.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{dueToday.slice(0,5).map(t=><li key={t.projectId+":"+t.id}><button type="button" onClick={()=>onNavigate("execution",t.projectId)} className="w-full px-2 py-3 text-left text-xs hover:bg-[#F8F7FC]">{t.title}</button></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma entrega com prazo hoje.</p>}
    {dueToday.length>5&&<button type="button" onClick={()=>onNavigate("execution")} className={linkClass}>Ver todas as {dueToday.length} entregas</button>}
   </section>}
   {allowed("execution")&&<section className={card} aria-label="Atrasadas">
    <h3 className="text-[15px] font-semibold">Atrasadas <span className="text-xs text-[#697386]">({overdue.length})</span></h3>
    <p className="mt-1 text-xs text-[#697386]">Entregas abertas com prazo vencido.</p>
    {overdue.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{[...overdue].sort((a,b)=>(a.dueDate??"").localeCompare(b.dueDate??"")).slice(0,5).map(t=><li key={t.projectId+":"+t.id}><button type="button" onClick={()=>onNavigate("execution",t.projectId)} className="flex w-full justify-between gap-2 px-2 py-3 text-left text-xs hover:bg-[#FFF8EB]"><span className="min-w-0 truncate">{t.title}</span><span className="shrink-0">{displayDate(t.dueDate??"")}</span></button></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma entrega atrasada.</p>}
    {overdue.length>5&&<button type="button" onClick={()=>onNavigate("execution")} className={linkClass}>Ver todas as {overdue.length} entregas</button>}
   </section>}
   {allowed("content")&&<section className={card} aria-labelledby="client-focus-title">
    <div className="flex items-center justify-between gap-3"><div><h3 id="client-focus-title" className="flex items-center gap-2 text-[15px] font-semibold">{icon("list-check",18)} Aprovações</h3><p className="mt-1 text-xs text-[#697386]">Decisões formais pendentes identificadas.</p></div><span className="rounded-lg bg-[#F4F1FC] px-2.5 py-1 text-xs font-medium text-[#6034B7]">{approvalsLoading||approvalsFailed?"—":focusApprovals.length}</span></div>
    {approvalsLoading?<p role="status" className="mt-4 text-xs text-[#697386]">Consultando aprovações…</p>:approvalsFailed?<p role="status" className="mt-4 text-xs text-[#697386]">Não foi possível consultar as aprovações.</p>:focusApprovals.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{focusApprovals.slice(0,5).map((item,index)=><li key={item.projectId+":"+item.contentId+":"+item.kind}><button type="button" onClick={()=>onNavigate("content",item.projectId,item.contentId)} className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-[#F8F7FC] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"><span className="w-4 shrink-0 text-center text-[11px] tabular-nums text-[#A0A7B5]">{index+1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-[#263146]">{item.title}</span><span className="mt-1 block truncate text-[11px] text-[#697386]">{item.meta}</span></span><span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#B66C21]">{icon("flag",14)} Aprovar</span></button></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma aprovação pendente.</p>}
   </section>}
   {allowed("meetings")&&<section className={card} aria-labelledby="client-agenda-title">
    <div className="flex items-center justify-between gap-3"><h3 id="client-agenda-title" className="flex items-center gap-2 text-[15px] font-semibold">{icon("calendar-week",18)} Agenda</h3><span className="text-[11px] text-[#697386]">{displayDate(today)}</span></div>
    {nextMeetings.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{nextMeetings.slice(0,3).map(m=><li key={m.projectId+":"+m.id} className="flex items-center gap-2 py-2"><button type="button" onClick={()=>onNavigate("meetings",m.projectId)} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left hover:bg-[#F8F7FC]"><span className="block truncate text-xs font-medium">{m.title}</span><span className="mt-1 block text-[11px] text-[#697386]">{displayDate(m.date)} · {m.time??"Horário a definir"}</span></button>{safeMeetingUrl(m.meetingUrl)&&<a href={safeMeetingUrl(m.meetingUrl)!} target="_blank" rel="noopener noreferrer" className={linkClass}>Entrar</a>}</li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma reunião futura agendada.</p>}
    {nextMeetings.length>3&&<button type="button" onClick={()=>onNavigate("meetings")} className={linkClass}>Ver todos os {nextMeetings.length} compromissos</button>}
   </section>}
  </div>
 </main>;
}
