"use client";
import {useState} from "react";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
import DialogFocus from "@/Components/ui/DialogFocus";
type Metric={label:string;value:string};
type Campaign={metrics:Metric[];id:string;title:string;type:"Online"|"Offline"|"Híbrida";channels:string;objective:string;status:"planned"|"active"|"completed"|"paused";period:string;actions:string[];result:string;next:string};
const statusLabels={paused:"Pausada",planned:"Planejada",active:"Em andamento",completed:"Concluída"};
const statusStyles={paused:"bg-[#EEE8FF] text-[#6034B7]",planned:"bg-[#EDF0F5] text-[#586274]",active:"bg-[#FFF2DB] text-[#92600C]",completed:"bg-[#E0F5E8] text-[#176F40]"};
type Source={id:string;title:string;kind?:"online"|"offline"|"hybrid";platform:string;objective:string;status:string;startDate:string;endDate:string;budget:number|null;spent:number|null;results:number|null;resultLabel:string;channels?:string;actions?:string[];resultSummary?:string;nextStep?:string;visibleToClient?:boolean;snapshots?:{month:string;spent:number|null;results:number|null;leads:number|null;clicks:number|null;impressions:number|null;appointments:number|null;sales:number|null;revenue:number|null}[]};
const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
export default function ClientCampaigns({projects}:{projects:{id:string;data:{marketingCampaigns?:Source[]}|null}[]}){
 const campaigns:Campaign[]=projects.flatMap(p=>(p.data?.marketingCampaigns??[]).filter(c=>c.visibleToClient===true).map(c=>{const latest=[...(c.snapshots??[])].sort((a,b)=>b.month.localeCompare(a.month))[0];const investment=latest?latest.spent:c.spent;const metrics:Metric[]=[{label:"Orçamento",value:c.budget===null?"Não informado":money(c.budget)},{label:latest?"Investimento em "+latest.month:"Investimento registrado",value:investment===null?"Não mensurado":money(investment as number)}];if(latest){if(typeof latest.results==="number")metrics.push({label:c.resultLabel||"Resultados",value:String(latest.results)});if(typeof latest.revenue==="number")metrics.push({label:"Receita registrada",value:money(latest.revenue)});for(const [key,label] of [["impressions","Impressões"],["clicks","Cliques"],["leads","Contatos"],["appointments","Agendamentos"],["sales","Vendas"]] as const)if(typeof latest[key]==="number")metrics.push({label,value:new Intl.NumberFormat("pt-BR").format(latest[key])});}else if(c.results!==null)metrics.push({label:c.resultLabel||"Resultados",value:String(c.results)});return {id:p.id+":"+c.id,title:c.title,type:c.kind==="offline"?"Offline":c.kind==="hybrid"?"Híbrida":"Online",channels:c.channels||c.platform,objective:c.objective,status:c.status==="finished"?"completed":c.status==="active"?"active":c.status==="paused"?"paused":"planned",period:(c.startDate||"Início a definir")+" — "+(c.endDate||"Término a definir"),metrics,actions:c.actions??[],result:c.resultSummary||"Resultados ainda não informados.",next:c.nextStep||"Próximo passo ainda não informado."};}));
 const [filter,setFilter]=useState("all");
 const [opened,setOpened]=useState<string|null>(null);
 const active=campaigns.find(x=>x.id===opened);
 const items=campaigns.filter(x=>filter==="all"||x.type===filter);
 return <section className="rv-ui2-module rv-ui2-client-campaigns space-y-3" aria-label="Campanhas compartilhadas">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E6ED] pb-3">
   <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar tipo de campanha">
    {(["all","Online","Offline","Híbrida"] as const).map(type=><button key={type} type="button" aria-pressed={filter===type} onClick={()=>{setFilter(type);setOpened(null)}} className={`min-h-9 cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold ${filter===type?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]"}`}>{type==="all"?"Todas":type}</button>)}
   </div>
   <span className="text-xs text-[#687487]">{items.length} {items.length===1?"campanha":"campanhas"}</span>
  </div>
  {items.length===0?<p className="py-8 text-sm text-[#687487]">Nenhuma campanha foi compartilhada neste filtro.</p>:
   <div className="overflow-x-auto border-y border-[#E3E6ED]">
    <table className="w-full min-w-[600px] border-collapse text-left">
     <thead className="bg-[#F8F9FB] text-[11px] font-semibold text-[#687487]"><tr><th scope="col" className="px-3 py-3">Campanha</th><th scope="col" className="px-3 py-3">Tipo</th><th scope="col" className="px-3 py-3">Situação</th><th scope="col" className="px-3 py-3">Período</th><th scope="col" className="px-3 py-3"><span className="sr-only">Ações</span></th></tr></thead>
     <tbody className="divide-y divide-[#E3E6ED]">{items.map(c=><tr key={c.id} className="hover:bg-[#FAFBFE]">
      <td className="px-3 py-3"><button type="button" onClick={()=>setOpened(c.id)} className="cursor-pointer text-left text-[13px] font-semibold text-[#323647] hover:text-[#5949D1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C5CE7]">{c.title}</button><p className="mt-1 max-w-[360px] truncate text-xs text-[#687487]">{c.objective}</p></td>
      <td className="px-3 py-3 text-xs text-[#687487]">{c.type}</td>
      <td className="px-3 py-3"><span className={`inline-block rounded-md px-2 py-1 text-[11px] font-semibold ${statusStyles[c.status]}`}>{statusLabels[c.status]}</span></td>
      <td className="px-3 py-3 text-xs text-[#687487]">{c.period}</td>
      <td className="px-3 py-3"><button type="button" onClick={()=>setOpened(c.id)} aria-label={`Ver detalhes de ${c.title}`} className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg hover:bg-[#EDEAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C5CE7]"><ContentTablerIcon name="eye" size={17}/></button></td>
     </tr>)}</tbody>
    </table>
   </div>}
  {active&&<div className="fixed inset-0 z-[120] flex justify-end">
   <button type="button" aria-label="Fechar detalhes da campanha" onClick={()=>setOpened(null)} className="absolute inset-0 cursor-default bg-[#101828]/45"/>
   <aside role="dialog" aria-modal="true" aria-labelledby="client-campaign-drawer-title" className="relative z-10 h-full w-full max-w-[560px] overflow-y-auto bg-white px-5 py-5 shadow-xl sm:px-7">
    <DialogFocus onClose={()=>setOpened(null)}/>
    <div className="flex items-start justify-between gap-3 border-b border-[#E3E6ED] pb-4">
     <div><p className="text-xs text-[#687487]">{active.type} · {active.period}</p><h2 id="client-campaign-drawer-title" className="mt-2 text-lg font-semibold text-[#323647]">{active.title}</h2><p className="mt-1 text-sm text-[#687487]">{active.objective}</p></div>
     <button type="button" aria-label="Fechar" onClick={()=>setOpened(null)} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#E3E6ED] hover:bg-[#F8F9FB]"><ContentTablerIcon name="x" size={18}/></button>
    </div>
    <div className="mt-5 space-y-6">
     <section><h3 className="text-sm font-semibold text-[#323647]">Indicadores registrados</h3><p className="mt-1 text-xs text-[#687487]">Investimentos e resultados são informados pela equipe Rotevo; não representam cobranças.</p><dl className="mt-3 divide-y divide-[#E3E6ED] border-y border-[#E3E6ED]">{active.metrics.map(m=><div key={m.label} className="flex items-center justify-between gap-3 py-3"><dt className="text-xs text-[#687487]">{m.label}</dt><dd className="text-sm font-semibold text-[#323647]">{m.value}</dd></div>)}</dl></section>
     <section><h3 className="text-sm font-semibold text-[#323647]">O que está sendo feito</h3>{active.actions.length?<ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#687487]">{active.actions.map((action,index)=><li key={index}>{action}</li>)}</ul>:<p className="mt-2 text-sm text-[#687487]">Ações ainda não informadas.</p>}</section>
     <section><h3 className="text-sm font-semibold text-[#323647]">Resultados e aprendizados</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#687487]">{active.result}</p></section>
     <section><h3 className="text-sm font-semibold text-[#323647]">Próximo passo</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#687487]">{active.next}</p></section>
    </div>
   </aside>
  </div>}
  <p className="text-xs text-[#687487]">As informações são atualizadas pela equipe Rotevo conforme o acompanhamento das campanhas.</p>
 </section>;
}
