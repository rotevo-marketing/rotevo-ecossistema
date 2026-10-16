"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Assignment={user_id:string;project_id:string};
type Permission={user_id:string;permission:string};
type Member={user_id:string;display_name:string;job_title:string|null;avatar_url:string|null;role:string;active:boolean};
const roles:Record<string,string>={admin:"Administrador",strategist:"Estrategista",project_manager:"Gestor de projetos",producer:"Produção",finance:"Financeiro"};
export default function TeamDirectory(){
 const [assignments,setAssignments]=useState<Assignment[]>([]),[permissions,setPermissions]=useState<Permission[]>([]);
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
    if(!Array.isArray(data?.members)||!Array.isArray(data?.assignments)||!Array.isArray(data?.permissions))throw new Error("Resposta inválida");
    next=data.members as Member[];nextAssignments=data.assignments as Assignment[];nextPermissions=data.permissions as Permission[];
   }catch{failed=true}
   if(!active)return;setLoading(false);setUnavailable(failed);setMembers(next);setAssignments(nextAssignments);setPermissions(nextPermissions);
 }void load();return()=>{active=false};},[]);
 return <section className="mt-8 rounded-2xl border border-[#E3E7F0] bg-white p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Equipe Rotevo</h2><p className="mt-2 text-sm text-[#525B70]">Colaboradores, funções e responsabilidades, com controle de acesso por projeto.</p></div><span className="rounded-lg bg-[#F1F2F6] px-3 py-2 text-xs font-medium text-[#697386]">Convites em preparação</span></div>
  {loading?<p className="mt-5 text-sm text-[#697386]">Carregando equipe...</p>:unavailable?
   <p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Não foi possível consultar o diretório da equipe. O acesso exige um administrador ativo e a estrutura de permissões homologada; nenhum cadastro foi alterado.</p>:
   members.length===0?<p className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Nenhum membro cadastrado na nova estrutura. Os usuários e logins atuais permanecem inalterados.</p>:
   <div className="mt-5 divide-y divide-[#E3E7F0]">{members.map(m=><div key={m.user_id} className="flex items-center gap-3 py-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEE8FF] font-semibold text-[#6D35F5]">{m.avatar_url?.startsWith("https://")?<img src={m.avatar_url} alt="" className="h-full w-full object-cover"/>:m.display_name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{m.display_name}</p><p className="text-xs text-[#697386]">{m.job_title||roles[m.role]||m.role}</p><p className="mt-1 text-xs text-[#697386]">{assignments.filter(a=>a.user_id===m.user_id).length} projeto(s) atribuído(s) · {permissions.filter(p=>p.user_id===m.user_id).length} permissão(ões) específica(s)</p></div><span className={`rounded-md px-2.5 py-1 text-xs ${m.active?"bg-[#E6F6EA] text-[#176B3C]":"bg-[#ECEEF2] text-[#677084]"}`}>{m.active?"Ativo":"Inativo"}</span></div>)}</div>}
  <p className="mt-5 text-xs leading-5 text-[#697386]">Convites, fotos e autorizações de edição somente serão habilitados após a validação das políticas de segurança e dos fluxos de convite. Não são administrados diretamente pelo navegador.</p>
 </section>;
}
