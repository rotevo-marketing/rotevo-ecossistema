"use client";
import { useMemo, useState } from "react";
import { RotevoTablerIcon } from "@/Components/RotevoTablerIcon";

export type ExecutionItem = {
  id:string;
  title:string;
  description?:string;
  projectTitle?:string;
  phase?:string;
  owner?:string;
  startDate?:string;
  dueDate?:string;
  status?:"planned"|"in_progress"|"blocked"|"completed"|"cancelled";
  kind?:"deliverable"|"milestone"|"task";
  dependencies?:string[];
  driveUrl?:string;
  visibleToClient?:boolean;
};
type Project={id:string;title:string;data:{executionTimeline?:ExecutionItem[];deliverySchedule?:Record<string,string>|null}|null};
const labels:Record<string,string>={
  planned:"Planejado",in_progress:"Em andamento",blocked:"Aguardando",completed:"Concluído",cancelled:"Cancelado"
};
const colors:Record<string,string>={
  planned:"bg-[#ECEFF5] text-[#566073]",in_progress:"bg-[#EDE8FF] text-[#6437C3]",
  blocked:"bg-[#FFF0D9] text-[#94610A]",completed:"bg-[#DFF4E6] text-[#176A3B]",cancelled:"bg-[#F2E9EA] text-[#9C4C59]"
};
const scheduleLabels:Record<string,string>={
 "essencia-do-projeto":"Essência do projeto",
 "fundamentos-estrategicos":"Fundamentos estratégicos",
 "estrategia-editorial-e-canais":"Estratégia editorial e canais",
 "campanhas-automacoes-e-conversao":"Campanhas, automações e conversão",
 "execucao-acompanhamento-e-gestao":"Execução, acompanhamento e gestão"
};
function formatted(value?:string){if(!value)return "A definir";const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(value);return match?`${match[3]}/${match[2]}/${match[1]}`:"A definir";}
function safeLink(url?:string){if(!url)return null;try{const parsed=new URL(url);return parsed.protocol==="https:"?parsed.href:null;}catch{return null;}}
function isExecutionItem(value:unknown):value is ExecutionItem{
  return typeof value==="object"&&value!==null&&typeof (value as ExecutionItem).id==="string"&&typeof (value as ExecutionItem).title==="string";
}
export default function ProjectTimeline({projects}:{projects:Project[]}){
 const [filter,setFilter]=useState("all");
 const [view,setView]=useState<"timeline"|"list">("timeline");
 const {items,legacyMilestones}=useMemo(()=>{
   const items:ExecutionItem[]=[];
   const legacyMilestones:{id:string;projectTitle:string;title:string;dueDate:string}[]=[];
   for(const project of projects){
     for(const item of project.data?.executionTimeline??[]){
       if(!isExecutionItem(item)||item.visibleToClient===false)continue;
       items.push({...item,projectTitle:project.title});
     }
     for(const [key,value] of Object.entries(project.data?.deliverySchedule??{})){
       if(typeof value!=="string"||!value)continue;
       legacyMilestones.push({id:`${project.id}:${key}`,projectTitle:project.title,title:scheduleLabels[key]??key,dueDate:value});
     }
   }
   items.sort((a,b)=>(a.dueDate??"9999").localeCompare(b.dueDate??"9999"));
   legacyMilestones.sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
   return {items,legacyMilestones};
 },[projects]);
 const visible=items.filter(item=>filter==="all"||item.status===filter);
 const completed=items.filter(item=>item.status==="completed").length;
 const next=items.find(item=>item.status!=="completed"&&item.status!=="cancelled"&&item.dueDate&&item.dueDate>=new Date().toISOString().slice(0,10));
 return <div className="space-y-5">
   <section className="grid gap-3 sm:grid-cols-3">
    {[{label:"Entregas cadastradas",value:String(items.length),icon:"report" as const},{label:"Concluídas",value:String(completed),icon:"chart-pie" as const},{label:"Próxima entrega",value:next?formatted(next.dueDate):"A definir",icon:"calendar-heart" as const}].map(k=>
      <div key={k.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
       <span className="text-[#6D35F5]"><RotevoTablerIcon name={k.icon} size={25}/></span>
       <p className="mt-3 text-xs text-[#697386]">{k.label}</p><p className="mt-1 text-lg font-semibold">{k.value}</p>
      </div>)}
   </section>
   <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Linha do tempo de execução</h2>
       <p className="mt-1 text-sm text-[#697386]">Entregas estratégicas, responsáveis e etapas do projeto. O calendário de conteúdo é independente.</p></div>
      <div className="flex rounded-xl bg-[#F0F2F7] p-1" aria-label="Modo de visualização">
       {(["timeline","list"] as const).map(mode=><button type="button" key={mode} onClick={()=>setView(mode)}
        aria-pressed={view===mode} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold ${view===mode?"bg-white text-[#0B142A] shadow-sm":"text-[#697386]"}`}>{mode==="timeline"?"Linha do tempo":"Lista"}</button>)}
      </div>
     </div>
     {items.length>0?<div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar entregas">
       {[["all","Todas"],["planned","Planejadas"],["in_progress","Em andamento"],["blocked","Aguardando"],["completed","Concluídas"]].map(([value,label])=>
        <button key={value} type="button" onClick={()=>setFilter(value)} aria-pressed={filter===value}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium ${filter===value?"border-[#6D35F5] bg-[#F0EBFF] text-[#6D35F5]":"border-[#E3E7F0] text-[#525B70] hover:bg-[#F6F7FB]"}`}>{label}</button>)}
      </div>:null}
     {items.length===0?<div className="mt-5 rounded-xl bg-[#F6F7FB] p-5">
       <p className="text-sm font-semibold">Nenhuma entrega operacional cadastrada.</p>
       <p className="mt-2 text-sm leading-6 text-[#697386]">Assim que a equipe incluir as iniciativas e os responsáveis do plano de execução, o andamento aparecerá aqui. As datas históricas já cadastradas são mostradas abaixo, separadamente.</p>
      </div>:visible.length===0?<p className="mt-6 text-sm text-[#697386]">Nenhuma entrega corresponde a este filtro.</p>:
      <div className={`mt-6 ${view==="timeline"?"border-l-2 border-[#E4E8F0] pl-5":"space-y-3"}`}>
       {visible.map(item=>{const url=safeLink(item.driveUrl);const state=item.status??"planned";return <article key={item.id} className={`${view==="timeline"?"relative mb-6":"mb-3"} rounded-xl border border-[#E3E7F0] p-4`}>
         {view==="timeline"&&<span aria-hidden="true" className="absolute -left-[29px] top-5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-[#6D35F5]"/>}
         <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{item.projectTitle}{item.phase?` · ${item.phase}`:""}</p></div>
          <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${colors[state]??colors.planned}`}>{labels[state]??labels.planned}</span>
         </div>
         {item.description&&<p className="mt-3 text-sm text-[#525B70]">{item.description}</p>}
         <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#697386]">
          <span>Prazo: {formatted(item.dueDate)}</span>
          {item.owner&&<span>Responsável: {item.owner}</span>}
          {item.dependencies?.length?<span>Dependências: {item.dependencies.length}</span>:null}
         </div>
         {url&&<a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex cursor-pointer text-sm font-semibold text-[#6D35F5] hover:underline">Ver material no Drive ↗</a>}
       </article>})}
      </div>}
   </section>
   <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
     <h2 className="text-base font-semibold">Marcos do cronograma anterior</h2>
     <p className="mt-2 text-sm text-[#697386]">Datas de entrega existentes nos planejamentos. Não são consideradas tarefas concluídas nem entram no cálculo do progresso.</p>
     {legacyMilestones.length?<div className="mt-4 divide-y divide-[#E3E7F0]">{legacyMilestones.map(item=>
      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
       <div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-[#697386]">{item.projectTitle}</p></div>
       <span className="text-sm font-semibold">{formatted(item.dueDate)}</span>
      </div>)}</div>:<p className="mt-4 text-sm text-[#697386]">Nenhum marco anterior cadastrado.</p>}
   </section>
 </div>;
}
