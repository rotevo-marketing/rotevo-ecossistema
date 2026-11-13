"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import type {EditorialItem} from "@/Components/cliente/EditorialCalendar";

type Decision={id:string;decision:"approved"|"changes_requested";comment:string|null;decided_at:string;content_version:string};
export default function EditorialIdeaDecision({projectId,item,onDecision}:{projectId:string;item:EditorialItem;onDecision?:(decision:"approved"|"changes_requested")=>void}){
 const [existing,setExisting]=useState<Decision|null>(null);
 const [note,setNote]=useState("");
 const [requestingChanges,setRequestingChanges]=useState(false);
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [available,setAvailable]=useState(true);
 const [error,setError]=useState("");
 const [completed,setCompleted]=useState(false);
 const version=item.version??"";
 useEffect(()=>{let alive=true;async function load(){
  setLoading(true);setExisting(null);setError("");setCompleted(false);setRequestingChanges(false);
  const {data,error:err}=await supabase.from("editorial_idea_approvals")
   .select("id,decision,comment,decided_at,content_version")
   .eq("project_id",projectId).eq("content_id",item.id).eq("content_version",version).maybeSingle();
  if(!alive)return;
  if(err){setAvailable(false);setError("A aprovação eletrônica ainda não está disponível. A equipe Rotevo está concluindo a configuração segura.");}
  else{setAvailable(true);setExisting(data as Decision|null);}
  setLoading(false);
 }void load();return()=>{alive=false};},[projectId,item.id,version]);
 async function decide(decision:"approved"|"changes_requested"){
  if(working||!available||existing||!["idea","idea_pending"].includes(item.status))return;
  if(decision==="changes_requested"&&note.trim().length<3){setError("Descreva o ajuste solicitado com pelo menos 3 caracteres.");return;}
  setWorking(true);setError("");
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user){setError("Sua sessão expirou. Entre novamente para registrar a decisão.");setWorking(false);return;}
  const {data,error:err}=await supabase.rpc("rotevo_editorial_idea_decide",{p_project_id:projectId,p_content_id:item.id,p_content_version:version,p_decision:decision,p_comment:decision==="changes_requested"?note.trim():null});
  setWorking(false);
  if(err){setError(err.code==="23505"?"Esta ideia já recebeu uma decisão. Atualize a página.":err.code==="42501"?"Este acesso não está autorizado a aprovar a ideia. Consulte a equipe Rotevo para confirmar o aprovador responsável.":"Não foi possível registrar a decisão. Tente novamente ou contate a equipe Rotevo.");return;}
  setExisting((Array.isArray(data)?data[0]:data) as Decision);setCompleted(true);onDecision?.(decision);
 }
 if(!["idea","idea_pending","idea_approved","idea_changes"].includes(item.status)&&!existing)return null;
 return <section className="rounded-xl border border-[#E3E7F0] bg-[#F8F9FC] p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-semibold">Aprovação da ideia</h4><p className="mt-1 text-xs text-[#697386]">Avalie a proposta antes de iniciar a produção.</p></div>
  </div>
  {loading?<p className="mt-2 text-sm text-[#697386]">Verificando aprovação...</p>:
   existing?<div className="mt-3 space-y-2"><p className="text-sm font-semibold text-[#126837]">{existing.decision==="approved"?"Ideia aprovada":"Ajustes na ideia"} · {new Date(existing.decided_at).toLocaleString("pt-BR")}</p>{existing.comment&&<p className="whitespace-pre-wrap text-sm text-[#525B70]">{existing.comment}</p>}{completed&&<p role="status" className="text-sm text-[#126837]">Decisão registrada com sucesso.</p>}</div>:
   !["idea_approved","idea_changes"].includes(item.status)&&<div className="mt-3 space-y-3 border-t border-[#E3E7F0] pt-3"><p className="text-sm text-[#525B70]">Confirme sua decisão sobre a ideia, versão {version||"não informada"}.</p>
     {requestingChanges&&<label className="block text-sm font-medium">Quais ajustes deseja solicitar?<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={3000} rows={3} placeholder="Descreva o que precisa ser alterado..." className="mt-2 block w-full rounded-lg border border-[#D8DCE5] bg-white p-3 text-sm"/></label>}
     <div className="flex flex-wrap gap-2"><button type="button" disabled={!available||working} onClick={()=>void decide("approved")} className="cursor-pointer rounded-lg bg-[#166B3F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{working?"Registrando...":"Aprovar ideia"}</button>
     <button type="button" disabled={!available||working} onClick={()=>requestingChanges?void decide("changes_requested"):setRequestingChanges(true)} className="cursor-pointer rounded-lg border border-[#D8DCE5] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40">{requestingChanges?"Enviar solicitação":"Solicitar ajustes"}</button></div>
   </div>}
  {error&&<p role="alert" className="mt-3 text-sm text-[#A83E3E]">{error}</p>}
 </section>;
}
