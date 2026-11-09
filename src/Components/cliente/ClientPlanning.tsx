"use client";
import {useEffect,useMemo,useState} from "react";
import {clientDocumentCode} from "@/lib/ui/planningSnapshot";
import {ecosystemDocuments} from "@/data/ecosystem2027";
import {planningAreas,type PlanningAreaDelivery} from "@/lib/planning/areaSchedule";
import type {RichContent} from "@/lib/planning/richContent";
import DynamicDocumentReader from "@/Components/strategic-editor/DynamicDocumentReader";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {supabase} from "@/lib/supabase";

type Stage={id:string;title:string;dueDate:string;status:"pending"|"in_progress"|"completed";visibleToClient:boolean};
type ClientProject={id:string;slug:string;title:string;description:string|null;status:string;data?:{planningStages?:Stage[]}|null};
type VisibleDocument={content:string;richContent?:RichContent};
type Presentation={id:string;status:string;data?:{planningAreaSchedule?:PlanningAreaDelivery[];ecosystem2027?:{catalogDocumentCodes?:string[];selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];documents?:Record<string,VisibleDocument>;executiveDocuments?:Record<string,VisibleDocument>}}};
type CatalogDocument=(typeof ecosystemDocuments)[number];
const date=(value?:string)=>value?value.split("-").reverse().join("/"):"Previsão a definir";
const areaName=(name:string)=>name.replace(/^\d{2} /,"");
const areaStatus=(status?:PlanningAreaDelivery["status"])=>status==="completed"?"Concluída internamente":status==="review"?"Em revisão":status==="in_progress"?"Em elaboração":"Prevista";
const activeIcon=(name:"file-text"|"lock"|"eye"|"folder-open"|"calendar"|"chevron-down"|"chevron-up"|"arrow-left"|"search"|"check"|"layout-dashboard",size=18)=><RotevoTablerIcon name={name} size={size}/>;

