"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";
import {RotevoLogo} from "@/Components/RotevoLogo";
type Summary={displayName:string;role:string;permissions:string[];assignedProjectCount:number;projects:{id:string;title:string}[]};
export default function RestrictedTeamHome(){
 const router=useRouter();
 const [leaving,setLeaving]=useState(false);
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
 async function logout(){setLeaving(true);const {error}=await supabase.auth.signOut();if(error){setState("Não foi possível sair. Tente novamente.");setLeaving(false);return;}router.replace("/estrategista/login");}
 return <main className="mx-auto max-w-3xl px-6 py-12"><header className="mb-8 flex items-center justify-between gap-4"><RotevoLogo/><button type="button" disabled={leaving} onClick={()=>void logout()} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{leaving?"Saindo...":"Sair"}</button></header><h1 className="text-2xl font-semibold">Área da equipe ROTEVO</h1>
 {state?<p role="status" className="mt-5 text-sm">{state}</p>:data&&<section className="mt-6 rounded-xl border p-5">
  <h2 className="text-lg font-medium">Olá, {data.displayName}</h2>
  <p className="mt-2 text-sm">Projetos atribuídos: {data.assignedProjectCount}</p>
  <p className="mt-2 text-sm">Acesso: {data.permissions.includes("projects.read")?"Consultar nomes dos projetos atribuídos":"Nenhuma permissão de consulta concedida"}</p>
  <h3 className="mt-5 font-semibold">Nomes dos projetos liberados</h3>
  {data.projects.length?<ul className="mt-2 list-disc pl-5 text-sm">{data.projects.map(project=><li key={project.id}>{project.title}</li>)}</ul>:<p className="mt-2 text-sm">Nenhum projeto com permissão de leitura.</p>}
  <p className="mt-4 text-sm text-gray-600">O acesso aos documentos e às operações exige autorização adicional e não está disponível nesta área.</p>
 </section>}
 <Link href="/estrategista/login" className="mt-6 inline-block text-sm font-medium text-[#6D35F5] underline">Voltar ao login</Link></main>;
}
