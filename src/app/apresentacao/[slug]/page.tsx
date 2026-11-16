"use client";

import AccountAppearanceBootstrap from "@/Components/operations/AccountAppearanceBootstrap";
import PlanningV5 from "@/Components/strategic-editor/PlanningV5";
import { isPlanningV5 } from "@/lib/planning/v5";
import type { PlanningV5Timeline } from "@/Components/strategic-editor/PlanningV5";
import {useEffect,useState} from "react";
import {useParams,useRouter,useSearchParams} from "next/navigation";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
import type {RichContent} from "@/lib/planning/richContent";
import EcosystemPresentationOverview from "@/Components/apresentacao/EcosystemPresentationOverview";

type PresentationProject={
 id:string;title:string;slug:string;status:string;client_id:string;
 clients:{name:string;slug:string}|{name:string;slug:string}[]|null;
 data:{planningStructureVersion?:number;timeline?:PlanningV5Timeline|null;coverImageUrl?:string|null;deliverySchedule?:Record<string,string>|null;
 ecosystem2027?:{selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];hiddenExecutiveDocumentCodes?:string[];executiveDocuments?:Record<string,{content:string;richContent?:RichContent}>;documents?:Record<string,{content?:string;richContent?:RichContent;publishedContent?:string;publishedRichContent?:RichContent}>}}|null
};
const clientOf=(project:PresentationProject)=>Array.isArray(project.clients)?project.clients[0]:project.clients;

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
    if(!candidate||candidate.slug!==slug||(!candidate.data?.ecosystem2027&&!isPlanningV5(candidate.data)))throw new Error("Only Ecosystem 2027 presentations are supported");
    if(!cancelled){setProject(candidate);setStrategist(profile.role==="strategist");}
   }catch{if(!cancelled)setNotFound(true);}
   finally{if(!cancelled)setLoading(false);}
  }
  void load();
  return()=>{cancelled=true;};
 },[slug,router]);
 if(loading)return <main className="flex min-h-screen items-center justify-center bg-[#F6F7FB] text-[#697386]">Carregando apresentação...</main>;
 if(notFound||!project)return <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F6F7FB] p-8 text-center"><h1 className="text-2xl font-semibold text-[#090D1C]">Apresentação indisponível</h1><p className="max-w-lg text-sm text-[#697386]">Somente projetos estruturados no Ecossistema de Crescimento 2027 estão disponíveis nesta plataforma.</p><Link href="/cliente" className="rounded-xl bg-[#090D1C] px-5 py-3 text-sm font-medium text-white">Voltar ao portal</Link></main>;
 const client=clientOf(project);
 const details=project.data!;
 if(!strategist&&project.status==="draft")return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F7FB] p-8 text-center"><h1 className="text-2xl font-semibold text-[#090D1C]">Planejamento em desenvolvimento</h1><p className="text-[#697386]">A apresentação estará disponível quando for publicada.</p><Link href="/cliente" className="rounded-xl bg-[#090D1C] px-5 py-3 text-sm text-white">Voltar ao portal</Link></main>;
 if (isPlanningV5(details)) return <main className="rv-ui3 min-h-screen p-4 sm:p-8" style={{background:"var(--rv3-canvas)"}}>
  {process.env.NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED === "true" && <AccountAppearanceBootstrap/>}
  <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">{project.title}</h1><Link href={strategist ? "/admin?section=projects" : "/cliente"}>Voltar</Link></header>
  <PlanningV5 key={project.id} project={project} timeline={details.timeline}/>
 </main>;
 return <EcosystemPresentationOverview
  projectId={project.id}
  clientName={client?.name??project.title}
  projectTitle={project.title}
  coverImageUrl={details.coverImageUrl??null}
  clientSlug={client?.slug??""}
  projectSlug={project.slug}
  isStrategist={strategist}
  returnToProjects={query.get("from")==="projects"}
  selectedCodes={details.ecosystem2027?.selectedDocumentCodes??[]}
  presentedCodes={details.ecosystem2027?.presentedDocumentCodes??[]}
  executiveDocuments={strategist?Object.fromEntries(Object.entries(details.ecosystem2027?.documents??{}).flatMap(([code,document])=>/^00\.0[1-7]$/.test(code)&&!details.ecosystem2027?.hiddenExecutiveDocumentCodes?.includes(code)&&document.publishedContent?[[code,{content:document.publishedContent,...(document.publishedRichContent?{richContent:document.publishedRichContent}:{})}]]:[])):details.ecosystem2027?.executiveDocuments??{}}
  documents={Object.fromEntries(Object.entries(details.ecosystem2027?.documents??{}).flatMap(([code,document])=>{const text=strategist?document.publishedContent:document.content;const rich=strategist?document.publishedRichContent:document.richContent;return typeof text==="string"?[[code,{content:text,...(rich?{richContent:rich}:{})}]]:[];}))}
 />;
}
