"use client";
import ExecutivePlanningSummary from "./ExecutivePlanningSummary";
import {useEffect,useState} from "react";
import DynamicDocumentReader from "@/Components/strategic-editor/DynamicDocumentReader";
import type {RichContent} from "@/lib/planning/richContent";
import {supabase} from "@/lib/supabase";
import {ecosystemDocuments} from "@/data/ecosystem2027";

type Stage={id:string;title:string;dueDate:string;status:"pending"|"in_progress"|"completed";visibleToClient:boolean};
type ClientProject={id:string;slug:string;title:string;description:string|null;status:string;data?:{planningStages?:Stage[]}|null};
type VisibleDocument={content:string;richContent?:RichContent};
type Presentation={id:string;status:string;data?:{ecosystem2027?:{selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];executiveDocuments?:Record<string,VisibleDocument>;documents?:Record<string,VisibleDocument>}}};
const areas=Array.from(new Set(ecosystemDocuments.filter(d=>/^\d{2} /.test(d.area)&&!d.area.startsWith("00 ")).map(d=>d.area)));
const button="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D35F5]";
export default function ClientPlanning({projects}:{projects:ClientProject[]}){
 const [result,setResult]=useState<{key:string;presentation:Presentation|null;error:string}|null>(null);
 const [retry,setRetry]=useState(0);
 const [area,setArea]=useState("");
 const [code,setCode]=useState("");
 const selected=projects[0];
 const selectedId=selected?.id,selectedSlug=selected?.slug,selectedStatus=selected?.status;
 const requestKey=selected?[selected.id,selected.slug,selected.status,retry].join(":"):"";
 const current=result?.key===requestKey?result:null;
 const loading=!current;
 const error=current?.error??"";
 const presentation=current?.presentation;
 useEffect(()=>{if(!selectedId||!selectedSlug||selectedStatus!=="published")return;let alive=true;
   const load=async()=>{
     try{
       const {data,error:sessionError}=await supabase.auth.getSession();
       if(sessionError||!data.session?.access_token)throw Error("Sessão expirada. Entre novamente.");
       const res=await fetch("/api/presentation/project?slug="+encodeURIComponent(selectedSlug),{headers:{Authorization:"Bearer "+data.session.access_token},cache:"no-store"});
       if(!res.ok)throw Error("A apresentação ainda não está disponível para consulta.");
       const payload=await res.json();
       if(!payload?.project||payload.project.id!==selectedId||payload.project.status!=="published")throw Error("Não foi possível confirmar o planejamento publicado.");
       if(alive)setResult({key:requestKey,presentation:payload.project,error:""});
     }catch(error){if(alive)setResult({key:requestKey,presentation:null,error:error instanceof Error?error.message:"Não foi possível consultar o planejamento."});}
   };
   void load();return()=>{alive=false};
 },[selectedId,selectedSlug,selectedStatus,requestKey]);
 const visible=presentation?.data?.ecosystem2027;
 const allowed=new Set((visible?.selectedDocumentCodes??[]).filter(c=>(visible?.presentedDocumentCodes??[]).includes(c)));
 const publishedDocs=ecosystemDocuments.filter(d=>!d.area.startsWith("00 ")&&d.code!=="01.01"&&allowed.has(d.code)&&!!visible?.documents?.[d.code]?.content?.trim());
 const availableAreas=areas.map(name=>({name,docs:publishedDocs.filter(d=>d.area===name)}));
 const chosenArea=availableAreas.find(a=>a.name===area);
 const chosen=chosenArea?.docs.find(d=>d.code===code);
 const docIndex=chosen?publishedDocs.findIndex(d=>d.code===chosen.code):-1;
 const stages=selected?.data?.planningStages??[];
 const completed=stages.filter(stage=>stage.status==="completed").length;
 const activeStage=stages.find(stage=>stage.status==="in_progress")??stages.find(stage=>stage.status==="pending");
 const choose=(next:string)=>{const d=publishedDocs.find(item=>item.code===next);if(d){setArea(d.area);setCode(d.code)}};
 return <div className="space-y-5">
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6D35F5]">Seu projeto</p><h2 className="mt-2 text-2xl font-bold text-[#090D1C]">{selected?.title??"Planejamento"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#525B70]">{selected?.status==="published"?"Consulte o material estratégico disponibilizado pela Rotevo.":"Acompanhe o andamento das etapas e as próximas entregas previstas."}</p></div>{selected&&<span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selected.status==="published"?"bg-[#E0F5E8] text-[#176F40]":"bg-[#FFF2DB] text-[#92600C]"}`}>{selected.status==="published"?"Planejamento publicado":"Em desenvolvimento"}</span>}</div>
   {selected&&<div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Etapas concluídas</p><p className="mt-1 text-lg font-bold text-[#090D1C]">{completed} de {stages.length||"—"}</p><p className="mt-1 text-xs text-[#697386]">{stages.length?"Conforme o cronograma divulgado":"Cronograma ainda não divulgado"}</p></div><div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Próximo marco</p><p className="mt-1 text-sm font-bold text-[#090D1C]">{activeStage?.title??(stages.length?"Etapas concluídas":"A definir pela Rotevo")}</p><p className="mt-1 text-xs text-[#697386]">{activeStage?.dueDate?"Previsão: "+activeStage.dueDate.split("-").reverse().join("/"):"Sem data prevista informada"}</p></div></div>}
  </section>
  {selected&&<section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Etapas e entregas</h3>{stages.length>0&&<span className="rounded-full bg-[#F1EDFE] px-3 py-1 text-xs font-semibold text-[#6034B7]">{completed}/{stages.length} concluídas</span>}</div><p className="mt-2 text-sm text-[#525B70]">Datas previstas pela Rotevo. A conclusão de uma etapa não significa publicação automática dos documentos.</p>{(selected.data?.planningStages??[]).length?<ol className="mt-6">{stages.map((stage,index)=><li key={stage.id} className="relative flex gap-4 pb-7 last:pb-0">{index<stages.length-1&&<span aria-hidden="true" className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${stage.status==="completed"?"bg-[#78B82D]":"bg-[#DDE2ED]"}`}/>}<span aria-hidden="true" className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${stage.status==="completed"?"border-[#78B82D] bg-[#E0F5E8] text-[#176F40]":stage.status==="in_progress"?"border-[#F0A735] bg-[#FFF2DB] text-[#92600C]":"border-[#DDE2ED] bg-white text-[#697386]"}`}>{stage.status==="completed"?"✓":index+1}</span><div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E3E7F0] bg-[#FAFBFD] px-4 py-3"><span className="text-sm font-semibold text-[#090D1C]">{stage.title}</span><span className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stage.status==="completed"?"bg-[#E0F5E8] text-[#176F40]":stage.status==="in_progress"?"bg-[#FFF2DB] text-[#92600C]":"bg-[#EDF0F5] text-[#586274]"}`}>{stage.status==="completed"?"Concluída":stage.status==="in_progress"?"Em andamento":"Não iniciada"}</span><span className="text-xs text-[#525B70]">{stage.dueDate?stage.dueDate.split("-").reverse().join("/"):"Previsão a definir"}</span></span></div></li>)}</ol>:<p className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#525B70]">A Rotevo ainda não divulgou as datas previstas para este planejamento.</p>}</section>}
  {!selected?<section className="rounded-2xl bg-white p-6 text-sm text-[#525B70]">Nenhum planejamento está vinculado à sua conta.</section>
   :selected.status!=="published"?null
   :loading?<section role="status" className="rounded-xl bg-white p-6 text-sm text-[#525B70]">Carregando documentos autorizados…</section>
   :error?<section role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">{error}<button type="button" className={button+" ml-3 border border-red-200"} onClick={()=>setRetry(value=>value+1)}>Tentar novamente</button></section>
   :<section className="space-y-5">
    <div className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
     <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6D35F5]">Visão Executiva</p><h3 className="mt-1 text-xl font-bold">Explore sua estratégia</h3></div><button type="button" className={button+" border border-[#DDE2ED] bg-white text-[#525B70]"} onClick={()=>{setArea("");setCode("")}}>Voltar à introdução</button></div>
     <ExecutivePlanningSummary documents={visible?.executiveDocuments??{}}/>
     <p className="mt-3 text-xs font-medium text-[#697386]">{publishedDocs.length} {publishedDocs.length===1?"documento disponível":"documentos disponíveis"} para leitura</p>
    </div>
    <section aria-label="Áreas do planejamento" className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
     <h3 className="mb-3 text-base font-bold">Áreas estratégicas</h3>
     <p className="mb-4 text-sm text-[#525B70]">Escolha uma área para explorar os materiais publicados. Áreas sem documentos disponíveis ficam identificadas.</p><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{availableAreas.map(item=><button key={item.name} type="button" onClick={()=>{setArea(item.name);setCode(item.docs[0]?.code??"")}} aria-pressed={area===item.name} className={"cursor-pointer rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D35F5] "+(area===item.name?"border-[#6D35F5] bg-[#EEE8FF] text-[#5123A6]":"border-[#E3E7F0] bg-[#FAFBFD] text-[#090D1C] hover:border-[#6D35F5]")}><span className="block text-xs font-semibold opacity-75">{item.name.slice(0,2)}</span><span className="mt-1 block text-sm font-semibold">{item.name.replace(/^\d{2} /,"")}</span><span className="mt-2 block text-xs opacity-75">{item.docs.length?item.docs.length+" documento(s) disponível(is)":"Aguardando publicação"}</span></button>)}</div>
    </section>
    {chosenArea&&<section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
     <p className="text-xs font-semibold text-[#697386]">{chosenArea.name}</p><h3 className="mt-2 text-xl font-bold">Documentos desta área</h3>
     {chosenArea.docs.length===0?<p className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#525B70]">Ainda não há documentos publicados nesta área.</p>
     :<><div role="group" aria-label="Documentos disponíveis" className="mt-4 flex flex-wrap gap-2">{chosenArea.docs.map(d=><button type="button" key={d.code} aria-pressed={code===d.code} onClick={()=>setCode(d.code)} className={button+" border "+(code===d.code?"border-[#6D35F5] bg-[#EEE8FF] text-[#6034B7]":"border-[#DDE2ED] bg-white text-[#525B70]")}>{d.code} · {d.title}</button>)}</div>
     {chosen&&<article className="mt-6 border-t border-[#E3E7F0] pt-6"><p className="text-xs font-semibold text-[#6D35F5]">Documento {chosen.code}</p><h4 className="mt-2 text-xl font-bold">{chosen.title}</h4>{visible?.documents?.[chosen.code]?.richContent?<DynamicDocumentReader content={visible.documents[chosen.code].richContent!}/>:<div className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-[#F6F7FB] p-5 text-sm leading-7 text-[#344054]">{visible?.documents?.[chosen.code]?.content}</div>}
      <div className="mt-5 flex flex-wrap justify-between gap-3"><button disabled={docIndex<=0} className={button+" border border-[#DDE2ED] disabled:cursor-not-allowed disabled:opacity-40"} onClick={()=>choose(publishedDocs[docIndex-1]?.code??"")}>← Documento anterior</button><button disabled={docIndex<0||docIndex>=publishedDocs.length-1} className={button+" bg-[#6D35F5] text-white disabled:cursor-not-allowed disabled:opacity-40"} onClick={()=>choose(publishedDocs[docIndex+1]?.code??"")}>Próximo documento →</button></div>
     </article>}</>}
    </section>}
    {!chosenArea&&<p className="text-sm text-[#697386]">Selecione uma área acima para consultar os documentos disponíveis.</p>}
   </section>}
 </div>;
}
