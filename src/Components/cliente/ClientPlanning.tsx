"use client";

import {useEffect,useState} from "react";
import PlanningV5,{type PlanningV5Timeline} from "@/Components/strategic-editor/PlanningV5";
import type {CompanyAnalysis} from "@/lib/planning/companyAnalysis";
import {isPlanningV5} from "@/lib/planning/v5";
import {supabase} from "@/lib/supabase";

type ClientProject={id:string;slug:string;title:string;status:string};
type Presentation={id:string;data?:{planningStructureVersion?:number;timeline?:PlanningV5Timeline|null;companyAnalysis0201?:CompanyAnalysis|null}};

export default function ClientPlanning({projects}:{projects:ClientProject[]}){
 const selected=projects[0];
 const [result,setResult]=useState<{key:string;presentation:Presentation|null;error:string}|null>(null);
 const [retry,setRetry]=useState(0);
 const requestKey=selected?[selected.id,selected.slug,selected.status,retry].join(":"):"";
 const current=result?.key===requestKey?result:null;
 const loading=!!selected&&!current, error=current?.error??"";
 const presentation=current?.presentation;
 useEffect(()=>{
  if(!selected?.id||!selected.slug)return;
  let live=true;
  const load=async()=>{
   try{
    const {data,error:sessionError}=await supabase.auth.getSession();
    if(sessionError||!data.session?.access_token)throw Error("Sessão expirada. Entre novamente.");
    const res=await fetch("/api/presentation/project?slug="+encodeURIComponent(selected.slug),{headers:{Authorization:"Bearer "+data.session.access_token},cache:"no-store"});
    if(!res.ok)throw Error("Não foi possível carregar o planejamento autorizado.");
    const payload=await res.json();
    if(!payload?.project||payload.project.id!==selected.id)throw Error("Não foi possível confirmar o projeto.");
    if(live)setResult({key:requestKey,presentation:payload.project,error:""});
   }catch(e){if(live)setResult({key:requestKey,presentation:null,error:e instanceof Error?e.message:"Falha ao consultar o planejamento."});}
  };
  void load();return()=>{live=false};
 },[selected?.id,selected?.slug,requestKey]);
 return <div className="space-y-0">
  {!selected?<section className="rounded-xl bg-white p-6 text-sm text-[#697386]">Nenhum planejamento está vinculado à sua conta.</section>
  :loading?<section role="status" className="rounded-xl bg-white p-6 text-sm text-[#697386]">Carregando planejamento autorizado…</section>
  :error?<section role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">{error}<button type="button" className="ml-3 cursor-pointer underline" onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button></section>
  :presentation && isPlanningV5(presentation.data) ? <PlanningV5 project={{id:presentation.id,title:selected.title}} timeline={presentation.data?.timeline} companyAnalysis={presentation.data?.companyAnalysis0201??null}/>
  :<section className="rounded-xl bg-white p-6 text-sm text-[#697386]">Planejamento indisponível.</section>}
 </div>;
}
