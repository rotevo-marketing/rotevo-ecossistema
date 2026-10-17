"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabase";
type Props={email:string;name:string;avatarUrl?:string|null;onLogout:()=>Promise<void>};
export default function AdminUserMenu({email,name,avatarUrl,onLogout}:Props){
 const [open,setOpen]=useState(false),[changing,setChanging]=useState(false);
 const rootRef=useRef<HTMLDivElement>(null);
 const triggerRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const closeOutside=(event:PointerEvent)=>{if(event.target instanceof Node&&!rootRef.current?.contains(event.target))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);triggerRef.current?.focus();}};
  document.addEventListener("pointerdown",closeOutside);
  document.addEventListener("keydown",escape);
  return()=>{document.removeEventListener("pointerdown",closeOutside);document.removeEventListener("keydown",escape);};
 },[open]);
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
 const display=name.trim()||email.split("@")[0]||"Usuário";
 const initials=display.split(/\s+/).slice(0,2).map(n=>n[0]?.toUpperCase()??"").join("");
 async function updatePassword(){
  if(busy)return;
  if(password.length<12){setFeedback("Use uma senha com pelo menos 12 caracteres.");return;}
  if(password!==confirm){setFeedback("As senhas não coincidem.");return;}
  setBusy(true);setFeedback("");
  try{
   const {error}=await supabase.auth.updateUser({password});
   if(error){setFeedback("Não foi possível alterar a senha. Faça login novamente e tente de novo.");return;}
   setPassword("");setConfirm("");setChanging(false);
   setFeedback("Senha atualizada. Outros dispositivos podem precisar de novo login.");
  }catch{
   setFeedback("Falha de conexão ao alterar a senha. Tente novamente.");
  }finally{
   setBusy(false);
  }
 }
 return <div ref={rootRef} className="relative">
  <button ref={triggerRef} type="button" aria-label="Abrir menu do usuário" aria-expanded={open} aria-haspopup="true" onClick={()=>setOpen(v=>!v)}
    className="flex items-center gap-2 rounded-xl border border-white/20 px-2 py-1.5 text-white hover:bg-white/10">
   <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A7E000] text-xs font-bold text-[#0B142A]">{avatarUrl?<img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover"/>:initials||"U"}</span>
   <span className="hidden max-w-44 truncate text-sm font-medium sm:inline">{display}</span>
   <span aria-hidden="true" className="text-xs">▾</span>
  </button>
  {open&&<div className="absolute right-0 z-[90] mt-2 w-[min(320px,calc(100vw-24px))] rounded-xl border border-[#E3E7F0] bg-white p-3 text-[#090D1C] shadow-xl">
   <div className="border-b border-[#E3E7F0] pb-3"><p className="truncate text-sm font-semibold">{display}</p><p className="truncate text-xs text-[#697386]">{email}</p></div>
   {feedback&&<p role="status" className="mt-3 text-xs text-[#525B70]">{feedback}</p>}
   {changing?<div className="mt-3 space-y-2">
     <p className="text-sm font-semibold">Alterar senha</p>
     <input type="password" autoComplete="new-password" aria-label="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nova senha (mín. 12 caracteres)" className="w-full rounded-lg border p-2 text-sm"/>
     <input type="password" autoComplete="new-password" aria-label="Confirmar nova senha" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirme a senha" className="w-full rounded-lg border p-2 text-sm"/>
     <div className="flex gap-2"><button type="button" disabled={busy} onClick={()=>void updatePassword()} className="rounded-lg bg-[#0B142A] px-3 py-2 text-xs text-white disabled:opacity-50">Salvar senha</button><button type="button" disabled={busy} onClick={()=>{setChanging(false);setPassword("");setConfirm("");}} className="rounded-lg border px-3 py-2 text-xs">Cancelar</button></div>
   </div>:<div className="mt-2 space-y-1">
    <button type="button" onClick={()=>{setChanging(true);setFeedback("");}} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F6F7FB]">Alterar senha</button>
    <button type="button" onClick={()=>void onLogout()} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Sair da conta</button>
   </div>}
  </div>}
 </div>;
}
