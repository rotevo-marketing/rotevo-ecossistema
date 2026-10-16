"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import EditorialApprovalsPanel from "@/Components/admin/EditorialApprovalsPanel";
import EditorialCalendar,{type EditorialItem,type EditorialProject,editorialStatuses} from "@/Components/cliente/EditorialCalendar";
type Client={id:string;name:string;slug:string};
type Project=EditorialProject & {updated_at:string;clients:Client|Client[]|null};
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
  if(!/^\d{4}-\d{2}-\d{2}$/.test(editing.publishDate)){setError("Informe uma data de publicação válida.");return;}
  if(!safe(editing.driveUrl??"")){setError("O link do Drive precisa ser um endereço HTTPS.");return;}
  const item={...editing,id:editing.id||crypto.randomUUID(),title:editing.title.trim(),driveUrl:editing.driveUrl?.trim()};
  void persist(editing.id?items.map(t=>t.id===editing.id?item:t):[...items,item]);
 }
 return <div className="mt-7 space-y-5">
  <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
   <h2 className="text-lg font-semibold">Gerenciar conteúdos</h2>
   <p className="mt-2 text-sm text-[#525B70]">Crie pautas, vincule arquivos do Drive e organize as etapas de revisão. Os arquivos permanecem no Google Drive.</p>
   <div className="mt-5 flex flex-wrap items-center gap-3">
    <select aria-label="Projeto editorial" value={projectId} onChange={e=>{setProjectId(e.target.value);setEditing(null);setError("");}} className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-xl border border-[#DDE1EA] px-4 py-2.5 text-sm">
     <option value="">Selecione um projeto</option>{projects.map(p=><option key={p.id} value={p.id}>{client(p)?.name??"Cliente"} · {p.title}</option>)}
    </select>
    <button type="button" disabled={!project||saving} onClick={()=>{setEditing({...blank});setError("");setNotice("");}} className="cursor-pointer rounded-xl bg-[#0B142A] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Novo conteúdo</button>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {notice&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
   {project&&approvalError&&<p className="mt-3 text-xs text-[#916000]">A sincronização do histórico de aprovações ainda depende da configuração do banco.</p>}
   {project&&<div className="mt-5 space-y-2">{items.length===0?<p className="text-sm text-[#697386]">Nenhum conteúdo cadastrado para este projeto.</p>:items.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E7F0] p-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#697386]">{item.publishDate} · {displayStatus(item)} · {item.visibleToClient?"Compartilhado":"Interno"}</p></div><button type="button" onClick={()=>{setEditing({...item});setError("");}} className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold">Editar</button></div>)}</div>}
   {project&&editing&&<div className="mt-5 rounded-xl border border-[#DED4FA] bg-[#FCFBFF] p-4">
    <h3 className="text-base font-semibold">{editing.id?"Editar conteúdo":"Novo conteúdo"}</h3>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-medium sm:col-span-2">Título *<input value={editing.title} maxLength={150} onChange={e=>setEditing({...editing,title:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Canal<input value={editing.channel} onChange={e=>setEditing({...editing,channel:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Formato<input value={editing.format} onChange={e=>setEditing({...editing,format:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Data prevista *<input type="date" value={editing.publishDate} onChange={e=>setEditing({...editing,publishDate:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Versão<input value={editing.version??""} maxLength={30} onChange={e=>setEditing({...editing,version:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium">Situação<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as EditorialItem["status"]})} className="mt-1 block w-full cursor-pointer rounded-lg border px-3 py-2.5 text-sm">{Object.entries(editorialStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
     <label className="text-xs font-medium">Link para o material no Drive<input type="url" value={editing.driveUrl??""} onChange={e=>setEditing({...editing,driveUrl:e.target.value})} placeholder="https://drive.google.com/..." className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">Legenda<textarea rows={3} value={editing.caption??""} onChange={e=>setEditing({...editing,caption:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
     <label className="text-xs font-medium sm:col-span-2">Observações de revisão<textarea rows={2} value={editing.reviewNotes??""} onChange={e=>setEditing({...editing,reviewNotes:e.target.value})} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
    </div>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.visibleToClient===true} onChange={e=>setEditing({...editing,visibleToClient:e.target.checked})} className="h-4 w-4 accent-[#6D35F5]"/> Compartilhar conteúdo no Portal do Cliente</label>
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setEditing(null)} disabled={saving} className="cursor-pointer rounded-lg border px-4 py-2.5 text-sm">Cancelar</button><button type="button" disabled={saving} onClick={save} className="cursor-pointer rounded-lg bg-[#0B142A] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving?"Salvando...":"Salvar conteúdo"}</button></div>
   </div>}
  </section>
  {project&&<EditorialApprovalsPanel projectId={project.id}/>}
  <EditorialCalendar projects={projects}/>
 </div>;
}
