"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { RotevoTablerIcon, type RotevoIconName } from "@/Components/RotevoTablerIcon";
import ProjectTimeline, { type ExecutionItem } from "@/Components/cliente/ProjectTimeline";

type Project = {
  id:string; title:string; slug:string; description:string|null; status:string; updated_at:string;
  data:{coverImageUrl?:string|null; deliverySchedule?:Record<string,string>|null; executionTimeline?:ExecutionItem[]; ecosystem2027?:{selectedDocumentCodes?:string[];presentedDocumentCodes?:string[]}}|null;
};
type MenuId="overview"|"planning"|"execution"|"content"|"meetings"|"onboarding"|"contract"|"drive"|"finance"|"access";
type MenuItem={id:MenuId;name:string;icon:RotevoIconName};
const menu:MenuItem[]=[
  {id:"overview",name:"Visão geral",icon:"layout-dashboard"},
  {id:"planning",name:"Planejamento",icon:"report"},
  {id:"execution",name:"Execução do projeto",icon:"chart-dots-3"},
  {id:"content",name:"Conteúdo",icon:"brand-instagram"},
  {id:"meetings",name:"Reuniões",icon:"calendar-heart"},
  {id:"onboarding",name:"Onboarding",icon:"alert-square-rounded"},
  {id:"contract",name:"Contrato",icon:"report"},
  {id:"drive",name:"Drive",icon:"shape"},
  {id:"finance",name:"Financeiro",icon:"chart-pie"},
  {id:"access",name:"Acessos",icon:"bolt"}
];
const statusLabel=(s:string)=>s==="draft"?"Em produção":s==="in_progress"?"Em andamento":s==="published"?"Publicado":"Arquivado";
const statusColor=(s:string)=>s==="published"?"bg-[#E2F6E8] text-[#126837]":s==="in_progress"?"bg-[#E6EFFF] text-[#315EA0]":s==="draft"?"bg-[#FFF2DB] text-[#92600C]":"bg-[#E9ECF2] text-[#626A7B]";
const scheduleLabels:Record<string,string>={
 "essencia-do-projeto":"Essência do projeto",
 "fundamentos-estrategicos":"Fundamentos estratégicos",
 "estrategia-editorial-e-canais":"Estratégia editorial e canais",
 "campanhas-automacoes-e-conversao":"Campanhas, automações e conversão",
 "execucao-acompanhamento-e-gestao":"Execução, acompanhamento e gestão"
};
function Icon({name,size=24}:{name:RotevoIconName;size?:number}){return <RotevoTablerIcon name={name} size={size} stroke={2.3}/>;}
function formattedDate(value:string){const d=new Date(value);return Number.isNaN(d.valueOf())?"A definir":new Intl.DateTimeFormat("pt-BR").format(d);}
function scheduleDate(value:string){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(value);return m?`${m[3]}/${m[2]}/${m[1]}`:"A definir";}
function Block({title,icon,children,action}:{title:string;icon:RotevoIconName;children:React.ReactNode;action?:React.ReactNode}){
 return <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
  <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="text-[#6D35F5]"><Icon name={icon}/></span><h2 className="text-base font-semibold">{title}</h2></div>{action}</div>{children}
 </section>;
}
export default function ClientAreaPage(){
 const router=useRouter();
 const [projects,setProjects]=useState<Project[]>([]);
 const [clientName,setClientName]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [tab,setTab]=useState<MenuId>("overview");
 const [collapsed,setCollapsed]=useState(false);
 const [mobileMenu,setMobileMenu]=useState(false);
 useEffect(()=>{let mounted=true;async function load(){
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){router.replace("/");return;}
   const {data:profile}=await supabase.from("profiles").select("role, client_id").eq("id",auth.user.id).single();
   if(!profile){await supabase.auth.signOut();router.replace("/");return;}
   if(profile.role==="strategist"){router.replace("/admin");return;}
   if(profile.role!=="client"||!profile.client_id){await supabase.auth.signOut();router.replace("/");return;}
   const [clientResult,projectResult]=await Promise.all([
     supabase.from("clients").select("name").eq("id",profile.client_id).single(),
     supabase.from("planning_projects").select("id,title,slug,description,status,updated_at,data").eq("client_id",profile.client_id).order("updated_at",{ascending:false})
   ]);
   if(!mounted)return;
   setClientName(clientResult.data?.name??"");
   if(projectResult.error)setError("Não foi possível carregar as informações do projeto.");
   else setProjects((projectResult.data??[]) as Project[]);
   setLoading(false);
 }load();return()=>{mounted=false};},[router]);
 async function logout(){await supabase.auth.signOut();router.replace("/");}
 const selected=menu.find(item=>item.id===tab)??menu[0];
 const schedule=useMemo(()=>projects.flatMap(project=>Object.entries(project.data?.deliverySchedule??{})
   .filter(([,date])=>Boolean(date)).map(([key,date])=>({label:scheduleLabels[key]??key,date,project:project.title})))
   .sort((a,b)=>a.date.localeCompare(b.date)),[projects]);
 const nextMilestone=schedule.find(item=>item.date>=new Date().toISOString().slice(0,10))??null;
 const renderProjects=()=><div className="space-y-3">{projects.length===0?<div className="rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Nenhum planejamento disponível para esta conta.</div>:projects.map(project=><article key={project.id} className="rounded-xl border border-[#E3E7F0] p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EDF0F8]">{project.data?.coverImageUrl?<img src={project.data.coverImageUrl} alt="" className="h-full w-full object-cover"/>:<span className="text-lg font-semibold text-[#697386]">{project.title.charAt(0).toUpperCase()}</span>}</div>
      <div className="min-w-0 flex-1"><h3 className="font-semibold">{project.title}</h3><p className="mt-1 text-xs text-[#697386]">Atualizado em {formattedDate(project.updated_at)}</p><span className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${statusColor(project.status)}`}>{statusLabel(project.status)}</span>
        {project.description&&<p className="mt-2 text-sm leading-6 text-[#525B70]">{project.description}</p>}
      </div>
    </div>
    <div className="mt-4 flex justify-end"><Link className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0B142A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#202E48]" href={`/apresentacao/${project.slug}`}>{project.status==="draft"?"Ver status do planejamento":"Acessar planejamento"} <span aria-hidden="true">→</span></Link></div>
  </article>)}</div>;
 const nav=<nav aria-label="Navegação do portal" className="space-y-1.5">
   <div className={`mb-6 border-b border-white/15 pb-5 ${collapsed?"lg:text-center":""}`}>
     <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-semibold text-white">{clientName.charAt(0).toUpperCase()||"C"}</span><div className={collapsed?"lg:hidden":""}><p className="line-clamp-2 text-sm font-semibold text-white">{clientName||"Portal do Cliente"}</p><p className="mt-1 text-xs text-[#B8C2D4]">Ambiente do cliente</p></div></div>
   </div>
   {menu.map(item=><button type="button" key={item.id} aria-current={tab===item.id?"page":undefined} aria-label={item.name} title={item.name}
       onClick={()=>{setTab(item.id);setMobileMenu(false)}} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${collapsed?"lg:justify-center lg:px-2":""} ${tab===item.id?"bg-[#6D35F5] text-white":"text-[#E2E6EE] hover:bg-white/10"}`}>
       <Icon name={item.icon} size={25}/><span className={collapsed?"lg:hidden":""}>{item.name}</span>
     </button>)}
 </nav>;
 return <main className="client-portal-v2 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
   <style jsx global>{` .client-portal-v2,.client-portal-v2 h1,.client-portal-v2 h2,.client-portal-v2 h3{font-family:var(--font-body),Arial,Helvetica,sans-serif!important} `}</style>
   <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B142A] text-white"><div className="flex w-full items-center justify-between gap-3 px-5 py-5">
      <div className="flex items-center gap-3"><RotevoLogo variant="white" size={27}/><span className="hidden border-l border-white/20 pl-3 text-sm text-[#CAD3E2] sm:inline">Portal do Cliente</span></div>
      <div className="flex items-center gap-2"><button type="button" onClick={()=>setMobileMenu(v=>!v)} className="cursor-pointer rounded-xl border border-white/20 px-3 py-2 text-sm lg:hidden" aria-expanded={mobileMenu}>Menu</button><button type="button" onClick={logout} className="cursor-pointer rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10">Sair</button></div>
   </div></header>
   <div className="flex w-full flex-1 items-stretch">
     <aside className={`relative hidden shrink-0 bg-[#0B142A] px-4 py-7 transition-[width] lg:block ${collapsed?"w-[78px]":"w-[286px]"}`}>{nav}
       <button type="button" aria-label={collapsed?"Expandir menu lateral":"Recolher menu lateral"} title={collapsed?"Expandir menu lateral":"Recolher menu lateral"} onClick={()=>setCollapsed(v=>!v)}
         className="absolute right-[-13px] top-[48%] z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-[#F6F7FB] bg-[#A7E000] font-bold text-[#0B142A]">{collapsed?"›":"‹"}</button>
     </aside>
     {mobileMenu&&<aside className="w-full bg-[#0B142A] px-4 py-6 lg:hidden">{nav}</aside>}
     <div className={`min-w-0 flex-1 px-5 pb-16 pt-9 sm:px-8 ${mobileMenu?"hidden lg:block":""}`}>
       <div className="mb-7"><p className="mb-1 text-sm text-[#697386]">{tab==="overview"?"Bem-vindo ao seu espaço":"Portal do Cliente"}</p><h1 className="text-3xl font-bold tracking-tight">{tab==="overview"?(clientName?`Olá, ${clientName}!`:"Visão geral"):selected.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#525B70]">{tab==="overview"?"Acompanhe o andamento do seu projeto e saiba o que precisa da sua atenção.":tab==="planning"?"Consulte seus planejamentos estratégicos em um ambiente próprio.":"Informações e entregas do seu projeto, organizadas em um só lugar."}</p></div>
       {error&&<div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
       {loading?<div className="rounded-2xl border border-[#E3E7F0] bg-white p-7 text-sm text-[#697386]">Carregando seu ambiente...</div>:
       tab==="overview"?<div className="space-y-5">
         <section className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-6">
           <div className="mb-3 flex items-center gap-3"><span className="text-[#6D35F5]"><Icon name="alert-square-rounded"/></span><h2 className="text-base font-semibold">Precisamos da sua atenção</h2></div>
           <p className="text-sm leading-6 text-[#525B70]">Nenhuma solicitação foi registrada neste portal até o momento. Quando houver materiais para aprovar ou informações a enviar, eles aparecerão aqui.</p>
         </section>
         <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
           {[
             {label:"Planejamentos",value:String(projects.length),icon:"report" as RotevoIconName},
             {label:"Projeto",value:projects.length===0?"Em preparação":projects.some(p=>p.status==="in_progress"||p.status==="draft")?"Em andamento":"Disponível",icon:"chart-dots-3" as RotevoIconName},
             {label:"Próximo marco",value:nextMilestone?scheduleDate(nextMilestone.date):"A definir",icon:"calendar-heart" as RotevoIconName},
             {label:"Aprovações",value:"Não integradas",icon:"alert-square-rounded" as RotevoIconName}
           ].map(k=><div key={k.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-5"><div className="mb-4 text-[#6D35F5]"><Icon name={k.icon}/></div><p className="text-xs text-[#697386]">{k.label}</p><p className="mt-2 text-base font-semibold">{k.value}</p></div>)}
         </div>
         <Block title="Andamento do projeto" icon="chart-dots-3" action={<button className="cursor-pointer text-sm font-semibold text-[#6D35F5]" onClick={()=>setTab("execution")}>Ver execução →</button>}>
           <p className="text-sm text-[#525B70]">O acompanhamento operacional de tarefas e entregas será disponibilizado aqui quando a linha do tempo de execução estiver integrada.</p>
           {projects.length>0&&<p className="mt-3 text-sm text-[#525B70]">Planejamento mais recente: <strong>{projects[0].title}</strong> · {statusLabel(projects[0].status)}.</p>}
         </Block>
         <Block title="Calendário editorial" icon="brand-instagram" action={<button className="cursor-pointer text-sm font-semibold text-[#6D35F5]" onClick={()=>setTab("content")}>Ver conteúdos →</button>}>
           <p className="text-sm text-[#525B70]">O calendário de conteúdos, os materiais enviados e as solicitações de aprovação aparecerão aqui após sua configuração.</p>
         </Block>
         <Block title="Próximos marcos" icon="calendar-heart">
           {nextMilestone?<div className="flex flex-wrap justify-between gap-2 text-sm"><span>{nextMilestone.label} · {nextMilestone.project}</span><strong>{scheduleDate(nextMilestone.date)}</strong></div>:<p className="text-sm text-[#697386]">Nenhum marco futuro cadastrado.</p>}
         </Block>
         <Block title="Planejamento Estratégico" icon="report" action={<button className="cursor-pointer text-sm font-semibold text-[#6D35F5]" onClick={()=>setTab("planning")}>Ver todos →</button>}>{renderProjects()}</Block>
       </div>:
       tab==="planning"?<Block title="Seus planejamentos" icon="report">{renderProjects()}</Block>:
       tab==="execution"?<ProjectTimeline projects={projects}/>:
       tab==="content"?<Block title="Calendário e aprovações de conteúdo" icon="brand-instagram"><p className="text-sm text-[#525B70]">O calendário editorial terá visualizações mensal, semanal e em lista. Cada publicação poderá ter link para o arquivo no Drive, legenda, data, versão, status e registro de aprovação ou solicitação de ajuste.</p><div className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Nenhum conteúdo cadastrado ainda. Não há aprovações pendentes registradas.</div></Block>:
       <Block title={selected.name} icon={selected.icon}>
         <p className="text-sm leading-6 text-[#525B70]">{tab==="meetings"?"Histórico de reuniões, atas, gravações e encaminhamentos compartilhados com você.":tab==="onboarding"?"Etapas de entrada, materiais solicitados e informações necessárias ao início do trabalho.":tab==="contract"?"Contrato, escopo contratado, vigência e documentos vinculados ao seu projeto.":tab==="drive"?"Acesso às pastas autorizadas do Google Drive: identidade visual, fotos, vídeos, documentos e entregas.":tab==="finance"?"Informações financeiras do seu contrato, incluindo vencimentos, pagamentos e documentos disponíveis.":"Links de acesso às plataformas e planilhas autorizadas. As senhas não serão copiadas para a Rotevo."}</p>
         <div className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Esta área está preparada para receber links e informações liberados pela equipe Rotevo. Ainda não existem registros vinculados a esta seção.</div>
       </Block>}
     </div>
   </div>
   <footer className="bg-[#A7E000]"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-7 text-xs font-medium text-[#090D1C] sm:px-8"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
 </main>;
}
