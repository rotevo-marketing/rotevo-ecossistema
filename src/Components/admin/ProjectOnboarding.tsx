"use client";
import {useState} from "react";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";

export type OnboardingItem={id:string;title:string;done:boolean;visibleToClient:boolean;link?:string;updatedAt?:string;owner?:string;dueDate?:string;waitingOnClient?:boolean;notes?:string};
export type OnboardingData={onboardingChecklist?:OnboardingItem[];[key:string]:unknown};
export const ONBOARDING_STANDARD_STEPS=[
 "Confirmar contratação, escopo e contrato",
 "Confirmar pagamento e dados para faturamento",
 "Validar cadastro e contatos do cliente",
 "Criar e organizar a pasta do cliente no Google Drive",
 "Solicitar materiais e informações iniciais",
 "Solicitar e validar acessos aos canais digitais necessários",
 "Definir responsáveis e canais de comunicação",
 "Enviar o Formulário de Diagnóstico Inicial e confirmar o preenchimento",
 "Agendar e realizar a reunião de kickoff",
 "Liberar o projeto para execução"
] as const;
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
const standard=():OnboardingItem[]=>ONBOARDING_STANDARD_STEPS.map(title=>({id:crypto.randomUUID(),title,done:false,visibleToClient:false}));

export default function ProjectOnboarding({projectId,data,updatedAt,onSaved}:{projectId:string;data:OnboardingData;updatedAt:string;onSaved:(value:OnboardingData,updatedAt:string)=>void}){
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const items=Array.isArray(data.onboardingChecklist)?data.onboardingChecklist:[];
 const completed=items.filter(x=>x.done).length;
 const missing=ONBOARDING_STANDARD_STEPS.filter(title=>!items.some(item=>normalize(item.title)===normalize(title)));
 async function persist(next:OnboardingItem[],message:string){
  if(saving)return;
  setSaving(true);setError("");setNotice("");
  try{
   const {data:session,error:authError}=await supabase.auth.getSession();
   if(authError||!session.session?.access_token){setError("Sessão expirada. Entre novamente.");return;}
   const response=await fetch("/api/admin/project/update",{
    method:"PATCH",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.session.access_token}`},
    body:JSON.stringify({projectId,expectedUpdatedAt:updatedAt,data:{...data,onboardingChecklist:next}}),
    cache:"no-store"
   });
   if(response.status===409){setError("O projeto mudou em outra sessão. Atualize a página antes de continuar.");return;}
   if(!response.ok){setError("Não foi possível salvar o onboarding. Confira sua permissão.");return;}
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string"){setError("Não foi possível confirmar o salvamento.");return;}
   onSaved(result.project.data as OnboardingData,result.project.updated_at);
   setNotice(message);
  }catch{setError("Falha de conexão. Tente novamente.");}
  finally{setSaving(false);}
 }
 const start=()=>void persist(standard(),"Onboarding iniciado com 10 etapas.");
 const extend=()=>void persist([...items,...missing.map(title=>({id:crypto.randomUUID(),title,done:false,visibleToClient:false}))],"Etapas padrão adicionadas sem apagar as anteriores.");
 const toggle=(id:string,done:boolean)=>void persist(items.map(item=>item.id===id?{...item,done,updatedAt:new Date().toISOString()}:item),"Progresso atualizado.");
 const resetMessages=()=>{setError("");setNotice("");};
 return <section className="mt-4 rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h3 className="text-lg font-bold text-[#090D1C]">Checklist do onboarding</h3><p className="mt-1 text-xs text-[#697386]">Marque o que foi realizado. Nenhuma etapa cria tarefas automaticamente.</p></div>
   {items.length>0&&<span className={completed===items.length?"rounded-lg bg-[#DEF5E7] px-3 py-2 text-xs font-semibold text-[#176F40]":"rounded-lg bg-[#EEE8FF] px-3 py-2 text-xs font-semibold text-[#6034B7]"}>{completed===items.length?"Concluído":"Em andamento"}</span>}
  </div>
  {error&&<p role="alert" className="mt-4 rounded-lg bg-[#FFF0F1] p-3 text-sm text-[#A3223D]">{error}</p>}
  {notice&&<p role="status" className="mt-4 rounded-lg bg-[#E9F7E9] p-3 text-sm text-[#21683F]">{notice}</p>}
  {items.length===0?
   <div className="mt-5 rounded-xl border border-dashed border-[#CBCDD6] bg-[#F6F7FB] p-5">
    <p className="text-sm font-semibold">Este projeto ainda não possui onboarding.</p>
    <p className="mt-2 text-xs text-[#697386]">Inicie com as 10 etapas padrão da ROTEVO. Depois, basta marcar cada item realizado.</p>
    <button type="button" disabled={saving} onClick={start} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#ADE60A] px-4 py-2.5 text-sm font-semibold text-[#090D1C] disabled:opacity-50"><RotevoTablerIcon name="square-rounded-plus" size={19}/>{saving?"Criando...":"Criar checklist padrão"}</button>
   </div>:
   <>
    <div className="mt-5 flex items-center justify-between gap-3 text-sm"><span className="text-[#525B70]">{completed} de {items.length} etapas concluídas</span><strong className="text-[#090D1C]">{Math.round(completed/items.length*100)}%</strong></div>
    <div role="progressbar" aria-label="Progresso do onboarding" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(completed/items.length*100)} className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#E9ECF4]"><div className="h-full rounded-full bg-[#ADE60A] transition-all" style={{width:`${completed/items.length*100}%`}}/></div>
    <div className="mt-4 divide-y divide-[#E3E7F0]">
     {items.map((item,index)=><label key={item.id} className="flex cursor-pointer items-start gap-3 py-3 text-sm">
      <input type="checkbox" aria-label={`Etapa ${index+1}: ${item.title}`} checked={item.done} disabled={saving} onChange={e=>{resetMessages();toggle(item.id,e.target.checked);}} className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#6D35F5] disabled:cursor-wait"/>
      <span className={item.done?"text-[#687285]":"font-medium text-[#090D1C]"}>{item.title}</span>
     </label>)}
    </div>
    {saving&&<p role="status" className="mt-2 text-xs text-[#697386]">Salvando alteração...</p>}
    {missing.length>0&&<div className="mt-5 rounded-xl border border-[#E3E7F0] bg-[#F6F7FB] p-4"><p className="text-xs text-[#697386]">Este projeto possui um checklist anterior. Você pode acrescentar as {missing.length} etapas do modelo atual sem perder as existentes.</p><button type="button" disabled={saving} onClick={extend} className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#C9B8F3] bg-white px-3 py-2 text-xs font-semibold text-[#6034B7] disabled:opacity-50"><RotevoTablerIcon name="square-rounded-plus" size={17}/>Adicionar etapas padrão que faltam</button></div>}
   </>
  }
 </section>;
}
