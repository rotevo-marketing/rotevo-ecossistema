"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";
import {AuthShell,authStyles as s} from "@/Components/auth/AuthShell";
export default function FirstAccessPage(){
 const router=useRouter();
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(password!==confirm){setError("As senhas não coincidem.");return;}
  if(password.length<12){setError("A nova senha precisa ter pelo menos 12 caracteres.");return;}
  setBusy(true);
  try{
   const {data,error:sessionError}=await supabase.auth.getSession();
   const token=data.session?.access_token;
   if(sessionError||!token)throw new Error("Faça login novamente.");
   const response=await fetch("/api/team/first-password",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({newPassword:password}),cache:"no-store"
   });
   if(!response.ok){const result=await response.json().catch(()=>null);throw new Error(result?.error||"Não foi possível alterar a senha.");}
   setPassword("");setConfirm("");
   await supabase.auth.signOut();
   router.replace("/estrategista/login?senha_atualizada=1");
  }catch(cause){setError(cause instanceof Error?cause.message:"Falha ao atualizar a senha.");}
  finally{setBusy(false);}
 }
 return <AuthShell title="Primeiro acesso" strategist={true}>
  <form onSubmit={e=>void submit(e)} className={s.form} aria-busy={busy}>
   <p className={s.note}>Antes de usar a plataforma, substitua a senha temporária. Após a alteração, um administrador deverá liberar seu acesso aos projetos.</p>
   <label className={s.field}>Nova senha
    <input type="password" required minLength={12} maxLength={128} autoComplete="new-password"
     value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} className={s.input}/>
   </label>
   <label className={s.field}>Confirmar nova senha
    <input type="password" required minLength={12} maxLength={128} autoComplete="new-password"
     value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy} className={s.input}/>
   </label>
   {error&&<p role="alert" className={s.message+" "+s.error}>{error}</p>}
   <button type="submit" className={s.button} disabled={busy}>{busy?"Salvando...":"Definir minha senha"}</button>
  </form>
 </AuthShell>;
}
