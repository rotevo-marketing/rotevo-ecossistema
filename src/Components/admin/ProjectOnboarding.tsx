"use client";
import {useState} from "react";
import {supabase} from "@/lib/supabase";

export type OnboardingItem={id:string;title:string;done:boolean;visibleToClient:boolean;link?:string;updatedAt?:string};
export type OnboardingData={onboardingChecklist?:OnboardingItem[];[key:string]:unknown};
const defaults=["Confirmar informações de contato","Validar contrato e escopo","Solicitar materiais e identidade visual","Confirmar acessos e permissões","Realizar reunião inicial","Validar briefing e próximos passos"];
export default function ProjectOnboarding({projectId,data,updatedAt,onSaved}:{projectId:string;data:OnboardingData;updatedAt:string;onSaved:(value:OnboardingData,updatedAt:string)=>void}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState<OnboardingItem[]>([]);
 const [saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const items=Array.isArray(data.onboardingChecklist)?data.onboardingChecklist:[];
 const completed=items.filter(x=>x.done).length;
 function begin(){setDraft(items.map(x=>({...x})));setEditing(true);setError("");setNotice("");}
 function startTemplate(){setDraft(defaults.map((title,i)=>({id:crypto.randomUUID(),title,done:false,visibleToClient:i===0||i===2||i===4})));setEditing(true);setError("");}
 async function save(){
  if(saving)return;
  if(draft.some(x=>x.title.trim().length<3)){setError("Informe uma descrição válida para cada etapa.");return;}
  if(draft.some(x=>{
   const link=x.link?.trim();
   if(!link)return false;
   try{return new URL(link).protocol!=="https:";}catch{return true;}
  })){setError("Os links das etapas devem ser URLs HTTPS válidas.");return;}
  setSaving(true);setError("");
  const value={...data,onboardingChecklist:draft.map(x=>({...x,title:x.title.trim()}))};
  try {
   const {data:session,error:authError}=await supabase.auth.getSession();
   const token=session.session?.access_token;
   if(authError||!token){setError("Sessão expirada. Entre novamente para salvar.");return;}
   const response=await fetch("/api/admin/project/update",{
    method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({projectId,expectedUpdatedAt:updatedAt,data:value}),cache:"no-store"
   });
   if(response.status===409){setError("O projeto foi atualizado em outra sessão. Atualize a página antes de salvar.");return;}
   if(!response.ok){setError("Não foi possível atualizar o onboarding. Confira as permissões.");return;}
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string"){setError("Não foi possível confirmar a atualização do onboarding.");return;}
   onSaved(result.project.data as OnboardingData,result.project.updated_at);
   setEditing(false);setNotice("Checklist de onboarding atualizado.");
  }catch{setError("Falha de conexão ao salvar o onboarding.");}
  finally{setSaving(false);}
 }
 return <section className="mt-6 rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="text-xl font-semibold">Onboarding do projeto</h2><p className="mt-2 text-sm text-[#525B70]">Etapas de entrada vinculadas a este projeto. As tarefas internas permanecem restritas à equipe.</p></div>
   {!editing&&<button type="button" className="cursor-pointer rounded-xl bg-[#0B142A] px-4 py-2.5 text-sm font-semibold text-white" onClick={items.length?begin:startTemplate}>{items.length?"Editar checklist":"Iniciar onboarding"}</button>}
  </div>
  {items.length>0&&<p className="mt-4 text-sm text-[#697386]">{completed} de {items.length} etapas concluídas</p>}
  {notice&&<p role="status" className="mt-3 text-sm text-green-800">{notice}</p>}
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  {editing?<div className="mt-5 space-y-3">{draft.map((item,index)=><div key={item.id} className="rounded-xl border border-[#E3E7F0] p-3">
   <div className="flex items-start gap-3"><input aria-label={`Concluir etapa ${index+1}`} type="checkbox" className="mt-3 h-4 w-4 accent-[#6D35F5]" checked={item.done} onChange={e=>setDraft(old=>old.map(x=>x.id===item.id?{...x,done:e.target.checked,updatedAt:new Date().toISOString()}:x))}/><input aria-label={`Descrição da etapa ${index+1}`} className="min-w-0 flex-1 rounded-lg border border-[#DDE1EA] px-3 py-2 text-sm" value={item.title} onChange={e=>setDraft(old=>old.map(x=>x.id===item.id?{...x,title:e.target.value}:x))}/><button type="button" onClick={()=>setDraft(old=>old.filter(x=>x.id!==item.id))} className="cursor-pointer px-2 py-2 text-xs text-red-700">Excluir</button></div>
   <label className="mt-2 flex items-center gap-2 pl-7 text-xs text-[#525B70]"><input type="checkbox" checked={item.visibleToClient} onChange={e=>setDraft(old=>old.map(x=>x.id===item.id?{...x,visibleToClient:e.target.checked}:x))}/> Visível ao cliente</label>
   <input aria-label={`Link da etapa ${index+1}`} type="url" placeholder="Link opcional do Drive (HTTPS)" value={item.link??""} onChange={e=>setDraft(old=>old.map(x=>x.id===item.id?{...x,link:e.target.value}:x))} className="mt-2 ml-7 block w-[calc(100%-1.75rem)] rounded-lg border border-[#DDE1EA] px-3 py-2 text-xs"/>
  </div>)}<div className="flex flex-wrap justify-between gap-2"><button type="button" onClick={()=>setDraft(old=>[...old,{id:crypto.randomUUID(),title:"Nova etapa",done:false,visibleToClient:false}])} className="cursor-pointer rounded-lg border px-3 py-2 text-sm">+ Adicionar etapa</button><div className="flex gap-2"><button type="button" disabled={saving} onClick={()=>setEditing(false)} className="cursor-pointer rounded-lg border px-3 py-2 text-sm">Cancelar</button><button type="button" disabled={saving} onClick={()=>void save()} className="cursor-pointer rounded-lg bg-[#0B142A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar etapas</button></div></div></div>:
   items.length?<div className="mt-5 divide-y divide-[#E3E7F0]">{items.map(item=><div key={item.id} className="flex items-center justify-between gap-2 py-3"><span className="text-sm">{item.done?"✓ ":"○ "}{item.title}</span><span className="text-xs text-[#697386]">{item.visibleToClient?"Compartilhada":"Interna"}</span></div>)}</div>:
   <p className="mt-4 text-sm text-[#697386]">Checklist ainda não iniciado. O modelo inicial pode ser adaptado conforme o serviço contratado.</p>}
 </section>;
}
