"use client";

import {usePortalRefresh} from "@/hooks/usePortalRefresh";
import {useCallback,useEffect,useMemo,useState} from "react";
import {request} from "@/lib/operations/api";
import {supabase} from "@/lib/supabase";
import {validGoogleDriveUrl} from "@/lib/workflow/clientActionsContract";
import DialogFocus from "@/Components/ui/DialogFocus";
import {assignmentLabels,assignmentStatusLabels} from "@/Components/cliente/ClientActionDeliveryPanel";
import ClientActionReviewPanel from "./ClientActionReviewPanel";

type Project={id:string;title:string};
type Delivery={id:string;driveUrl:string;note:string;attempt:number;status:string;feedback?:string|null};
export type ProjectAssignment={
 id:string;projectId:string;resourceId:string;resourceType:"content"|"task";resourceVersion:string|null;
 clientUserId:string;responsible:string|null;actionType:string;instructions:string;dueDate:string|null;
 status:string;completedAt:string|null;deliveries:Delivery[];
};
const noAssignments:ProjectAssignment[]=[];
export function useStrategistAssignments(projects:Project[],enabled:boolean){
 const ids=useMemo(()=>projects.map(p=>p.id).sort().join("|"),[projects]);
 const [snapshot,setSnapshot]=useState<{ids:string;rows:ProjectAssignment[];error:string}|null>(null);
 const [revision,setRevision]=useState(0);
 const revalidate=useCallback(()=>setRevision(value=>value+1),[]);
 usePortalRefresh(revalidate,enabled&&!!ids);
 useEffect(()=>{
  if(!enabled||!ids)return;
  let active=true,requestNumber=0,loadedUser="";
  const refresh=async()=>{
   const generation=++requestNumber;
   try{
    const {data,error}=await supabase.auth.getUser();
    if(error||!data.user)throw new Error("Sessão expirada.");
    const author=data.user.id;
    if(!active||generation!==requestNumber)return;
    if(loadedUser&&loadedUser!==author)setSnapshot(null);
    loadedUser=author;
    const results=await Promise.allSettled(ids.split("|").map(async projectId=>{
     const query=new URLSearchParams({projectId,expectedAuthorUserId:author});
     const response=await request<{assignments:ProjectAssignment[]}>("/api/workflow/client-actions/project?"+query);
     return response.assignments.filter(row=>row.projectId===projectId);
    }));
    if(!active||generation!==requestNumber)return;
    setSnapshot({ids,rows:results.flatMap(result=>result.status==="fulfilled"?result.value:[]),
     error:results.some(result=>result.status==="rejected")?"Algumas atribuições não puderam ser carregadas.":""});
   }catch{
    if(active&&generation===requestNumber)setSnapshot({ids,rows:[],error:"Não foi possível consultar as atribuições."});
   }
  };
  const auth=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==="SIGNED_OUT"||(event==="SIGNED_IN"&&loadedUser&&loadedUser!==session?.user.id))setSnapshot(null);
   if(event==="SIGNED_IN"||event==="SIGNED_OUT")requestNumber++;
   if(event==="SIGNED_IN")setTimeout(()=>{if(active)void refresh();},0);
  });
  void refresh();
  return()=>{active=false;auth.data.subscription.unsubscribe();};
 },[enabled,ids,revision]);
 return {
  rows:enabled&&snapshot?.ids===ids?snapshot.rows:noAssignments,
  error:enabled&&snapshot?.ids===ids?snapshot.error:"",
  refresh:()=>setRevision(value=>value+1)
 };
}
export function StrategistAssignmentDetails({items,project,client,title,onClose,onReviewed,onOpenResource}:{
 items:ProjectAssignment[];project:Project;client?:string;title:string;onClose:()=>void;onReviewed:()=>void;onOpenResource?:()=>void;
}){
 return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#090D1C]/60 p-4">
  <section role="dialog" aria-modal="true" aria-label="Detalhes da atribuição" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-white p-5 shadow-xl">
   <DialogFocus onClose={onClose}/>
   <div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2><button type="button" onClick={onClose} className="rounded-lg border px-3 py-1 text-sm">Fechar</button></div>
   <p className="mt-1 text-sm">{[client,project.title].filter(Boolean).join(" · ")}</p>
   {onOpenResource&&<button type="button" className="mt-2 rounded-lg border px-3 py-1 text-sm" onClick={onOpenResource}>Abrir registro original</button>}
   {items.map(item=><section key={item.id} className="mt-4 rounded-lg border p-4">
    <h3 className="text-sm font-semibold">{assignmentLabels[item.actionType]??"Atribuição"}</h3>
    <p className="mt-1 text-xs">{item.responsible??client??"Cliente"} · {assignmentStatusLabels[item.status]??item.status} · {item.dueDate?.split("-").reverse().join("/")??"Sem prazo"}</p>
    {item.resourceVersion&&<p className="mt-1 text-xs">Versão {item.resourceVersion}</p>}
    <p className="mt-2 whitespace-pre-wrap text-sm">{item.instructions}</p>
    <h4 className="mt-4 text-sm font-semibold">Histórico de entregas</h4>
    {item.deliveries.length===0?<p className="mt-1 text-sm">Nenhuma entrega registrada.</p>:
     <ul className="mt-1 divide-y">{item.deliveries.map(delivery=><li key={delivery.id} className="space-y-1 py-2 text-sm">
      <p>Entrega {delivery.attempt} · {assignmentStatusLabels[delivery.status]??delivery.status}</p>
      {delivery.note&&<p className="whitespace-pre-wrap">{delivery.note}</p>}
      {delivery.feedback&&<p className="whitespace-pre-wrap">{delivery.feedback}</p>}
      {validGoogleDriveUrl(delivery.driveUrl)&&<a className="underline" href={delivery.driveUrl} target="_blank" rel="noopener noreferrer">Abrir material no Google Drive</a>}
     </li>)}</ul>}
    {item.status==="submitted"&&<ClientActionReviewPanel projects={[project]} assignmentId={item.id} onReviewed={onReviewed}/>}
   </section>)}
  </section>
 </div>;
}
