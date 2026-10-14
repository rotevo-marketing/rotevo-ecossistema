"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RotevoLogo } from "@/Components/RotevoLogo";

type Project={id:string;title:string;slug:string;description:string|null;status:string;updated_at:string;data:{coverImageUrl?:string|null;deliverySchedule?:Record<string,string>|null;ecosystem2027?:{selectedDocumentCodes?:string[];presentedDocumentCodes?:string[]}}|null};
const scheduleGroups=[
  {key:"essencia-do-projeto",label:"Essência do Projeto"},
  {key:"fundamentos-estrategicos",label:"Fundamentos Estratégicos do Projeto"},
  {key:"estrategia-editorial-e-canais",label:"Estratégia Editorial e Canais de Conteúdo"},
  {key:"campanhas-automacoes-e-conversao",label:"Campanhas, Automações e Conversão"},
  {key:"execucao-acompanhamento-e-gestao",label:"Execução, Acompanhamento e Gestão"},
];
const statusLabel=(s:string)=>s==="draft"?"Em produção":s==="in_progress"?"Em andamento":s==="published"?"Publicado":"Arquivado";
const statusStyle=(s:string)=>s==="draft"?"bg-amber-100 text-amber-800":s==="in_progress"?"bg-blue-100 text-blue-700":s==="published"?"bg-emerald-100 text-emerald-700":"bg-slate-200 text-slate-700";
const date=(d:string)=>new Intl.DateTimeFormat("pt-BR").format(new Date(d));
const scheduleDate=(s:string)=>{const parts=s.split("-");return parts.length===3?`${parts[2]}/${parts[1]}/${parts[0]}`:"A definir"};
export default function ClientAreaPage(){
  const router=useRouter();
  const [projects,setProjects]=useState<Project[]>([]);
  const [clientName,setClientName]=useState("");
  const [isLoading,setIsLoading]=useState(true);
  const [errorMessage,setErrorMessage]=useState("");
  useEffect(()=>{let alive=true;async function load(){
    const {data:userData}=await supabase.auth.getUser();
    if(!userData.user){router.push("/");return;}
    const {data:profile}=await supabase.from("profiles").select("role, client_id").eq("id",userData.user.id).single();
    if(!profile){await supabase.auth.signOut();router.push("/");return;}
    if(profile.role==="strategist"){router.push("/admin");return;}
    if(profile.role!=="client"||!profile.client_id){await supabase.auth.signOut();router.push("/");return;}
    const [clientResult,projectResult]=await Promise.all([
      supabase.from("clients").select("name").eq("id",profile.client_id).single(),
      supabase.from("planning_projects").select("id, title, slug, description, status, updated_at, data").eq("client_id",profile.client_id).order("updated_at",{ascending:false})
    ]);
    if(!alive)return;
    setClientName(clientResult.data?.name??"");
    if(projectResult.error)setErrorMessage("Não foi possível carregar os planejamentos.");
    else setProjects((projectResult.data??[]) as Project[]);
    setIsLoading(false);
  }load();return()=>{alive=false}},[router]);
  async function logout(){await supabase.auth.signOut();router.push("/");}
  return <main className="client-area-v2 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
    <style jsx global>{` .client-area-v2, .client-area-v2 h1, .client-area-v2 h2, .client-area-v2 h3 {font-family:var(--font-body),Arial,Helvetica,sans-serif!important} `}</style>
    <header className="border-b border-[#E3E7F0] bg-white"><div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
      <div className="flex items-center gap-4"><RotevoLogo size={27}/><span className="hidden h-6 w-px bg-[#E3E7F0] sm:block"/><span className="hidden text-sm text-[#697386] sm:block">Área do Cliente</span></div>
      <button type="button" onClick={logout} className="cursor-pointer rounded-xl border border-[#E3E7F0] px-5 py-2.5 text-sm font-medium hover:bg-[#F6F7FB]">Sair</button>
    </div></header>
    <section className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-10 sm:px-8 lg:px-10">
      <div className="mb-8"><p className="text-sm font-medium text-[#697386]">Área do Cliente</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{clientName?`Olá, ${clientName}!`:"Meus planejamentos"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#525B70]">Acompanhe seus projetos e acesse seus planejamentos estratégicos.</p></div>
      {errorMessage&&<p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</p>}
      <h2 className="mb-4 text-xl font-bold">Meus planejamentos</h2>
      {isLoading?<div className="rounded-2xl border border-[#E3E7F0] bg-white p-7 text-sm text-[#697386]">Carregando seus planejamentos...</div>:
       projects.length===0&&!errorMessage?<div className="rounded-2xl border border-[#E3E7F0] bg-white p-7"><h3 className="text-lg font-bold">Planejamento em preparação</h3><p className="mt-2 text-sm text-[#525B70]">Seu ambiente estratégico está sendo configurado. Quando houver um planejamento disponível, ele aparecerá aqui.</p></div>:
       <div className="space-y-4">{projects.map(project=>{
         const schedule=project.data?.deliverySchedule??null;
         const hasSchedule=schedule&&Object.values(schedule).some(Boolean);
         const isDraft=project.status==="draft";
         return <article key={project.id} className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
           <div className="flex flex-wrap items-start gap-4">
             <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EDF0F8]">{project.data?.coverImageUrl?<img src={project.data.coverImageUrl} alt={project.title} className="h-full w-full object-cover"/>:<span className="flex h-full w-full items-center justify-center text-xl font-bold text-[#697386]">{project.title.charAt(0).toUpperCase()}</span>}</div>
             <div className="min-w-0 flex-1"><h3 className="text-xl font-bold tracking-[-0.02em]">{project.title}</h3><p className="mt-1 text-sm text-[#525B70]">{clientName||"Planejamento estratégico"}</p>
               <span className={`mt-3 inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${statusStyle(project.status)}`}>{statusLabel(project.status)}</span>
               {project.description&&<p className="mt-3 text-sm leading-6 text-[#525B70]">{project.description}</p>}
               {isDraft&&<p className="mt-3 text-sm leading-6 text-[#525B70]">Seu planejamento está em preparação. Os conteúdos serão disponibilizados conforme a evolução do projeto.</p>}
             </div>
           </div>
           {hasSchedule&&<div className="mt-6 rounded-xl bg-[#F6F7FB] p-4 sm:p-5"><h4 className="text-sm font-semibold">Cronograma previsto</h4><div className="mt-3 divide-y divide-[#E3E7F0]">{scheduleGroups.map(g=><div key={g.key} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="text-[#525B70]">{g.label}</span><span className="font-semibold">{schedule?.[g.key]?scheduleDate(schedule[g.key]):"A definir"}</span></div>)}</div></div>}
           <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E7F0] pt-5"><span className="text-xs text-[#697386]">Atualizado em {date(project.updated_at)}</span><Link href={`/apresentacao/${project.slug}`} className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#0B142A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1D2A44]">{isDraft?"Ver status do planejamento":"Acessar planejamento"} <span aria-hidden="true" className="ml-2">→</span></Link></div>
         </article>
       })}</div>}
    </section>
    <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium text-[#090D1C] sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
  </main>;
}
