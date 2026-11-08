"use client";
import {useEffect,useState} from "react";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
import {supabase} from "@/lib/supabase";
import type {ClientWorkspace,PortalModule} from "@/lib/operations/model";
import type {ExecutionItem} from "./ProjectTimeline";
import type {EditorialItem} from "./EditorialCalendar";
import type {AgendaItem} from "@/Components/admin/OperationalAgenda";
import type {CampaignRecord} from "@/Components/admin/CampaignsHub";
import {balance,brl,displayDate,todayInBrazil,type ClientFinanceState} from "@/lib/finance/model";
type Project={id:string;title:string;status:string;updated_at:string;data:{planningStages?:{id:string;title:string;dueDate:string;status:string}[];executionTimeline?:ExecutionItem[];editorialCalendar?:EditorialItem[];operationalAgenda?:AgendaItem[];marketingCampaigns?:CampaignRecord[]}|null};
type Decision={project_id:string;content_id:string;content_version:string;decision:"approved"|"changes_requested";decided_at:string;comment?:string|null};
type ClientAction={title:string;detail:string;target:PortalModule;projectId?:string;contentId?:string};
const names:Record<PortalModule,string>={planning:"Planejamento",execution:"Execução",content:"Conteúdo",campaigns:"Campanhas",meetings:"Reuniões",contract:"Contrato",drive:"Drive",finance:"Financeiro"};
export default function ClientOverview({projects,workspace,onNavigate}:{projects:Project[];workspace:ClientWorkspace;onNavigate:(module:PortalModule,projectId?:string,contentId?:string)=>void}){
 const decisionKey=JSON.stringify(projects.map(p=>p.id));
 const [decisionResult,setDecisionResult]=useState<{key:string;rows:Decision[];ideaRows:Decision[];error:boolean}|null>(null);
 const decisions=decisionResult?.key===decisionKey?decisionResult.rows:[];
 const ideaDecisions=decisionResult?.key===decisionKey?decisionResult.ideaRows:[];
 const decisionError=decisionResult?.key===decisionKey&&decisionResult.error;
 const decisionsLoading=workspace.modules.includes("content")&&projects.length>0&&decisionResult?.key!==decisionKey;
 const [finance,setFinance]=useState<ClientFinanceState|null>(null),[financeError,setFinanceError]=useState(false);
 useEffect(()=>{let alive=true;const ids=projects.map(p=>p.id);if(ids.length&&workspace.modules.includes("content"))void (async()=>{const [r,ideas]=await Promise.all([
  supabase.from("editorial_approvals").select("project_id,content_id,content_version,decision,decided_at,comment").in("project_id",ids),
  supabase.from("editorial_idea_approvals").select("project_id,content_id,content_version,decision,decided_at,comment").in("project_id",ids)
 ]);if(alive){setDecisionResult({key:decisionKey,rows:(r.data??[]) as Decision[],ideaRows:(ideas.data??[]) as Decision[],error:Boolean(r.error||ideas.error)});}})();if(workspace.modules.includes("finance"))void import("@/lib/finance/api").then(m=>m.financeRequest(true)).then(r=>{if(alive)setFinance(r)}).catch(()=>{if(alive)setFinanceError(true)});return()=>{alive=false;};},[projects,workspace,decisionKey]);
 const allowed=(module:PortalModule)=>workspace.modules.includes(module),today=todayInBrazil();
 const tasks=allowed("execution")?projects.flatMap(p=>(p.data?.executionTimeline??[]).map(t=>({...t,project:p.title,projectId:p.id}))):[];
 const stages=allowed("planning")?projects.flatMap(p=>(p.data?.planningStages??[]).map(t=>({...t,project:p.title,projectId:p.id}))):[];
 const deliverables=tasks.length?tasks:stages,completed=deliverables.filter(t=>t.status==="completed").length,pct=deliverables.length?Math.round(100*completed/deliverables.length):0;
 const next=[...deliverables].filter(t=>!["completed","cancelled"].includes(t.status??"planned")&&t.dueDate).sort((a,b)=>a.dueDate!.localeCompare(b.dueDate!))[0];
 const content=allowed("content")?projects.flatMap(p=>(p.data?.editorialCalendar??[]).filter(i=>i.visibleToClient===true).map(i=>({...i,projectId:p.id}))):[];
 const decided=(rows:Decision[],item:(typeof content)[number])=>rows.some(d=>d.project_id===item.projectId&&d.content_id===item.id&&d.content_version===(item.version??""));
 const pendingIdeas=content.filter(i=>i.status==="idea_pending"&&!decided(ideaDecisions,i));
 const pendingFinal=content.filter(i=>i.status==="awaiting_client"&&!decided(decisions,i));
 const pendingCount=pendingIdeas.length+pendingFinal.length;
 const approvedIdeas=content.filter(i=>ideaDecisions.some(d=>d.project_id===i.projectId&&d.content_id===i.id&&d.content_version===(i.version??"")&&d.decision==="approved"));
 const approvedFinal=content.filter(i=>decisions.some(d=>d.project_id===i.projectId&&d.content_id===i.id&&d.content_version===(i.version??"")&&d.decision==="approved"));
 const produced=content.filter(i=>["production","recording","review"].includes(i.status)).length;
 const scheduled=content.filter(i=>i.status==="scheduled").length;
 const published=content.filter(i=>i.status==="published").length;
 const meetings=allowed("meetings")?projects.flatMap(p=>p.data?.operationalAgenda??[]).filter(m=>m.status==="planned"&&m.date>=today).sort((a,b)=>(a.date+(a.time??"")).localeCompare(b.date+(b.time??""))):[];
 const campaigns=allowed("campaigns")?projects.flatMap(p=>p.data?.marketingCampaigns??[]):[];
 const invoices=finance?.invoices.filter(i=>!i.cancelled&&balance(i)>0)??[];
 const contentAttention:ClientAction[]=!decisionError&&!decisionsLoading?[
  ...pendingIdeas.map(i=>({title:"Aprovar ideia: "+i.title,detail:i.channel+" · versão "+(i.version||"não informada")+" · prevista para "+displayDate(i.publishDate),target:"content" as const,projectId:i.projectId,contentId:i.id})),
  ...pendingFinal.map(i=>({title:"Aprovar material final: "+i.title,detail:i.channel+" · versão "+(i.version||"não informada")+" · prevista para "+displayDate(i.publishDate),target:"content" as const,projectId:i.projectId,contentId:i.id}))
 ]:[];
 const attention:ClientAction[]=[...contentAttention,...invoices.filter(i=>i.due_date<today).map(i=>({title:"Mensalidade vencida: "+i.title+" · "+brl(balance(i)),detail:"Pagamento pendente",target:"finance" as const}))];
 const activity=(!decisionError&&!decisionsLoading?[
   ...ideaDecisions.map(d=>({...d,phase:"Ideia"})),
   ...decisions.map(d=>({...d,phase:"Material final"}))
 ].map(d=>({date:d.decided_at,title:(d.decision==="approved"?"Aprovação registrada":"Ajustes solicitados")+" · "+d.phase,detail:content.find(i=>i.projectId===d.project_id&&i.id===d.content_id)?.title??"Publicação editorial",projectId:d.project_id,contentId:d.content_id})):[])
  .filter(d=>d.date&&content.some(i=>i.projectId===d.projectId&&i.id===d.contentId))
  .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 const recentProjects=[...projects].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,5);
 const serviceValue=(m:PortalModule)=>m==="planning"?projects.some(p=>p.status==="published")?"Planejamento disponibilizado":"Acompanhe as etapas compartilhadas":m==="execution"?tasks.length?completed+" de "+tasks.length+" entregas concluídas":"Nenhuma entrega compartilhada":m==="content"?decisionsLoading?"Conferindo aprovações…":decisionError?"Aprovações indisponíveis":content.length+" conteúdos · "+pendingCount+" pendentes de aprovação":m==="campaigns"?campaigns.filter(c=>c.status==="active").length+" em andamento":m==="meetings"?meetings[0]?displayDate(meetings[0].date)+" · "+(meetings[0].time||"Horário a definir"):"Nenhuma reunião futura":m==="contract"?workspace.contracts.length+" contrato(s) disponibilizado(s)":m==="drive"?workspace.folders.length+" pasta(s) compartilhada(s)":financeError?"Consulta indisponível":finance?invoices.length?invoices.length+" lançamento(s) em aberto":"Nenhum lançamento pendente":"Consultando mensalidades…";
 return <div className="space-y-5"><section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{projects.length===1?projects[0].title:"Acompanhamento dos seus projetos"}</h2><span className="rounded-full bg-[#EDF0F5] px-3 py-1 text-xs text-[#586274]">{projects.length} projeto(s)</span></div>{deliverables.length?<><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs text-[#697386]">Entregas concluídas</p><p className="mt-1 text-3xl font-bold">{pct}%</p></div><p className="text-xs text-[#697386]">{completed} de {deliverables.length} entregas</p></div><div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Entregas concluídas" className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8ECF3]"><div className="h-full bg-[#78B82D]" style={{width:pct+"%"}}/></div></>:<p className="mt-5 text-sm text-[#697386]">As etapas e entregas aparecerão aqui quando forem compartilhadas pela equipe.</p>}{next&&<div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F6F7FB] p-4"><div><p className="text-xs text-[#697386]">Próxima entrega{next.dueDate!<today?" · prazo em revisão":""}</p><p className="mt-1 text-sm font-semibold">{next.title} · {displayDate(next.dueDate!)}</p></div><button type="button" onClick={()=>onNavigate(tasks.length?"execution":"planning",next.projectId)} className="text-sm font-semibold text-[#6D35F5]">Ver detalhes →</button></div>}</section>
 <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">Precisa da sua atenção</h2>{attention.length?<div className="mt-3 divide-y divide-[#E3E7F0]">{attention.map((item,i)=><div key={i} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold text-[#344056]">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{item.detail}</p></div><button type="button" onClick={()=>onNavigate(item.target,item.projectId,item.contentId)} className="text-xs font-semibold text-[#6D35F5]">Ver →</button></div>)}</div>:<p className="mt-3 text-sm text-[#697386]">{decisionsLoading?"Conferindo aprovações antes de apresentar suas pendências…":decisionError||financeError?"Algumas informações não puderam ser verificadas. Consulte o serviço correspondente.":"Nenhuma ação pendente identificada nos registros compartilhados."}</p>}</section>
 <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><h2 className="text-lg font-bold">Acompanhamento dos serviços</h2>
  {allowed("content")&&content.length>0&&<div className="mt-4 flex flex-wrap gap-2">{[
    ["Conteúdos",content.length],["Aguardam sua decisão",pendingCount],["Ideias aprovadas",approvedIdeas.length],["Em produção",produced],["Materiais aprovados",approvedFinal.length],["Agendados",scheduled],["Publicados",published]
  ].map(([label,count])=><span key={label} className="rounded-lg border border-[#E3E7F0] bg-[#F8F9FC] px-3 py-2 text-xs text-[#525B70]"><strong className="text-[#090D1C]">{count}</strong> {label}</span>)}</div>}{!workspace.modules.length&&<p className="mt-3 text-sm text-[#697386]">Nenhum serviço foi disponibilizado para esta conta.</p>}<div className="mt-4 grid gap-3 sm:grid-cols-2">{workspace.modules.map(m=><button type="button" key={m} onClick={()=>onNavigate(m)} className="rounded-xl border border-[#E3E7F0] p-4 text-left hover:border-[#6D35F5]"><p className="text-xs text-[#697386]">{names[m]}</p><p className="mt-2 text-sm font-semibold">{serviceValue(m)}</p><p className="mt-3 text-xs font-semibold text-[#6D35F5]">Ver detalhes →</p></button>)}</div></section>
 <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><ContentTablerIcon name="clock" size={20}/>Atualizações recentes</h2>
  {activity.length?<div className="mt-3 divide-y divide-[#E3E7F0]">{activity.map((a,i)=><div key={a.projectId+":"+a.contentId+":"+a.date+":"+i} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#344056]">{a.title}</p><p className="mt-1 text-xs text-[#697386]">{a.detail} · {new Date(a.date).toLocaleString("pt-BR")}</p></div><button type="button" onClick={()=>onNavigate("content",a.projectId,a.contentId)} className="shrink-0 text-xs font-semibold text-[#6D35F5]">Ver →</button></div>)}</div>:
  decisionError?<p className="mt-3 text-sm text-[#697386]">Histórico de aprovações indisponível. Consulte Conteúdo.</p>:
  decisionsLoading?<p className="mt-3 text-sm text-[#697386]">Conferindo atualizações...</p>:
  <p className="mt-3 text-sm text-[#697386]">Ainda não há decisões de aprovação registradas.</p>}
  {recentProjects.length>0&&<div className="mt-4 border-t border-[#E3E7F0] pt-3"><p className="text-xs font-semibold text-[#697386]">Projetos atualizados</p>{recentProjects.map(p=><div key={p.id} className="mt-2 text-sm text-[#525B70]">{p.title}<p className="text-xs text-[#8992A5]">Atualizado em {new Date(p.updated_at).toLocaleDateString("pt-BR")}</p></div>)}</div>}
 </section></div>;
}
