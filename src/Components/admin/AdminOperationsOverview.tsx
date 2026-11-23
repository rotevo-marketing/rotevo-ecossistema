"use client";
import {useEffect,useMemo,useState} from "react";
import {balance,brl,todayInBrazil,type FinanceState} from "@/lib/finance/model";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon,type RotevoIconName} from "@/Components/RotevoTablerIcon";
import {buildOperationsOverview,overviewClient,overviewProjectHref,overviewToday,type OperationsProject,type OverviewDecision,type OverviewSource} from "@/lib/overview/model";
import {loadOverviewDecisions} from "@/lib/overview/approvals";
import {DailyTaskCenters,type TaskProject} from "./CentralTarefas";
import {AdminMeetingsHub} from "./OperationalHubs";
import {usePortalRefresh} from "@/hooks/usePortalRefresh";
import WorkflowFocusQueue from "./WorkflowFocusQueue";
export type {OperationsProject} from "@/lib/overview/model";
type Props={onChanged:(id:string,data:TaskProject["data"],updatedAt:string)=>void;projects:OperationsProject[];userId?:string|null;userName?:string;state?:"ready"|"loading"|"error"|"forbidden";onOpenProjects:()=>void;onOpenTasks?:()=>void;onOpenMeetings?:()=>void;onOpenContent?:()=>void;onOpenFinance?:()=>void;onOpenNotification?:(projectId:string,contentId:string)=>void;onOpenTaskNotification?:(projectId:string,taskId:string)=>void};
export default function AdminOperationsOverview({projects,userId=null,userName="",state="ready",onChanged,onOpenProjects,onOpenTasks,onOpenMeetings,onOpenContent,onOpenFinance,onOpenNotification,onOpenTaskNotification}:Props){
 const [financial,setFinancial]=useState<FinanceState|null>(null),[financialError,setFinancialError]=useState("");
 useEffect(()=>{if(state!=="ready")return;let alive=true;void import("@/lib/finance/api").then(m=>m.financeRequest(false)).then(data=>{if(alive){setFinancial(data);setFinancialError("");}}).catch(e=>{if(alive)setFinancialError(e instanceof Error?e.message:"Consulta financeira indisponível.");});return()=>{alive=false;};},[state]);
 const financeToday=todayInBrazil(),overdueIncoming=financial?.invoices.filter(i=>i.direction==="in"&&!i.cancelled&&balance(i)>0&&i.due_date<financeToday)??[];
 const [retry,setRetry]=useState(0);
 usePortalRefresh(()=>setRetry(value=>value+1),state==="ready");
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
  const month=today.slice(0,7);
  const incoming=financial?.invoices.filter(i=>!i.cancelled&&i.direction==="in")??[];
  const dueReceivables=incoming.filter(i=>balance(i)>0);
  const dueTotal=dueReceivables.reduce((n,i)=>n+balance(i),0);
  const paidThisMonth=financial?.settlements.filter(s=>!s.reversed&&s.paid_on.startsWith(month)&&incoming.some(i=>i.id===s.invoice_id)).reduce((n,s)=>n+s.amount_cents,0)??0;
  const overdueTotal=overdueIncoming.reduce((n,i)=>n+balance(i),0);
  const todayDate=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
  const surface="rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-5";
  const simpleAction="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#6034B7] hover:bg-[#F4F0FF] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]";
  const approvalItems=model.attention.flatMap(item=>{
   if(!item.approval)return [];
   const {id,phase,priority}=item.approval;
   return [{id,phase,priority,title:item.title,projectId:item.project.id,dueDate:item.due,open:()=>{
    if(phase!=="document"&&onOpenNotification){onOpenNotification(item.project.id,id);return;}
    const href=overviewProjectHref(item.project);
    if(href)window.location.assign(href);
   }}];
  });
  const firstName=userName.trim().split(/\s+/)[0]||"";
  const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
  const greeting=hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";
  const formattedToday=todayDate.charAt(0).toUpperCase()+todayDate.slice(1);
  return <main aria-label="Meu dia na Rotevo" className="rv-ui3-daily-dashboard space-y-4 pb-6 text-[#323647] sm:space-y-5">
    <header className="flex items-start justify-between gap-4 py-2"><div className="min-w-0"><p className="flex items-center gap-2 text-xs font-medium text-[#697386]"><RotevoTablerIcon name="calendar-week" size={15} stroke={1.7}/>{formattedToday}</p><h2 className="mt-2 text-[clamp(23px,2.3vw,32px)] font-semibold tracking-tight text-[#17172A]">{greeting}{firstName?", "+firstName:""}.</h2><p className="mt-2 max-w-xl text-[13px] leading-5 text-[#646C80]">Seu trabalho, seus compromissos e as prioridades da operação.</p></div></header>
    {!ready?<section role={state==="loading"?"status":"alert"} className={surface}><p className="text-sm font-semibold">{state==="loading"?"Preparando a visão geral":state==="forbidden"?"Acesso não autorizado":"Não foi possível carregar a visão geral"}</p><p className="mt-2 text-xs text-[#697386]">Os indicadores só aparecem quando as fontes autorizadas estiverem disponíveis.</p></section>:<>
     {(model.executionUnavailable||model.agendaUnavailable||model.editorialUnavailable||source==="unavailable"||source==="forbidden")&&<p role="status" className="rounded-lg border border-[#F4DBA6] bg-[#FFFAEF] p-3 text-xs text-[#826321]">Há informações operacionais indisponíveis. Totais desconhecidos foram apresentados como “—”, sem presumir valores.</p>}
     <DailyTaskCenters approvals={approvalItems} projects={projects} day={today} userId={userId} onChanged={onChanged} onOpenTasks={onOpenTasks} onOpenContent={onOpenContent} onOpenAssignedContent={onOpenNotification}/>
     <section aria-label="Ações e avisos de aprovações">
      {model.pendingDecisions===null&&<p role="status" className="mt-2 text-xs">{source==="loading"?"Consultando aprovações…":"Há fontes de aprovação indisponíveis."}</p>}
      {onOpenContent&&<button type="button" onClick={onOpenContent} className={simpleAction}>Ver todas as aprovações</button>}
      {process.env.NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED==="true"&&userId&&onOpenNotification&&<WorkflowFocusQueue userId={userId} onOpenContent={onOpenNotification} onOpenTask={onOpenTaskNotification}/>}
     </section>
     <section className={surface} aria-label="Agenda">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Agenda de hoje</h3>{onOpenMeetings&&<button type="button" onClick={onOpenMeetings} className={simpleAction}>Ver agenda</button>}</div>
      <AdminMeetingsHub projects={projects.map(p=>({...p,data:p.data??{}}))} userId={userId} onChanged={onChanged} day={today}/>
     </section>
     <section className={surface} aria-labelledby="daily-finance">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="daily-finance" className="flex items-center gap-2 text-sm font-semibold"><RotevoTablerIcon name="currency-dollar" size={18} stroke={1.6}/> Resumo financeiro</h3>{onOpenFinance&&<button onClick={onOpenFinance} type="button" className={simpleAction} aria-label="Acessar módulo Financeiro"><RotevoTablerIcon name="external-link" size={16} stroke={1.6}/></button>}</div>
      <p className="mt-1 text-xs text-[#697386]">Recebimentos e saldos registrados · mês atual</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">{[{label:"A receber",value:financial?brl(dueTotal):"—",hint:"Saldo aberto de cobranças",icon:"hourglass" as RotevoIconName},{label:"Recebido no mês",value:financial?brl(paidThisMonth):"—",hint:"Baixas registradas",icon:"circle-check" as RotevoIconName},{label:"Em atraso",value:financial?brl(overdueTotal):"—",hint:"Recebimentos vencidos",icon:"alert-circle" as RotevoIconName}].map(metric=><div key={metric.label} className="rounded-lg border border-[#EDF0F6] bg-[#FAFBFD] p-3"><div className="flex items-center gap-2 text-xs text-[#697386] rv-ui3-finance-metric-label"><RotevoTablerIcon name={metric.icon} size={16} stroke={1.5}/>{metric.label}</div><p className="mt-2 text-lg font-semibold tabular-nums">{metric.value}</p><p className="mt-1 text-[11px] text-[#697386] rv-ui3-finance-metric-label">{metric.hint}</p></div>)}</div>
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
