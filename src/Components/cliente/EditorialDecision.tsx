"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import type {EditorialItem} from "@/Components/cliente/EditorialCalendar";

type Decision={id:string;decision:"approved"|"changes_requested";comment:string|null;decided_at:string;content_version:string};
export default function EditorialDecision({projectId,item}:{projectId:string;item:EditorialItem}){
 const [existing,setExisting]=useState<Decision|null>(null);
 const [note,setNote]=useState("");
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [available,setAvailable]=useState(true);
 const [error,setError]=useState("");
 const [completed,setCompleted]=useState(false);
 const version=item.version??"";
 useEffect(()=>{let alive=true;async function load(){
  setLoading(true);setExisting(null);setError("");setCompleted(false);
  const {data,error:err}=await supabase.from("editorial_approvals")
   .select("id,decision,comment,decided_at,content_version")
   .eq("project_id",projectId).eq("content_id",item.id).eq("content_version",version).maybeSingle();
  if(!alive)return;
  if(err){setAvailable(false);setError("A aprovação eletrônica ainda não está disponível. A equipe Rotevo está concluindo a configuração segura.");}
  else{setAvailable(true);setExisting(data as Decision|null);}
  setLoading(false);
 }void load();return()=>{alive=false};},[projectId,item.id,version]);
 async function decide(decision:"approved"|"changes_requested"){
  if(working||!available||existing||item.status!=="awaiting_client")return;
  if(decision==="changes_requested"&&note.trim().length<3){setError("Descreva o ajuste solicitado com pelo menos 3 caracteres.");return;}
  setWorking(true);setError("");
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user){setError("Sua sessão expirou. Entre novamente para registrar a decisão.");setWorking(false);return;}
  const {data,error:err}=await supabase.from("editorial_approvals").insert({
    project_id:projectId,content_id:item.id,content_version:version,decision,
    comment:decision==="changes_requested"?note.trim():null,decided_by:auth.user.id
  }).select("id,decision,comment,decided_at,content_version").single();
  setWorking(false);
  if(err){setError(err.code==="23505"?"Esta versão já recebeu uma decisão. Atualize a página.":"Não foi possível registrar a decisão. Tente novamente ou contate a equipe Rotevo.");return;}
  setExisting(data as Decision);setCompleted(true);
 }
 if(item.status!=="awaiting_client"&&!existing)return null;
 return <section className="mt-5 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4">
  <h4 className="text-sm font-semibold">Aprovação do conteúdo</h4>
  {loading?<p className="mt-2 text-sm text-[#697386]">Verificando situação da aprovação...</p>:
  existing?<div className="mt-2 space-y-2"><p className="text-sm font-semibold text-[#126837]">{existing.decision==="approved"?"Versão aprovada":"Ajustes solicitados"} · {new Date(existing.decided_at).toLocaleString("pt-BR")}</p>
   {existing.comment&&<p className="whitespace-pre-wrap text-sm text-[#525B70]">{existing.comment}</p>}
   {completed&&<p role="status" className="text-sm text-[#126837]">Sua decisão foi registrada com sucesso.</p>}
  </div>:
  <div className="mt-3 space-y-3">
   <p className="text-sm text-[#525B70]">Confira o material e a legenda antes de registrar a decisão sobre esta versão ({version||"sem versão informada"}).</p>
   <label className="block text-sm font-medium">Comentários ou ajustes necessários
    <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={3000} rows={3} placeholder="Descreva aqui o que precisa ser alterado..." className="mt-2 block w-full rounded-lg border border-[#D8DCE5] bg-white p-3 text-sm"/>
   </label>
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={!available||working} onClick={()=>void decide("approved")} className="cursor-pointer rounded-lg bg-[#166B3F] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{working?"Registrando...":"Aprovar versão"}</button>
    <button type="button" disabled={!available||working} onClick={()=>void decide("changes_requested")} className="cursor-pointer rounded-lg border border-[#D8DCE5] bg-white px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Solicitar ajustes</button>
   </div>
  </div>}
  {error&&<p role="alert" className="mt-3 text-sm text-[#A83E3E]">{error}</p>}
 </section>;
}
