"use client";

import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {ecosystemDocuments} from "@/data/ecosystem2027";
import type {ExecutionItem} from "@/Components/cliente/ProjectTimeline";

type DocumentRecord={content:string;updatedAt:string;reviewStatus?:"draft"|"review"|"approved";publishedContent?:string;publishedAt?:string};
type Eco={version?:number;selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];documents?:Record<string,DocumentRecord>};
type ProjectData={ecosystem2027?:Eco;executionTimeline?:ExecutionItem[];[key:string]:unknown};
type Props={projectId:string;projectData:ProjectData;updatedAt:string;onSaved:(data:ProjectData,updatedAt:string)=>void};

export default function EcosystemDocumentEditor({projectId,projectData,updatedAt,onSaved}:Props){
 const eco=projectData.ecosystem2027;
 const selected=useMemo(()=>new Set(eco?.selectedDocumentCodes??[]),[eco?.selectedDocumentCodes]);
 const documents=useMemo(()=>ecosystemDocuments.filter(d=>selected.has(d.code)&&!d.area.startsWith("00 ")),[selected]);
 const [code,setCode]=useState("");
 const [search,setSearch]=useState("");
 const [statusFilter,setStatusFilter]=useState<"all"|"draft"|"review"|"approved"|"published">("all");
 const visibleDocuments=documents.filter(d=>{
  const record=eco?.documents?.[d.code];
  const matchesSearch=`${d.code} ${d.title} ${d.area}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR").trim());
  const matchesStatus=statusFilter==="all"||(statusFilter==="published"?!!record?.publishedAt:(record?.reviewStatus??"draft")===statusFilter);
  return matchesSearch&&matchesStatus;
 });
 const reviewedCount=documents.filter(d=>eco?.documents?.[d.code]?.reviewStatus==="review").length;
 const approvedCount=documents.filter(d=>eco?.documents?.[d.code]?.reviewStatus==="approved").length;
 const draftCount=documents.filter(d=>!eco?.documents?.[d.code]||eco?.documents?.[d.code]?.reviewStatus==="draft").length;
 const publishedCount=documents.filter(d=>!!eco?.documents?.[d.code]?.publishedAt).length;
 const areaProgress=Array.from(new Set(documents.map(d=>d.area))).map(area=>{
  const scoped=documents.filter(d=>d.area===area);
  const done=scoped.filter(d=>!!eco?.documents?.[d.code]?.publishedAt).length;
  return {area,total:scoped.length,done};
 });
 const overallProgress=documents.length?Math.round(publishedCount/documents.length*100):0;
 const active=documents.find(d=>d.code===code)??documents[0];
 const activeCode=active?.code??"";
 const linkedDeliveries=Array.isArray(projectData.executionTimeline)?projectData.executionTimeline.filter(item=>!!item&&typeof item==="object"&&typeof item.id==="string"&&typeof item.title==="string"&&item.documentCode===activeCode):[];
 const linkedPending=linkedDeliveries.filter(item=>item.status!=="completed"&&item.status!=="cancelled");
 const linkedCompleted=linkedDeliveries.filter(item=>item.status==="completed");
 const linkedBlocked=linkedDeliveries.filter(item=>item.status==="blocked");
 const currentDate=new Date().toLocaleDateString("en-CA");
 const linkedOverdue=linkedPending.filter(item=>typeof item.dueDate==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)&&item.dueDate<currentDate);
 const record=activeCode?eco?.documents?.[activeCode]:undefined;
 const savedContent=record?.content??"";
 const [content,setContent]=useState(savedContent);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 useEffect(()=>{setContent(savedContent);setError("");setSuccess("");},[activeCode,savedContent]);
 async function persist(action:"save"|"review"|"approve"|"publish"){
  if(!activeCode||saving)return;
  if(action==="publish"&&(record?.reviewStatus!=="approved"||content!==savedContent)){setError("Aprove e salve a versão atual antes de publicar.");return;}
  if(action==="approve"&&(record?.reviewStatus!=="review"||content!==savedContent)){setError("Envie a versão salva para revisão antes de aprovar.");return;}
  if(action==="review"&&content!==savedContent){setError("Salve as alterações antes de solicitar revisão.");return;}
  if(action==="save"&&content===savedContent)return;
  if(content.length>200000){setError("O documento excede o limite de 200 mil caracteres.");return;}
  setSaving(true);setError("");setSuccess("");
  try{
   const {data:session,error:sessionError}=await supabase.auth.getSession();
   const token=session.session?.access_token;
   if(sessionError||!token)throw new Error("Sessão expirada.");
   const now=new Date().toISOString();
   const nextRecord:DocumentRecord=action==="publish"?{...record,content:savedContent,updatedAt:record?.updatedAt??now,reviewStatus:"approved",publishedContent:savedContent,publishedAt:now}:action==="approve"?{...record,content:savedContent,updatedAt:record?.updatedAt??now,reviewStatus:"approved"}:action==="review"?{...record,content:savedContent,updatedAt:record?.updatedAt??now,reviewStatus:"review"}:{...record,content,updatedAt:now,reviewStatus:"draft"};
   const nextData:ProjectData={...projectData,ecosystem2027:{...eco,documents:{
     ...(eco?.documents??{}),[activeCode]:nextRecord
   }}};
   const response=await fetch("/api/admin/project/update",{
    method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({projectId,expectedUpdatedAt:updatedAt,data:nextData}),cache:"no-store"
   });
   if(response.status===409)throw new Error("Este projeto foi alterado em outra sessão. Recarregue a página para evitar sobrescrever informações.");
   if(!response.ok)throw new Error("Não foi possível salvar o documento.");
   const result=await response.json();
   if(!result?.project?.updated_at||!result?.project?.data)throw new Error("Resposta de salvamento inválida.");
   onSaved(result.project.data as ProjectData,result.project.updated_at as string);
   setSuccess(action==="publish"?"Versão aprovada publicada para apresentação.":action==="approve"?"Versão aprovada.":action==="review"?"Documento enviado para revisão.":"Rascunho salvo; versão publicada anterior preservada.");
  }catch(e){setError(e instanceof Error?e.message:"Erro ao salvar.");}
  finally{setSaving(false);}
 }
 if(!eco)return null;
 return <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
  <div className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
   <h2 className="text-xl font-bold text-[#090D1C]">Documentos do Ecossistema 2027</h2>
   <p className="mt-2 text-sm text-[#697386]">Edite, revise e aprove cada documento. A apresentação utiliza somente a versão explicitamente publicada; alterações no rascunho não modificam o conteúdo já entregue ao cliente.</p>
   <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Indicadores dos documentos"><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{documents.length}</strong>Selecionados</div><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{draftCount}</strong>Em produção</div><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{reviewedCount}</strong>Em revisão</div><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{approvedCount}</strong>Aprovados</div><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{publishedCount}</strong>Publicados</div></div>
   <div className="mt-5 rounded-xl border border-[#E3E7F0] p-4">
    <div className="flex items-center justify-between gap-2 text-sm"><strong>Progresso de publicação</strong><span className="font-semibold">{overallProgress}%</span></div>
    <progress max={100} value={overallProgress} aria-label="Progresso geral de publicação" className="mt-3 h-2 w-full accent-[#6D35F5]"/>
    <details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-[#525B70]">Acompanhar por área estratégica</summary>
      <div className="mt-3 space-y-3">{areaProgress.map(item=><div key={item.area}><div className="flex justify-between gap-3 text-xs"><span>{item.area}</span><span>{item.done} / {item.total}</span></div><progress aria-label={`Publicações em ${item.area}`} max={item.total} value={item.done} className="mt-1 h-2 w-full accent-[#6D35F5]"/></div>)}</div>
    </details>
   </div>
   {documents.length===0?<p className="mt-5 text-sm text-[#697386]">Selecione documentos para começar.</p>:<>
    <div className="mt-5 grid gap-4 md:grid-cols-[270px_1fr]">
     <div><label htmlFor="rotevo-doc-search" className="mb-2 block text-sm font-semibold">Buscar documento</label><input id="rotevo-doc-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Código, título ou área" className="mb-4 w-full rounded-xl border border-[#E3E7F0] bg-white px-3 py-3 text-sm"/><label htmlFor="rotevo-doc-filter" className="mb-2 block text-sm font-semibold">Filtrar por etapa</label><select id="rotevo-doc-filter" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)} className="mb-4 w-full rounded-xl border border-[#E3E7F0] bg-white px-3 py-3 text-sm"><option value="all">Todas as etapas</option><option value="draft">Em produção</option><option value="review">Em revisão</option><option value="approved">Aprovados</option><option value="published">Com versão publicada</option></select><label htmlFor="rotevo-doc-code" className="mb-2 block text-sm font-semibold">Documento</label>
      <select id="rotevo-doc-code" value={activeCode} onChange={e=>{if(content!==savedContent&&!window.confirm("Descartar as alterações não salvas?"))return;setCode(e.target.value);}} className="w-full rounded-xl border border-[#E3E7F0] bg-white px-3 py-3 text-sm">
       {documents.map(doc=><option key={doc.code} value={doc.code}>{doc.code} — {doc.title}</option>)}
      </select>
      <p className="mt-3 text-xs text-[#697386]">{active?.area}</p>
      {(search.trim()||statusFilter!=="all")&&<div className="mt-3 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[#E3E7F0] p-2" aria-label="Resultados da busca">{visibleDocuments.length===0?<p className="p-2 text-xs text-[#697386]">Nenhum documento encontrado.</p>:visibleDocuments.map(doc=><button key={doc.code} type="button" onClick={()=>{if(content!==savedContent&&!window.confirm("Descartar alterações não salvas?"))return;setCode(doc.code);}} className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${doc.code===activeCode?"bg-[#F0ECFF] font-bold":"hover:bg-[#F6F7FB]"}`}>{doc.code} — {doc.title}</button>)}</div>}

     </div>
     <div><div className="mb-5 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4"><h3 className="text-sm font-bold">Entregas vinculadas a este documento</h3><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Indicadores das entregas relacionadas"><div className="rounded-lg bg-white p-2 text-xs"><strong className="block text-lg">{linkedDeliveries.length}</strong>Total</div><div className="rounded-lg bg-white p-2 text-xs"><strong className="block text-lg">{linkedPending.length}</strong>Pendentes</div><div className="rounded-lg bg-white p-2 text-xs"><strong className="block text-lg">{linkedCompleted.length}</strong>Concluídas</div><div className="rounded-lg bg-white p-2 text-xs"><strong className="block text-lg">{linkedOverdue.length}</strong>Atrasadas</div></div>{linkedBlocked.length>0&&<p className="mt-2 text-xs font-medium text-amber-800">{linkedBlocked.length} entrega(s) aguardando desbloqueio.</p>}<p className="mt-1 text-xs text-[#697386]">As atividades são gerenciadas no cronograma de execução abaixo.</p>{linkedDeliveries.length===0?<p className="mt-3 text-sm text-[#697386]">Nenhuma entrega vinculada até agora.</p>:<ul className="mt-3 space-y-2">{linkedDeliveries.map(item=><li key={item.id} className="rounded-lg border border-[#E3E7F0] bg-white p-3"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{({planned:"Planejado",in_progress:"Em andamento",blocked:"Aguardando",completed:"Concluído",cancelled:"Cancelado"} as Record<string,string>)[item.status??"planned"]??"A definir"} · {item.dueDate||"Sem prazo"} · {item.visibleToClient===false?"Interno":"Visível ao cliente"}</p></li>)}</ul>}</div><label htmlFor="rotevo-doc-body" className="mb-2 block text-sm font-semibold">Conteúdo estratégico</label>
      <textarea id="rotevo-doc-body" rows={14} value={content} onChange={e=>setContent(e.target.value)} placeholder="Insira aqui o documento estratégico estruturado..." className="min-h-72 w-full rounded-xl border border-[#E3E7F0] p-4 text-sm leading-6 outline-none focus:border-[#6D35F5]"/>
      <p className="mt-3 text-xs text-[#697386]">Etapa: {record?.reviewStatus==="approved"?"Aprovado":record?.reviewStatus==="review"?"Em revisão":"Em produção"} · Versão publicada: {record?.publishedAt?new Date(record.publishedAt).toLocaleDateString("pt-BR"):"Ainda não publicada"}</p>
      {record?.publishedContent!==undefined&&<details className="mt-3 rounded-xl border border-[#E3E7F0] p-3"><summary className="cursor-pointer text-sm font-medium">Consultar última versão publicada (somente leitura)</summary><div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#F6F7FB] p-4 text-sm leading-6 text-[#525B70]">{record.publishedContent}</div></details>}
      {activeCode&&!eco?.presentedDocumentCodes?.includes(activeCode)&&<p className="mt-3 rounded-lg bg-[#F6F7FB] p-3 text-xs text-[#525B70]">Documento interno: mesmo após publicar sua versão, ele não aparecerá ao cliente enquanto não estiver marcado para exibição no escopo.</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
       <span className="text-xs text-[#697386]">{content.length.toLocaleString("pt-BR")} caracteres · {content===savedContent?"Sem alterações":"Alterações não salvas"}</span>
       <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>persist("save")} disabled={saving||content===savedContent} className="rounded-xl bg-[#0B142A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Salvar rascunho</button>
        <button type="button" onClick={()=>persist("review")} disabled={saving||content!==savedContent||record?.reviewStatus!=="draft"||!content.trim()} className="rounded-xl border border-[#E3E7F0] px-4 py-3 text-sm font-medium disabled:opacity-40">Enviar para revisão</button>
        <button type="button" onClick={()=>persist("approve")} disabled={saving||content!==savedContent||record?.reviewStatus!=="review"} className="rounded-xl border border-[#E3E7F0] px-4 py-3 text-sm font-medium disabled:opacity-40">Aprovar</button>
        <button type="button" onClick={()=>persist("publish")} disabled={saving||content!==savedContent||record?.reviewStatus!=="approved"||!content.trim()} className="rounded-xl bg-[#A7E000] px-4 py-3 text-sm font-semibold text-[#090D1C] disabled:opacity-40">Publicar versão</button>
       </div>
      </div>
     </div>
    </div>
    {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {success&&<p role="status" className="mt-4 text-sm text-emerald-700">{success}</p>}
   </>}
  </div>
 </section>;
}
