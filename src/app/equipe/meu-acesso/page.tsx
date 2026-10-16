"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Summary={displayName:string;role:string;permissions:string[];assignedProjectCount:number};
export default function RestrictedTeamHome(){
 const [data,setData]=useState<Summary|null>(null),[state,setState]=useState("Verificando acesso...");
 useEffect(()=>{let live=true;(async()=>{
  try{
   const {data:session,error}=await supabase.auth.getSession();
   if(error||!session.session)throw new Error("Faça login para continuar.");
   const response=await fetch("/api/team/my-access",{headers:{Authorization:`Bearer ${session.session.access_token}`},cache:"no-store"});
   if(!response.ok)throw new Error(response.status===403?"Seu acesso ainda não foi liberado pelo administrador.":"Não foi possível verificar o acesso.");
   const result=await response.json() as Summary;
   if(live){setData(result);setState("");}
  }catch(e){if(live)setState(e instanceof Error?e.message:"Acesso indisponível.");}
 })();return()=>{live=false};},[]);
 return <main className="mx-auto max-w-3xl px-6 py-12"><h1 className="text-2xl font-semibold">Área da equipe ROTEVO</h1>
 {state?<p role="status" className="mt-5 text-sm">{state}</p>:data&&<section className="mt-6 rounded-xl border p-5">
  <h2 className="text-lg font-medium">Olá, {data.displayName}</h2>
  <p className="mt-2 text-sm">Projetos atribuídos: {data.assignedProjectCount}</p>
  <p className="mt-2 text-sm">Permissões: {data.permissions.length?data.permissions.join(", "):"Nenhuma permissão adicional concedida"}</p>
  <p className="mt-4 text-sm text-gray-600">Os módulos operacionais permanecem indisponíveis nesta área até a validação da autorização específica por projeto.</p>
 </section>}
 </main>;
}
