"use client";

import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {ecosystemDocuments} from "@/data/ecosystem2027";

type DocumentRecord={content:string;updatedAt:string;reviewStatus?:"draft"|"review"|"approved";publishedContent?:string;publishedAt?:string};
type Eco={version?:number;selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];documents?:Record<string,DocumentRecord>};
type ProjectData={ecosystem2027?:Eco;[key:string]:unknown};
type Props={projectId:string;projectData:ProjectData;updatedAt:string;onSaved:(data:ProjectData,updatedAt:string)=>void};

export default function EcosystemDocumentEditor({projectId,projectData,updatedAt,onSaved}:Props){
 const eco=projectData.ecosystem2027;
 const selected=useMemo(()=>new Set(eco?.selectedDocumentCodes??[]),[eco?.selectedDocumentCodes]);
 const documents=useMemo(()=>ecosystemDocuments.filter(d=>selected.has(d.code)&&!d.area.startsWith("00 ")),[selected]);
 const [code,setCode]=useState("");
 const [search,setSearch]=useState("");
 const visibleDocuments=documents.filter(d=>`${d.code} ${d.title} ${d.area}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR").trim()));
 const reviewedCount=documents.filter(d=>eco?.documents?.[d.code]?.reviewStatus==="review").length;
 const approvedCount=documents.filter(d=>eco?.documents?.[d.code]?.reviewStatus==="approved").length;
 const publishedCount=documents.filter(d=>!!eco?.documents?.[d.code]?.publishedAt).length;
 const active=documents.find(d=>d.code===code)??documents[0];
 const activeCode=active?.code??"";
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
   <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Indicadores dos documentos"><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{documents.length}</strong>Selecionados</div><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{reviewedCount}</strong>Em revisão</div><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{approvedCount}</strong>Aprovados</div><div className="rounded-xl bg-[#F6F7FB] p-3 text-sm"><strong className="block text-xl">{publishedCount}</strong>Publicados</div></div>
   {documents.length===0?<p className="mt-5 text-sm text-[#697386]">Selecione documentos para começar.</p>:<>
    <div className="mt-5 grid gap-4 md:grid-cols-[270px_1fr]">
     <div><label htmlFor="rotevo-doc-search" className="mb-2 block text-sm font-semibold">Buscar documento</label><input id="rotevo-doc-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Código, título ou área" className="mb-4 w-full rounded-xl border border-[#E3E7F0] bg-white px-3 py-3 text-sm"/><label htmlFor="rotevo-doc-code" className="mb-2 block text-sm font-semibold">Documento</label>
      <select id="rotevo-doc-code" value={activeCode} onChange={e=>{if(content!==savedContent&&!window.confirm("Descartar as alterações não salvas?"))return;setCode(e.target.value);}} className="w-full rounded-xl border border-[#E3E7F0] bg-white px-3 py-3 text-sm">
       {visibleDocuments.length===0?<option disabled value="">Nenhum documento encontrado</option>:null}
       {documents.map(doc=><option key={doc.code} value={doc.code} hidden={!visibleDocuments.includes(doc)}>{doc.code} — {doc.title}</option>)}
      </select>
      <p className="mt-3 text-xs text-[#697386]">{active?.area}</p>
     </div>
     <div><label htmlFor="rotevo-doc-body" className="mb-2 block text-sm font-semibold">Conteúdo estratégico</label>
      <textarea id="rotevo-doc-body" rows={14} value={content} onChange={e=>setContent(e.target.value)} placeholder="Insira aqui o documento estratégico estruturado..." className="min-h-72 w-full rounded-xl border border-[#E3E7F0] p-4 text-sm leading-6 outline-none focus:border-[#6D35F5]"/>
      <p className="mt-3 text-xs text-[#697386]">Etapa: {record?.reviewStatus==="approved"?"Aprovado":record?.reviewStatus==="review"?"Em revisão":"Em produção"} · Versão publicada: {record?.publishedAt?new Date(record.publishedAt).toLocaleDateString("pt-BR"):"Ainda não publicada"}</p>
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
