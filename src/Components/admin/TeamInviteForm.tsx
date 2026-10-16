"use client";
import {useState} from "react";
import {supabase} from "@/lib/supabase";
const roles=[
 {value:"strategist",label:"Estrategista"},
 {value:"project_manager",label:"Gestor de projetos"},
 {value:"producer",label:"Produção"},
 {value:"finance",label:"Financeiro"}
];
export default function TeamInviteForm({onInvited}:{onInvited:()=>Promise<void>}){
 const [displayName,setDisplayName]=useState(""),[email,setEmail]=useState(""),[role,setRole]=useState("producer");
 const [pending,setPending]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setPending(true);setError("");setNotice("");
  try{
   const {data,error:sessionError}=await supabase.auth.getSession();
   const token=data.session?.access_token;
   if(sessionError||!token)throw new Error("Sessão expirada.");
   const response=await fetch("/api/team/invite",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({displayName:displayName.trim(),email:email.trim().toLowerCase(),role}),cache:"no-store"});
   const result=await response.json().catch(()=>null) as {error?:string;message?:string}|null;
   if(!response.ok)throw new Error(result?.error||"Não foi possível enviar o convite.");
   await onInvited();
   setDisplayName("");setEmail("");setNotice(result?.message||"Convite enviado; ativação administrativa pendente.");
  }catch(cause){setError(cause instanceof Error?cause.message:"Falha no convite.");}
  finally{setPending(false);}
 }
 return <form onSubmit={event=>void submit(event)} className="mt-4 grid gap-3 rounded-xl border border-[#E3E7F0] bg-[#F8F9FC] p-4 md:grid-cols-3">
  <div><label htmlFor="team-invite-name" className="mb-1 block text-xs font-semibold">Nome completo</label>
   <input id="team-invite-name" required minLength={2} maxLength={120} value={displayName} onChange={e=>setDisplayName(e.target.value)}
    className="w-full rounded-lg border border-[#D5D9E6] bg-white px-3 py-2 text-sm"/></div>
  <div><label htmlFor="team-invite-email" className="mb-1 block text-xs font-semibold">E-mail</label>
   <input id="team-invite-email" type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}
    className="w-full rounded-lg border border-[#D5D9E6] bg-white px-3 py-2 text-sm"/></div>
  <div><label htmlFor="team-invite-role" className="mb-1 block text-xs font-semibold">Função</label>
   <select id="team-invite-role" value={role} onChange={e=>setRole(e.target.value)}
    className="w-full rounded-lg border border-[#D5D9E6] bg-white px-3 py-2 text-sm">
    {roles.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
   </select></div>
  <div className="md:col-span-3"><button type="submit" disabled={pending} className="rounded-lg bg-[#0B142A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Enviar convite</button>
   <p className="mt-2 text-xs text-[#697386]">Os convidados permanecem inativos até liberação administrativa.</p>
   {error&&<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
   {notice&&<p role="status" className="mt-2 text-xs text-green-700">{notice}</p>}
  </div>
 </form>;
}
