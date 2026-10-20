"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {ecosystemDocuments} from "@/data/ecosystem2027";

type Stage={id:string;title:string;dueDate:string;status:"pending"|"in_progress"|"completed";visibleToClient:boolean};
type ClientProject={id:string;slug:string;title:string;description:string|null;status:string;data?:{planningStages?:Stage[]}|null};
type VisibleDocument={content:string};
type Presentation={id:string;status:string;data?:{ecosystem2027?:{selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];documents?:Record<string,VisibleDocument>}}};
const areas=Array.from(new Set(ecosystemDocuments.filter(d=>/^\d{2} /.test(d.area)&&!d.area.startsWith("00 ")).map(d=>d.area)));
const button="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D35F5]";
export default function ClientPlanning({projects}:{projects:ClientProject[]}){
 const [projectId,setProjectId]=useState("");
 const [result,setResult]=useState<{key:string;presentation:Presentation|null;error:string}|null>(null);
 const [retry,setRetry]=useState(0);
 const [area,setArea]=useState("");
 const [code,setCode]=useState("");
 const selected=projects.find(p=>p.id===projectId)??projects[0];
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
 const choose=(next:string)=>{const d=publishedDocs.find(item=>item.code===next);if(d){setArea(d.area);setCode(d.code)}};
 return <div className="space-y-5">
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
   <p className="text-xs font-bold uppercase tracking-wider text-[#6D35F5]">Planejamento Estratégico</p>
   <h2 className="mt-2 text-2xl font-bold">Seu planejamento de crescimento</h2>
   <p className="mt-2 max-w-3xl text-sm leading-6 text-[#525B70]">Conheça as decisões estratégicas da sua empresa e explore os documentos liberados pela Rotevo. As áreas e documentos permanecem nesta página.</p>
   {projects.length>1&&<label className="mt-5 block max-w-md text-sm font-semibold">Planejamento
    <select value={selected?.id??""} onChange={e=>{setProjectId(e.target.value);setArea("");setCode("")}} className="mt-2 w-full rounded-xl border border-[#DDE2ED] bg-white px-3 py-3 text-sm">
    {projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
   {selected&&<div className="mt-5 flex flex-wrap items-center gap-3"><strong className="text-sm">{selected.title}</strong><span className={`rounded-full px-3 py-1 text-xs font-semibold ${selected.status==="published"?"bg-[#E0F5E8] text-[#176F40]":"bg-[#FFF2DB] text-[#92600C]"}`}>{selected.status==="published"?"Publicado":"Em desenvolvimento"}</span></div>}
  </section>
  {selected&&<section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7"><h3 className="text-lg font-bold">Cronograma de elaboração e entrega</h3><p className="mt-2 text-sm text-[#525B70]">Datas previstas pela Rotevo. A conclusão de uma etapa não significa publicação automática dos documentos.</p>{(selected.data?.planningStages??[]).length?<ol className="mt-5 space-y-3">{(selected.data?.planningStages??[]).map(stage=><li key={stage.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E7F0] px-4 py-3"><span className="text-sm font-semibold">{stage.title}</span><span className="text-xs text-[#525B70]">{stage.status==="completed"?"Concluída":stage.status==="in_progress"?"Em andamento":"Não iniciada"} · {stage.dueDate?stage.dueDate.split("-").reverse().join("/"):"Previsão a definir"}</span></li>)}</ol>:<p className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#525B70]">A Rotevo ainda não divulgou as datas previstas para este planejamento.</p>}</section>}
  {!selected?<section className="rounded-2xl bg-white p-6 text-sm text-[#525B70]">Nenhum planejamento está vinculado à sua conta.</section>
   :selected.status!=="published"?<section className="rounded-2xl border border-[#E3E7F0] bg-white p-7"><h3 className="text-lg font-bold">Planejamento em desenvolvimento</h3><p className="mt-2 text-sm leading-6 text-[#525B70]">A apresentação estratégica ficará disponível aqui quando for publicada pela Rotevo. Nenhum rascunho é mostrado.</p></section>
   :loading?<section role="status" className="rounded-xl bg-white p-6 text-sm text-[#525B70]">Carregando documentos autorizados…</section>
   :error?<section role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">{error}<button type="button" className={button+" ml-3 border border-red-200"} onClick={()=>setRetry(value=>value+1)}>Tentar novamente</button></section>
   :<section className="space-y-5">
    <div className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
     <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6D35F5]">Visão Executiva</p><h3 className="mt-1 text-xl font-bold">Explore sua estratégia</h3></div><button type="button" className={button+" border border-[#DDE2ED] bg-white text-[#525B70]"} onClick={()=>{setArea("");setCode("")}}>Voltar à introdução</button></div>
     <p className="mt-3 max-w-3xl text-sm leading-6 text-[#525B70]">Esta introdução organiza o acesso às áreas estratégicas. As decisões consolidadas serão apresentadas aqui quando houver conteúdo executivo publicado.</p>
     <p className="mt-3 text-xs font-medium text-[#697386]">{publishedDocs.length} {publishedDocs.length===1?"documento disponível":"documentos disponíveis"} para leitura</p>
    </div>
    <section aria-label="Áreas do planejamento" className="rounded-2xl border border-[#E3E7F0] bg-white p-5">
     <h3 className="mb-3 text-base font-bold">Áreas estratégicas</h3>
     <div className="flex flex-wrap gap-2">{availableAreas.map(item=><button key={item.name} type="button" onClick={()=>{setArea(item.name);setCode(item.docs[0]?.code??"")}} aria-pressed={area===item.name} className={button+" border "+(area===item.name?"border-[#6D35F5] bg-[#6D35F5] text-white":"border-[#DDE2ED] bg-white text-[#525B70] hover:border-[#6D35F5]")}>{item.name.replace(/^\d{2} /,"")} <span className="ml-1 text-xs opacity-75">({item.docs.length})</span></button>)}</div>
    </section>
    {chosenArea&&<section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
     <p className="text-xs font-semibold text-[#697386]">{chosenArea.name}</p><h3 className="mt-2 text-xl font-bold">Documentos desta área</h3>
     {chosenArea.docs.length===0?<p className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#525B70]">Ainda não há documentos publicados nesta área.</p>
     :<><div role="group" aria-label="Documentos disponíveis" className="mt-4 flex flex-wrap gap-2">{chosenArea.docs.map(d=><button type="button" key={d.code} aria-pressed={code===d.code} onClick={()=>setCode(d.code)} className={button+" border "+(code===d.code?"border-[#6D35F5] bg-[#EEE8FF] text-[#6034B7]":"border-[#DDE2ED] bg-white text-[#525B70]")}>{d.code} · {d.title}</button>)}</div>
     {chosen&&<article className="mt-6 border-t border-[#E3E7F0] pt-6"><p className="text-xs font-semibold text-[#6D35F5]">Documento {chosen.code}</p><h4 className="mt-2 text-xl font-bold">{chosen.title}</h4><div className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-[#F6F7FB] p-5 text-sm leading-7 text-[#344054]">{visible?.documents?.[chosen.code]?.content}</div>
      <div className="mt-5 flex flex-wrap justify-between gap-3"><button disabled={docIndex<=0} className={button+" border border-[#DDE2ED] disabled:cursor-not-allowed disabled:opacity-40"} onClick={()=>choose(publishedDocs[docIndex-1]?.code??"")}>← Documento anterior</button><button disabled={docIndex<0||docIndex>=publishedDocs.length-1} className={button+" bg-[#6D35F5] text-white disabled:cursor-not-allowed disabled:opacity-40"} onClick={()=>choose(publishedDocs[docIndex+1]?.code??"")}>Próximo documento →</button></div>
     </article>}</>}
    </section>}
    {!chosenArea&&<p className="text-sm text-[#697386]">Selecione uma área acima para consultar os documentos disponíveis.</p>}
   </section>}
 </div>;
}
