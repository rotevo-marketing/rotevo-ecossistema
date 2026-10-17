"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {validOperationalDate} from "@/lib/security/executionDependencyValidation";
import EditorialApprovalsPanel from "@/Components/admin/EditorialApprovalsPanel";
import EditorialCalendar,{type EditorialItem,type EditorialProject,editorialStatuses} from "@/Components/cliente/EditorialCalendar";
type Client={id:string;name:string;slug:string};
type Project=Omit<EditorialProject,"data"> & {updated_at:string;clients:Client|Client[]|null;data:{editorialCalendar?:EditorialItem[];executionTimeline?:{id:string;title:string}[]}|null};
const blank:EditorialItem={id:"",title:"",channel:"Instagram",format:"Reels",publishDate:"",caption:"",driveUrl:"",version:"01",status:"idea",visibleToClient:false};
function client(p:Project){return Array.isArray(p.clients)?p.clients[0]:p.clients;}
function safe(u:string){if(!u)return true;try{return new URL(u).protocol==="https:";}catch{return false;}}
export default function EditorialManager({projects,onChanged}:{projects:Project[];onChanged:(id:string,data:Project["data"],updatedAt:string)=>void}){
 const [projectId,setProjectId]=useState(""),[editing,setEditing]=useState<EditorialItem|null>(null);
 const [saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const project=projects.find(p=>p.id===projectId);
 const items=useMemo(()=>Array.isArray(project?.data?.editorialCalendar)?project.data.editorialCalendar:[],[project]);
 const [decisions,setDecisions]=useState<{content_id:string;content_version:string;decision:"approved"|"changes_requested"}[]>([]);
 const [approvalError,setApprovalError]=useState(false);
 useEffect(()=>{let mounted=true;async function load(){
  if(!projectId){setDecisions([]);setApprovalError(false);return;}
  const {data,error}=await supabase.from("editorial_approvals").select("content_id,content_version,decision").eq("project_id",projectId);
  if(!mounted)return;
  setApprovalError(!!error);setDecisions(error?[]:(data??[]) as typeof decisions);
 }void load();return()=>{mounted=false};},[projectId]);
 function displayStatus(item:EditorialItem){
  const decision=decisions.find(x=>x.content_id===item.id&&x.content_version===(item.version??""));
  return decision?editorialStatuses[decision.decision]:editorialStatuses[item.status]??item.status;
 }

 async function persist(next:EditorialItem[]){
  if(!project||saving)return;
  setSaving(true);setError("");setNotice("");
  const payload={...(project.data??{}),editorialCalendar:next};
  try {
   const {data:session,error:authError}=await supabase.auth.getSession();
   const token=session.session?.access_token;
   if(authError||!token){setError("Sessão expirada. Entre novamente para salvar.");return;}
   const response=await fetch("/api/admin/project/update",{
    method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({projectId:project.id,expectedUpdatedAt:project.updated_at,data:payload}),cache:"no-store"
   });
   if(response.status===409){setError("Esse projeto foi modificado em outra sessão. Atualize a página para evitar sobrescrever informações.");return;}
   if(!response.ok){setError("Não foi possível salvar o conteúdo. Confira as permissões.");return;}
   const result=await response.json();
   if(!result?.project||typeof result.project.updated_at!=="string"){setError("Não foi possível confirmar a atualização do conteúdo.");return;}
   onChanged(project.id,result.project.data as Project["data"],result.project.updated_at);
   setEditing(null);setNotice("Conteúdo atualizado com sucesso.");
  }catch{setError("Falha de conexão ao salvar o conteúdo.");}
  finally{setSaving(false);}
 }
 function save(){
  if(!editing||!project)return;
  if(editing.title.trim().length<3){setError("Informe o título do conteúdo.");return;}
  if(!validOperationalDate(editing.publishDate)){setError("Informe uma data de publicação válida.");return;}
  if(!safe(editing.driveUrl??"")){setError("O link do Drive precisa ser um endereço HTTPS.");return;}
  const original=items.find(row=>row.id===editing.id);
  const decided=decisions.some(row=>row.content_id===editing.id&&row.content_version===(editing.version??""));
  const materialFields=["title","channel","format","publishDate","caption","driveUrl","relatedTaskId"] as const;
  if(original&&decided&&original.version===editing.version&&materialFields.some(field=>(original[field]??"")!==(editing[field]??""))){
   setError("Esta versão já recebeu uma decisão do cliente. Informe um novo número de versão antes de alterar o material.");
   return;
  }
  if(editing.relatedTaskId&&!project.data?.executionTimeline?.some(t=>t.id===editing.relatedTaskId)){setError("A tarefa vinculada precisa pertencer ao mesmo projeto.");return;}
  const item={...editing,id:editing.id||crypto.randomUUID(),title:editing.title.trim(),driveUrl:editing.driveUrl?.trim()};
  void persist(editing.id?items.map(t=>t.id===editing.id?item:t):[...items,item]);
 }
 return <div className="mt-7 space-y-5">
  {notice&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
  <EditorialCalendar projects={projects} onNew={id=>{setProjectId(id||projects[0]?.id||"");setEditing({...blank});setError("");setNotice("");}} onEdit={(id,item)=>{setProjectId(id);setEditing({...item});setError("");setNotice("");}}/>
  {project&&editing&&<div className="fixed inset-0 z-[120] flex justify-end"><button type="button" aria-label="Fechar editor de conteúdo" onClick={()=>setEditing(null)} className="absolute inset-0 bg-[#090D1C]/50"/><aside role="dialog" aria-modal="true" aria-label="Editor de conteúdo" className="relative z-10 h-full w-full max-w-[650px] overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
    <h3 className="text-base font-semibold">{editing.id?"Editar conteúdo":"Novo conteúdo"}</h3>
    {!editing.id&&<label className="mt-4 block text-xs font-medium">Projeto<select value={projectId} onChange={e=>{setProjectId(e.target.value);setError("");}} className="mt-1 block w-full rounded-lg border border-[#E3E7F0] px-3 py-2.5 text-sm">{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}</select></label>}
    {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {approvalError&&<p className="mt-3 text-xs text-[#916000]">A sincronização de aprovações depende da configuração do banco.</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-medium sm:col-span-2">Título *<input value={editing.title} maxLength={150} onChange={e=>setEditing({...editing,title:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Canal<input value={editing.channel} onChange={e=>setEditing({...editing,channel:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Formato<input value={editing.format} onChange={e=>setEditing({...editing,format:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Data prevista *<input type="date" value={editing.publishDate} onChange={e=>setEditing({...editing,publishDate:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Versão<input value={editing.version??""} maxLength={30} onChange={e=>setEditing({...editing,version:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Situação<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as EditorialItem["status"]})} className="mt-1 block w-full cursor-pointer rounded-lg border px-3 py-2.5 text-sm">{Object.entries(editorialStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
     <label className="text-xs font-medium">Tarefa relacionada<select value={editing.relatedTaskId??""} onChange={e=>setEditing({...editing,relatedTaskId:e.target.value||undefined})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Nenhuma tarefa vinculada</option>{(project.data?.executionTimeline??[]).map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select><span className="mt-1 block text-[11px] text-[#697386]">Permite consultar a decisão do cliente na Central de Tarefas. Não conclui a tarefa automaticamente.</span></label>
     <label className="text-xs font-medium">Link para o material no Drive<input type="url" value={editing.driveUrl??""} onChange={e=>setEditing({...editing,driveUrl:e.target.value})} placeholder="https://drive.google.com/..." className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">Legenda<textarea rows={3} value={editing.caption??""} onChange={e=>setEditing({...editing,caption:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">Observações de revisão<textarea rows={2} value={editing.reviewNotes??""} onChange={e=>setEditing({...editing,reviewNotes:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
    </div>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.visibleToClient===true} onChange={e=>setEditing({...editing,visibleToClient:e.target.checked})} className="h-4 w-4 accent-[#6D35F5]"/> Compartilhar conteúdo no Portal do Cliente</label>
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setEditing(null)} disabled={saving} className="cursor-pointer rounded-lg border px-4 py-2.5 text-sm">Cancelar</button><button type="button" disabled={saving} onClick={save} className="cursor-pointer rounded-lg bg-[#ADE60A] px-5 py-2.5 text-sm font-semibold text-[#090D1C] disabled:opacity-40">{saving?"Salvando...":"Salvar conteúdo"}</button></div>
   </aside></div>}
 </div>;
}
