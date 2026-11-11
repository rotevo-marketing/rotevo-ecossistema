"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountProfileButton,{useAccountProfile} from "@/Components/operations/AccountProfileButton";
import {portalTarget} from "@/lib/ui/navigation";
import { supabase } from "@/lib/supabase";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { RotevoTablerIcon, type RotevoIconName } from "@/Components/RotevoTablerIcon";
import ProjectTimeline, { type ExecutionItem } from "@/Components/cliente/ProjectTimeline";
import type {EditorialItem} from "@/Components/cliente/EditorialCalendar";
import ClientContent from "@/Components/cliente/ClientContent";
import ClientCampaigns from "@/Components/cliente/ClientCampaigns";
import ClientMeetings from "@/Components/cliente/ClientMeetings";
import ClientContracts from "@/Components/cliente/ClientContracts";
import {type ClientWorkspace} from "@/lib/operations/model";
import ClientDrive from "@/Components/cliente/ClientDrive";
import ClientFinance from "@/Components/finance/ClientFinance";
import ClientOverview from "@/Components/cliente/ClientOverview";
import ClientPlanning from "@/Components/cliente/ClientPlanning";
import type {OnboardingItem} from "@/Components/admin/ProjectOnboarding";

type Project = {
  id:string; title:string; slug:string; description:string|null; status:string; updated_at:string; clientAvatarUrl?:string|null;
  data:{marketingCampaigns?:import("@/Components/admin/CampaignsHub").CampaignRecord[];operationalAgenda?:import("@/Components/admin/OperationalAgenda").AgendaItem[];planningStages?:{id:string;title:string;dueDate:string;status:"pending"|"in_progress"|"completed";visibleToClient:boolean}[];coverImageUrl?:string|null; deliverySchedule?:Record<string,string>|null; executionTimeline?:ExecutionItem[]; editorialCalendar?:EditorialItem[]; onboardingChecklist?:OnboardingItem[]; ecosystem2027?:{selectedDocumentCodes?:string[];presentedDocumentCodes?:string[]}}|null;
};
type MenuId="overview"|"planning"|"execution"|"content"|"campaigns"|"meetings"|"onboarding"|"contract"|"drive"|"finance"|"access";
type MenuItem={id:MenuId;name:string;icon:RotevoIconName};
const menu:MenuItem[]=[
  {id:"overview",name:"Visão geral",icon:"layout-dashboard"},
  {id:"planning",name:"Planejamento",icon:"report"},
  {id:"execution",name:"Tarefas",icon:"list-check"},
  {id:"content",name:"Conteúdo",icon:"brand-instagram"},
  {id:"campaigns",name:"Campanhas",icon:"rocket"},
  {id:"meetings",name:"Reuniões",icon:"calendar-heart"},
  {id:"contract",name:"Contrato",icon:"report"},
  {id:"drive",name:"Drive",icon:"folder-open"},
  {id:"finance",name:"Financeiro",icon:"currency-dollar"},

];
function Icon({name,size=24}:{name:RotevoIconName;size?:number}){return <RotevoTablerIcon name={name} size={size} stroke={2.3}/>;}
function Block({title,icon,children,action}:{title:string;icon:RotevoIconName;children:React.ReactNode;action?:React.ReactNode}){
 return <section className="rv-ui2-client-section rounded-xl border border-[#E3E6ED] bg-white p-4 sm:p-5">
  <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="text-[#6C5CE7]"><Icon name={icon}/></span><h2 className="text-[15px] font-semibold tracking-tight text-[#323647]">{title}</h2></div>{action}</div>{children}
 </section>;
}
export default function ClientAreaPage(){
 const router=useRouter();
 const account=useAccountProfile();
 const [projects,setProjects]=useState<Project[]>([]);
 const [selectedProjectId,setSelectedProjectId]=useState("");
 const scopedProjects=useMemo(()=>{const project=projects.find(p=>p.id===selectedProjectId)??projects[0];return project?[project]:[];},[projects,selectedProjectId]);
 const [workspace,setWorkspace]=useState<ClientWorkspace|null>(null);
 const [clientName,setClientName]=useState("");
 const [clientAvatar,setClientAvatar]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [tab,setTab]=useState<MenuId>("overview");
 const [focusedContent,setFocusedContent]=useState<string|null>(null);
 const [collapsed,setCollapsed]=useState(false);
 const [mobileMenu,setMobileMenu]=useState(false);
 const [profileOpen,setProfileOpen]=useState(false);
 useEffect(()=>{
  if(!profileOpen&&!mobileMenu)return;
  const closeOnEscape=(event:KeyboardEvent)=>{
   if(event.key!=="Escape")return;
   setProfileOpen(false);
   setMobileMenu(false);
  };
  window.addEventListener("keydown",closeOnEscape);
  return()=>window.removeEventListener("keydown",closeOnEscape);
 },[profileOpen,mobileMenu]);
 useEffect(()=>{let mounted=true;async function load(){
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){router.replace("/");return;}
   const {data:profile}=await supabase.from("profiles").select("role, client_id").eq("id",auth.user.id).single();
   if(!profile){await supabase.auth.signOut();router.replace("/");return;}
   if(profile.role==="strategist"){router.replace("/admin");return;}
   if(profile.role!=="client"||!profile.client_id){await supabase.auth.signOut();router.replace("/");return;}
   const {data:sessionData}=await supabase.auth.getSession();
   const token=sessionData.session?.access_token;
   if(!token){if(mounted){setError("Sessão expirada. Faça login novamente.");setLoading(false);}return;}
   const [clientResult,projectResponse,workspaceResponse]=await Promise.all([
     supabase.from("clients").select("name").eq("id",profile.client_id).single(),
     fetch("/api/client/projects",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"})
       .catch(()=>null),
     fetch("/api/client/workspace",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}).catch(()=>null)
   ]);
   if(!mounted)return;
   setClientName(clientResult.data?.name??"");
   if(workspaceResponse?.ok){const payload=await workspaceResponse.json().catch(()=>null);if(mounted&&payload?.workspace)setWorkspace(payload.workspace);
     if(mounted&&typeof payload?.clientAvatarRef==="string"){
       const ref=payload.clientAvatarRef;
       if(ref.startsWith("asset://")){
         const id=ref.slice(8);
         const resolved=await fetch("/api/assets/resolve",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({ids:[id]})}).then(x=>x.ok?x.json():null).catch(()=>null);
         if(mounted)setClientAvatar(resolved?.links?.[id]??"");
       }else if(ref.startsWith("https://"))setClientAvatar(ref);
     }}
   else setError("Não foi possível carregar os serviços autorizados. Atualize a página para tentar novamente.");
   if(!projectResponse?.ok){setError("Não foi possível carregar as informações do projeto.");}
   else{
     const payload:unknown=await projectResponse.json().catch(()=>null);
     if(!mounted)return;
     if(payload && typeof payload==="object" && "projects" in payload && Array.isArray(payload.projects))
       setProjects(payload.projects as Project[]);
     else setError("Não foi possível carregar as informações do projeto.");
   }
   setLoading(false);
 }load();return()=>{mounted=false};},[router]);
 async function logout(){await supabase.auth.signOut();router.replace("/");}
 function openModule(module:MenuId,projectId?:string,contentId?:string){setSelectedProjectId(current=>portalTarget(projects,current,projectId));setFocusedContent(module==="content"?(contentId??null):null);setTab(module);setMobileMenu(false);}
 const selected=menu.find(item=>item.id===tab)??menu[0];
 const nav=<nav aria-label="Navegação do portal" className="space-y-0.5">
   {menu.filter(item=>item.id==="overview"||workspace?.modules.includes(item.id as never)).map(item=><button type="button" key={item.id} aria-current={tab===item.id?"page":undefined} aria-label={item.name} title={item.name}
       onClick={()=>{setTab(item.id);setMobileMenu(false)}} className={`rv-ui2-nav-item flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${collapsed?"lg:justify-center lg:px-2":""} ${tab===item.id?"bg-[#EDEAFF] text-[#6251CA]":"text-[#4A5266] hover:bg-[#F6F7FB]"}`}>
       <Icon name={item.icon} size={19}/><span className={collapsed?"lg:hidden":""}>{item.name}</span>
     </button>)}
 </nav>;
 return <main className="client-portal-v2 rv-ui2 rv-ui3 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
   <style jsx global>{` .client-portal-v2,.client-portal-v2 h1,.client-portal-v2 h2,.client-portal-v2 h3{font-family:var(--font-body),Arial,Helvetica,sans-serif!important} `}</style>
   <header className="rv-ui2-topbar sticky top-0 z-40 border-b border-[#E5E8EF] bg-white text-[#303648]"><div className="flex w-full items-center justify-between gap-3 px-5 py-3">
      <div className="flex items-center gap-3"><RotevoLogo variant="black" size={27}/><span className="hidden border-l border-[#E5E8EF] pl-3 text-xs font-medium text-[#697386] sm:inline">Portal do Cliente</span></div>
      <div className="flex items-center gap-3"><button type="button" onClick={()=>setMobileMenu(v=>!v)} className="cursor-pointer rounded-lg border border-[#DCE1EB] px-3 py-2 text-xs lg:hidden" aria-expanded={mobileMenu}><RotevoTablerIcon name="menu-2" size={19} stroke={1.7}/><span className="sr-only">Menu</span></button>
       <div className="relative"><button type="button" aria-label="Abrir menu da conta" aria-expanded={profileOpen} aria-controls="client-account-menu" onClick={()=>setProfileOpen(v=>!v)} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E3E6ED] px-2 py-1.5 hover:bg-[#F6F7FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C5CE7]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6D35F5] text-sm font-bold text-white">{account.avatar||clientAvatar?<img src={account.avatar||clientAvatar} alt="" className="h-full w-full rounded-full object-cover"/>:(account.profile?.displayName||clientName).trim().charAt(0).toLocaleUpperCase("pt-BR")||"C"}</span><span className="hidden max-w-[180px] truncate text-sm font-semibold sm:block">{account.profile?.displayName||clientName||"Minha conta"}</span><RotevoTablerIcon name="chevron-down" size={14} stroke={1.7}/></button>
       {profileOpen&&<><button type="button" aria-label="Fechar menu da conta" className="fixed inset-0 z-40 cursor-default" onClick={()=>setProfileOpen(false)}/><div id="client-account-menu" className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-[#E3E7F0] bg-white p-2 text-[#090D1C] shadow-xl"><p className="truncate border-b border-[#E3E7F0] px-3 py-2 text-xs font-medium text-[#525B70]">{clientName||"Minha conta"}</p><AccountProfileButton/><Link href="/esqueci-senha" onClick={()=>setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:bg-[#F6F7FB]"><Icon name="key" size={18}/>Alterar senha</Link><button type="button" onClick={()=>{setProfileOpen(false);void logout()}} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium hover:bg-[#F6F7FB]"><Icon name="logout" size={18}/>Sair</button></div></>}</div></div>
   </div></header>
   <div className="flex w-full flex-1 items-stretch">
     <aside className={`rv-ui2-sidebar relative hidden shrink-0 border-r border-[#E3E7F0] bg-white px-2.5 py-5 transition-[width] lg:block ${collapsed?"w-[68px]":"w-[232px]"}`}>{nav}
       <button type="button" aria-label={collapsed?"Expandir menu lateral":"Recolher menu lateral"} title={collapsed?"Expandir menu lateral":"Recolher menu lateral"} onClick={()=>setCollapsed(v=>!v)}
         className="absolute right-[-13px] top-[48%] z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[#DDE1E9] bg-white font-bold text-[#6251CA] shadow-sm"><RotevoTablerIcon name={collapsed?"chevron-right":"chevron-left"} size={17} stroke={1.7}/></button>
     </aside>
     {mobileMenu&&<aside className="w-full border-b border-[#E3E7F0] bg-white px-4 py-4 lg:hidden">{nav}</aside>}
     <div className={`rv-ui2-client-content min-w-0 flex-1 px-4 pb-14 pt-7 sm:px-6 lg:px-8 ${mobileMenu?"hidden lg:block":""}`}>
       <header className="rv-page-heading rv-ui2-client-heading">
          <div className="rv-ui2-client-heading-copy">
            <h1>{tab==="overview"?"Visão geral":selected.name}</h1>
          </div>
          <span className="rv-ui2-client-identity"><RotevoTablerIcon name="users" size={17} stroke={1.7}/>{clientName||"Área do cliente"}</span>
        </header>
       {projects.length>1&&["planning","execution","content","campaigns","meetings"].includes(tab)&&<label className="mb-5 block text-sm font-semibold">Projeto<select value={scopedProjects[0]?.id??""} onChange={e=>setSelectedProjectId(e.target.value)} className="ml-3 max-w-full rounded-xl border border-[#E3E7F0] bg-white p-3">{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
       {error&&<div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={()=>window.location.reload()} className="ml-3 rounded-lg border border-red-200 px-3 py-2 font-semibold">Tentar novamente</button></div>}
       {loading?<div className="rounded-2xl border border-[#E3E7F0] bg-white p-7 text-sm text-[#697386]">Carregando seu ambiente...</div>:
       !workspace?<p className="rounded-xl bg-white p-6 text-sm">Seus serviços não puderam ser carregados. Atualize a página.</p>:
       tab!=="overview"&&!workspace.modules.includes(tab as never)?<p className="rounded-xl bg-white p-6 text-sm">Este serviço não está disponível para sua conta.</p>:
       tab==="overview"?<ClientOverview projects={projects} workspace={workspace} clientName={clientName} onNavigate={openModule}/>:
       tab==="planning"?<ClientPlanning key={scopedProjects[0]?.id??"no-project"} projects={scopedProjects}/>:
       tab==="execution"?<ProjectTimeline key={scopedProjects[0]?.id??"no-project"} projects={scopedProjects}/>:
       tab==="content"?<ClientContent key={scopedProjects[0]?.id??"no-project"} projects={scopedProjects} focusContentId={focusedContent} onFocusHandled={()=>setFocusedContent(null)}/> :
       tab==="finance"?<ClientFinance/> :
       tab==="campaigns"?<ClientCampaigns key={scopedProjects[0]?.id??"no-project"} projects={scopedProjects}/>:
       tab==="onboarding"?<Block title="Etapas do seu projeto" icon="alert-square-rounded"><div className="space-y-4">{projects.flatMap(p=>(p.data?.onboardingChecklist??[]).filter(i=>i.visibleToClient===true).map(i=>({...i,projectTitle:p.title}))).length===0?<p className="text-sm text-[#697386]">Nenhuma etapa de onboarding foi compartilhada pela equipe até o momento.</p>:projects.map(p=><div key={p.id}><h3 className="mb-2 text-sm font-semibold">{p.title}</h3><div className="divide-y divide-[#E3E7F0]">{(p.data?.onboardingChecklist??[]).filter(i=>i.visibleToClient===true).map(i=><div key={i.id} className="flex items-center justify-between gap-2 py-3"><span className="text-sm">{i.done?"✓":"○"} {i.title}</span>{i.link&&i.link.startsWith("https://")&&<a href={i.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#6D35F5]">Abrir material ↗</a>}</div>)}</div></div>)}</div></Block> :
       tab==="meetings"?<ClientMeetings key={scopedProjects[0]?.id??"no-project"} projects={scopedProjects}/>:
       tab==="contract"?<ClientContracts contracts={workspace?.contracts??[]}/>:
       tab==="drive"?<ClientDrive folders={workspace?.folders??[]}/>:
       <Block title={selected.name} icon={selected.icon}>
         <p className="text-sm leading-6 text-[#525B70]">{"Links de acesso às plataformas e planilhas autorizadas. As senhas não serão copiadas para a Rotevo."}</p>
         <div className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm text-[#697386]">Esta área está preparada para receber links e informações liberados pela equipe Rotevo. Ainda não existem registros vinculados a esta seção.</div>
       </Block>}
     </div>
   </div>
   <footer className="rv-ui2-footer mt-auto shrink-0 border-t border-[#E6E9F0] bg-white"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs font-normal text-[#7A8392] sm:px-8"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
 </main>;
}
