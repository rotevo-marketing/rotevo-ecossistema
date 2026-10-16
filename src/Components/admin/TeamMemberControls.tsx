"use client";
import {useState} from "react";
import {supabase} from "@/lib/supabase";
export type TeamProject={id:string;title:string};
export type TeamPermission={user_id:string;permission:string};
export type TeamAssignment={user_id:string;project_id:string};
export type TeamCapabilities={invites:boolean;permissions:boolean;assignments:boolean;memberStatus:boolean};
type Props={
 userId:string;memberRole:string;active:boolean;
 projects:TeamProject[];assignments:TeamAssignment[];permissions:TeamPermission[];
 capabilities:TeamCapabilities;onUpdated:()=>Promise<void>;
};
const allowedPermissions=["projects.read","projects.write","tasks.read","tasks.write","editorial.read","editorial.write","meetings.read","finance.read","finance.write"];
export default function TeamMemberControls({userId,memberRole,active,projects,assignments,permissions,capabilities,onUpdated}:Props){
 const [pending,setPending]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [permission,setPermission]=useState(allowedPermissions[0]);
 const [projectId,setProjectId]=useState("");
 const editable=memberRole!=="admin";
 const hasPermission=permissions.some(p=>p.user_id===userId&&p.permission===permission);
 const assigned=assignments.some(a=>a.user_id===userId&&a.project_id===projectId);
 async function apply(path:string,body:Record<string,unknown>){
  setPending(true);setError("");setNotice("");
  try{
   const {data,error:sessionError}=await supabase.auth.getSession();
   const token=data.session?.access_token;
   if(sessionError||!token)throw new Error("Faça login novamente.");
   const response=await fetch(path,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body),cache:"no-store"});
   if(!response.ok){
    const result=await response.json().catch(()=>null) as {error?:string}|null;
    throw new Error(result?.error||"A alteração não foi autorizada.");
   }
   await onUpdated();
   setNotice("Alteração registrada.");
  }catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível concluir a operação.");}
  finally{setPending(false);}
 }
 if(!editable||!capabilities.permissions&&!capabilities.assignments&&!capabilities.memberStatus)return null;
 return <div className="mt-3 space-y-3 rounded-xl border border-[#E3E7F0] bg-white p-3">
  <p className="text-xs font-semibold text-[#525B70]">Administração de acesso</p>
  {capabilities.memberStatus&&<div className="flex flex-wrap items-center justify-between gap-2">
   <span className="text-xs text-[#525B70]">Situação do colaborador</span>
   <button type="button" disabled={pending} onClick={()=>void apply("/api/team/members/status",{userId,active:!active})}
    className="rounded-lg border border-[#D5D9E6] px-3 py-1.5 text-xs disabled:opacity-50">{active?"Inativar":"Ativar"}</button>
  </div>}
  {active&&capabilities.permissions&&<div className="flex flex-wrap items-center gap-2">
   <label className="text-xs text-[#525B70]" htmlFor={`permission-${userId}`}>Permissão</label>
   <select id={`permission-${userId}`} value={permission} onChange={event=>setPermission(event.target.value)}
    className="min-w-0 flex-1 rounded-lg border border-[#D5D9E6] px-2 py-1.5 text-xs">
    {allowedPermissions.map(value=><option key={value} value={value}>{value}</option>)}
   </select>
   <button type="button" disabled={pending} onClick={()=>void apply("/api/team/permissions",{userId,permission,enabled:!hasPermission})}
    className="rounded-lg border border-[#D5D9E6] px-3 py-1.5 text-xs disabled:opacity-50">{hasPermission?"Revogar":"Conceder"}</button>
  </div>}
  {active&&capabilities.assignments&&<div className="flex flex-wrap items-center gap-2">
   <label className="text-xs text-[#525B70]" htmlFor={`project-${userId}`}>Projeto</label>
   <select id={`project-${userId}`} value={projectId} onChange={event=>setProjectId(event.target.value)}
    className="min-w-0 flex-1 rounded-lg border border-[#D5D9E6] px-2 py-1.5 text-xs">
    <option value="">Selecione</option>
    {projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
   </select>
   <button type="button" disabled={pending||!projectId} onClick={()=>void apply("/api/team/assignments",{userId,projectId,assigned:!assigned})}
    className="rounded-lg border border-[#D5D9E6] px-3 py-1.5 text-xs disabled:opacity-50">{assigned?"Remover":"Atribuir"}</button>
  </div>}
  {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
  {notice&&<p role="status" className="text-xs text-green-700">{notice}</p>}
 </div>;
}
