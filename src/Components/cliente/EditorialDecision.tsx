"use client";
import {useEffect,useRef,useState} from "react";
import type {SharedDecisionComposer} from "@/Components/shared/ProjectConversation";
import {supabase} from "@/lib/supabase";
import type {EditorialItem} from "@/Components/cliente/EditorialCalendar";

type Decision={id:string;decision:"approved"|"changes_requested";comment:string|null;decided_at:string;content_version:string};
export default function EditorialDecision({projectId,item,onDecision,composer}:{projectId:string;item:EditorialItem;onDecision?:(decision:"approved"|"changes_requested")=>void;composer?:SharedDecisionComposer}){
 const [existing,setExisting]=useState<Decision|null>(null);
 const [note,setNote]=useState("");
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [available,setAvailable]=useState(true);
 const [error,setError]=useState("");
 const [completed,setCompleted]=useState(false);
 const pending=useRef(false);
 const text=composer?.body??note;
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
  if(pending.current||loading||working||composer?.disabled||!available||existing||item.status!=="awaiting_client")return;
  const comment=decision==="changes_requested"?text.trim():null;
  if(comment!==null&&comment.length<3){setError("Descreva o ajuste solicitado com pelo menos 3 caracteres.");return;}
  pending.current=true;setWorking(true);composer?.onBusy(true);setError("");
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user){setError("Sua sessão expirou. Entre novamente para registrar a decisão.");return;}
   const {data,error:err}=await supabase.rpc("rotevo_editorial_decide",{p_project_id:projectId,p_content_id:item.id,p_content_version:version,p_decision:decision,p_comment:comment});
   if(err){setError(err.code==="23505"?"Esta versão já recebeu uma decisão.":"Não foi possível registrar a decisão. Tente novamente ou contate a equipe Rotevo.");return;}
   setExisting((Array.isArray(data)?data[0]:data) as Decision);setCompleted(true);
   if(comment!==null){setNote("");composer?.clear();}
   onDecision?.(decision);
  }catch{setError("Não foi possível registrar a decisão. Seu texto foi preservado.");}
  finally{pending.current=false;setWorking(false);composer?.onBusy(false);}
 }
 if(item.status!=="awaiting_client"&&!existing)return null;
 return <section className="mt-5 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4">
  <h4 className="text-sm font-semibold">Aprovação do conteúdo</h4>
  {loading?<p className="mt-2 text-sm text-[#697386]">Verificando situação da aprovação...</p>:
  existing?<div className="mt-2 space-y-2"><p className="text-sm font-semibold text-[#126837]">{existing.decision==="approved"?"Versão aprovada":"Ajustes solicitados"} · {new Date(existing.decided_at).toLocaleString("pt-BR")}</p>
   {existing.comment&&<p className="whitespace-pre-wrap text-sm text-[#525B70]">{existing.comment}</p>}
   {completed&&<p role="status" className="text-sm text-[#126837]">Sua decisão foi registrada com sucesso.</p>}
  </div>:
  <div className={composer?"flex flex-wrap justify-end gap-2":"mt-3 space-y-3"}>
   {!composer&&<label className="block text-xs font-semibold">Nova mensagem
    <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={3000} rows={3} disabled={working} className="mt-2 block w-full rounded-lg border border-[#D8DCE5] bg-white p-3 text-sm"/>
   </label>}
   <button type="button" disabled={!available||working||composer?.disabled||text.trim().length<3} onClick={()=>void decide("changes_requested")} className="rounded-lg border border-[#D8DCE5] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Solicitar ajuste</button>
   <button type="button" disabled={!available||working||composer?.disabled} onClick={()=>void decide("approved")} className="rounded-lg bg-[#166B3F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Aprovar conteúdo</button>
  </div>}
  {error&&<p role="alert" className="mt-3 text-sm text-[#A83E3E]">{error}</p>}
 </section>;
}
