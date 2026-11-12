"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {request} from "@/lib/operations/api";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";

type WorkflowNotice={
 notification_id:string;project_id:string;project_title:string;resource_id:string;
 event_type:string;occurred_at:string;read_at:string|null;
};
type Result={notifications:WorkflowNotice[]};
const actionable=new Set(["adjustments_requested","message_sent"]);

export default function WorkflowFocusQueue({userId,onOpenContent}:{
 userId:string;onOpenContent:(projectId:string,contentId:string)=>void;
}){
 const [items,setItems]=useState<WorkflowNotice[]>([]);
 const [status,setStatus]=useState<"loading"|"ready"|"unavailable">("loading");
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   try{
    const {data,error}=await supabase.auth.getUser();
    if(!active)return;
    if(error||data.user?.id!==userId){setItems([]);setStatus("unavailable");return;}
    const result=await request<Result>("/api/workflow/notifications?limit=50&unread=true");
    if(!active)return;
    const {data:latest,error:identityError}=await supabase.auth.getUser();
    if(!active)return;
    if(identityError||latest.user?.id!==userId){setItems([]);setStatus("unavailable");return;}
    setItems(result.notifications.filter(n=>actionable.has(n.event_type)&&!!n.project_id&&!!n.resource_id).slice(0,5));
    setStatus("ready");
   }catch{if(active){setItems([]);setStatus("unavailable");}}
  };
  void refresh();
  const check=()=>{if(document.visibilityState==="visible")void refresh();};
  const interval=window.setInterval(check,30000);
  document.addEventListener("visibilitychange",check);
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==="SIGNED_OUT"||(session?.user&&session.user.id!==userId)){
    active=false;setItems([]);setStatus("unavailable");
   }
  });
  return()=>{active=false;window.clearInterval(interval);document.removeEventListener("visibilitychange",check);subscription.unsubscribe();};
 },[userId]);
 return <div className="mt-4 border-t border-[#EDF0F6] pt-3" aria-label="Notificações que exigem atenção">
  <p className="text-xs font-semibold text-[#525B70]">Aprovações e mensagens pendentes</p>
  {status==="loading"&&<p role="status" className="mt-2 text-xs text-[#697386]">Consultando pendências...</p>}
  {status==="unavailable"&&<p role="status" className="mt-2 text-xs text-[#697386]">Pendências de aprovações indisponíveis no momento.</p>}
  {status==="ready"&&!items.length&&<p className="mt-2 text-xs text-[#697386]">Nenhuma solicitação de ajuste ou mensagem não lida.</p>}
  {status==="ready"&&items.length>0&&<ul className="mt-2 divide-y divide-[#EDF0F6]">{items.map(n=><li key={n.notification_id}>
   <button type="button" onClick={()=>onOpenContent(n.project_id,n.resource_id)}
    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-3 text-left hover:bg-[#F8F7FC] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]">
    <span className="min-w-0"><span className="block text-xs font-medium text-[#263146]">{n.event_type==="adjustments_requested"?"Ajustes solicitados":"Nova mensagem"}</span><span className="mt-1 block truncate text-[11px] text-[#697386]">{n.project_title}</span></span>
    <RotevoTablerIcon name="external-link" size={16} stroke={1.7}/>
   </button>
  </li>)}</ul>}
 </div>;
}
