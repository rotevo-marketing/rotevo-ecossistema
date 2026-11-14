"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import Link from "next/link";
import {balance,brl,todayInBrazil,type FinanceState} from "@/lib/finance/model";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon,type RotevoIconName} from "@/Components/RotevoTablerIcon";
import {buildOperationsOverview,overviewClient,overviewDate,overviewProjectHref,overviewToday,type OperationsProject,type OverviewDecision,type OverviewItem,type OverviewSource} from "@/lib/overview/model";
import {loadOverviewDecisions} from "@/lib/overview/approvals";
import AdminWorkConsole from "./AdminWorkConsole";
import WorkflowFocusQueue from "./WorkflowFocusQueue";
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
type Props={projects:OperationsProject[];userId?:string|null;userName?:string;state?:"ready"|"loading"|"error"|"forbidden";onOpenProjects:()=>void;onOpenTasks?:()=>void;onOpenMeetings?:()=>void;onOpenContent?:()=>void;onOpenFinance?:()=>void;onOpenNotification?:(projectId:string,contentId:string)=>void;onOpenTaskNotification?:(projectId:string,taskId:string)=>void};
export default function AdminOperationsOverview({projects,userId=null,userName="",state="ready",onOpenProjects,onOpenTasks,onOpenMeetings,onOpenContent,onOpenFinance,onOpenNotification,onOpenTaskNotification}:Props){
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
  const approvalItems=model.attention.filter(item=>item.kind==="editorial"||item.kind==="document");
  const dashboardCard="rounded-2xl border p-4 sm:p-5";
  const firstName=userName.trim().split(/\s+/)[0]||"";
  const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
  const greeting=hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";
  const formattedToday=todayDate.charAt(0).toUpperCase()+todayDate.slice(1);
  return <main aria-label="Meu dia na Rotevo" className="rv-ui3-daily-dashboard space-y-4 pb-6 text-[#323647] sm:space-y-5">
    <header className="flex items-start justify-between gap-4 py-2"><div className="min-w-0"><p className="flex items-center gap-2 text-xs font-medium text-[#697386]"><RotevoTablerIcon name="calendar-week" size={15} stroke={1.7}/>{formattedToday}</p><h2 className="mt-2 text-[clamp(23px,2.3vw,32px)] font-semibold tracking-tight text-[#17172A]">{greeting}{firstName?", "+firstName:""}.</h2><p className="mt-2 max-w-xl text-[13px] leading-5 text-[#646C80]">Seu trabalho, seus compromissos e as prioridades da operação.</p></div></header>
    {!ready?<section role={state==="loading"?"status":"alert"} className={surface}><p className="text-sm font-semibold">{state==="loading"?"Preparando a visão geral":state==="forbidden"?"Acesso não autorizado":"Não foi possível carregar a visão geral"}</p><p className="mt-2 text-xs text-[#697386]">Os indicadores só aparecem quando as fontes autorizadas estiverem disponíveis.</p></section>:<>
     {(model.executionUnavailable||model.agendaUnavailable||model.editorialUnavailable||source==="unavailable"||source==="forbidden")&&<p role="status" className="rounded-lg border border-[#F4DBA6] bg-[#FFFAEF] p-3 text-xs text-[#826321]">Há informações operacionais indisponíveis. Totais desconhecidos foram apresentados como “—”, sem presumir valores.</p>}
     <div className="grid items-start gap-4 xl:grid-cols-2">
      <section className={dashboardCard+" border-[#E1D8FB] bg-[#F7F4FF]"} aria-labelledby="daily-today">
       <div className="flex items-center justify-between gap-3"><h3 id="daily-today" className="text-[15px] font-semibold">Para hoje</h3><strong className="text-xl tabular-nums">{dailyTasks.length}</strong></div>
       <p className="mt-1 text-xs text-[#697386]">Tarefas atribuídas à sua conta com prazo hoje.</p>
       {dailyTasks.length?<ul className="mt-3 divide-y divide-[#E1D8FB]">{dailyTasks.slice(0,5).map(item=><li key={item.key}><Link href={overviewProjectHref(item.project)??"#daily-today"} className="block rounded-lg px-2 py-3 text-[13px] hover:bg-white/70"><strong className="block truncate font-medium">{item.title}</strong><span className="mt-1 block text-xs text-[#697386]">{overviewClient(item.project)?.name??item.project.title}</span></Link></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma tarefa com prazo hoje.</p>}
       {dailyTasks.length>5&&onOpenTasks&&<button type="button" onClick={onOpenTasks} className={simpleAction}>Ver todas</button>}
      </section>
      <section className={dashboardCard+" border-[#F5E0BD] bg-[#FFF8EB]"} aria-labelledby="daily-overdue">
       <div className="flex items-center justify-between gap-3"><h3 id="daily-overdue" className="text-[15px] font-semibold">Atrasadas</h3><strong className="text-xl tabular-nums">{model.overdueTasks===null?"—":model.overdueTasks}</strong></div>
       <p className="mt-1 text-xs text-[#697386]">Pendências operacionais com prazo vencido.</p>
       {overduePersonal.length?<ul className="mt-3 divide-y divide-[#F5E0BD]">{overduePersonal.slice(0,5).map(item=><li key={item.key}><Link href={overviewProjectHref(item.project)??"#daily-overdue"} className="block rounded-lg px-2 py-3 text-[13px] hover:bg-white/70"><strong className="block truncate font-medium">{item.title}</strong><span className="mt-1 block text-xs text-[#697386]">{overviewClient(item.project)?.name??item.project.title} · {overviewDate(item.due)}</span></Link></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma tarefa pessoal atrasada.</p>}
       {onOpenTasks&&<button type="button" onClick={onOpenTasks} className={simpleAction}>Ver todas as tarefas</button>}
      </section>
      <section className={dashboardCard+" border-[#D9ECE1] bg-[#F3FAF6]"} aria-labelledby="daily-approvals">
       <div className="flex items-center justify-between gap-3"><h3 id="daily-approvals" className="text-[15px] font-semibold">Aprovações</h3><strong className="text-xl tabular-nums">{model.pendingDecisions===null?"—":model.pendingDecisions}</strong></div>
       <p className="mt-1 text-xs text-[#697386]">Decisões formais pendentes nos projetos.</p>
       {approvalItems.length?<ul className="mt-3 divide-y divide-[#D9ECE1]">{approvalItems.slice(0,5).map(item=><li key={item.key}><Link href={overviewProjectHref(item.project)??"#daily-approvals"} className="block rounded-lg px-2 py-3 text-[13px] hover:bg-white/70"><strong className="block truncate font-medium">{item.title}</strong><span className="mt-1 block text-xs text-[#697386]">{overviewClient(item.project)?.name??item.project.title}</span></Link></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma decisão formal pendente.</p>}
       {onOpenContent&&<button type="button" onClick={onOpenContent} className={simpleAction}>Ver todas as aprovações</button>}
       {process.env.NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED==="true"&&userId&&onOpenNotification&&<WorkflowFocusQueue userId={userId} onOpenContent={onOpenNotification} onOpenTask={onOpenTaskNotification}/>}
      </section>
      <section className={dashboardCard+" border-[#D8E8FA] bg-[#F3F8FE]"} aria-labelledby="daily-agenda">
       <div className="flex items-center justify-between gap-3"><h3 id="daily-agenda" className="text-[15px] font-semibold">Agenda</h3><strong className="text-xl tabular-nums">{model.agendaUnavailable?"—":dayMeetings.length}</strong></div>
       <p className="mt-1 text-xs text-[#697386]">Compromissos de hoje e próximos encontros.</p>
       {dayMeetings.length?<ul className="mt-3 divide-y divide-[#D8E8FA]">{dayMeetings.slice(0,3).map(item=><li key={item.key} className="py-3 text-[13px]"><strong className="block font-medium">{item.title}</strong><span className="mt-1 block text-xs text-[#697386]">{item.time??"Sem horário"} · {overviewClient(item.project)?.name??item.project.title}</span></li>)}</ul>:<p className="mt-4 text-xs text-[#697386]">Nenhuma reunião agendada para hoje.</p>}
       {upcomingMeetings.length>0&&<div className="mt-3 border-t border-[#D8E8FA] pt-3"><p className="text-xs font-semibold">Próximos compromissos</p>{upcomingMeetings.slice(0,3).map(item=><p key={item.key} className="mt-2 text-xs text-[#697386]">{overviewDate(item.due)} · {item.title}</p>)}</div>}
       {onOpenMeetings&&<button type="button" onClick={onOpenMeetings} className={simpleAction}>Ver agenda</button>}
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
