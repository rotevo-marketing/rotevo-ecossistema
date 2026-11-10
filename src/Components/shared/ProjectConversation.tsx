"use client";

import {useCallback,useEffect,useId,useState} from "react";
import {request} from "@/lib/operations/api";

type Message={id:string;author_role:"client"|"staff"|"strategist";body:string;created_at:string};
type Response={messages:Message[]};
const label=(role:Message["author_role"])=>role==="client"?"Cliente":"Equipe Rotevo";

export default function ProjectConversation({projectId,resourceType,resourceId}:{
 projectId:string;resourceType:"task"|"content";resourceId:string;
}){
 const messageId=useId();
 const [messages,setMessages]=useState<Message[]>([]);
 const [body,setBody]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const path="/api/collaboration/messages?"+new URLSearchParams({projectId,resourceType,resourceId});
 const reload=useCallback(async()=>{
  try{const response=await request<Response>(path);setMessages(response.messages);setError("");}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar a conversa.");}
  finally{setLoading(false);}
 },[path]);
 useEffect(()=>{setMessages([]);setLoading(true);setError("");void reload();},[reload]);
 async function send(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!body.trim()||saving)return;
  setSaving(true);setError("");
  try{
   await request("/api/collaboration/messages","POST",{projectId,resourceType,resourceId,body:body.trim()});
   setBody("");await reload();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar a mensagem. Seu texto foi preservado.");}
  finally{setSaving(false);}
 }
 return <section aria-label="Conversa sobre este item" className="rounded-xl border border-[#E3E7F0] p-4">
  <h3 className="text-sm font-bold">Conversa sobre este item</h3>
  <p className="mt-1 text-xs text-[#697386]">Mensagens separadas das decisões de aprovação.</p>
  {loading?<p role="status" className="mt-3 text-sm">Carregando mensagens...</p>:
   <ol aria-live="polite" className="mt-3 max-h-64 space-y-3 overflow-y-auto">
    {messages.map(message=><li key={message.id} className="rounded-lg bg-[#F6F7FB] p-3">
     <div className="flex flex-wrap justify-between gap-2 text-xs font-semibold text-[#555E70]">
      <span>{label(message.author_role)}</span>
      <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString("pt-BR")}</time>
     </div>
     <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#344056]">{message.body}</p>
    </li>)}
    {!messages.length&&<li className="text-xs text-[#697386]">Nenhuma mensagem registrada.</li>}
   </ol>}
  {error&&<div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p role="alert" className="text-xs text-red-700">{error}</p><button type="button" onClick={()=>{setLoading(true);void reload();}} className="rounded-lg border border-[#CFD4DF] px-3 py-2 text-xs font-semibold">Tentar novamente</button></div>}
  <form className="mt-4 space-y-2" onSubmit={send}>
   <label htmlFor={messageId} className="block text-xs font-semibold">Nova mensagem</label>
   <textarea id={messageId} value={body} maxLength={3000} rows={3} disabled={saving} onChange={event=>setBody(event.target.value)}
    className="w-full rounded-lg border border-[#CFD4DF] p-3 text-sm focus-visible:outline-2 focus-visible:outline-[#6C5CE7]" />
   <div className="flex justify-end"><button type="submit" disabled={saving||!body.trim()||loading||!!error}
    className="rounded-lg bg-[#6D35F5] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving?"Enviando...":"Enviar mensagem"}</button></div>
  </form>
 </section>;
}
