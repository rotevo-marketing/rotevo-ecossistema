"use client";
import {useEffect,useMemo,useState} from "react";
import type {EditorialItem} from "@/Components/cliente/EditorialCalendar";
import {supabase} from "@/lib/supabase";
type Project={id:string;title:string;data:{editorialCalendar?:EditorialItem[]}|null};
type Decision={project_id:string;content_id:string;content_version:string};
export default function ClientAttention({projects,onOpenContent}:{projects:Project[];onOpenContent:()=>void}){
 const [decisions,setDecisions]=useState<Decision[]>([]);
 const [loading,setLoading]=useState(true);
 const [unavailable,setUnavailable]=useState(false);
 const candidates=useMemo(()=>projects.flatMap(p=>(p.data?.editorialCalendar??[])
   .filter(x=>x?.visibleToClient===true&&x.status==="awaiting_client")
   .map(item=>({item,project:p}))),[projects]);
 const projectIds=useMemo(()=>[...new Set(candidates.map(x=>x.project.id))],[candidates]);
 useEffect(()=>{let active=true;async function load(){
  if(projectIds.length===0){setDecisions([]);setUnavailable(false);setLoading(false);return;}
  setLoading(true);
  const {data,error}=await supabase.from("editorial_approvals").select("project_id,content_id,content_version").in("project_id",projectIds);
  if(!active)return;
  setUnavailable(!!error);
  setDecisions(error?[]:(data??[]) as Decision[]);
  setLoading(false);
 }void load();return()=>{active=false}},[projectIds]);
 const pending=candidates.filter(({item,project})=>!decisions.some(d=>d.project_id===project.id&&d.content_id===item.id&&d.content_version===(item.version??"")));
 return <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
  <div className="mb-3 flex items-center gap-3"><span className="text-[#6D35F5]">●</span><h2 className="text-base font-semibold">Precisamos da sua atenção</h2></div>
  {loading?<p className="text-sm text-[#697386]">Verificando aprovações disponíveis...</p>:
   unavailable?<p className="text-sm text-[#697386]">O acompanhamento de aprovações está temporariamente indisponível. A equipe Rotevo está concluindo a configuração.</p>:
   pending.length===0?<p className="text-sm leading-6 text-[#525B70]">Nenhum conteúdo aguardando sua decisão no momento. Outras solicitações serão exibidas aqui conforme suas integrações forem habilitadas.</p>:
   <div className="divide-y divide-[#E3E7F0]">{pending.slice(0,6).map(({item,project})=><div key={project.id+":"+item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
    <div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{project.title} · {item.channel} · Versão {item.version||"não informada"}</p></div>
    <button type="button" onClick={onOpenContent} className="cursor-pointer rounded-xl bg-[#0B142A] px-4 py-2.5 text-xs font-semibold text-white">Revisar conteúdo →</button>
   </div>)}{pending.length>6&&<button type="button" onClick={onOpenContent} className="py-3 text-sm font-semibold text-[#6D35F5]">Ver todas as {pending.length} solicitações →</button>}</div>}
 </section>;
}
