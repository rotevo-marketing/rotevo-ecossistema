"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
type Message={id:string;author_id:string;author_kind:"client"|"strategist";message_type:"comment"|"task_approved"|"task_changes_requested";body:string;created_at:string};
export default function ProjectConversation({projectId,itemType,itemId,contentVersion="",clientView=false}:{projectId:string;itemType:"task"|"content";itemId:string;contentVersion?:string;clientView?:boolean}){
 const [messages,setMessages]=useState<Message[]>([]);
 const [currentUserId,setCurrentUserId]=useState("");
 const [body,setBody]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [available,setAvailable]=useState(true);
 const load=useCallback(async()=>{
  setLoading(true);
  const {data:session,error:authError}=await supabase.auth.getSession();
  const token=session.session?.access_token;
  if(authError||!token){setError("Sessão encerrada. Entre novamente para visualizar a conversa.");setAvailable(false);setLoading(false);return;}
  const query=new URLSearchParams({projectId,itemType,itemId,contentVersion});
  try{
   const response=await fetch("/api/collaboration?"+query.toString(),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   if(!response.ok){setAvailable(false);setError(response.status===503?"A conversa ainda não está habilitada neste ambiente.":"Não foi possível carregar esta conversa.");return;}
   const result=await response.json();
   setMessages(result.messages??[]);setCurrentUserId(result.currentUserId??"");setAvailable(true);setError("");
  }catch{setError("Falha de conexão. Verifique sua internet.");}
  finally{setLoading(false);}
 },[projectId,itemType,itemId,contentVersion]);
 useEffect(()=>{void load();},[load]);
 async function send(kind:"comment"|"task_approved"|"task_changes_requested"="comment"){
  if(sending||!available)return;
  const text=kind==="task_approved"?(body.trim()||"Aprovo esta tarefa."):body.trim();
  if(!text||text.length>2000||(kind==="task_changes_requested"&&text.length<3)){setError("Escreva uma mensagem válida (até 2.000 caracteres).");return;}
  setSending(true);setError("");
  const {data:session,error:authError}=await supabase.auth.getSession();
  if(authError||!session.session?.access_token){setError("Sessão expirada. Entre novamente.");setSending(false);return;}
  try{
   const response=await fetch("/api/collaboration",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.session.access_token},body:JSON.stringify({projectId,itemType,itemId,contentVersion,kind,body:text}),cache:"no-store"});
   if(!response.ok){setError(response.status===503?"O armazenamento de mensagens ainda não está configurado. Nada foi enviado.":response.status===429?"Muitas mensagens em pouco tempo. Tente novamente.":"Não foi possível enviar. Atualize a conversa.");return;}
   const result=await response.json();setMessages(prev=>[...prev,result.message]);setBody("");
  }catch{setError("Sem conexão. Mensagem não enviada.");}
  finally{setSending(false);}
 }
 const latestDecision=[...messages].reverse().find(m=>m.message_type!=="comment");
 return <section aria-label={itemType==="task"?"Conversa e aprovação da tarefa":"Conversa sobre o conteúdo"} className="mt-4 flex min-h-[250px] flex-col rounded-xl border border-[#E5E9F1] bg-white">
  <div className="flex items-center justify-between gap-2 border-b border-[#EDF0F5] px-3 py-3"><h4 className="text-xs font-semibold text-[#344056]">{itemType==="task"?"Conversa e aprovação":"Conversa sobre o conteúdo"}</h4><button type="button" onClick={()=>void load()} disabled={loading} className="cursor-pointer rounded-md px-2 py-1 text-[11px] text-[#6D35F5] hover:bg-[#F4F0FF] disabled:opacity-50">Atualizar</button></div>
  {latestDecision&&itemType==="task"&&<p role="status" className="mx-3 mt-3 rounded-lg bg-[#F7F5FD] px-3 py-2 text-xs text-[#5C467C]">Última decisão do cliente: {latestDecision.message_type==="task_approved"?"Aprovada":"Ajustes solicitados"}</p>}
  <ol aria-live="polite" className="max-h-72 flex-1 space-y-3 overflow-y-auto px-3 py-4">{messages.map(m=><li key={m.id} className={m.author_id===currentUserId?"ml-5 rounded-xl bg-[#F0EBFF] p-3":"mr-5 rounded-xl bg-[#F5F7FA] p-3"}>
    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-[#697386]"><span className="font-semibold">{m.author_id===currentUserId?"Você":m.author_kind==="client"?"Cliente":"Equipe Rotevo"}{m.message_type!=="comment"?" · "+(m.message_type==="task_approved"?"Aprovou":"Solicitou ajustes"):""}</span><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString("pt-BR")}</time></div><p className="whitespace-pre-wrap break-words text-sm leading-5 text-[#30384A]">{m.body}</p>
   </li>)}{!messages.length&&!loading&&<li className="py-6 text-center text-xs text-[#8791A0]">Nenhum comentário registrado.</li>}{loading&&<li className="py-6 text-center text-xs text-[#697386]">Carregando conversa...</li>}</ol>
  {error&&<p role="alert" className="mx-3 mb-2 text-xs text-[#B43446]">{error}</p>}
  <div className="border-t border-[#EDF0F5] p-3"><label htmlFor={"discussion-"+itemType+"-"+itemId} className="sr-only">Escreva seu comentário</label><div className="flex items-end gap-2 rounded-xl border border-[#DDE2EC] bg-white p-2 focus-within:border-[#9278E8]"><textarea id={"discussion-"+itemType+"-"+itemId} value={body} onChange={e=>setBody(e.target.value)} disabled={!available||sending} maxLength={2000} rows={2} placeholder={available?"Escreva um comentário...":"Conversa indisponível"} className="max-h-28 min-h-12 min-w-0 flex-1 resize-y bg-transparent p-1 text-sm outline-none disabled:opacity-50"/><button type="button" aria-label="Enviar comentário" onClick={()=>void send()} disabled={!available||sending||!body.trim()} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#6D35F5] text-white disabled:cursor-not-allowed disabled:opacity-40"><RotevoTablerIcon name="arrow-left" size={17} className="rotate-180"/></button></div>
   {clientView&&itemType==="task"&&<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>void send("task_approved")} disabled={!available||sending} className="min-h-9 cursor-pointer rounded-lg border border-[#B8DFC8] bg-[#EDF9F1] px-3 text-xs font-semibold text-[#176B41] disabled:opacity-40">Aprovar tarefa</button><button type="button" onClick={()=>void send("task_changes_requested")} disabled={!available||sending||body.trim().length<3} title="Escreva os ajustes na mensagem antes de enviar." className="min-h-9 cursor-pointer rounded-lg border border-[#ECD5A8] bg-[#FFF9ED] px-3 text-xs font-semibold text-[#906019] disabled:opacity-40">Solicitar ajustes</button></div>}
  </div>
 </section>;
}
