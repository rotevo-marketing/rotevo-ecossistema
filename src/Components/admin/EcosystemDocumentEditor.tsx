"use client";

import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {ecosystemDocuments} from "@/data/ecosystem2027";

type DocumentRecord={content:string;updatedAt:string};
type Eco={version?:number;selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];documents?:Record<string,DocumentRecord>};
type ProjectData={ecosystem2027?:Eco;[key:string]:unknown};
type Props={projectId:string;projectData:ProjectData;updatedAt:string;onSaved:(data:ProjectData,updatedAt:string)=>void};

export default function EcosystemDocumentEditor({projectId,projectData,updatedAt,onSaved}:Props){
 const eco=projectData.ecosystem2027;
 const selected=useMemo(()=>new Set(eco?.selectedDocumentCodes??[]),[eco?.selectedDocumentCodes]);
 const documents=useMemo(()=>ecosystemDocuments.filter(d=>selected.has(d.code)&&!d.area.startsWith("00 ")),[selected]);
 const [code,setCode]=useState("");
 const active=documents.find(d=>d.code===code)??documents[0];
 const activeCode=active?.code??"";
 const savedContent=activeCode?eco?.documents?.[activeCode]?.content??"":"";
 const [content,setContent]=useState(savedContent);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 useEffect(()=>{setContent(savedContent);setError("");setSuccess("");},[activeCode,savedContent]);
 async function save(){
  if(!activeCode||saving||content===savedContent)return;
  if(content.length>200000){setError("O documento excede o limite de 200 mil caracteres.");return;}
  setSaving(true);setError("");setSuccess("");
  try{
   const {data:session,error:sessionError}=await supabase.auth.getSession();
   const token=session.session?.access_token;
   if(sessionError||!token)throw new Error("Sessão expirada.");
   const nextData:ProjectData={...projectData,ecosystem2027:{...eco,documents:{
     ...(eco?.documents??{}),[activeCode]:{content,updatedAt:new Date().toISOString()}
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
   setSuccess("Documento salvo.");
  }catch(e){setError(e instanceof Error?e.message:"Erro ao salvar.");}
  finally{setSaving(false);}
 }
 if(!eco)return null;
 return <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
  <div className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
   <h2 className="text-xl font-bold text-[#090D1C]">Documentos do Ecossistema 2027</h2>
   <p className="mt-2 text-sm text-[#697386]">Edite o conteúdo de cada documento selecionado. O conteúdo é interno e não é enviado à apresentação do cliente nesta etapa.</p>
   {documents.length===0?<p className="mt-5 text-sm text-[#697386]">Selecione documentos para começar.</p>:<>
    <div className="mt-5 grid gap-4 md:grid-cols-[270px_1fr]">
     <div><label htmlFor="rotevo-doc-code" className="mb-2 block text-sm font-semibold">Documento</label>
      <select id="rotevo-doc-code" value={activeCode} onChange={e=>{if(content!==savedContent&&!window.confirm("Descartar as alterações não salvas?"))return;setCode(e.target.value);}} className="w-full rounded-xl border border-[#E3E7F0] bg-white px-3 py-3 text-sm">
       {documents.map(doc=><option key={doc.code} value={doc.code}>{doc.code} — {doc.title}</option>)}
      </select>
      <p className="mt-3 text-xs text-[#697386]">{active?.area}</p>
     </div>
     <div><label htmlFor="rotevo-doc-body" className="mb-2 block text-sm font-semibold">Conteúdo estratégico</label>
      <textarea id="rotevo-doc-body" rows={14} value={content} onChange={e=>setContent(e.target.value)} placeholder="Insira aqui o documento estratégico estruturado..." className="min-h-72 w-full rounded-xl border border-[#E3E7F0] p-4 text-sm leading-6 outline-none focus:border-[#6D35F5]"/>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
       <span className="text-xs text-[#697386]">{content.length.toLocaleString("pt-BR")} caracteres · {content===savedContent?"Sem alterações":"Alterações não salvas"}</span>
       <button type="button" onClick={save} disabled={saving||content===savedContent} className="rounded-xl bg-[#0B142A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{saving?"Salvando...":"Salvar documento"}</button>
      </div>
     </div>
    </div>
    {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {success&&<p role="status" className="mt-4 text-sm text-emerald-700">{success}</p>}
   </>}
  </div>
 </section>;
}
