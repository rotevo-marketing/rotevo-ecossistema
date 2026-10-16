"use client";

import {useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
import EcosystemPresentationOverview from "@/Components/apresentacao/EcosystemPresentationOverview";

type PresentationProject={
 id:string;title:string;slug:string;status:string;client_id:string;
 clients:{name:string;slug:string}|{name:string;slug:string}[]|null;
 data:{coverImageUrl?:string|null;deliverySchedule?:Record<string,string>|null;
 ecosystem2027?:{selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];documents?:Record<string,{content:string}>}}|null
};
const clientOf=(project:PresentationProject)=>Array.isArray(project.clients)?project.clients[0]:project.clients;

export default function ApresentacaoDinamicaPage(){
 const params=useParams(),router=useRouter();
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
    if(!candidate||candidate.slug!==slug||!candidate.data?.ecosystem2027)throw new Error("Only Ecosystem 2027 presentations are supported");
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
 return <EcosystemPresentationOverview
  clientName={client?.name??project.title}
  projectTitle={project.title}
  coverImageUrl={details.coverImageUrl??null}
  clientSlug={client?.slug??""}
  projectSlug={project.slug}
  isStrategist={strategist}
  selectedCodes={details.ecosystem2027?.selectedDocumentCodes??[]}
  presentedCodes={details.ecosystem2027?.presentedDocumentCodes??[]}
  documents={details.ecosystem2027?.documents??{}}
 />;
}
