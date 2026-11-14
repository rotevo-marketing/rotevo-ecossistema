"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {request} from "@/lib/operations/api";

type Choice="light"|"dark"|"system";
const choices:{value:Choice;label:string}[]=[
 {value:"light",label:"Claro"},{value:"dark",label:"Escuro"},{value:"system",label:"Sistema"}
];
const validChoice=(v:unknown):v is Choice=>v==="light"||v==="dark"||v==="system";
/**
 * Isolated, gated per-user appearance selector. Never saves into localStorage.
 * Does not apply a theme until the protected account API confirms identity.
 */
export default function AccountAppearancePreference(){
 const [choice,setChoice]=useState<Choice>("system");
 const [user,setUser]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  let alive=true;let currentUser="";
  const mq=window.matchMedia("(prefers-color-scheme: dark)");
  const apply=(value:Choice)=>{if(!alive)return;const effective=value==="system"?(mq.matches?"dark":"light"):value;
   document.documentElement.dataset.rotevoAppearance=effective;};
  const onSystem=()=>{if(!alive)return;setChoice(old=>{apply(old);return old;});};
  mq.addEventListener("change",onSystem);
  const subscription=supabase.auth.onAuthStateChange((_event,session)=>{
   if(!session?.user||currentUser&&session.user.id!==currentUser){
    alive=false;document.documentElement.removeAttribute("data-rotevo-appearance");
    setUser("");setChoice("system");setError("");
   }
  });
  void (async()=>{
   try{
    const {data,error:authError}=await supabase.auth.getUser();
    if(authError||!data.user)throw new Error("Sessão expirada.");
    currentUser=data.user.id;
    const params=new URLSearchParams({expectedAuthorUserId:currentUser});
    const result=await request<{appearance:Choice}>("/api/account/appearance?"+params.toString());
    if(!alive)return;
    if(!validChoice(result.appearance))throw new Error("Preferência inválida.");
    setUser(currentUser);setChoice(result.appearance);apply(result.appearance);
   }catch(e){if(alive){setError(e instanceof Error?e.message:"Preferência indisponível.");document.documentElement.removeAttribute("data-rotevo-appearance");}}
   finally{if(alive)setLoading(false);}
  })();
  return()=>{alive=false;mq.removeEventListener("change",onSystem);subscription.data.subscription.unsubscribe();};
 },[]);
 async function change(next:Choice){
  if(busy||!user||loading)return;
  setBusy(true);setError("");
  try{
   const {data,error:authError}=await supabase.auth.getUser();
   if(authError||!data.user||data.user.id!==user)throw new Error("A sessão mudou. Reabra o menu.");
   const result=await request<{appearance:Choice}>("/api/account/appearance","PATCH",{
    appearance:next,expectedAuthorUserId:user});
   if(!validChoice(result.appearance))throw new Error("Preferência inválida.");
   setChoice(result.appearance);
   const matches=window.matchMedia("(prefers-color-scheme: dark)").matches;
   document.documentElement.dataset.rotevoAppearance=result.appearance==="system"?(matches?"dark":"light"):result.appearance;
   window.dispatchEvent(new CustomEvent("rotevo-appearance-updated",{detail:{appearance:result.appearance,userId:user}}));
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar a preferência.");}
  finally{setBusy(false);}
 }
 return <div data-ui3-account-appearance className="rounded-lg px-3 py-2">
  <p className="mb-2 text-xs font-semibold">Aparência</p>
  <div role="group" aria-label="Aparência da plataforma" className="flex flex-wrap gap-1">
   {choices.map(item=><button key={item.value} type="button" aria-pressed={choice===item.value}
     disabled={loading||busy||!user} onClick={()=>void change(item.value)}
     className={"rounded-lg border px-2.5 py-2 text-xs disabled:opacity-50 "+(choice===item.value?"border-[#6C5CE7] bg-[#F0EBFF] text-[#6034B7]":"border-[#E3E6ED] hover:bg-[#F6F7FB]")}>
    {item.label}</button>)}
  </div>
  {loading&&<p role="status" className="mt-2 text-[11px] text-[#697386]">Consultando preferência…</p>}
  {error&&<p role="alert" className="mt-2 text-xs text-[#A83E3E]">{error}</p>}
 </div>;
}
