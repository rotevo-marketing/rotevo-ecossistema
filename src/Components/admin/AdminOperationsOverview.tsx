"use client";
import { useMemo } from "react";
import Link from "next/link";
import { RotevoTablerIcon, type RotevoIconName } from "@/Components/RotevoTablerIcon";
import type { ExecutionItem } from "@/Components/cliente/ProjectTimeline";
import type { EditorialItem } from "@/Components/cliente/EditorialCalendar";
import type { AgendaItem } from "@/Components/admin/OperationalAgenda";

export type OperationsProject = {
 id:string; title:string;slug:string;status:"draft"|"in_progress"|"published"|"archived";updated_at:string;
 data:{executionTimeline?:ExecutionItem[];editorialCalendar?:EditorialItem[];operationalAgenda?:AgendaItem[];coverImageUrl?:string|null;operationalStatus?:string;ecosystem2027?:{selectedDocumentCodes?:string[];documents?:Record<string,{content?:string;reviewStatus?:string;publishedAt?:string;publishedContent?:string}>}}|null;
 clients:{id:string;name:string;slug:string}|{id:string;name:string;slug:string}[]|null;
};
const client=(p:OperationsProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
const status=(s:string)=>s==="draft"?"Em produção":s==="in_progress"?"Em andamento":s==="published"?"Publicado":"Arquivado";
const date=(s:string)=>{const p=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);return p?`${p[3]}/${p[2]}/${p[1]}`:s;};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
export default function AdminOperationsOverview({projects,onOpenProjects}:{projects:OperationsProject[];onOpenProjects:()=>void}){
 const documentSummary=useMemo(()=>projects.map(project=>{
   const eco=project.data?.ecosystem2027;
   const selected=[...new Set((eco?.selectedDocumentCodes??[]).filter(code=>/^\d{2}\.\d{2}$/.test(code)))];
   const released=selected.filter(code=>typeof eco?.documents?.[code]?.publishedAt==="string"&&typeof eco?.documents?.[code]?.publishedContent==="string").length;
   const review=selected.filter(code=>eco?.documents?.[code]?.reviewStatus==="review").length;
   const tasks=(project.data?.executionTimeline??[]).filter(t=>t&&typeof t.title==="string");
   const pending=tasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").length;
   const overdue=tasks.filter(t=>t.dueDate&&t.dueDate<today()&&t.status!=="completed"&&t.status!=="cancelled").length;
   const blocked=tasks.filter(t=>t.status==="blocked").length;
   const unassigned=tasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled"&&!t.owner?.trim()&&!t.ownerUserId).length;
   const waitingPrerequisites=tasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled"&&(t.dependencies??[]).some(id=>tasks.find(other=>other.id===id)?.status!=="completed")).length;
   const contents=Array.isArray(project.data?.editorialCalendar)?project.data.editorialCalendar:[];
   const awaitingEditorial=contents.filter(item=>item?.status==="awaiting_client"&&item.visibleToClient===true).length;
   const pastEditorial=contents.filter(item=>item?.publishDate&&item.publishDate<today()&&!["published","idea"].includes(item.status)).length;
   const progress=selected.length?Math.round(released/selected.length*100):0;
   return {project,selected:selected.length,released,review,pending,overdue,blocked,unassigned,waitingPrerequisites,awaitingEditorial,pastEditorial,progress};
 }),[projects]);
 const records=useMemo(()=>projects.flatMap(p=>(p.data?.executionTimeline??[]).filter(t=>t&&typeof t.title==="string").map(t=>({...t,project:p,owner:t.owner?.trim()||"Não atribuído"}))),[projects]);
 const ownership=useMemo(()=>{
  const map=new Map<string,{name:string;open:number;overdue:number;blocked:number;urgent:number}>();
  for(const project of projects){
   for(const task of project.data?.executionTimeline??[]){
    if(!task||task.status==="completed"||task.status==="cancelled")continue;
    const name=task.owner?.trim()||"Não atribuído";
    const key=task.ownerUserId||name;
    const record=map.get(key)??{name,open:0,overdue:0,blocked:0,urgent:0};
    record.open++;
    if(task.dueDate&&task.dueDate<today())record.overdue++;
    if(task.status==="blocked")record.blocked++;
    if(task.priority==="urgent")record.urgent++;
    map.set(key,record);
   }
  }
  return [...map.values()].sort((a,b)=>b.open-a.open||a.name.localeCompare(b.name,"pt-BR"));
 },[projects]);
 const editorial=useMemo(()=>projects.flatMap(p=>(Array.isArray(p.data?.editorialCalendar)?p.data.editorialCalendar:[]).filter(item=>item&&typeof item.title==="string"&&typeof item.publishDate==="string").map(item=>({...item,project:p}))),[projects]);
 const awaitingApproval=editorial.filter(item=>item.status==="awaiting_client"&&item.visibleToClient===true);
 const editorialOverdue=editorial.filter(item=>item.publishDate<today()&&!["published","idea"].includes(item.status));
 const nextEditorial=editorial.filter(item=>item.publishDate>=today()&&item.status!=="published").sort((a,b)=>a.publishDate.localeCompare(b.publishDate)).slice(0,6);
 const commitments=useMemo(()=>projects.flatMap(p=>(Array.isArray(p.data?.operationalAgenda)?p.data.operationalAgenda:[]).filter(x=>x&&typeof x.date==="string"&&typeof x.title==="string").map(x=>({...x,project:p}))),[projects]);
 const plannedCommitments=commitments.filter(x=>x.status==="planned");
 const overdueCommitments=plannedCommitments.filter(x=>x.date<today());
 const nextCommitments=plannedCommitments.filter(x=>x.date>=today()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);
 const active=records.filter(t=>t.status!=="completed"&&t.status!=="cancelled");
 const overdue=active.filter(t=>t.dueDate&&t.dueDate<today());
 const upcoming=active.filter(t=>t.dueDate&&t.dueDate>=today()).sort((a,b)=>(a.dueDate??"").localeCompare(b.dueDate??""));
 const attention=[...overdue,...active.filter(t=>t.status==="blocked"||t.priority==="urgent")].filter((item,index,array)=>array.findIndex(t=>t.id===item.id&&t.project.id===item.project.id)===index).sort((a,b)=>Number(!!b.dueDate&&b.dueDate<today())-Number(!!a.dueDate&&a.dueDate<today())||Number(b.status==="blocked")-Number(a.status==="blocked")||Number(b.priority==="urgent")-Number(a.priority==="urgent")).slice(0,8);
 const cards:{title:string;value:string;icon:RotevoIconName;description:string}[]=[
  {title:"Projetos cadastrados",value:String(projects.length),icon:"report",description:"Planejamentos e projetos existentes"},
  {title:"Entregas em aberto",value:String(active.length),icon:"chart-dots-3",description:"Itens da execução cadastrados"},
  {title:"Tarefas atrasadas",value:String(overdue.length),icon:"alert-square-rounded",description:"Prazos anteriores a hoje"},
  {title:"Aguardando solução",value:String(active.filter(t=>t.status==="blocked").length),icon:"calendar-heart",description:"Entregas marcadas como bloqueadas"}
 ];
 return <div className="space-y-6">
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=><div key={card.title} className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
   <span className="text-[#6D35F5]"><RotevoTablerIcon name={card.icon} size={26}/></span>
   <p className="mt-3 text-sm text-[#525B70]">{card.title}</p><p className="mt-1 text-3xl font-semibold tabular-nums">{card.value}</p><p className="mt-2 text-xs text-[#697386]">{card.description}</p>
  </div>)}</div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Prioridades da operação</h2><p className="mt-1 text-sm text-[#697386]">Entregas em atraso, bloqueadas ou urgentes nos projetos cadastrados.</p></div>
    <button type="button" onClick={onOpenProjects} className="cursor-pointer text-sm font-semibold text-[#6D35F5]">Ver projetos →</button></div>
   {attention.length===0?<p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Nenhuma entrega atrasada ou bloqueada registrada até o momento. Aprovações e reuniões serão integradas nas próximas etapas.</p>:
    <div className="mt-5 divide-y divide-[#E3E7F0]">{attention.map(t=><div key={t.project.id+":"+t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div><p className="text-sm font-semibold">{t.title}</p><p className="mt-1 text-xs text-[#697386]">{client(t.project)?.name??"Cliente"} · {t.owner}{t.dueDate?` · ${date(t.dueDate)}`:""}</p></div>
      <Link className="text-sm font-semibold text-[#6D35F5] hover:underline" href={`/admin/planejamentos/${client(t.project)?.slug??""}`}>Abrir projeto →</Link>
    </div>)}</div>}
  </section>
  <div className="grid gap-5 xl:grid-cols-2">
   <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Projetos recentes</h2><button type="button" onClick={onOpenProjects} className="cursor-pointer text-sm font-semibold text-[#6D35F5]">Ver todos →</button></div>
    {projects.length===0?<p className="text-sm text-[#697386]">Nenhum projeto cadastrado.</p>:<div className="divide-y divide-[#E3E7F0]">{projects.slice(0,6).map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ECE8FA] text-sm font-semibold text-[#5830A7]">{p.data?.coverImageUrl?<img src={p.data.coverImageUrl} alt="" className="h-full w-full object-cover"/>:(client(p)?.name??"C").charAt(0).toUpperCase()}</div><div><p className="text-sm font-semibold">{client(p)?.name??"Cliente sem nome"}</p><p className="mt-1 text-xs text-[#697386]">{p.title} · {status(p.status)}</p></div></div>
      <Link href={`/admin/planejamentos/${client(p)?.slug??""}`} className="text-sm font-semibold text-[#6D35F5] hover:underline">Gerenciar →</Link>
    </div>)}</div>}
   </section>
   <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
    <h2 className="text-lg font-semibold">Próximas entregas</h2><p className="mt-1 text-sm text-[#697386]">Atividades com prazo futuro ou para hoje.</p>
    {upcoming.length===0?<p className="mt-5 text-sm text-[#697386]">Nenhuma entrega futura com prazo cadastrado.</p>:<div className="mt-4 divide-y divide-[#E3E7F0]">{upcoming.slice(0,6).map(t=><div key={t.project.id+":"+t.id} className="flex items-center justify-between gap-2 py-3"><div><p className="text-sm font-semibold">{t.title}</p><p className="text-xs text-[#697386]">{client(t.project)?.name??"Cliente"} · {t.owner}</p></div><span className="shrink-0 text-xs font-semibold text-[#525B70]">{date(t.dueDate??"")}</span></div>)}</div>}
   </section>
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <h2 className="text-lg font-semibold">Reuniões e acompanhamentos</h2><p className="mt-1 text-sm text-[#697386]">Compromissos registrados na agenda operacional dos projetos.</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Agendados</p><p className="mt-2 text-2xl font-semibold">{plannedCommitments.length}</p></div><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Pendentes com data vencida</p><p className="mt-2 text-2xl font-semibold">{overdueCommitments.length}</p></div><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Reuniões registradas</p><p className="mt-2 text-2xl font-semibold">{commitments.filter(x=>x.kind==="meeting").length}</p></div></div>
   <h3 className="mt-5 text-sm font-semibold">Próximos compromissos</h3>{nextCommitments.length===0?<p className="mt-3 text-sm text-[#697386]">Nenhum compromisso futuro pendente.</p>:<div className="mt-3 divide-y divide-[#E3E7F0]">{nextCommitments.map(x=><div key={x.project.id+":"+x.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{x.title}</p><p className="text-xs text-[#697386]">{client(x.project)?.name??"Cliente"} · {x.owner||"Sem responsável"}</p></div><span className="text-xs font-medium">{date(x.date)}</span></div>)}</div>}
  </section>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <h2 className="text-lg font-semibold">Agenda editorial e aprovações</h2>
   <p className="mt-1 text-sm text-[#697386]">Visão dos conteúdos registrados nos projetos. As decisões formais do cliente são acompanhadas no painel de aprovações.</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Conteúdos cadastrados</p><p className="mt-2 text-2xl font-semibold">{editorial.length}</p></div><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Em solicitação de aprovação</p><p className="mt-2 text-2xl font-semibold">{awaitingApproval.length}</p></div><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Datas editoriais vencidas</p><p className="mt-2 text-2xl font-semibold">{editorialOverdue.length}</p></div></div>
   <h3 className="mt-5 text-sm font-semibold">Próximas publicações previstas</h3>
   {nextEditorial.length===0?<p className="mt-3 text-sm text-[#697386]">Nenhuma publicação futura pendente registrada.</p>:<div className="mt-3 divide-y divide-[#E3E7F0]">{nextEditorial.map(item=><div key={item.project.id+":"+item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-[#697386]">{client(item.project)?.name??"Cliente"} · {item.channel} · {item.status}</p></div><span className="text-xs font-medium">{date(item.publishDate)}</span></div>)}</div>}
  </section>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Acompanhamento por cliente e projeto</h2><p className="mt-1 text-sm text-[#697386]">Documentos estratégicos publicados, revisão e pendências de execução. Indicadores calculados a partir dos registros atuais.</p></div><button type="button" onClick={onOpenProjects} className="text-sm font-semibold text-[#6D35F5]">Ver todos os projetos →</button></div>
   {documentSummary.length===0?<p className="mt-5 text-sm text-[#697386]">Nenhum projeto para acompanhar.</p>:<div className="mt-4 divide-y divide-[#E3E7F0]">{documentSummary.map(item=><div key={item.project.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] md:items-center"><div><p className="text-sm font-semibold">{client(item.project)?.name??"Cliente sem nome"}</p><p className="text-xs text-[#697386]">{item.project.title}</p><div className="mt-2 flex items-center gap-2"><progress aria-label={`Progresso dos documentos de ${item.project.title}`} max={100} value={item.progress} className="h-2 w-full max-w-36 accent-[#6D35F5]"/><span className="text-xs tabular-nums text-[#525B70]">{item.selected?`${item.progress}%`:"Sem documentos"}</span></div>{item.blocked>0&&<p className="mt-1 text-xs text-amber-800">{item.blocked} entrega(s) bloqueada(s)</p>}{item.unassigned>0&&<p className="mt-1 text-xs text-[#525B70]">{item.unassigned} atividade(s) sem responsável</p>}{item.waitingPrerequisites>0&&<p className="mt-1 text-xs text-amber-800">{item.waitingPrerequisites} aguardando pré-requisitos</p>}{item.awaitingEditorial>0&&<p className="mt-1 text-xs text-[#525B70]">{item.awaitingEditorial} conteúdo(s) em solicitação de aprovação</p>}{item.pastEditorial>0&&<p className="mt-1 text-xs text-red-700">{item.pastEditorial} prazo(s) editoriais vencidos</p>}</div><div className="text-xs"><strong className="block text-base">{item.released}/{item.selected}</strong>Publicados</div><div className="text-xs"><strong className="block text-base">{item.review}</strong>Em revisão</div><div className="text-xs"><strong className="block text-base">{item.pending}</strong>Entregas abertas</div><div className="text-xs"><strong className="block text-base">{item.overdue}</strong>Atrasadas</div><Link className="text-xs font-semibold text-[#6D35F5] hover:underline" href={`/admin/planejamentos/${client(item.project)?.slug??""}`}>Gerenciar →</Link></div>)}</div>}
  </section>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <h2 className="text-lg font-semibold">Distribuição da carga por responsável</h2>
   <p className="mt-1 text-sm text-[#697386]">Quantidade de tarefas em aberto por membro da equipe, incluindo urgências, atrasos e bloqueios. Não representa horas trabalhadas.</p>
   {ownership.length===0?<p className="mt-4 text-sm text-[#697386]">Nenhuma atividade em aberto.</p>:<div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[#E3E7F0] text-xs text-[#697386]"><th className="py-3 pr-4">Responsável</th><th className="px-3 py-3">Em aberto</th><th className="px-3 py-3">Atrasadas</th><th className="px-3 py-3">Bloqueadas</th><th className="px-3 py-3">Urgentes</th></tr></thead><tbody>{ownership.map(item=><tr key={item.name} className="border-b border-[#F0F1F5]"><th className="py-3 pr-4 font-medium">{item.name}</th><td className="px-3 py-3 tabular-nums">{item.open}</td><td className="px-3 py-3 tabular-nums">{item.overdue}</td><td className="px-3 py-3 tabular-nums">{item.blocked}</td><td className="px-3 py-3 tabular-nums">{item.urgent}</td></tr>)}</tbody></table></div>}
  </section>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <h2 className="text-lg font-semibold">Operação integrada</h2><p className="mt-2 text-sm leading-6 text-[#525B70]">Esta visão reúne projetos e entregas já registrados na Rotevo. A agenda editorial já utiliza registros dos projetos. Aprovações formais usam registros de decisão separados; reuniões e saúde automática de projetos dependem de uma fonte de dados validada. Nenhuma atividade ou indicador é simulado.</p>
  </section>
 </div>;
}
