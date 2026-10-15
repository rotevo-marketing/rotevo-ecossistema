"use client";
import { useMemo } from "react";
import Link from "next/link";
import { RotevoTablerIcon, type RotevoIconName } from "@/Components/RotevoTablerIcon";
import type { ExecutionItem } from "@/Components/cliente/ProjectTimeline";

export type OperationsProject = {
 id:string; title:string;slug:string;status:"draft"|"in_progress"|"published"|"archived";updated_at:string;
 data:{executionTimeline?:ExecutionItem[];coverImageUrl?:string|null;operationalStatus?:string}|null;
 clients:{id:string;name:string;slug:string}|{id:string;name:string;slug:string}[]|null;
};
const client=(p:OperationsProject)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
const status=(s:string)=>s==="draft"?"Em produção":s==="in_progress"?"Em andamento":s==="published"?"Publicado":"Arquivado";
const date=(s:string)=>{const p=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);return p?`${p[3]}/${p[2]}/${p[1]}`:s;};
const today=()=>new Date().toISOString().slice(0,10);
export default function AdminOperationsOverview({projects,onOpenProjects}:{projects:OperationsProject[];onOpenProjects:()=>void}){
 const records=useMemo(()=>projects.flatMap(p=>(p.data?.executionTimeline??[]).filter(t=>t&&typeof t.title==="string").map(t=>({...t,project:p,owner:t.owner?.trim()||"Não atribuído"}))),[projects]);
 const active=records.filter(t=>t.status!=="completed"&&t.status!=="cancelled");
 const overdue=active.filter(t=>t.dueDate&&t.dueDate<today());
 const upcoming=active.filter(t=>t.dueDate&&t.dueDate>=today()).sort((a,b)=>(a.dueDate??"").localeCompare(b.dueDate??""));
 const attention=[...overdue,...active.filter(t=>t.status==="blocked")].filter((item,index,array)=>array.findIndex(t=>t.id===item.id&&t.project.id===item.project.id)===index).slice(0,5);
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
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Prioridades da operação</h2><p className="mt-1 text-sm text-[#697386]">Entregas em atraso ou bloqueadas nos projetos cadastrados.</p></div>
    <button type="button" onClick={onOpenProjects} className="cursor-pointer text-sm font-semibold text-[#6D35F5]">Ver projetos →</button></div>
   {attention.length===0?<p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Nenhuma entrega atrasada ou bloqueada registrada até o momento. Aprovações e reuniões serão integradas nas próximas etapas.</p>:
    <div className="mt-5 divide-y divide-[#E3E7F0]">{attention.map(t=><div key={t.project.id+":"+t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div><p className="text-sm font-semibold">{t.title}</p><p className="mt-1 text-xs text-[#697386]">{client(t.project)?.name??"Cliente"} · {t.owner}{t.dueDate?` · ${date(t.dueDate)}`:""}</p></div>
      <Link className="text-sm font-semibold text-[#6D35F5] hover:underline" href={`/admin/planejamentos/${client(t.project)?.slug??""}`}>Abrir projeto →</Link>
    </div>)}</div>}
  </section>
  <div className="grid gap-5 xl:grid-cols-2">
   <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Projetos em acompanhamento</h2><button type="button" onClick={onOpenProjects} className="cursor-pointer text-sm font-semibold text-[#6D35F5]">Ver todos →</button></div>
    {projects.length===0?<p className="text-sm text-[#697386]">Nenhum projeto cadastrado.</p>:<div className="divide-y divide-[#E3E7F0]">{projects.slice(0,6).map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div><p className="text-sm font-semibold">{client(p)?.name??"Cliente sem nome"}</p><p className="mt-1 text-xs text-[#697386]">{p.title} · {status(p.status)}</p></div>
      <Link href={`/admin/planejamentos/${client(p)?.slug??""}`} className="text-sm font-semibold text-[#6D35F5] hover:underline">Gerenciar →</Link>
    </div>)}</div>}
   </section>
   <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
    <h2 className="text-lg font-semibold">Próximas entregas</h2><p className="mt-1 text-sm text-[#697386]">Atividades com prazo futuro ou para hoje.</p>
    {upcoming.length===0?<p className="mt-5 text-sm text-[#697386]">Nenhuma entrega futura com prazo cadastrado.</p>:<div className="mt-4 divide-y divide-[#E3E7F0]">{upcoming.slice(0,6).map(t=><div key={t.project.id+":"+t.id} className="flex items-center justify-between gap-2 py-3"><div><p className="text-sm font-semibold">{t.title}</p><p className="text-xs text-[#697386]">{client(t.project)?.name??"Cliente"} · {t.owner}</p></div><span className="shrink-0 text-xs font-semibold text-[#525B70]">{date(t.dueDate??"")}</span></div>)}</div>}
   </section>
  </div>
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <h2 className="text-lg font-semibold">Operação integrada</h2><p className="mt-2 text-sm leading-6 text-[#525B70]">Esta visão reúne projetos e entregas já registrados na Rotevo. Calendário editorial, aprovações, reuniões, equipe e saúde automática de projetos serão conectados quando seus registros estiverem disponíveis. Nenhuma atividade ou indicador é simulado.</p>
  </section>
 </div>;
}
