"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
import {request} from "@/lib/operations/api";
import {supabase} from "@/lib/supabase";
import type {ClientActionType,ClientResourceType} from "@/lib/workflow/clientActionsContract";

type Recipient={id:string;full_name:string|null;email:string|null};
type Resource={
 clientId:string;
 projectId:string;
 resourceId:string;
 resourceType:ClientResourceType;
 resourceVersion?:string;
};
const actionLabels:Record<ClientActionType,string>={
 record_video:"Gravar vídeo",
 send_material:"Enviar material",
 provide_information:"Fornecer informações",
 review_material:"Revisar material",
 custom:"Outra responsabilidade",
};
const field="mt-1 block w-full rounded-lg border border-[#E3E7F0] px-3 py-2 text-sm";

export default function ClientActionCreate({clientId,projectId,resourceId,resourceType,resourceVersion}:Resource){
 const [opened,setOpened]=useState(false);
 const [accounts,setAccounts]=useState<Recipient[]>([]);
 const [actor,setActor]=useState("");
 const [recipient,setRecipient]=useState("");
 const [action,setAction]=useState<ClientActionType>("send_material");
 const [instructions,setInstructions]=useState("");
 const [date,setDate]=useState("");
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState(false);
 const attempt=useRef<{payload:string;key:string}|null>(null);
 const inFlight=useRef(false);

 useEffect(()=>{
  if(!opened)return;
  let current=true;
  async function load(){
   setLoading(true);
   setError("");
   try{
    const {data}=await supabase.auth.getUser();
    if(!data.user)throw Error("Entre novamente para selecionar o destinatário.");
    const {users}=await request<{users:Recipient[]}>(
     "/api/admin/client-users?"+new URLSearchParams({clientId,linkedOnly:"true"})
    );
    if(current){setAccounts(users);setActor(data.user.id);}
   }catch(cause){
    if(current)setError(cause instanceof Error?cause.message:"Não foi possível carregar as contas.");
   }finally{
    if(current)setLoading(false);
   }
  }
  void load();
  return()=>{current=false;};
 },[clientId,opened]);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(inFlight.current||!actor||!recipient||!date||instructions.trim().length<3)return;
  inFlight.current=true;
  setSaving(true);
  setError("");
  const payload={
   projectId,resourceType,resourceId,resourceVersion:resourceVersion??null,
   clientUserId:recipient,actionType:action,instructions:instructions.trim(),
   dueDate:date,expectedAuthorUserId:actor,
  };
  const serialized=JSON.stringify(payload);
  if(attempt.current?.payload!==serialized)attempt.current={payload:serialized,key:crypto.randomUUID()};
  try{
   await request("/api/workflow/client-actions","POST",{...payload,requestKey:attempt.current.key});
   attempt.current=null;
   setRecipient("");
   setInstructions("");
   setDate("");
   setOpened(false);
   setSuccess(true);
  }catch(cause){
   setError(cause instanceof Error?cause.message:"Não foi possível registrar a atribuição.");
  }finally{
   inFlight.current=false;
   setSaving(false);
  }
 }

 return <section className="mt-4 rounded-xl border border-[#E3E7F0] p-4" aria-label="Responsabilidade do cliente">
  <button type="button" aria-expanded={opened} disabled={saving}
   className="rounded-lg border border-[#E3E7F0] px-3 py-2 text-sm font-semibold"
   onClick={()=>{setOpened(value=>!value);setSuccess(false);}}>
   Atribuir responsabilidade ao cliente
  </button>
  {success&&<p role="status" className="mt-2 text-sm">Responsabilidade registrada para a conta selecionada.</p>}
  {opened&&(loading?<p role="status" className="mt-2 text-sm">Carregando contas vinculadas...</p>:
   <form className="mt-3 space-y-3" onSubmit={submit}>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {actor&&accounts.length===0&&<p className="text-sm">Nenhuma conta de cliente vinculada ao projeto.</p>}
    {accounts.length>0&&<fieldset disabled={saving} className="space-y-3">
     <label className="block text-xs font-medium">Conta do cliente<select required className={field}
      value={recipient} onChange={e=>setRecipient(e.target.value)}>
      <option value="">Selecione a conta</option>
      {accounts.map(account=><option key={account.id} value={account.id}>
       {[account.full_name,account.email].filter(Boolean).join(" · ")||"Conta vinculada"}
      </option>)}
     </select></label>
     <label className="block text-xs font-medium">Responsabilidade<select className={field}
      value={action} onChange={e=>setAction(e.target.value as ClientActionType)}>
      {Object.entries(actionLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
     </select></label>
     <label className="block text-xs font-medium">Instruções<textarea className={field} required minLength={3}
      maxLength={4000} rows={3} value={instructions} onChange={e=>setInstructions(e.target.value)}/></label>
     <label className="block text-xs font-medium">Prazo<input className={field} required type="date"
      value={date} onChange={e=>setDate(e.target.value)}/></label>
     <button type="submit" className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-semibold text-white">
      {saving?"Registrando...":"Confirmar atribuição"}
     </button>
    </fieldset>}
   </form>)}
 </section>;
}
