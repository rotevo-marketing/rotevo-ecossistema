"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {request} from "@/lib/operations/api";
import TeamMemberControls,{type TeamCapabilities,type TeamProject} from "./TeamMemberControls";
import TeamMemberProfileEditor from "./TeamMemberProfileEditor";
import TeamInviteForm from "./TeamInviteForm";
import {teamPermissionLabel} from "@/lib/team-permissions";
import TeamAdminTransferForm from "./TeamAdminTransferForm";
type Assignment={user_id:string;project_id:string};
type Permission={user_id:string;permission:string};
type Member={user_id:string;display_name:string;job_title:string|null;avatar_url:string|null;avatar_ref:string;profile_updated_at:string|null;role:string;active:boolean};
const roles:Record<string,string>={admin:"Administrador",strategist:"Estrategista",project_manager:"Gestor de projetos",producer:"Produção",finance:"Financeiro"};
export default function TeamDirectory(){
 const [assignments,setAssignments]=useState<Assignment[]>([]),[permissions,setPermissions]=useState<Permission[]>([]);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [projects,setProjects]=useState<TeamProject[]>([]),[capabilities,setCapabilities]=useState<TeamCapabilities>({invites:false,permissions:false,assignments:false,memberStatus:false,adminTransfer:false});
 const [refresh,setRefresh]=useState(0);
 const [showCreate,setShowCreate]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [removingPhoto,setRemovingPhoto]=useState<string|null>(null);
 const [photoError,setPhotoError]=useState("");
 async function removeMemberPhoto(member:Member){
  if(removingPhoto||!window.confirm(`Remover a fotografia de ${member.display_name}?`))return;
  setRemovingPhoto(member.user_id);setPhotoError("");
  try{await request("/api/team/members/profile","PATCH",{userId:member.user_id,displayName:member.display_name,avatarRef:"",expectedUpdatedAt:member.profile_updated_at});setRefresh(v=>v+1);}
  catch(e){setPhotoError(e instanceof Error?e.message:"Não foi possível remover a foto.");}
  finally{setRemovingPhoto(null);}
 }

 const [members,setMembers]=useState<Member[]>([]),[loading,setLoading]=useState(true),[unavailable,setUnavailable]=useState(false);
 useEffect(()=>{const updated=()=>setRefresh(n=>n+1);window.addEventListener("rotevo-profile-updated",updated);window.addEventListener("focus",updated);const timer=setInterval(updated,15*60*1000);return()=>{window.removeEventListener("rotevo-profile-updated",updated);window.removeEventListener("focus",updated);clearInterval(timer);};},[]);
 useEffect(()=>{let active=true;async function load(){
   let next:Member[]=[];let nextAssignments:Assignment[]=[];let nextPermissions:Permission[]=[];let failed=false;
   try{
    const {data:session,error:sessionError}=await supabase.auth.getSession();
    const token=session.session?.access_token;
    if(sessionError||!token)throw new Error("Sessão indisponível");
    const response=await fetch("/api/team/directory",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    if(!response.ok)throw new Error("Equipe não autorizada");
    const data=await response.json();
    if(!Array.isArray(data?.members)||!Array.isArray(data?.assignments)||!Array.isArray(data?.permissions)||!Array.isArray(data?.projects)||!data.capabilities)throw new Error("Resposta inválida");
    next=data.members as Member[];nextAssignments=data.assignments as Assignment[];nextPermissions=data.permissions as Permission[];
    if(active){setProjects(data.projects as TeamProject[]);setCapabilities(data.capabilities as TeamCapabilities)}
   }catch{failed=true}
   if(!active)return;setLoading(false);setUnavailable(failed);setMembers(next);setAssignments(nextAssignments);setPermissions(nextPermissions);
 }void load();return()=>{active=false};},[refresh]);
 return <section className="mt-8 rounded-2xl border border-[#E3E7F0] bg-white p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Equipe Rotevo</h2><p className="mt-2 text-sm text-[#525B70]">Colaboradores, funções e responsabilidades, com controle de acesso por projeto.</p></div><button type="button" onClick={()=>setShowCreate(v=>!v)} disabled={!capabilities.invites} className="rounded-lg bg-[#0B142A] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#F1F2F6] disabled:text-[#697386]">{capabilities.invites?(showCreate?"Fechar cadastro":"Novo usuário"):"Cadastro aguardando ativação segura"}</button></div>
  {capabilities.adminTransfer&&<TeamAdminTransferForm members={members} onTransferred={async()=>{setRefresh(n=>n+1)}}/>}
  {capabilities.invites&&showCreate&&<TeamInviteForm onInvited={async()=>{setShowCreate(false);setRefresh(n=>n+1)}}/>}
  {photoError&&<p role="alert" className="mt-4 text-sm text-red-700">{photoError}</p>}
  {loading?<p className="mt-5 text-sm text-[#697386]">Carregando equipe...</p>:unavailable?
   <p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Não foi possível consultar o diretório da equipe. O acesso exige um administrador ativo e a estrutura de permissões homologada; nenhum cadastro foi alterado.</p>:
   members.length===0?<p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Nenhum membro cadastrado na nova estrutura. Os usuários e logins atuais permanecem inalterados.</p>:
   <div className="mt-5 divide-y divide-[#E3E7F0]">{members.map(m=><div key={m.user_id} className="flex items-center gap-3 py-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEE8FF] font-semibold text-[#6D35F5]">{m.avatar_url&&(m.avatar_ref||m.avatar_url.startsWith("https://"))?<img src={m.avatar_url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover"/>:m.display_name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{m.display_name}</p><p className="text-xs text-[#697386]">{m.job_title||roles[m.role]||m.role}</p><button type="button" disabled={editing!==null} onClick={()=>setEditing(m.user_id)} className="mt-2 text-xs font-semibold text-[#6D35F5] underline disabled:opacity-40">Editar usuário</button><div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" disabled={editing!==null} onClick={()=>setEditing(m.user_id)} className="cursor-pointer rounded-lg border border-[#D8C9FF] px-3 py-1.5 text-xs font-semibold text-[#5123C5] hover:bg-[#F0ECFF] disabled:opacity-40">Alterar foto</button>{!!m.avatar_ref&&<button type="button" disabled={removingPhoto!==null} onClick={()=>void removeMemberPhoto(m)} className="cursor-pointer rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40">{removingPhoto===m.user_id?"Removendo…":"Remover foto"}</button>}</div>{editing===m.user_id&&<TeamMemberProfileEditor key={m.user_id} member={m} onCancel={()=>setEditing(null)} onSaved={()=>{setEditing(null);setRefresh(n=>n+1);}}/>}<p className="mt-1 text-xs text-[#697386]">{assignments.filter(a=>a.user_id===m.user_id).length} projeto(s) atribuído(s) · {permissions.filter(p=>p.user_id===m.user_id).length} permissão(ões) específica(s)</p><button type="button" onClick={()=>setExpanded(expanded===m.user_id?null:m.user_id)} className="mt-2 text-xs font-medium text-[#6D35F5] underline" aria-expanded={expanded===m.user_id}> {expanded===m.user_id?"Ocultar atribuições":"Ver atribuições e permissões"} </button>{expanded===m.user_id&&<div className="mt-2 rounded-lg bg-[#F6F7FB] p-3 text-xs text-[#525B70]"><p className="font-semibold">Projetos vinculados</p><p className="mt-1 break-words">{assignments.filter(a=>a.user_id===m.user_id).map(a=>projects.find(p=>p.id===a.project_id)?.title||"Projeto indisponível").join(", ")||"Nenhum vínculo"}</p><p className="mt-3 font-semibold">Permissões específicas</p><p className="mt-1 break-words">{permissions.filter(p=>p.user_id===m.user_id).map(p=>teamPermissionLabel(p.permission)).join(", ")||"Nenhuma permissão específica"}</p></div>}{expanded===m.user_id&&<TeamMemberControls userId={m.user_id} memberRole={m.role} active={m.active} projects={projects} assignments={assignments} permissions={permissions} capabilities={capabilities} onUpdated={async()=>{setRefresh(n=>n+1)}}/>}</div><span className={`rounded-md px-2.5 py-1 text-xs ${m.active?"bg-[#E6F6EA] text-[#176B3C]":"bg-[#ECEEF2] text-[#677084]"}`}>{m.active?"Ativo":"Inativo"}</span></div>)}</div>}
  <p className="mt-5 text-xs leading-5 text-[#697386]">Novos colaboradores começam inativos. Após a troca da senha temporária, ative a conta, conceda a consulta e atribua os projetos. Somente administradores ativos podem alterar acessos.</p>
 </section>;
}
