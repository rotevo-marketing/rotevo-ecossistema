"use client";
import {useEffect,useMemo,useState} from "react";
import {request} from "@/lib/operations/api";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {validGoogleDriveUrl} from "@/lib/workflow/clientActionsContract";

type Project={id:string;title:string};
type Review={
 assignmentId:string;submissionId:string;
 resourceType:"content"|"task";resourceId:string;resourceVersion:string|null;
 clientUserId:string;actionType:string;instructions:string;
 submittedAt:string;note:string;driveUrl:string;attemptNumber:number;dueDate:string|null;
 projectId:string;projectTitle:string;
};
type ReviewResponse={reviews:Omit<Review,"projectId"|"projectTitle">[]};
const readableAction=(value:string)=>({
 record_video:"Gravação de vídeo",send_material:"Envio de material",
 provide_information:"Informações",review_material:"Revisão de material",custom:"Atividade personalizada"
} as Record<string,string>)[value]??"Entrega";

/**
 * Operational review surface. Requires TWO explicitly enabled flags:
 * NEXT_PUBLIC_ROTEVO_CLIENT_ACTIONS_ENABLED and server ROTEVO_CLIENT_ACTIONS_ENABLED.
 * A client cannot gain team privileges by rendering this component.
 */
export default function ClientActionReviewPanel({projects}:{projects:Project[]}){
 const [items,setItems]=useState<Review[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [working,setWorking]=useState<string|null>(null);
 const [feedback,setFeedback]=useState<Record<string,string>>({});
 const [revision,setRevision]=useState(0);
 const projectKey=useMemo(()=>projects.map(p=>p.id).sort().join("|"),[projects]);
 useEffect(()=>{
  let alive=true;
  let loadedUserId="";
  const ids=projects.map(p=>({id:p.id,title:p.title}));
  setItems([]);setError("");setLoading(true);
  const authChange=supabase.auth.onAuthStateChange((_event,session)=>{
   if(!session?.user){
    alive=false;setItems([]);setError("");setLoading(false);
   }else if(loadedUserId&&session.user.id!==loadedUserId){
    alive=false;setItems([]);setError("");setRevision(v=>v+1);
   }
  });
  void (async()=>{
   try{
    const {data,error:authError}=await supabase.auth.getUser();
    if(authError||!data.user)throw new Error("Sessão expirada. Entre novamente.");
    loadedUserId=data.user.id;
    if(!alive)return;
    const responses=await Promise.allSettled(ids.map(async p=>{
     const params=new URLSearchParams({projectId:p.id,expectedAuthorUserId:data.user!.id});
     const res=await request<ReviewResponse>("/api/workflow/client-actions/review-queue?"+params.toString());
     return (res.reviews??[]).map(row=>({...row,projectId:p.id,projectTitle:p.title}));
    }));
    if(!alive)return;
    const successful=responses.filter((r):r is PromiseFulfilledResult<Review[]>=>r.status==="fulfilled");
    const failures=responses.length-successful.length;
    setItems(successful.flatMap(r=>r.value).sort((a,b)=>a.submittedAt.localeCompare(b.submittedAt)));
    if(failures&&successful.length===0)throw new Error("Não foi possível consultar as entregas deste projeto.");
    if(failures)setError("Alguns projetos não puderam ser consultados. Verifique suas permissões.");
   }catch(e){
    if(alive)setError(e instanceof Error?e.message:"Falha ao consultar as entregas.");
   }finally{if(alive)setLoading(false);}
  })();
  return()=>{alive=false;authChange.data.subscription.unsubscribe();};
 // Only project ID membership should cause a refetch. Changes in title are non-security metadata.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[projectKey,revision]);
 async function decide(item:Review,decision:"validated"|"correction_requested"){
  if(working)return;
  const note=(feedback[item.submissionId]??"").trim();
  if(decision==="correction_requested"&&note.length<3){
   setError("Descreva o ajuste solicitado com pelo menos três caracteres.");return;
  }
  setError("");setWorking(item.submissionId);
  try{
   const {data,error:authError}=await supabase.auth.getUser();
   if(authError||!data.user)throw new Error("Sessão expirada. Entre novamente.");
   await request("/api/workflow/client-actions/review","POST",{
    assignmentId:item.assignmentId,submissionId:item.submissionId,
    decision,feedback:decision==="validated"?"":note,expectedAuthorUserId:data.user.id
   });
   setItems(rows=>rows.filter(x=>x.submissionId!==item.submissionId));
   setFeedback(old=>{const next={...old};delete next[item.submissionId];return next;});
   setRevision(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível registrar a revisão.");}
  finally{setWorking(null);}
 }
 return <section data-ui3-client-review aria-labelledby="client-review-title"
  className="rounded-xl border border-[#E3E6ED] bg-white p-4">
  <div className="flex items-center justify-between gap-3">
   <div><h3 id="client-review-title" className="flex items-center gap-2 text-sm font-semibold text-[#263146]">
    <RotevoTablerIcon name="list-check" size={18}/>Entregas para validar</h3>
    <p className="mt-1 text-xs text-[#697386]">Somente solicitações atribuídas e aguardando revisão interna.</p></div>
   <span className="text-xs tabular-nums text-[#697386]">{loading?"…":items.length}</span>
  </div>
  {error&&<p role="alert" className="mt-3 rounded-md border border-[#F3CFCF] bg-[#FFF6F6] px-3 py-2 text-xs text-[#9C3340]">{error}</p>}
  {loading?<p role="status" className="mt-4 text-xs text-[#697386]">Consultando entregas…</p>
  :items.length===0?<p className="mt-4 text-xs text-[#697386]">Nenhuma entrega aguardando revisão nos projetos autorizados.</p>
  :<ul className="mt-3 divide-y divide-[#EDF0F6]">{items.slice(0,20).map(item=><li key={item.submissionId} className="space-y-2 py-3">
   <div className="flex flex-wrap justify-between gap-2">
    <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#263146]">{readableAction(item.actionType)} · {item.projectTitle}</p>
     <p className="mt-1 text-xs text-[#697386]">{item.instructions}</p></div>
    <span className="text-xs text-[#697386]">Tentativa {item.attemptNumber}</span>
   </div>
   {item.note&&<p className="rounded-md bg-[#F7F8FB] p-3 text-xs leading-5 text-[#4A5368]">{item.note}</p>}
   {validGoogleDriveUrl(item.driveUrl)&&<a href={item.driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-md px-1 py-1 text-xs font-semibold text-[#5949D1] hover:underline">Abrir material no Google Drive</a>}
   <label className="block text-xs font-medium text-[#525B70]">Justificativa para solicitar ajustes
    <textarea rows={2} maxLength={4000} value={feedback[item.submissionId]??""}
     onChange={e=>setFeedback(v=>({...v,[item.submissionId]:e.target.value}))}
     placeholder="Explique ao cliente o que deve ser corrigido…"
     className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-xs focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"/>
   </label>
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={!!working} onClick={()=>void decide(item,"validated")}
     className="rounded-lg border border-[#9DCBAD] bg-[#F0FBF3] px-3 py-2 text-xs font-semibold text-[#176F40] disabled:opacity-60">Validar entrega</button>
    <button type="button" disabled={!!working} onClick={()=>void decide(item,"correction_requested")}
     className="rounded-lg border border-[#F0D5A5] bg-[#FFF8EC] px-3 py-2 text-xs font-semibold text-[#91590E] disabled:opacity-60">Solicitar ajustes</button>
   </div>
  </li>)}</ul>}
  {items.length>20&&<p className="mt-2 text-xs text-[#697386]">Exibindo 20 de {items.length} entregas. Os demais registros permanecem na fila.</p>}
 </section>;
}
