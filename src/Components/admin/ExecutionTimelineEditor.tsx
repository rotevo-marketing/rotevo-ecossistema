"use client";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {ecosystemDocuments} from "@/data/ecosystem2027";
import {validOperationalDate} from "@/lib/security/executionDependencyValidation";
import type { ExecutionItem } from "@/Components/cliente/ProjectTimeline";

type ProjectData = { executionTimeline?: ExecutionItem[]; ecosystem2027?:{selectedDocumentCodes?:string[]} };
type Props={ projectId:string; projectData:ProjectData; updatedAt:string; onSaved:(data:ProjectData,updatedAt:string)=>void };
const blank:ExecutionItem={id:"",title:"",description:"",status:"planned",priority:"normal",kind:"deliverable",owner:"",ownerUserId:"",phase:"",startDate:"",dueDate:"",driveUrl:"",visibleToClient:true,dependencies:[]};
const labels={planned:"Planejado",in_progress:"Em andamento",blocked:"Aguardando",completed:"Concluído",cancelled:"Cancelado"} as const;
const kinds={deliverable:"Entrega",milestone:"Marco",task:"Tarefa"} as const;
const validLink=(value:string)=>{if(!value.trim())return true;try{return new URL(value).protocol==="https:";}catch{return false;}};
export default function ExecutionTimelineEditor({projectId,projectData,updatedAt,onSaved}:Props){
 const [editing,setEditing]=useState<ExecutionItem|null>(null);
 useUnsavedChanges(editing!==null);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [members,setMembers]=useState<{user_id:string;display_name:string;active:boolean}[]>([]);
 const [teamReady,setTeamReady]=useState(false);
 useEffect(()=>{let active=true;async function load(){
  const {data,error}=await supabase.from("team_members").select("user_id,display_name,active").eq("active",true).order("display_name");
  if(!active)return;
  setTeamReady(!error);setMembers(error?[]:(data??[]));
 }void load();return()=>{active=false};},[]);
 const strategicDocs=ecosystemDocuments.filter(d=>projectData.ecosystem2027?.selectedDocumentCodes?.includes(d.code));
 const items=useMemo(()=>Array.isArray(projectData.executionTimeline)?projectData.executionTimeline.filter(i=>i&&typeof i.id==="string"&&typeof i.title==="string"):[],[projectData]);
 async function persist(next:ExecutionItem[]){
  if(saving)return;
  setSaving(true);setError("");setSuccess("");
  // Compare-and-swap guards against overwriting changes made elsewhere.
  const nextData={...projectData,executionTimeline:next};
  try {
   const {data:sessionResult,error:sessionError}=await supabase.auth.getSession();
   const token=sessionResult.session?.access_token;
   if(sessionError||!token){setError("Sessão expirada. Entre novamente antes de salvar.");return;}
   const response=await fetch("/api/admin/project/update",{
    method:"PATCH",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
    body:JSON.stringify({projectId,expectedUpdatedAt:updatedAt,data:nextData}),
    cache:"no-store"
   });
   if(response.status===409){setError("O planejamento foi atualizado em outra sessão. Atualize a página antes de salvar para evitar sobrescrever alterações.");return;}
   if(!response.ok){setError("Não foi possível salvar as entregas. Verifique sua permissão e tente novamente.");return;}
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string"){
    setError("Não foi possível confirmar a atualização das entregas.");return;
   }
   onSaved(result.project.data as ProjectData,result.project.updated_at);
  }catch{
   setError("Falha de conexão ao salvar as entregas. Tente novamente.");
   return;
  }finally{setSaving(false);}
  setEditing(null);setSuccess("Linha do tempo atualizada com sucesso.");
 }
 function saveItem(){
  if(!editing)return;
  if(!["low","normal","high","urgent"].includes(editing.priority??"normal")){setError("Prioridade inválida.");return;}
  const title=editing.title.trim();
  if(title.length<3){setError("Informe um título com pelo menos 3 caracteres.");return;}
  if((editing.startDate&&!validOperationalDate(editing.startDate))||(editing.dueDate&&!validOperationalDate(editing.dueDate))){setError("Informe datas válidas para o cronograma.");return;}
  if(editing.startDate&&editing.dueDate&&editing.startDate>editing.dueDate){setError("O prazo não pode ser anterior ao início.");return;}
  if(!validLink(editing.driveUrl??"")){setError("Use um endereço HTTPS válido para o material.");return;}
  if(editing.documentCode&&!strategicDocs.some(d=>d.code===editing.documentCode)){setError("Selecione um documento estratégico válido do projeto.");return;}
  if(editing.status==="completed"&&(editing.dependencies??[]).some(id=>items.find(item=>item.id===id)?.status!=="completed")){setError("Conclua todos os pré-requisitos antes de finalizar esta entrega.");return;}
  if(editing.status!=="completed"&&editing.id&&items.some(item=>item.status==="completed"&&(item.dependencies??[]).includes(editing.id))){setError("Esta entrega é pré-requisito de uma atividade concluída. Reabra a atividade dependente primeiro.");return;}
  const deps=editing.dependencies??[];
  if(deps.includes(editing.id)){setError("Uma entrega não pode depender de si mesma.");return;}
  if(deps.some(id=>!items.some(item=>item.id===id))){setError("Há dependências que não pertencem a este projeto.");return;}
  const adjacency=new Map(items.map(item=>[item.id,item.id===editing.id?deps:(item.dependencies??[])]));
  const reaches=(id:string,target:string,visited=new Set<string>()):boolean=>{
   if(id===target)return true;
   if(visited.has(id))return false;
   visited.add(id);
   return (adjacency.get(id)??[]).some(next=>reaches(next,target,visited));
  };
  if(editing.id&&deps.some(id=>reaches(id,editing.id))){setError("Dependência circular detectada. Revise a sequência das entregas.");return;}
  if(!editing.id&&typeof crypto==="undefined"){setError("Não foi possível gerar um identificador para a entrega.");return;}
  const oldItem=items.find(item=>item.id===editing.id);
  const completedAt=editing.status==="completed"?(oldItem?.status==="completed"?oldItem.completedAt:new Date().toISOString()):undefined;
  const row={...editing,id:editing.id||crypto.randomUUID(),title,driveUrl:editing.driveUrl?.trim()||"",visibleToClient:editing.visibleToClient===true,completedAt};
  const next=editing.id?items.map(i=>i.id===editing.id?row:i):[...items,row];
  void persist(next);
 }
 function removeItem(item:ExecutionItem){
  if(editing){setError("Salve ou cancele a entrega em edição antes de excluir outra.");return;}
  const agenda=projectData as ProjectData & {operationalAgenda?:{relatedTaskId?:string;title?:string}[]};
  if(agenda.operationalAgenda?.some(event=>event.relatedTaskId===item.id)){setError("Esta atividade possui reuniões ou acompanhamentos vinculados. Remova o vínculo na agenda antes de excluir.");return;}
  if(items.some(row=>(row.dependencies??[]).includes(item.id))){setError("Esta entrega é pré-requisito de outra. Remova os vínculos antes de excluí-la.");return;}
  if(!window.confirm(`Excluir a entrega "${item.title}"? Esta ação não pode ser desfeita.`))return;
  void persist(items.filter(i=>i.id!==item.id));
 }
 return <section className="mt-6 rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="text-xl font-bold">Execução do projeto</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#525B70]">Cadastre entregas, tarefas e marcos que devem compor a linha do tempo. A equipe gerencia; o cliente acompanha apenas os itens liberados.</p></div>
    <button type="button" disabled={saving} onClick={()=>{if(editing&&!window.confirm("Descartar a entrega em edição?"))return;setEditing({...blank});setError("");setSuccess("")}} className="cursor-pointer rounded-xl bg-[#0B142A] px-4 py-2.5 text-sm font-semibold text-white">Adicionar entrega</button>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {success&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
   {items.length===0?<p className="mt-5 rounded-xl bg-[#F6F7FB] p-5 text-sm text-[#697386]">Nenhuma entrega operacional cadastrada. Os marcos antigos continuarão disponíveis separadamente no portal.</p>:
    <div className="mt-5 divide-y divide-[#E3E7F0]">{items.map(item=><div key={item.id} className="flex flex-col items-start justify-between gap-4 py-4 sm:flex-row sm:items-center">
     <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{item.title}</h3>{item.documentCode&&<p className="mt-1 text-xs text-[#6D35F5]">Documento 2027: {item.documentCode} — {strategicDocs.find(d=>d.code===item.documentCode)?.title??"Não incluído no escopo atual"}</p>}<p className="mt-1 text-xs text-[#697386]">{labels[item.status??"planned"]} · {item.dueDate||"Sem prazo"} · {item.visibleToClient===true?"Visível ao cliente":"Interno"}</p></div>
     <div className="flex gap-2"><button type="button" disabled={saving} onClick={()=>{if(editing&&!window.confirm("Descartar a entrega em edição?"))return;setEditing({...item});setError("");setSuccess("")}} className="cursor-pointer rounded-lg border border-[#E3E7F0] px-3 py-2 text-xs font-semibold disabled:opacity-50">Editar</button><button type="button" disabled={saving} onClick={()=>removeItem(item)} className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Excluir</button></div>
    </div>)}</div>}
   {editing&&<div className="mt-5 rounded-2xl border border-[#D9D0F5] bg-[#FCFBFF] p-4 sm:p-5">
     <h3 className="mb-4 text-base font-semibold">{editing.id?"Editar entrega":"Nova entrega"}</h3>
     <div className="grid gap-4 sm:grid-cols-2">
       <label className="block text-xs font-medium">Título da entrega *
         <input disabled={saving} value={editing.title} maxLength={140} onChange={e=>setEditing({...editing,title:e.target.value})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"/>
       </label>
       <label className="block text-xs font-medium">Tipo
         <select disabled={saving} value={editing.kind??"deliverable"} onChange={e=>setEditing({...editing,kind:e.target.value as ExecutionItem["kind"]})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm">{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
       </label>
       <label className="block text-xs font-medium">Situação
         <select value={editing.status??"planned"} onChange={e=>setEditing({...editing,status:e.target.value as ExecutionItem["status"]})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm">{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
       </label>
       <label className="block text-xs font-medium">Responsável
         {teamReady&&members.length>0?
          <select value={editing.ownerUserId||""} onChange={e=>{const member=members.find(m=>m.user_id===e.target.value);setEditing({...editing,ownerUserId:member?.user_id||"",owner:member?.display_name||""})}} className="mt-1 block w-full cursor-pointer rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm">
           <option value="">Não atribuído</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
          </select>:
          <input value={editing.owner??""} maxLength={120} onChange={e=>setEditing({...editing,owner:e.target.value,ownerUserId:""})} placeholder="Nome provisório (cadastro da equipe pendente)" className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"/>
         }
       </label>
       <label className="block text-xs font-medium sm:col-span-2">Documento estratégico relacionado
         <select value={editing.documentCode??""} onChange={e=>setEditing({...editing,documentCode:e.target.value})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"><option value="">Não vincular documento</option>{strategicDocs.map(doc=><option key={doc.code} value={doc.code}>{doc.code} — {doc.title}</option>)}</select>
       </label>
       <fieldset className="sm:col-span-2 rounded-xl border border-[#D7DCE6] p-3"><legend className="px-1 text-xs font-semibold">Pré-requisitos desta entrega</legend><p className="mb-2 text-xs text-[#697386]">Selecione atividades que devem ser concluídas primeiro.</p><div className="grid gap-2 sm:grid-cols-2">{items.filter(item=>item.id!==editing.id).map(item=><label key={item.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={(editing.dependencies??[]).includes(item.id)} onChange={e=>setEditing({...editing,dependencies:e.target.checked?[...(editing.dependencies??[]),item.id]:(editing.dependencies??[]).filter(id=>id!==item.id)})}/>{item.title}</label>)}</div>{items.filter(item=>item.id!==editing.id).length===0&&<p className="text-xs text-[#697386]">Nenhuma outra atividade cadastrada.</p>}</fieldset>
       <label className="block text-xs font-medium">Prioridade
         <select value={editing.priority??"normal"} onChange={e=>setEditing({...editing,priority:e.target.value as ExecutionItem["priority"]})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select>
       </label>
       <label className="block text-xs font-medium">Etapa ou fase
         <input value={editing.phase??""} maxLength={120} onChange={e=>setEditing({...editing,phase:e.target.value})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"/>
       </label>
       <label className="block text-xs font-medium">Data de início
         <input type="date" value={editing.startDate??""} onChange={e=>setEditing({...editing,startDate:e.target.value})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"/>
       </label>
       <label className="block text-xs font-medium">Prazo
         <input type="date" value={editing.dueDate??""} onChange={e=>setEditing({...editing,dueDate:e.target.value})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"/>
       </label>
       <label className="block text-xs font-medium">Link do material (HTTPS)
         <input type="url" value={editing.driveUrl??""} onChange={e=>setEditing({...editing,driveUrl:e.target.value})} placeholder="https://drive.google.com/..." className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"/>
       </label>
       <label className="block text-xs font-medium sm:col-span-2">Descrição
         <textarea disabled={saving} value={editing.description??""} maxLength={2000} rows={3} onChange={e=>setEditing({...editing,description:e.target.value})} className="mt-1 block w-full rounded-lg border border-[#D7DCE6] bg-white px-3 py-2.5 text-sm"/>
       </label>
     </div>
     <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.visibleToClient!==false} onChange={e=>setEditing({...editing,visibleToClient:e.target.checked})} className="h-4 w-4 accent-[#6D35F5]"/> Exibir entrega na Área do Cliente</label>
     <div className="mt-5 flex flex-wrap justify-end gap-2">
       <button type="button" disabled={saving} onClick={()=>{setEditing(null);setError("")}} className="cursor-pointer rounded-lg border border-[#D7DCE6] px-4 py-2.5 text-sm disabled:opacity-40">Cancelar</button>
       <button type="button" disabled={saving} onClick={saveItem} className="cursor-pointer rounded-lg bg-[#0B142A] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving?"Salvando...":"Salvar entrega"}</button>
     </div>
   </div>}
 </section>;
}
