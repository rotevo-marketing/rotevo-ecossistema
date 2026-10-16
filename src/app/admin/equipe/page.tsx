"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {RotevoLogo} from "@/Components/RotevoLogo";
import TeamDirectory from "@/Components/admin/TeamDirectory";
import {supabase} from "@/lib/supabase";

export default function TeamAdministrationPage(){
 const router=useRouter();
 const [verified,setVerified]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{let live=true;void(async()=>{
  try{
   const {data,error:identityError}=await supabase.auth.getUser();
   if(identityError||!data.user){router.replace("/estrategista/login");return;}
   const {data:profile,error:profileError}=await supabase.from("profiles").select("role").eq("id",data.user.id).single();
   if(profileError)throw new Error("Nao foi possivel verificar seu acesso. Tente novamente.");
   if(profile.role!=="strategist"){
    router.replace(profile.role==="staff"?"/equipe/meu-acesso":"/cliente");return;
   }
   if(live)setVerified(true);
  }catch(cause){if(live)setError(cause instanceof Error?cause.message:"Acesso indisponivel.");}
 })();return()=>{live=false};},[router]);
 return <main className="min-h-screen bg-[#F6F7FB] text-[#090D1C]">
  <header className="border-b border-[#E3E7F0] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
   <RotevoLogo/><Link href="/admin" className="rounded-lg border border-[#E3E7F0] px-4 py-2 text-sm font-semibold">Voltar ao painel</Link>
  </div></header>
  <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><h1 className="text-3xl font-bold">Gestão de usuários</h1>
   <p className="mt-3 text-sm text-[#525B70]">Cadastre colaboradores e controle a liberação de acesso aos projetos.</p>
   {error?<p role="alert" className="mt-6 text-sm text-red-700">{error}</p>:verified?<TeamDirectory/>:<p role="status" className="mt-6 text-sm">Verificando acesso...</p>}
  </div>
 </main>;
}
