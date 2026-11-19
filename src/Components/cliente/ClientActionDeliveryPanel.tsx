"use client";
import {usePortalRefresh,announceOperationalChange} from "@/hooks/usePortalRefresh";

import {useCallback,useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabase";
import {request} from "@/lib/operations/api";
import {validGoogleDriveUrl} from "@/lib/workflow/clientActionsContract";

type Project={id:string;title:string};
export type ClientAssignment={id:string;projectId:string;projectTitle:string;resourceType:"content"|"task";resourceId:string;resourceVersion:string|null;actionType:string;instructions:string;dueDate:string|null;status:string;updatedAt?:string};
const emptyAssignments:ClientAssignment[]=[];
type Draft={url:string;note:string;requestKey:string};
const editable=(status:string)=>["pending","in_progress","correction_requested"].includes(status);

export function useClientAssignments(projects:Project[],userId?:string){
 const key=JSON.stringify([userId,projects.map(p=>[p.id,p.title]).sort()]);
 const [snapshot,setSnapshot]=useState<{key:string;items:ClientAssignment[]}>({key:"",items:[]});
 const [loading,setLoading]=useState(false),[error,setError]=useState("");
 const revision=useRef(0);
 const refresh=useCallback(async()=>{
  const generation=++revision.current;
  if(!userId){setSnapshot({key,items:[]});setLoading(false);return;}
  setLoading(true);
  try{
   const actor=await supabase.auth.getUser();
   if(actor.error||actor.data.user?.id!==userId)throw Error("Sessão alterada.");
   const results=await Promise.allSettled(projects.map(async p=>{
    const query=new URLSearchParams({projectId:p.id,expectedAuthorUserId:userId});
    const response=await request<{assignments:Omit<ClientAssignment,"projectTitle">[]}>("/api/workflow/client-actions?"+query);
    return (response.assignments??[]).filter(a=>a.projectId===p.id).map(a=>({...a,projectTitle:p.title}));
   }));
   const latest=await supabase.auth.getUser();
   if(generation!==revision.current)return;
   if(latest.error||latest.data.user?.id!==userId)throw Error("Sessão alterada.");
   setSnapshot({key,items:results.flatMap(r=>r.status==="fulfilled"?r.value:[])});
   setError(results.some(r=>r.status==="rejected")?"Alguns projetos não puderam ser consultados.":"");
  }catch(cause){if(generation===revision.current){setSnapshot({key,items:[]});setError(cause instanceof Error?cause.message:"Não foi possível consultar suas entregas.");}}
  finally{if(generation===revision.current)setLoading(false);}
 // Projects are captured by their stable ID/title identity.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key]);
 const invalidate=useCallback(()=>{revision.current++;},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void refresh(),0);return()=>{window.clearTimeout(timer);invalidate();};},[key,refresh,invalidate]);
 usePortalRefresh(refresh,!!userId);
 return {items:snapshot.key===key?snapshot.items:emptyAssignments,loading:!!userId&&(loading||snapshot.key!==key),error:snapshot.key===key?error:"",
  markSubmitted:(id:string)=>{setSnapshot(current=>current.key===key?{...current,items:current.items.map(item=>item.id===id?{...item,status:"submitted"}:item)}:current);announceOperationalChange();}};
}

export const assignmentLabels:Record<string,string>={
 record_video:"Gravar vídeo",send_material:"Enviar material",provide_information:"Fornecer informações",
 review_material:"Revisar material",custom:"Atribuição"
};
export const assignmentStatusLabels:Record<string,string>={
 pending:"Pendente",in_progress:"Em andamento",submitted:"Aguardando validação",
 correction_requested:"Correção solicitada",validated:"Validada",cancelled:"Cancelada"
};

/** The client uploads directly to Google Drive and submits the link. */
export default function ClientActionDeliveryPanel({items,userId,onSubmitted}:{
 items:ClientAssignment[];userId:string;onSubmitted:(id:string)=>void;
}){
 const [urls,setUrls]=useState<Record<string,string>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [drafts,setDrafts]=useState<Record<string,Draft>>({});
 const [busy,setBusy]=useState(""),[error,setError]=useState("");
 const inFlight=useRef(false);
 async function submit(item:ClientAssignment){
  if(inFlight.current||!editable(item.status))return;
  const url=(urls[item.id]??"").trim(),note=(notes[item.id]??"").trim();
  if(!validGoogleDriveUrl(url)){setError("Cole um link válido do Google Drive.");return;}
  const draft=drafts[item.id];
  if(draft&&(draft.url!==url||draft.note!==note)){
   setError("A tentativa anterior está pendente. Mantenha o link e a observação até confirmar o envio.");return;
  }
  inFlight.current=true;
  setBusy(item.id);setError("");
  const current=draft??{url,note,requestKey:"client-drive:"+crypto.randomUUID()};
  if(!draft)setDrafts(v=>({...v,[item.id]:current}));
  try{
   const {data,error:authError}=await supabase.auth.getUser();
   if(authError||data.user?.id!==userId)throw Error("Sessão expirada.");
   const result=await request<{submission:{id:string}}>(
    "/api/workflow/client-actions/submit","POST",{
     assignmentId:item.id,driveUrl:current.url,note:current.note,
     requestKey:current.requestKey,expectedAuthorUserId:userId
    });
   const identity=await supabase.auth.getUser();
   if(identity.error||identity.data.user?.id!==userId)throw Error("A sessão mudou.");
   if(!result.submission?.id)throw Error("A entrega não foi confirmada.");
   onSubmitted(item.id);
   setUrls(v=>({...v,[item.id]:""}));setNotes(v=>({...v,[item.id]:""}));
   setDrafts(v=>{const next={...v};delete next[item.id];return next;});
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível registrar o link da entrega.");}
  finally{inFlight.current=false;setBusy("");}
 }
 return <section data-ui3-client-actions aria-label="Instruções e entrega" className="rounded-xl border border-[#E3E6ED] p-4">
  <h3 className="text-sm font-semibold">Instruções e entrega</h3>
  <p className="mt-1 text-xs text-[#697386]">Grave ou prepare o material no Google Drive e cole o link aqui. A Rotevo não armazena arquivos.</p>
  {error&&<p role="alert" className="mt-2 text-xs text-[#A83E3E]">{error}</p>}
  <ul className="mt-3 divide-y">{items.map(item=><li key={item.id} className="space-y-2 py-3">
    <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold">{assignmentLabels[item.actionType]??assignmentLabels.custom}</p><span className="text-xs text-[#697386]">{assignmentStatusLabels[item.status]??item.status}</span></div>
    <p className="whitespace-pre-wrap text-xs text-[#525B70]">{item.instructions}</p>
    {editable(item.status)&&<>
     <label className="block text-xs font-medium">Link do arquivo no Google Drive
      <input type="url" required maxLength={2048} value={urls[item.id]??""}
       onChange={e=>setUrls(v=>({...v,[item.id]:e.target.value}))}
       placeholder="https://drive.google.com/file/d/..."
       className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-xs"/></label>
     <p className="text-[11px] text-[#697386]">Confira se a equipe da Rotevo tem permissão para visualizar o material no Drive.</p>
     <label className="block text-xs font-medium">Observação (opcional)
      <textarea maxLength={4000} rows={2} value={notes[item.id]??""}
       onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))}
       className="mt-1 w-full rounded-lg border border-[#E3E6ED] p-2 text-xs"/></label>
     <button type="button" disabled={!!busy} onClick={()=>void submit(item)}
      className="rounded-lg bg-[#6C5CE7] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
      {busy===item.id?"Enviando…":"Enviar link para validação"}</button>
    </>}
   </li>)}</ul>
 </section>;
}
