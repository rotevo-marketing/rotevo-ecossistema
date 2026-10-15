"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type RecordRow={id:string;content_id:string;content_version:string;decision:"approved"|"changes_requested";comment:string|null;decided_at:string;decided_by:string};
export default function EditorialApprovalsPanel({projectId}:{projectId:string}){
 const [rows,setRows]=useState<RecordRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let alive=true;async function run(){
  setLoading(true);setError("");
  const {data,error:err}=await supabase.from("editorial_approvals").select("id,content_id,content_version,decision,comment,decided_at,decided_by").eq("project_id",projectId).order("decided_at",{ascending:false}).limit(100);
  if(!alive)return;
  setLoading(false);
  if(err)setError("Histórico de aprovações ainda indisponível. É necessário aplicar e validar a migração do banco.");
  else setRows((data??[]) as RecordRow[]);
 }void run();return()=>{alive=false};},[projectId]);
 return <section className="mt-5 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4">
  <h3 className="text-sm font-semibold">Histórico de decisões do cliente</h3>
  {loading?<p className="mt-3 text-sm text-[#697386]">Carregando histórico...</p>:
   error?<p className="mt-3 text-sm text-[#697386]">{error}</p>:
   rows.length===0?<p className="mt-3 text-sm text-[#697386]">Nenhuma decisão registrada.</p>:
   <div className="mt-4 divide-y divide-[#DDE1E9]">{rows.map(row=><div key={row.id} className="py-3">
    <p className="text-sm font-semibold">{row.decision==="approved"?"Aprovado":"Ajustes solicitados"} · Versão {row.content_version||"não informada"}</p>
    <p className="mt-1 text-xs text-[#697386]">Conteúdo: {row.content_id} · {new Date(row.decided_at).toLocaleString("pt-BR")} · Usuário {row.decided_by.slice(0,8)}</p>
    {row.comment&&<p className="mt-2 whitespace-pre-wrap text-sm text-[#525B70]">{row.comment}</p>}
   </div>)}</div>}
 </section>;
}
