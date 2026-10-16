"use client";
import {useState} from "react";
import {supabase} from "@/lib/supabase";
type Member={user_id:string;display_name:string;role:string;active:boolean};
export default function TeamAdminTransferForm({members,onTransferred}:{members:Member[];onTransferred:()=>Promise<void>}){
 const [target,setTarget]=useState(""),[confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const candidates=members.filter(m=>m.active&&m.role!=="admin");
 async function transfer(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");setNotice("");
  if(confirmation!=="TRANSFERIR_ADMIN"||!target)return;
  setBusy(true);
  try{
   const {data,error:sessionError}=await supabase.auth.getSession();
   const token=data.session?.access_token;
   if(sessionError||!token)throw new Error("Faça login novamente.");
   const response=await fetch("/api/team/admin/transfer",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({targetUserId:target,confirmation}),cache:"no-store"
   });
   if(!response.ok)throw new Error("Transferência não autorizada. O novo administrador precisa ter perfil de estrategista ativo.");
   setNotice("Transferência concluída. Atualize a sessão para refletir o novo papel.");
   setConfirmation("");setTarget("");await onTransferred();
  }catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível transferir a administração.");}
  finally{setBusy(false);}
 }
 return <form onSubmit={event=>void transfer(event)} className="mt-4 rounded-xl border border-[#E3E7F0] bg-[#F8F9FC] p-4">
  <p className="text-sm font-semibold">Transferir administração</p>
  <p className="mt-1 text-xs text-[#697386]">Operação irreversível neste formulário: o novo administrador assume e o atual passa a estrategista. Somente perfis de estrategista são elegíveis.</p>
  <div className="mt-3 grid gap-2 md:grid-cols-2">
   <label className="text-xs font-medium">Novo administrador
    <select required value={target} onChange={e=>setTarget(e.target.value)} className="mt-1 w-full rounded-lg border border-[#D5D9E6] p-2 text-sm">
     <option value="">Selecione um colaborador ativo</option>
     {candidates.map(m=><option value={m.user_id} key={m.user_id}>{m.display_name}</option>)}
    </select>
   </label>
   <label className="text-xs font-medium">Digite TRANSFERIR_ADMIN para confirmar
    <input required value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border border-[#D5D9E6] p-2 text-sm"/>
   </label>
  </div>
  <button type="submit" disabled={busy||!target||confirmation!=="TRANSFERIR_ADMIN"} className="mt-3 rounded-lg bg-[#0B142A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirmar transferência</button>
  {error&&<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  {notice&&<p role="status" className="mt-2 text-xs text-green-700">{notice}</p>}
 </form>;
}
