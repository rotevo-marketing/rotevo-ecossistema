"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {request} from "@/lib/operations/api";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";

type Notice={
 notification_id:string;event_id:string;project_id:string;project_title:string;
 resource_id:string;resource_version:string|null;event_type:string;
 event_phase:string|null;occurred_at:string;read_at:string|null;
};
type Result={notifications:Notice[]};
const label=(n:Notice)=>{
 if(n.event_type==="approval_requested")return n.event_phase==="idea"?"Ideia aguardando sua aprovação":"Conteúdo aguardando sua aprovação";
 if(n.event_type==="approval_approved")return "Versão aprovada pelo cliente";
 if(n.event_type==="adjustments_requested")return "Cliente solicitou ajustes";
 if(n.event_type==="message_sent")return n.event_phase==="task"?"Nova mensagem em uma tarefa":"Nova mensagem na conversa";
 return "Atualização do projeto";
};

/** Feature-gated workflow inbox; navigations are resolved by the authenticated parent. */
export default function WorkflowNotificationBell({userId,onOpenContent,onOpenTask}:{userId:string;onOpenContent?:(projectId:string,resourceId:string)=>void;onOpenTask?:(projectId:string,taskId:string)=>void}){
 const [open,setOpen]=useState(false);
 const [loading,setLoading]=useState(false);
 const [notices,setNotices]=useState<Notice[]>([]);
 const [unread,setUnread]=useState(0);
 const [pilotAllowed,setPilotAllowed]=useState(false);
 const [error,setError]=useState("");
 const identity=useRef(userId);
 const revision=useRef(0);
 // Invalidate in-flight requests on every identity change, before effects run.
 if(identity.current!==userId){identity.current=userId;revision.current+=1;}
 useEffect(()=>{setNotices([]);setUnread(0);setOpen(false);setError("");setPilotAllowed(false);},[userId]);
 const refresh=useCallback(async()=>{
  const expected=identity.current;
  const currentRevision=++revision.current;
  const isCurrent=()=>identity.current===expected&&revision.current===currentRevision;
  const {data:actor,error:authError}=await supabase.auth.getUser();
  if(!isCurrent())return;
  if(authError||!actor.user||actor.user.id!==expected){
   setNotices([]);setUnread(0);setOpen(false);setPilotAllowed(false);return;
  }
  try{
   const [list,newCount]=await Promise.all([
    request<Result>("/api/workflow/notifications?limit=30"),
    request<Result>("/api/workflow/notifications?limit=50&unread=true")
   ]);
   if(!isCurrent())return;
   setNotices(list.notifications);
   setUnread(newCount.notifications.length);
   setPilotAllowed(true);
   setError("");
  }catch{if(isCurrent()){setPilotAllowed(false);setNotices([]);setUnread(0);setOpen(false);setError("Não foi possível atualizar as notificações.");}}
 },[]);
 useEffect(()=>{
  let alive=true;
  const check=()=>{if(alive&&document.visibilityState==="visible")void refresh();};
  void refresh();
  const i=window.setInterval(check,30000);
  document.addEventListener("visibilitychange",check);
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==="SIGNED_OUT"||(session?.user&&session.user.id!==identity.current)){
    revision.current+=1;
    setNotices([]);setUnread(0);setOpen(false);setPilotAllowed(false);
   }
  });
  return()=>{alive=false;window.clearInterval(i);document.removeEventListener("visibilitychange",check);subscription.unsubscribe();};
 },[refresh,userId]);
 async function read(n:Notice){
  if(n.read_at||loading)return;
  const expected=identity.current;
  const atStart=revision.current;
  setLoading(true);setError("");
  try{
   const {data:actor,error:authError}=await supabase.auth.getUser();
   if(authError||!actor.user||actor.user.id!==expected||revision.current!==atStart)throw Error("Sessão alterada.");
   await request("/api/workflow/notifications","PATCH",{notificationId:n.notification_id,expectedAuthorUserId:expected});
   if(identity.current===expected&&revision.current===atStart)await refresh();
  }catch(e){if(identity.current===expected)setError(e instanceof Error?e.message:"Não foi possível marcar como lida.");}
  finally{setLoading(false);}
 }
 if(!pilotAllowed)return null;
 return <div className="relative">
  <button type="button" aria-label={unread>0?"Notificações: "+unread+" não lidas":"Notificações"} aria-haspopup="dialog" aria-expanded={open}
   onClick={()=>{setOpen(v=>!v);if(!open)void refresh();}}
   className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#525B70] hover:bg-[#F5F3FF] focus-visible:outline-2 focus-visible:outline-[#6D35F5]">
   <RotevoTablerIcon name="bell" size={19} stroke={1.65}/>
   {unread>0&&<span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-[#6D35F5] px-1 text-[10px] font-semibold leading-4 text-white">{unread>9?"9+":unread}</span>}
  </button>
  {open&&<section role="dialog" aria-label="Central de notificações" className="absolute right-0 z-50 mt-2 w-[min(350px,90vw)] rounded-xl border border-[#E3E7F0] bg-white p-3 shadow-xl">
   <div className="flex items-center justify-between border-b border-[#EFF1F5] pb-2">
    <h3 className="text-sm font-semibold text-[#30394A]">Notificações</h3>
    <button type="button" onClick={()=>setOpen(false)} className="cursor-pointer px-2 py-1 text-xs text-[#697386]">Fechar</button>
   </div>
   {error&&<p role="alert" className="mt-2 text-xs text-[#A83E3E]">{error}</p>}
   <ol className="max-h-[360px] overflow-y-auto">
    {notices.map(n=><li key={n.notification_id} className="border-b border-[#EFF1F5] py-3 last:border-0">
     <p className="text-xs font-semibold text-[#344056]">{label(n)}{!n.read_at&&<span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#6D35F5]" aria-label="Não lida"/>}</p>
     <p className="mt-1 truncate text-xs text-[#697386]">{n.project_title}</p>
     <p className="mt-1 text-[11px] text-[#8B95A5]">{new Date(n.occurred_at).toLocaleString("pt-BR")}</p>
     {(n.event_type==="message_sent"&&n.event_phase==="task"?onOpenTask:onOpenContent)&&n.resource_id&&n.project_id&&<button type="button" onClick={()=>{setOpen(false);if(n.event_type==="message_sent"&&n.event_phase==="task")onOpenTask?.(n.project_id,n.resource_id);else onOpenContent?.(n.project_id,n.resource_id);}} className="mt-2 mr-3 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[#5949D1] focus-visible:outline-2 focus-visible:outline-[#6D35F5]"><RotevoTablerIcon name="external-link" size={14} stroke={1.6}/> {n.event_type==="message_sent"&&n.event_phase==="task"?"Ver tarefa":"Ver conteúdo"}</button>}
     {!n.read_at&&<button type="button" disabled={loading} onClick={()=>void read(n)} className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[#5949D1] disabled:opacity-50">
      <RotevoTablerIcon name="check" size={14} stroke={1.6}/> Marcar como lida
     </button>}
    </li>)}
   </ol>
   {!notices.length&&!error&&<p className="py-6 text-center text-xs text-[#697386]">Nenhuma notificação disponível.</p>}
   <p className="border-t border-[#EFF1F5] pt-2 text-[11px] text-[#8B95A5]">Marcar como lida não encerra uma pendência. O acesso ao item será validado novamente.</p>
  </section>}
 </div>;
}
