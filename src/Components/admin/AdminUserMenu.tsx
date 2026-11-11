"use client";
import {useEffect,useRef,useState} from "react";
import AccountProfileButton,{useAccountProfile} from "@/Components/operations/AccountProfileButton";
import {supabase} from "@/lib/supabase";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
type Props={email:string;name:string;avatarUrl?:string|null;onLogout:()=>Promise<void>};
export default function AdminUserMenu({email,name,avatarUrl,onLogout}:Props){
 const account=useAccountProfile();
 const profileAvatar=account.profile?account.avatar:avatarUrl;
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
 const display=account.profile?.displayName||name.trim()||email.split("@")[0]||"Usuário";
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
  <button ref={triggerRef} type="button" aria-label={`Abrir menu de ${display}`} aria-expanded={open} aria-haspopup="true" onClick={()=>setOpen(v=>!v)}
    className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-[#E3E7F0] bg-white px-2.5 py-1 text-[#323647] transition-colors hover:border-[#CEC9EA] hover:bg-[#F6F7FB] focus-visible:outline-2 focus-visible:outline-[#6C5CE7] sm:px-3">
   <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E3E7F0] bg-[#EEE8FF] text-xs font-bold text-[#6034B7]">{profileAvatar?<img src={profileAvatar} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover"/>:initials||"U"}</span>
   <span className="hidden max-w-44 min-w-0 truncate text-left text-sm font-semibold sm:inline">{display}</span>
   <RotevoTablerIcon name="chevron-down" size={16} stroke={1.7} className="hidden text-[#697386] sm:block"/>
  </button>
  {open&&<div className="absolute right-0 z-[90] mt-2 w-[min(320px,calc(100vw-24px))] rounded-xl border border-[#E3E7F0] bg-white p-3 text-[#090D1C] shadow-xl">
   <div className="border-b border-[#E3E7F0] px-1 pb-3 pt-1"><p className="truncate text-sm font-semibold">{display}</p><p className="mt-1 truncate text-xs text-[#697386]">{account.profile?.email||email}</p></div>
   {feedback&&<p role="status" className="mt-3 text-xs text-[#525B70]">{feedback}</p>}
   {changing?<div className="mt-3 space-y-2">
     <p className="text-sm font-semibold">Alterar senha</p>
     <input type="password" autoComplete="new-password" aria-label="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nova senha (mín. 12 caracteres)" className="w-full rounded-lg border p-2 text-sm"/>
     <input type="password" autoComplete="new-password" aria-label="Confirmar nova senha" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirme a senha" className="w-full rounded-lg border p-2 text-sm"/>
     <div className="flex gap-2"><button type="button" disabled={busy} onClick={()=>void updatePassword()} className="rounded-lg bg-[#0B142A] px-3 py-2 text-xs text-white disabled:opacity-50">Salvar senha</button><button type="button" disabled={busy} onClick={()=>{setChanging(false);setPassword("");setConfirm("");}} className="rounded-lg border px-3 py-2 text-xs">Cancelar</button></div>
   </div>:<div className="mt-2 space-y-1"><AccountProfileButton/>
    <button type="button" onClick={()=>{setChanging(true);setFeedback("");}} className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-[#323647] hover:bg-[#F6F7FB] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"><RotevoTablerIcon name="key" size={18} stroke={1.7}/><span>Alterar senha</span></button>
    <div className="my-1 border-t border-[#E3E7F0]"/><button type="button" onClick={()=>void onLogout()} className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-[#B33A4D] hover:bg-[#FFF4F5] focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"><RotevoTablerIcon name="logout" size={18} stroke={1.7}/><span>Sair</span></button>
   </div>}
  </div>}
 </div>;
}
