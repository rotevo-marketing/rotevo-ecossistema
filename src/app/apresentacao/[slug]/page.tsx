"use client";

import AccountAppearanceBootstrap from "@/Components/operations/AccountAppearanceBootstrap";
import PlanningV5 from "@/Components/strategic-editor/PlanningV5";
import { isPlanningV5 } from "@/lib/planning/v5";
import type { PlanningV5Timeline } from "@/Components/strategic-editor/PlanningV5";
import {useEffect,useState} from "react";
import {useParams,useRouter,useSearchParams} from "next/navigation";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
import type {CompanyAnalysis} from "@/lib/planning/companyAnalysis";

type PresentationProject={
 id:string;title:string;slug:string;
 clients:{slug:string}|{slug:string}[]|null;
 data:{planningStructureVersion?:number;timeline?:PlanningV5Timeline|null;companyAnalysis0201?:CompanyAnalysis|null};
};

export default function ApresentacaoDinamicaPage(){
 const params=useParams(),router=useRouter(),query=useSearchParams();
 const slug=typeof params.slug==="string"?params.slug:"";
 const [project,setProject]=useState<PresentationProject|null>(null);
 const [strategist,setStrategist]=useState(false);
 const [loading,setLoading]=useState(true);
 const [notFound,setNotFound]=useState(false);
 useEffect(()=>{
  if(!slug)return;
  let cancelled=false;
  async function load(){
   setLoading(true);setNotFound(false);
   const {data:session,error:sessionError}=await supabase.auth.getSession();
   const token=session.session?.access_token;
   if(sessionError||!token){router.push("/");return;}
   const {data:profile}=await supabase.from("profiles").select("role").eq("id",session.session!.user.id).maybeSingle();
   if(!profile||!["strategist","client"].includes(profile.role)){router.push("/");return;}
   try{
    const response=await fetch(`/api/presentation/project?slug=${encodeURIComponent(slug)}`,{
      headers:{Authorization:`Bearer ${token}`},cache:"no-store"
    });
    if(!response.ok)throw new Error("presentation unavailable");
    const result=await response.json();
    const candidate=result?.project as PresentationProject|undefined;
    if(!candidate||candidate.slug!==slug||!isPlanningV5(candidate.data))throw new Error("Planejamento V5 indisponível");
    if(!cancelled){setProject(candidate);setStrategist(profile.role==="strategist");}
   }catch{if(!cancelled)setNotFound(true);}
   finally{if(!cancelled)setLoading(false);}
  }
  void load();
  return()=>{cancelled=true;};
 },[slug,router]);
 if(loading)return <main className="flex min-h-screen items-center justify-center bg-[#F6F7FB] text-[#697386]">Carregando apresentação...</main>;
 if(notFound||!project)return <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F6F7FB] p-8 text-center"><h1 className="text-2xl font-semibold text-[#090D1C]">Apresentação indisponível</h1><Link href="/cliente" className="rounded-xl bg-[#090D1C] px-5 py-3 text-sm font-medium text-white">Voltar ao portal</Link></main>;
 const client=Array.isArray(project.clients)?project.clients[0]:project.clients;
 const backHref=!strategist?"/cliente":query.get("from")==="projects"||!client?.slug?"/admin?section=projects":`/admin/planejamentos/${encodeURIComponent(client.slug)}?projectId=${encodeURIComponent(project.id)}`;
 return <main className="rv-ui3 min-h-screen p-4 sm:p-8" style={{background:"var(--rv3-canvas)"}}>
  {process.env.NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED === "true" && <AccountAppearanceBootstrap/>}
  <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">{project.title}</h1><Link href={backHref}>Voltar</Link></header>
  <PlanningV5 key={project.id} project={project} timeline={project.data.timeline} companyAnalysis={project.data.companyAnalysis0201}/>
 </main>;
}
