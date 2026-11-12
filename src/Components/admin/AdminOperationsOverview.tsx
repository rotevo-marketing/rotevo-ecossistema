"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import Link from "next/link";
import {balance,brl,todayInBrazil,type FinanceState} from "@/lib/finance/model";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon,type RotevoIconName} from "@/Components/RotevoTablerIcon";
import {buildOperationsOverview,overviewClient,overviewDate,overviewProjectHref,overviewToday,type OperationsProject,type OverviewDecision,type OverviewItem,type OverviewSource} from "@/lib/overview/model";
import {loadOverviewDecisions} from "@/lib/overview/approvals";
import AdminWorkConsole from "./AdminWorkConsole";
export type {OperationsProject} from "@/lib/overview/model";
const panel="rv-ui2-section rv-ui3-overview-panel min-w-0 bg-white py-4";
const action="inline-flex min-h-10 shrink-0 items-center rounded-lg px-2 py-2 text-[13px] font-semibold text-[#5949D1] hover:bg-[#EDEAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C5CE7]";
function Heading({id,title,icon,description,children}:{id:string;title:string;icon:RotevoIconName;description:string;children?:ReactNode}){
 return <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2.5"><span aria-hidden="true" className="text-[#687487]"><RotevoTablerIcon name={icon} size={17} stroke={1.5}/></span><h2 id={id} className="text-sm font-semibold tracking-tight">{title}</h2></div><p className="sr-only">{description}</p></div>{children}</div>;
}
function Empty({children}:{children:ReactNode}){return <p className="mt-3 border-t border-[#E3E6ED] py-4 text-sm leading-6 text-[#687487]">{children}</p>;}
function RecordLink({item,label="Abrir no projeto"}:{item:OverviewItem;label?:string}){
 const href=overviewProjectHref(item.project);return href?<Link href={href} className={action} aria-label={`${label}: ${item.title}`}>{label} →</Link>:<span className="text-[13px] text-[#525B70]">Vínculo do projeto indisponível</span>;
}
function ItemRow({item,meeting=false}:{item:OverviewItem;meeting?:boolean}){
 return <li className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF0F6] py-3 last:border-b-0"><div className="min-w-0 flex-1 basis-44">{meeting&&<p className="mb-1 text-xs font-medium text-[#687487]">{overviewDate(item.due)} · {item.time??"Horário não informado"}</p>}<p className="break-words text-sm font-semibold">{item.title}</p><p className="mt-1 break-words text-[13px] text-[#525B70]">{overviewClient(item.project)?.name??"Cliente não informado"} · {item.project.title}</p><p className={`mt-2 text-[13px] ${!meeting&&item.priority===1?"font-semibold text-red-700":"text-[#525B70]"}`}>{meeting?item.reasons[0]:overviewDate(item.due)+(item.time?` · ${item.time}`:"")}{!meeting&&item.kind==="meeting"?" · Compromisso vinculado à sua tarefa":""}</p></div><RecordLink item={item}/></li>;
}
type Props={projects:OperationsProject[];userId?:string|null;userName?:string;state?:"ready"|"loading"|"error"|"forbidden";onOpenProjects:()=>void;onOpenTasks?:()=>void;onOpenMeetings?:()=>void;onOpenContent?:()=>void;onOpenFinance?:()=>void};
export default function AdminOperationsOverview({projects,userId=null,userName="",state="ready",onOpenProjects,onOpenTasks,onOpenMeetings,onOpenContent,onOpenFinance}:Props){
 const [financial,setFinancial]=useState<FinanceState|null>(null),[financialError,setFinancialError]=useState("");
 useEffect(()=>{if(state!=="ready")return;let alive=true;void import("@/lib/finance/api").then(m=>m.financeRequest(false)).then(data=>{if(alive){setFinancial(data);setFinancialError("");}}).catch(e=>{if(alive)setFinancialError(e instanceof Error?e.message:"Consulta financeira indisponível.");});return()=>{alive=false;};},[state]);
 const financeToday=todayInBrazil(),overdueIncoming=financial?.invoices.filter(i=>i.direction==="in"&&!i.cancelled&&balance(i)>0&&i.due_date<financeToday)??[],overdueOutgoing=financial?.invoices.filter(i=>i.direction==="out"&&!i.cancelled&&balance(i)>0&&i.due_date<financeToday)??[];
 const [expanded,setExpanded]=useState(false),[retry,setRetry]=useState(0);
 const key=JSON.stringify([projects.map(p=>[p.id,p.updated_at]),retry,state]);
 const [decisions,setDecisions]=useState<{key:string;rows:OverviewDecision[];source:OverviewSource}>({key:"",rows:[],source:"loading"});
 useEffect(()=>{
  if(state!=="ready")return;let active=true;
  void loadOverviewDecisions(supabase,projects).then(rows=>{if(active)setDecisions({key,rows,source:"ready"});}).catch((error:unknown)=>{const code=error&&typeof error==="object"&&"code" in error?error.code:null;if(active)setDecisions({key,rows:[],source:code==="42501"?"forbidden":"unavailable"});});
  return()=>{active=false;};
 },[projects,key,state]);
 const source=decisions.key===key?decisions.source:"loading",today=overviewToday();
 const model=useMemo(()=>buildOperationsOverview(projects,userId,decisions.key===key?decisions.rows:[],source,today),[projects,userId,decisions,key,source,today]);
 const ready=state==="ready";
 const dailyTasks=model.routine.filter(item=>item.kind==="task"&&item.due===today);
  const overduePersonal=model.routine.filter(item=>item.kind==="task"&&!!item.due&&item.due<today);
  const nextPersonal=model.routine.filter(item=>item.kind==="task"&&(!item.due||item.due>today));
  const dayMeetings=model.meetings.filter(item=>item.due===today);
  const upcomingMeetings=model.meetings.filter(item=>item.due!==today);
  const month=today.slice(0,7);
  const incoming=financial?.invoices.filter(i=>!i.cancelled&&i.direction==="in")??[];
  const dueReceivables=incoming.filter(i=>balance(i)>0);
  const dueTotal=dueReceivables.reduce((n,i)=>n+balance(i),0);
  const paidThisMonth=financial?.settlements.filter(s=>!s.reversed&&s.paid_on.startsWith(month)&&incoming.some(i=>i.id===s.invoice_id)).reduce((n,s)=>n+s.amount_cents,0)??0;
  const overdueTotal=overdueIncoming.reduce((n,i)=>n+balance(i),0);
  const todayDate=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
  const surface="rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-5";
  const simpleAction="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#6034B7] hover:bg-[#F4F0FF] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]";
  const metrics:{title:string;value:string;detail:string;icon:RotevoIconName;onClick?:()=>void;warning?:boolean}[]=[
   {title:"Para hoje",value:ready?String(dailyTasks.length):"—",detail:"Suas tarefas com prazo hoje",icon:"list-check",onClick:onOpenTasks},
   {title:"Atrasadas",value:ready&&model.overdueTasks!==null?String(model.overdueTasks):"—",detail:"Tarefas abertas da operação",icon:"alert-circle",onClick:onOpenTasks,warning:(model.overdueTasks??0)>0},
   {title:"Reuniões",value:ready&&!model.agendaUnavailable?String(dayMeetings.length):"—",detail:"Compromissos para hoje",icon:"calendar-week",onClick:onOpenMeetings},
   {title:"Aprovações",value:ready&&model.pendingDecisions!==null?String(model.pendingDecisions):"—",detail:"Decisões formais pendentes",icon:"file-text",onClick:onOpenContent}
  ];
  const personalPriorities=[...overduePersonal,...dailyTasks,...nextPersonal].filter((item,index,arr)=>arr.findIndex(x=>x.key===item.key)===index).sort((a,b)=>a.priority-b.priority||a.taskPriority-b.taskPriority||(a.due??"9999").localeCompare(b.due??"9999")).slice(0,6);
  const firstName=userName.trim().split(/\s+/)[0]||"";
  const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
  const greeting=hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";
  const formattedToday=todayDate.charAt(0).toUpperCase()+todayDate.slice(1);
  return <main aria-label="Meu dia na Rotevo" className="rv-ui3-daily-dashboard space-y-4 pb-6 text-[#323647] sm:space-y-5">
    <header className="flex items-start justify-between gap-4 py-2"><div className="min-w-0"><p className="flex items-center gap-2 text-xs font-medium text-[#697386]"><RotevoTablerIcon name="calendar-week" size={15} stroke={1.7}/>{formattedToday}</p><h2 className="mt-2 text-[clamp(23px,2.3vw,32px)] font-semibold tracking-tight text-[#17172A]">{greeting}{firstName?", "+firstName:""}.</h2><p className="mt-2 max-w-xl text-[13px] leading-5 text-[#646C80]">Seu trabalho, seus compromissos e as prioridades da operação.</p></div></header>
    {!ready?<section role={state==="loading"?"status":"alert"} className={surface}><p className="text-sm font-semibold">{state==="loading"?"Preparando a visão geral":state==="forbidden"?"Acesso não autorizado":"Não foi possível carregar a visão geral"}</p><p className="mt-2 text-xs text-[#697386]">Os indicadores só aparecem quando as fontes autorizadas estiverem disponíveis.</p></section>:<>
     <section aria-label="Indicadores do dia" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
       {metrics.map((metric,index)=><button key={metric.title} type="button" onClick={metric.onClick} disabled={!metric.onClick} className={"group rounded-xl border p-4 text-left transition-[border-color,box-shadow] hover:border-[#C5B9F5] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-[#6C5CE7] "+(index===0?"border-[#E1D8FB] bg-[#F7F4FF]":index===1?"border-[#F5E0BD] bg-[#FFF8EB]":index===2?"border-[#D8E8FA] bg-[#F3F8FE]":"border-[#D9ECE1] bg-[#F3FAF6]")+" "+(!metric.onClick?"cursor-default":"cursor-pointer")}>
       <div className="flex items-center justify-between"><span className="text-xs font-medium text-[#697386]">{metric.title}</span><RotevoTablerIcon name={metric.icon} size={18} stroke={1.6}/></div>
       <div className={"mt-3 text-[28px] font-semibold tabular-nums "+(metric.warning?"text-[#B73C4D]":"text-[#111827]")}>{metric.value}</div>
       <p className="mt-1 text-[11px] text-[#697386]">{metric.detail}</p>
      </button>)}
     </section>
     {(model.executionUnavailable||model.agendaUnavailable||model.editorialUnavailable||source==="unavailable"||source==="forbidden")&&<p role="status" className="rounded-lg border border-[#F4DBA6] bg-[#FFFAEF] p-3 text-xs text-[#826321]">Há informações operacionais indisponíveis. Totais desconhecidos foram apresentados como “—”, sem presumir valores.</p>}
     <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)]">
      <section className={surface} aria-labelledby="daily-priorities">
       <div className="flex items-center justify-between gap-3"><div><h3 id="daily-priorities" className="flex items-center gap-2 text-[15px] font-semibold"><RotevoTablerIcon name="list-check" size={18} stroke={1.6}/> Meu foco</h3><p className="mt-1 text-xs text-[#697386]">O que precisa da sua atenção, por urgência e prazo.</p></div><span className="rounded-lg bg-[#F4F1FC] px-2.5 py-1 text-xs font-medium tabular-nums text-[#6034B7]">{personalPriorities.length}</span></div>
       {!userId?<p className="mt-4 text-xs text-[#697386]">Aguardando vínculo com sua conta de estrategista.</p>:personalPriorities.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{personalPriorities.map((item,index)=><li key={item.key}><Link href={overviewProjectHref(item.project)??"#daily-priorities"} aria-label={"Consultar tarefa "+item.title+" no projeto"} className="group flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-[#F8F7FC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C5CE7]"><span className="w-4 shrink-0 text-center text-[11px] tabular-nums text-[#A0A7B5]">{index+1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-[#263146]">{item.title}</span><span className="mt-1 block truncate text-[11px] text-[#697386]">{overviewClient(item.project)?.name??item.project.title}</span></span><span className={"inline-flex shrink-0 items-center gap-1 text-[11px] font-medium "+(item.due&&item.due<today?"text-[#B73C4D]":"text-[#697386]")}><RotevoTablerIcon name="flag" size={14} stroke={1.7}/>{item.due&&item.due<today?"Atrasada":item.due===today?"Hoje":item.due?overviewDate(item.due):"Sem prazo"}</span></Link></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma tarefa atribuída à sua conta para este período.</p>}
       {model.unlinkedOwners>0&&<p className="mt-3 text-xs text-[#697386]">Existem atribuições somente por nome, que não foram associadas automaticamente à sua conta.</p>}
      </section>
      <section className={surface} aria-labelledby="daily-agenda">
       <div className="flex items-center justify-between gap-3"><h3 id="daily-agenda" className="flex items-center gap-2 text-[15px] font-semibold"><RotevoTablerIcon name="calendar-week" size={18} stroke={1.6}/> Agenda</h3><span className="text-[11px] font-medium text-[#697386]">{overviewDate(today)}</span></div>
       {dayMeetings.length?<ul className="mt-3 divide-y divide-[#EDF0F6]">{dayMeetings.map(item=><li key={item.key} className="rounded-xl border border-[#E8E5F3] bg-[#F8F6FF] p-3"><div className="flex items-start gap-3"><span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold tabular-nums text-[#6034B7]">{item.time??"—"}</span><div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{item.title}</p><p className="mt-1 text-[11px] text-[#697386]">{overviewClient(item.project)?.name??item.project.title}</p></div></div>{onOpenMeetings&&<button type="button" onClick={onOpenMeetings} className="mt-2 rounded-lg border border-[#DDD5F5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6034B7]">Ver reunião</button>}</li>)}</ul>:<p className="mt-4 rounded-lg bg-[#F8F9FC] px-3 py-4 text-xs leading-5 text-[#697386]">{model.agendaUnavailable?"Agenda parcialmente indisponível.":"Nenhuma reunião agendada para hoje."}</p>}
       {upcomingMeetings.length>0&&<div className="mt-4 border-t border-[#EDF0F6] pt-3"><p className="text-xs font-semibold text-[#697386]">Próximos compromissos</p>{upcomingMeetings.slice(0,2).map(item=><p key={item.key} className="mt-2 text-xs text-[#525B70]">{overviewDate(item.due)} · {item.time??"Hora não informada"} · {item.title}</p>)}</div>}
      </section>
     </div>
     <section className={surface} aria-labelledby="daily-finance">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="daily-finance" className="flex items-center gap-2 text-sm font-semibold"><RotevoTablerIcon name="currency-dollar" size={18} stroke={1.6}/> Resumo financeiro</h3>{onOpenFinance&&<button onClick={onOpenFinance} type="button" className={simpleAction} aria-label="Acessar módulo Financeiro"><RotevoTablerIcon name="external-link" size={16} stroke={1.6}/></button>}</div>
      <p className="mt-1 text-xs text-[#697386]">Recebimentos e saldos registrados · mês atual</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">{[{label:"A receber",value:financial?brl(dueTotal):"—",hint:"Saldo aberto de cobranças",icon:"hourglass" as RotevoIconName},{label:"Recebido no mês",value:financial?brl(paidThisMonth):"—",hint:"Baixas registradas",icon:"circle-check" as RotevoIconName},{label:"Em atraso",value:financial?brl(overdueTotal):"—",hint:"Recebimentos vencidos",icon:"alert-circle" as RotevoIconName}].map(metric=><div key={metric.label} className="rounded-lg border border-[#EDF0F6] bg-[#FAFBFD] p-3"><div className="flex items-center gap-2 text-xs text-[#697386]"><RotevoTablerIcon name={metric.icon} size={16} stroke={1.5}/>{metric.label}</div><p className="mt-2 text-lg font-semibold tabular-nums">{metric.value}</p><p className="mt-1 text-[11px] text-[#697386]">{metric.hint}</p></div>)}</div>
      {!financial&&<p className="mt-3 text-xs text-[#697386]">{financialError||"Consultando lançamentos financeiros autorizados…"}</p>}
      <p className="mt-3 text-[11px] text-[#697386]">Valores baseados nos registros do Financeiro; recebimentos exigem baixa confirmada.</p>
     </section>
     <section className={surface} aria-labelledby="daily-projects">
      <div className="flex items-center justify-between gap-3"><h3 id="daily-projects" className="flex items-center gap-2 text-sm font-semibold"><RotevoTablerIcon name="report" size={18} stroke={1.6}/> Projetos que exigem atenção</h3><button type="button" onClick={onOpenProjects} className={simpleAction} aria-label="Acessar projetos"><RotevoTablerIcon name="external-link" size={16} stroke={1.6}/></button></div>
      {model.projectAttention.length?<ul className="mt-3 grid gap-2 md:grid-cols-2">{model.projectAttention.slice(0,4).map(({project,items})=><li key={project.id} className="rounded-lg border border-[#EDF0F6] p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{project.title}</p><span className="rounded bg-[#F3F0FF] px-2 py-1 text-[11px] text-[#6034B7]">{items.length} pendência(s)</span></div><p className="mt-1 text-xs text-[#697386]">{overviewClient(project)?.name??"Cliente não informado"}</p><p className="mt-2 line-clamp-2 text-xs text-[#525B70]">{items[0].reasons.join(" · ")}</p></li>)}</ul>:<p className="mt-3 text-xs text-[#697386]">Nenhum projeto com pendência confirmada.</p>}
     </section>
     {model.invalidDates>0&&<p role="status" className="text-xs text-[#697386]">Algumas datas inválidas não foram incluídas nos indicadores.</p>}
    </>}
   </main>;
}
