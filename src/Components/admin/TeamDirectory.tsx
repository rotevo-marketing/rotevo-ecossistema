"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import TeamMemberControls,{type TeamCapabilities,type TeamProject} from "./TeamMemberControls";
import TeamInviteForm from "./TeamInviteForm";
type Assignment={user_id:string;project_id:string};
type Permission={user_id:string;permission:string};
type Member={user_id:string;display_name:string;job_title:string|null;avatar_url:string|null;role:string;active:boolean};
const roles:Record<string,string>={admin:"Administrador",strategist:"Estrategista",project_manager:"Gestor de projetos",producer:"Produção",finance:"Financeiro"};
export default function TeamDirectory(){
 const [assignments,setAssignments]=useState<Assignment[]>([]),[permissions,setPermissions]=useState<Permission[]>([]);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [projects,setProjects]=useState<TeamProject[]>([]),[capabilities,setCapabilities]=useState<TeamCapabilities>({invites:false,permissions:false,assignments:false,memberStatus:false});
 const [refresh,setRefresh]=useState(0);
 const [members,setMembers]=useState<Member[]>([]),[loading,setLoading]=useState(true),[unavailable,setUnavailable]=useState(false);
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
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Equipe Rotevo</h2><p className="mt-2 text-sm text-[#525B70]">Colaboradores, funções e responsabilidades, com controle de acesso por projeto.</p></div><span className="rounded-lg bg-[#F1F2F6] px-3 py-2 text-xs font-medium text-[#697386]">Convites em preparação</span></div>
  {capabilities.invites&&<TeamInviteForm onInvited={async()=>{setRefresh(n=>n+1)}}/>}
  {loading?<p className="mt-5 text-sm text-[#697386]">Carregando equipe...</p>:unavailable?
   <p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Não foi possível consultar o diretório da equipe. O acesso exige um administrador ativo e a estrutura de permissões homologada; nenhum cadastro foi alterado.</p>:
   members.length===0?<p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Nenhum membro cadastrado na nova estrutura. Os usuários e logins atuais permanecem inalterados.</p>:
   <div className="mt-5 divide-y divide-[#E3E7F0]">{members.map(m=><div key={m.user_id} className="flex items-center gap-3 py-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEE8FF] font-semibold text-[#6D35F5]">{m.avatar_url?.startsWith("https://")?<img src={m.avatar_url} alt="" className="h-full w-full object-cover"/>:m.display_name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{m.display_name}</p><p className="text-xs text-[#697386]">{m.job_title||roles[m.role]||m.role}</p><p className="mt-1 text-xs text-[#697386]">{assignments.filter(a=>a.user_id===m.user_id).length} projeto(s) atribuído(s) · {permissions.filter(p=>p.user_id===m.user_id).length} permissão(ões) específica(s)</p><button type="button" onClick={()=>setExpanded(expanded===m.user_id?null:m.user_id)} className="mt-2 text-xs font-medium text-[#6D35F5] underline" aria-expanded={expanded===m.user_id}> {expanded===m.user_id?"Ocultar atribuições":"Ver atribuições e permissões"} </button>{expanded===m.user_id&&<div className="mt-2 rounded-lg bg-[#F6F7FB] p-3 text-xs text-[#525B70]"><p className="font-semibold">Projetos vinculados</p><p className="mt-1 break-words">{assignments.filter(a=>a.user_id===m.user_id).map(a=>a.project_id).join(", ")||"Nenhum vínculo"}</p><p className="mt-3 font-semibold">Permissões específicas</p><p className="mt-1 break-words">{permissions.filter(p=>p.user_id===m.user_id).map(p=>p.permission).join(", ")||"Nenhuma permissão específica"}</p></div>}{expanded===m.user_id&&<TeamMemberControls userId={m.user_id} memberRole={m.role} active={m.active} projects={projects} assignments={assignments} permissions={permissions} capabilities={capabilities} onUpdated={async()=>{setRefresh(n=>n+1)}}/>}</div><span className={`rounded-md px-2.5 py-1 text-xs ${m.active?"bg-[#E6F6EA] text-[#176B3C]":"bg-[#ECEEF2] text-[#677084]"}`}>{m.active?"Ativo":"Inativo"}</span></div>)}</div>}
  <p className="mt-5 text-xs leading-5 text-[#697386]">Consulta administrativa de equipe, projetos e permissões. Alterações de acesso e convites permanecem desabilitados até a homologação de segurança.</p>
 </section>;
}
