"use client";
import {usePortalRefresh} from "@/hooks/usePortalRefresh";


import {useCallback,useEffect,useId,useRef,useState} from "react";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {request} from "@/lib/operations/api";
import {TaskAvatar} from "@/Components/admin/TaskGridCells";

type Message={id:string;author_role:"client"|"staff"|"strategist";author_name:string;author_avatar_url:string|null;content_version?:string|null;body:string;created_at:string};
type Response={messages:Message[];nextCursor:string|null};
export type SharedDecisionComposer={body:string;disabled:boolean;onBusy:(busy:boolean)=>void;clear:()=>void};
type Approval={phase:"idea"|"final";version:string;onDecision:(decision:"approved"|"changes_requested",comment:string|null)=>void};

function ConversationPanel({projectId,resourceType,resourceId,readOnly=false,approval,contentDetails=false,renderLegacyActions}:{
 projectId:string;resourceType:"task"|"content";resourceId:string;readOnly?:boolean;approval?:Approval;contentDetails?:boolean;renderLegacyActions?:(composer:SharedDecisionComposer)=>React.ReactNode;
}){
 const messageId=useId();
 const [messages,setMessages]=useState<Message[]>([]);
 const [body,setBody]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [olderLoading,setOlderLoading]=useState(false);
 const [nextCursor,setNextCursor]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [approvalDone,setApprovalDone]=useState<"approved"|"changes_requested"|null>(null);
 const pendingDecision=useRef(false);
 const [legacyBusy,setLegacyBusy]=useState(false);
 const pendingSend=useRef(false);
 const readRevision=useRef(0);
 const mountedAuthor=useRef<string|null>(null);
 useEffect(()=>{let active=true;mountedAuthor.current=null;void supabase.auth.getUser().then(({data})=>{if(active)mountedAuthor.current=data.user?.id??null;}).catch(()=>{if(active)mountedAuthor.current=null;});return()=>{active=false;mountedAuthor.current=null;};},[projectId,resourceId,resourceType]);
 const path="/api/collaboration/messages?"+new URLSearchParams({projectId,resourceType,resourceId});
 const reload=useCallback(async()=>{
  const revision=++readRevision.current;
  try{const response=await request<Response>(path);if(revision!==readRevision.current)return;setMessages(current=>{const latest=new Set(response.messages.map(m=>m.id));const older=response.nextCursor?current.filter(m=>!latest.has(m.id)&&m.created_at<(response.messages[0]?.created_at??"")):[];return [...older,...response.messages];});setNextCursor(current=>current??response.nextCursor);setError("");}
  catch(e){if(revision===readRevision.current)setError(e instanceof Error?e.message:"Não foi possível carregar a conversa.");}
  finally{if(revision===readRevision.current)setLoading(false);}
 },[path]);
 const invalidateReads=useCallback(()=>{readRevision.current++;},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void reload(),0);return()=>{window.clearTimeout(timer);invalidateReads();};},[reload,invalidateReads]);
 usePortalRefresh(reload);
 async function loadOlder(){
  if(!nextCursor||olderLoading)return;
  setOlderLoading(true);setError("");
  try{
   const response=await request<Response>(path+"&cursor="+encodeURIComponent(nextCursor));
   setMessages(current=>{
    const known=new Set(current.map(message=>message.id));
    return [...response.messages.filter(message=>!known.has(message.id)),...current];
   });
   setNextCursor(response.nextCursor);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar mensagens anteriores.");}
  finally{setOlderLoading(false);}
 }
 async function send(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!body.trim()||loading||saving||legacyBusy||pendingSend.current||pendingDecision.current||readOnly)return;
  pendingSend.current=true;
  setSaving(true);setError("");
  try{
   const {data:actor,error:identityError}=await supabase.auth.getUser();
   const expectedAuthorUserId=mountedAuthor.current;
   if(identityError||!expectedAuthorUserId||actor.user?.id!==expectedAuthorUserId)throw Error("A conta mudou. Reabra o painel antes de enviar.");
   await request("/api/collaboration/messages","POST",{projectId,resourceType,resourceId,body:body.trim(),expectedAuthorUserId});
   setBody("");await reload();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar a mensagem. Seu texto foi preservado.");}
  finally{pendingSend.current=false;setSaving(false);}
 }
 async function decide(decision:"approved"|"changes_requested"){
  if(!approval||loading||saving||pendingSend.current||pendingDecision.current||approvalDone||readOnly)return;
  if(decision==="changes_requested"&&body.trim().length<3){setError("Descreva o ajuste na conversa com pelo menos 3 caracteres.");return;}
  const comment=decision==="changes_requested"?body.trim():null;
  pendingDecision.current=true;
  setSaving(true);setError("");
  try{
   const {data:actor,error:authError}=await supabase.auth.getUser();
   if(authError||!mountedAuthor.current||actor.user?.id!==mountedAuthor.current)throw Error("A conta ativa mudou. Reabra a conversa para continuar.");
   await request("/api/workflow/editorial/decision","POST",{
    projectId,contentId:resourceId,contentVersion:approval.version,phase:approval.phase,
    decision,adjustmentBody:comment,
    expectedAuthorUserId:mountedAuthor.current
   });
   setApprovalDone(decision);
   if(decision==="changes_requested")setBody("");
   approval.onDecision(decision,comment);
   void reload();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível registrar a decisão.");}
  finally{pendingDecision.current=false;setSaving(false);}
 }
 return <section aria-label="Conversa sobre este item" className="rounded-xl border border-[#E3E7F0] p-4">
  {!contentDetails&&<><h3 className="text-sm font-bold">Conversa sobre este item</h3>
  <p className="mt-1 text-xs text-[#697386]">Mensagens separadas das decisões de aprovação.</p></>}
  {loading?<p role="status" className="mt-3 text-sm">Carregando mensagens...</p>:
   <div className="mt-3">{nextCursor&&<button type="button" disabled={olderLoading} onClick={()=>void loadOlder()} className="mb-3 rounded-lg border border-[#CFD4DF] px-3 py-2 text-xs font-semibold disabled:opacity-50">{olderLoading?"Carregando...":"Carregar mensagens anteriores"}</button>}<ol aria-live="polite" className="max-h-64 space-y-3 overflow-y-auto">
    {messages.map(message=><li key={message.id} className="flex items-start gap-2.5 border-b border-[#EFF1F5] py-3 last:border-0">
     <TaskAvatar name={message.author_name} src={message.author_avatar_url} size={30}/>
     <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
       <span className="text-xs font-semibold text-[#293144]">{message.author_name}</span>
       <time dateTime={message.created_at} className="text-[11px] font-normal text-[#606D82]">{new Date(message.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</time>
       {message.content_version&&<span className="text-[11px] font-normal text-[#606D82]">Versão {message.content_version}</span>}
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#344056]">{message.body}</p>
     </div>
    </li>)}
    {!messages.length&&<li className="text-xs text-[#697386]">Nenhuma mensagem registrada.</li>}
   </ol></div>}
  {error&&<div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p role="alert" className="text-xs text-red-700">{error}</p><button type="button" onClick={()=>{setLoading(true);void reload();}} className="rounded-lg border border-[#CFD4DF] px-3 py-2 text-xs font-semibold">Tentar novamente</button></div>}
  {!readOnly&&<form className="mt-4 space-y-2" onSubmit={send}>
   <label htmlFor={messageId} className="block text-xs font-semibold">Nova mensagem</label>
   <textarea id={messageId} value={body} maxLength={3000} rows={3} disabled={saving||legacyBusy} onChange={event=>setBody(event.target.value)}
    className="w-full rounded-lg border border-[#CFD4DF] p-3 text-sm focus-visible:outline-2 focus-visible:outline-[#6C5CE7]" />
   <div className="flex flex-wrap justify-end gap-2">
    <button type="submit" disabled={saving||legacyBusy||!body.trim()||loading}
     className="rounded-lg border border-[#D8DCE5] bg-white px-4 py-2 text-xs font-semibold text-[#344056] disabled:opacity-50">Enviar mensagem</button>
    {!contentDetails&&approval&&!approvalDone&&<button type="button" disabled={saving||loading||body.trim().length<3} onClick={()=>void decide("changes_requested")}
     className="rounded-lg border border-[#D8DCE5] bg-white px-3 py-2 text-xs font-semibold text-[#344056] disabled:opacity-50">Solicitar ajuste</button>}
    {approval&&!approvalDone&&<button type="button" disabled={saving||loading} onClick={()=>void decide("approved")}
     className="inline-flex items-center gap-1 rounded-lg bg-[#6D35F5] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
     <RotevoTablerIcon name="check" size={16} stroke={1.7}/> {approval.phase==="idea"?"Aprovar ideia":"Aprovar conteúdo"}
    </button>}
    {renderLegacyActions?.({body,disabled:saving||loading,onBusy:setLegacyBusy,clear:()=>setBody("")})}
   </div>
  </form>}
  {approvalDone&&<p role="status" className="text-xs text-[#126837]">{approvalDone==="changes_requested"?"Solicitação de ajustes registrada.":"Aprovação registrada."}</p>}
 </section>;
}

export default function ProjectConversation(props:Parameters<typeof ConversationPanel>[0]){return <ConversationPanel key={props.projectId+":"+props.resourceType+":"+props.resourceId} {...props}/>;}