export default function ClientPlanning({projects}:{projects:ClientProject[]}){
 const selected=projects[0];
 const [result,setResult]=useState<{key:string;presentation:Presentation|null;error:string}|null>(null);
 const [retry,setRetry]=useState(0);
 const [openedArea,setOpenedArea]=useState("");
 const [selectedCode,setSelectedCode]=useState("");
 const [search,setSearch]=useState("");
 const [mobileReader,setMobileReader]=useState(false);
 const requestKey=selected?[selected.id,selected.slug,selected.status,retry].join(":"):"";
 const current=result?.key===requestKey?result:null;
 const loading=!!selected&&!current, error=current?.error??"";
 const presentation=current?.presentation;
 useEffect(()=>{
  if(!selected?.id||!selected.slug)return;
  let live=true;
  const load=async()=>{
   try{
    const {data,error:sessionError}=await supabase.auth.getSession();
    if(sessionError||!data.session?.access_token)throw Error("Sessão expirada. Entre novamente.");
    const res=await fetch("/api/presentation/project?slug="+encodeURIComponent(selected.slug),{headers:{Authorization:"Bearer "+data.session.access_token},cache:"no-store"});
    if(!res.ok)throw Error("Não foi possível carregar o planejamento autorizado.");
    const payload=await res.json();
    if(!payload?.project||payload.project.id!==selected.id)throw Error("Não foi possível confirmar o projeto.");
    if(live)setResult({key:requestKey,presentation:payload.project,error:""});
   }catch(e){if(live)setResult({key:requestKey,presentation:null,error:e instanceof Error?e.message:"Falha ao consultar o planejamento."});}
  };
  void load();return()=>{live=false};
 },[selected?.id,selected?.slug,requestKey]);
 const visible=presentation?.data?.ecosystem2027;
 const catalogCodes=visible?.catalogDocumentCodes??[];
 const knownDocuments=useMemo(()=>ecosystemDocuments.filter(d=>clientDocumentCode(d.code)&&catalogCodes.includes(d.code)),[catalogCodes.join("|")]);
 const released=new Set((visible?.selectedDocumentCodes??[]).filter(code=>(visible?.presentedDocumentCodes??[]).includes(code)&&Boolean(visible?.documents?.[code]?.content?.trim())));
 const published=knownDocuments.filter(doc=>released.has(doc.code));
 const schedule=presentation?.data?.planningAreaSchedule??[];
 const areaRows=planningAreas.filter(name=>knownDocuments.some(doc=>doc.area===name)).filter(name=>!schedule.some(entry=>entry.area===name)||schedule.some(entry=>entry.area===name&&entry.visibleToClient)).map(name=>({name,docs:knownDocuments.filter(doc=>doc.area===name),delivery:schedule.find(item=>item.area===name)}));
 const hasExecutive=Object.values(visible?.executiveDocuments??{}).some(doc=>!!doc.content?.trim());
 const executive=ecosystemDocuments.filter(d=>d.area.startsWith("00 ")&&!!visible?.executiveDocuments?.[d.code]?.content?.trim());
 const [readerArea,readerCode]=selectedCode==="executive"?["executive",""]: [knownDocuments.find(d=>d.code===selectedCode)?.area??"",selectedCode];
 const active=knownDocuments.find(d=>d.code===readerCode);
 const activeContent=readerCode?visible?.documents?.[readerCode]:undefined;
 const activeReleased=!!active&&released.has(active.code);
 const delivery=areaRows.find(row=>row.name===readerArea)?.delivery;
 const lastReleased=published.length,allDocs=knownDocuments.length;
 const filteredAreas=areaRows.map(row=>({...row,docs:row.docs.filter(doc=>(doc.code+" "+doc.title).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))})).filter(row=>!search||row.docs.length);
 const choose=(code:string,area:string)=>{setSelectedCode(code);setOpenedArea(area);setMobileReader(true);};
 const publishedIndex=active?published.findIndex(d=>d.code===active.code):-1;
 const chooseAdjacent=(offset:number)=>{const next=published[publishedIndex+offset];if(next)choose(next.code,next.area);};
 return <div className="space-y-4">
  <section className="rounded-2xl border border-[#E3E7F0] bg-white px-5 py-5 sm:px-7">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-xs font-bold uppercase tracking-wider text-[#6D35F5]">Planejamento estratégico</p><h2 className="mt-1 text-xl font-bold text-[#0B142A]">{selected?.title??"Planejamento"}</h2><p className="mt-1 text-sm text-[#697386]">Acompanhe as áreas do planejamento e consulte os documentos disponibilizados.</p></div>
    {!!selected&&<span className="rounded-full bg-[#F4F0FF] px-3 py-1.5 text-xs font-semibold text-[#6034B7]">{lastReleased} de {allDocs||"—"} documentos disponíveis</span>}
   </div>
  </section>
  {!selected?<section className="rounded-xl bg-white p-6 text-sm text-[#697386]">Nenhum planejamento está vinculado à sua conta.</section>
  :loading?<section role="status" className="rounded-xl bg-white p-6 text-sm text-[#697386]">Carregando planejamento autorizado…</section>
  :error?<section role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">{error}<button type="button" className="ml-3 cursor-pointer underline" onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button></section>
  :<section className="overflow-hidden rounded-2xl border border-[#E3E7F0] bg-white lg:grid lg:min-h-[580px] lg:grid-cols-[300px_minmax(0,1fr)]">
   <aside aria-label="Navegação dos documentos do planejamento" className={(mobileReader?"hidden ":"block ")+"min-w-0 border-[#E3E7F0] p-4 lg:block lg:border-r"}>
    <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-[#101828]">Documentos</h3><span className="text-xs text-[#697386]">{lastReleased} disponíveis</span></div>
    <label className="mt-3 block"><span className="sr-only">Buscar documento</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar documento…" className="w-full rounded-xl border border-[#E1E5EE] bg-[#F7F8FB] px-3 py-2.5 text-sm outline-[#6D35F5]"/></label>
    <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
     <button type="button" onClick={()=>choose("executive","executive")} aria-pressed={selectedCode==="executive"} className={"flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold "+(selectedCode==="executive"?"bg-[#EEE8FF] text-[#6034B7]":"hover:bg-[#F7F8FB]")}><span className="text-[#6D35F5]">{activeIcon("layout-dashboard")}</span><span className="flex-1">Visão Executiva</span>{hasExecutive?<span className="text-xs text-[#178052]">{activeIcon("check",15)}</span>:<span className="text-[#8791A4]">{activeIcon("lock",15)}</span>}</button>
     {filteredAreas.map(row=>{
      const expanded=openedArea===row.name||search.length>0;
      const available=row.docs.filter(d=>released.has(d.code)).length;
      return <div key={row.name} className="rounded-xl border border-[#E8EAF1]">
       <button type="button" aria-expanded={expanded} onClick={()=>setOpenedArea(expanded?"":row.name)} className="flex w-full cursor-pointer items-center gap-2 px-3 py-3 text-left">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EFE9FF] text-[11px] font-bold text-[#6034B7]">{row.name.slice(0,2)}</span>
        <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#1A2438]">{areaName(row.name)}</span><span className="mt-1 block text-[11px] text-[#697386]">{available} de {row.docs.length} documentos · {row.delivery?.dueDate?date(row.delivery.dueDate):"Previsão a definir"}</span></span>
        {activeIcon(expanded?"chevron-up":"chevron-down",15)}
       </button>
       {expanded&&<div className="space-y-1 border-t border-[#E8EAF1] px-2 py-2">{row.docs.map(doc=>{
        const isReleased=released.has(doc.code);
        return <button key={doc.code} type="button" onClick={()=>choose(doc.code,row.name)} aria-pressed={selectedCode===doc.code} className={"flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-2.5 text-left "+(selectedCode===doc.code?"bg-[#EEE8FF]":"hover:bg-[#F7F8FB]")}>
         <span className={isReleased?"text-[#6D35F5]":"text-[#A1A9B8]"}>{activeIcon(isReleased?"file-text":"lock",16)}</span>
         <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#253049]">{doc.title}</span><span className="block text-[11px] text-[#697386]">{doc.code} · {isReleased?"Disponível para leitura":"Em elaboração"}</span></span>
        </button>;
       })}</div>}
      </div>;
     })}
     {!areaRows.length&&<p className="rounded-lg bg-[#F7F8FB] p-4 text-sm text-[#697386]">As áreas do planejamento serão exibidas quando forem configuradas pela Rotevo.</p>}
     {areaRows.length>0&&!filteredAreas.length&&<p className="p-3 text-xs text-[#697386]">Nenhum documento corresponde à pesquisa.</p>}
    </div>
   </aside>
   <main className={(mobileReader?"block ":"hidden ")+"min-w-0 bg-[#F7F8FC] p-3 sm:p-5 lg:block lg:p-7"}>
    <button type="button" onClick={()=>setMobileReader(false)} className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E5EC] bg-white px-3 py-2 text-xs font-semibold lg:hidden">{activeIcon("arrow-left",16)} Voltar aos documentos</button>
    {selectedCode==="executive"?<div className="mx-auto max-w-[900px] rounded-2xl border border-[#E4E7EE] bg-white p-5 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-[#697386]">Visão Executiva</p><h3 className="mt-3 text-2xl font-bold">Síntese estratégica</h3>{executive.length?<div className="mt-5 space-y-5">{executive.map(doc=><section key={doc.code}><details className="rounded-xl border border-[#E3E7F0] p-4"><summary className="cursor-pointer text-sm font-semibold">{doc.code} · {doc.title}</summary><div className="mt-5">{visible?.executiveDocuments?.[doc.code]?.richContent?<DynamicDocumentReader content={visible.executiveDocuments[doc.code].richContent!}/>:<div className="whitespace-pre-wrap break-words text-sm leading-7">{visible?.executiveDocuments?.[doc.code]?.content}</div>}</div></details></section>)}</div>:<p className="mt-5 rounded-xl bg-[#F7F8FB] p-5 text-sm text-[#697386]">A Visão Executiva será apresentada quando a Rotevo disponibilizar os documentos desta seção.</p>}</div>
    :active?<article className="mx-auto max-w-[960px] overflow-hidden rounded-2xl border border-[#E4E7EE] bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-10">
     <p className="text-xs font-bold uppercase tracking-widest text-[#8C96A9]">Documento estratégico <span className="ml-2">{active.code}</span></p>
     <h3 className="mt-4 text-2xl font-bold tracking-tight text-[#0B142A] sm:text-3xl">{active.title}</h3>
     <div className="my-6 border-t border-[#E9ECF3]"/>
     {activeReleased&&activeContent?
      <><div className="se-client-document-reader">{activeContent.richContent?<DynamicDocumentReader content={activeContent.richContent}/>:<div className="whitespace-pre-wrap break-words text-sm leading-7 text-[#344054]">{activeContent.content}</div>}</div>
       <nav className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#E9ECF3] pt-5" aria-label="Navegação entre documentos publicados"><button type="button" disabled={publishedIndex<=0} onClick={()=>chooseAdjacent(-1)} className="cursor-pointer rounded-lg border border-[#DCE2EC] px-3 py-2 text-xs font-semibold disabled:opacity-40">Anterior</button><button type="button" disabled={publishedIndex<0||publishedIndex===published.length-1} onClick={()=>chooseAdjacent(1)} className="cursor-pointer rounded-lg bg-[#6D35F5] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Próximo documento</button></nav>
      </>
      :<div className="mt-4 rounded-xl border border-[#E9E2D7] bg-[#FFF9F0] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#7E5A1B]">{activeIcon("calendar",18)} Seu planejamento está sendo construído</div><p className="mt-3 text-sm leading-7 text-[#525B70]">Este documento ainda não foi disponibilizado para leitura. {delivery?.dueDate?"A previsão da etapa é "+date(delivery.dueDate)+".":"A data de disponibilização será informada pela Rotevo."} Assim que a versão for publicada, você poderá consultá-la neste espaço.</p><p className="mt-3 text-xs font-semibold text-[#907C61]">Etapa: {areaStatus(delivery?.status)}</p></div>}
    </article>
    :<div className="mx-auto max-w-[800px] rounded-2xl border border-[#E4E7EE] bg-white p-7"><div className="text-[#6D35F5]">{activeIcon("folder-open",28)}</div><h3 className="mt-4 text-xl font-bold">Explore seu planejamento</h3><p className="mt-2 max-w-xl text-sm leading-7 text-[#697386]">Selecione uma área e um documento na coluna à esquerda. As seções em elaboração apresentam a previsão de disponibilização; as versões publicadas podem ser lidas integralmente aqui.</p>{published.length>0&&<button type="button" onClick={()=>choose(published[0].code,published[0].area)} className="mt-5 cursor-pointer rounded-lg bg-[#6D35F5] px-4 py-2.5 text-sm font-semibold text-white">Ler primeiro documento disponível</button>}</div>}
   </main>
  </section>}
 </div>;
}
