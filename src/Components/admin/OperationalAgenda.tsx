"use client";
import {useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {validOperationalDate,validOperationalTime} from "@/lib/security/executionDependencyValidation";

export type AgendaItem={id:string;title:string;kind:"meeting"|"followup"|"checkpoint";date:string;time?:string;status:"planned"|"completed"|"cancelled";notes?:string;owner?:string;relatedTaskId?:string};
type Data={operationalAgenda?:AgendaItem[];executionTimeline?:{id:string;title:string}[]};
const empty:AgendaItem={id:"",title:"",kind:"meeting",date:"",time:"",status:"planned",notes:"",owner:"",relatedTaskId:""};
const kinds={meeting:"Reunião",followup:"Acompanhamento",checkpoint:"Marco de controle"};
export default function OperationalAgenda({projectId,projectData,updatedAt,onSaved}:{projectId:string;projectData:Data;updatedAt:string;onSaved:(data:Data,updatedAt:string)=>void}){
 const [editing,setEditing]=useState<AgendaItem|null>(null),[working,setWorking]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const rows=useMemo(()=>Array.isArray(projectData.operationalAgenda)?projectData.operationalAgenda.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string"):[],[projectData]);
 const ordered=[...rows].sort((a,b)=>(a.date+"T"+(a.time||"23:59")).localeCompare(b.date+"T"+(b.time||"23:59")));
 const tasks=projectData.executionTimeline??[];
 async function save(next:AgendaItem[]){
  if(working)return;
  setWorking(true);setError("");setMessage("");
  try{
   const {data:session,error:sessionError}=await supabase.auth.getSession();
   if(sessionError||!session.session?.access_token)throw new Error("Sessão expirada. Entre novamente.");
   const response=await fetch("/api/admin/project/update",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.session.access_token}`},body:JSON.stringify({projectId,expectedUpdatedAt:updatedAt,data:{...projectData,operationalAgenda:next}}),cache:"no-store"});
   if(response.status===409)throw new Error("O projeto foi atualizado em outra sessão. Recarregue antes de salvar.");
   if(!response.ok)throw new Error("Não foi possível atualizar a agenda autorizada.");
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string")throw new Error("A gravação não pôde ser confirmada.");
   onSaved(result.project.data as Data,result.project.updated_at);
   setEditing(null);setMessage("Agenda operacional atualizada.");
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar agenda.");}
  finally{setWorking(false);}
 }
 function submit(){
  if(!editing)return;
  const title=editing.title.trim();
  if(title.length<3||title.length>140){setError("Informe um título entre 3 e 140 caracteres.");return;}
  if((editing.notes??"").length>2000){setError("As observações devem ter no máximo 2.000 caracteres.");return;}
  if((editing.owner??"").length>120){setError("O responsável deve ter no máximo 120 caracteres.");return;}
  if(!validOperationalDate(editing.date)){setError("Informe uma data válida.");return;}
  if(editing.time&&!validOperationalTime(editing.time)){setError("Informe um horário válido.");return;}
  if(editing.relatedTaskId&&!tasks.some(t=>t.id===editing.relatedTaskId)){setError("A atividade vinculada não pertence ao projeto.");return;}
  const value={...editing,id:editing.id||crypto.randomUUID(),title,notes:(editing.notes??"").trim(),owner:(editing.owner??"").trim()};
  void save(editing.id?rows.map(x=>x.id===editing.id?value:x):[...rows,value]);
 }
 return <section id="agenda-operacional" className="mt-6 rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Reuniões e acompanhamento</h2><p className="mt-1 text-sm text-[#697386]">Agenda de reuniões, retornos e marcos operacionais. Os registros não criam convites externos automaticamente.</p></div><button type="button" disabled={working} onClick={()=>setEditing({...empty})} className="rounded-xl bg-[#0B142A] px-4 py-2 text-sm font-semibold text-white">Novo compromisso</button></div>
  {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="mt-4 text-sm text-emerald-800">{message}</p>}
  <div className="mt-5 divide-y divide-[#E3E7F0]">{ordered.length===0?<p className="text-sm text-[#697386]">Nenhum compromisso registrado.</p>:ordered.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{kinds[item.kind]} · {item.date}{item.time?` às ${item.time}`:""} · {item.status==="completed"?"Concluído":item.status==="cancelled"?"Cancelado":"Planejado"} · {item.owner||"Sem responsável"}</p>{item.relatedTaskId&&<p className="text-xs text-[#697386]">Atividade: {tasks.find(t=>t.id===item.relatedTaskId)?.title??"Referência indisponível"}</p>}{item.notes&&<p className="mt-1 text-xs text-[#697386]">{item.notes}</p>}</div><div className="flex gap-2"><button type="button" disabled={working} onClick={()=>setEditing({...item})} className="rounded-lg border px-3 py-2 text-xs">Editar</button><button type="button" disabled={working} onClick={()=>{if(window.confirm("Excluir este compromisso?"))void save(rows.filter(x=>x.id!==item.id));}} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700">Excluir</button></div></div>)}</div>
  {editing&&<div className="mt-5 grid gap-3 rounded-xl bg-[#F6F7FB] p-4 sm:grid-cols-2"><label className="text-xs font-semibold">Título<input value={editing.title} maxLength={140} onChange={e=>setEditing({...editing,title:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold">Data<input type="date" value={editing.date} onChange={e=>setEditing({...editing,date:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold">Horário (opcional)<input type="time" value={editing.time??""} onChange={e=>setEditing({...editing,time:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold">Tipo<select value={editing.kind} onChange={e=>setEditing({...editing,kind:e.target.value as AgendaItem["kind"]})} className="mt-1 w-full rounded-lg border p-2 text-sm">{Object.entries(kinds).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label className="text-xs font-semibold">Situação<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as AgendaItem["status"]})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="planned">Planejado</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></label><label className="text-xs font-semibold">Responsável<input value={editing.owner??""} maxLength={120} onChange={e=>setEditing({...editing,owner:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold">Atividade vinculada<select value={editing.relatedTaskId??""} onChange={e=>setEditing({...editing,relatedTaskId:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Nenhuma</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label className="text-xs font-semibold sm:col-span-2">Observações<textarea rows={3} maxLength={2000} value={editing.notes??""} onChange={e=>setEditing({...editing,notes:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><div className="flex gap-2 sm:col-span-2"><button type="button" disabled={working} onClick={submit} className="rounded-lg bg-[#0B142A] px-4 py-2 text-sm font-semibold text-white">Salvar</button><button type="button" disabled={working} onClick={()=>setEditing(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button></div></div>}
 </section>;
}
