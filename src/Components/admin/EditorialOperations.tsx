"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import type {EditorialItem} from "@/Components/cliente/EditorialCalendar";
type Client={name:string;slug:string};
type Project={id:string;title:string;data:{editorialCalendar?:EditorialItem[]}|null;clients:Client|Client[]|null};
type Decision={project_id:string;content_id:string;content_version:string;decision:string;decided_at:string;comment:string|null};
const customer=(p:Project)=>Array.isArray(p.clients)?p.clients[0]:p.clients;
export default function EditorialOperations({projects,onOpenContent}:{projects:Project[];onOpenContent:()=>void}){
 const [rows,setRows]=useState<Decision[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState(false);
 const items=useMemo(()=>projects.flatMap(p=>(p.data?.editorialCalendar??[])
  .filter(i=>i&&i.visibleToClient===true&&i.status==="awaiting_client").map(i=>({item:i,project:p}))),[projects]);
 const ids=useMemo(()=>[...new Set(items.map(x=>x.project.id))],[items]);
 useEffect(()=>{let valid=true;async function load(){
  if(!ids.length){setRows([]);setError(false);setLoading(false);return;}
  setLoading(true);
  const {data,error:err}=await supabase.from("editorial_approvals")
   .select("project_id,content_id,content_version,decision,decided_at,comment")
   .in("project_id",ids).order("decided_at",{ascending:false});
  if(!valid)return;
  setRows(err?[]:(data??[]) as Decision[]);setError(!!err);setLoading(false);
 }void load();return()=>{valid=false};},[ids]);
 const pending=items.filter(({item,project})=>!rows.some(r=>r.project_id===project.id&&r.content_id===item.id&&r.content_version===(item.version??"")));
 return <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Aprovações de conteúdo</h2><p className="mt-1 text-sm text-[#697386]">Solicitações por cliente e registros de decisão.</p></div>
   <button type="button" onClick={onOpenContent} className="cursor-pointer text-sm font-semibold text-[#6D35F5]">Gerenciar conteúdo →</button>
  </div>
  {loading?<p className="mt-5 text-sm text-[#697386]">Verificando aprovações...</p>:
   error?<p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Integração de aprovações ainda não disponível. A migração e as permissões do banco precisam ser validadas.</p>:
   <div className="mt-5 space-y-4">
    <div className="rounded-xl bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Aguardando decisão</p><p className="mt-1 text-2xl font-semibold tabular-nums">{pending.length}</p></div>
    {pending.length===0?<p className="text-sm text-[#697386]">Nenhum conteúdo visível ao cliente aguardando uma decisão.</p>:pending.slice(0,5).map(({item,project})=><div key={project.id+":"+item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E7F0] py-2"><div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-[#697386]">{customer(project)?.name??"Cliente"} · {project.title} · Versão {item.version||"não informada"}</p></div><button type="button" onClick={onOpenContent} className="cursor-pointer text-xs font-semibold text-[#6D35F5]">Abrir →</button></div>)}
    {rows.length>0&&<div className="border-t border-[#E3E7F0] pt-4"><h3 className="mb-2 text-sm font-semibold">Decisões recentes</h3>{rows.slice(0,4).map((r,i)=><p key={i} className="py-1 text-xs text-[#525B70]">{r.decision==="approved"?"Aprovado":"Ajustes solicitados"} · Versão {r.content_version} · {new Date(r.decided_at).toLocaleDateString("pt-BR")}</p>)}</div>}
   </div>}
 </section>;
}
