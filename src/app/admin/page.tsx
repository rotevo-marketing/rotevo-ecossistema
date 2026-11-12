"use client";
import {confirmDiscardChanges} from "@/hooks/useUnsavedChanges";
import "./rotevo-ui2.css";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { RotevoTablerIcon, type RotevoIconName } from "@/Components/RotevoTablerIcon";
import AdminOperationsOverview from "@/Components/admin/AdminOperationsOverview";
import AdminUserMenu from "@/Components/admin/AdminUserMenu";
import WorkflowNotificationBell from "@/Components/shared/WorkflowNotificationBell";
import CentralTarefas from "@/Components/admin/CentralTarefas";
import CampaignsHub,{type CampaignRecord} from "@/Components/admin/CampaignsHub";
import {AdminOnboardingHub,AdminMeetingsHub} from "@/Components/admin/OperationalHubs";
import type {OnboardingItem} from "@/Components/admin/ProjectOnboarding";
import type {AgendaItem} from "@/Components/admin/OperationalAgenda";
import ClientsDirectory from "@/Components/admin/ClientsDirectory";
import TeamDirectory from "@/Components/admin/TeamDirectory";
import FinanceHub from "@/Components/finance/FinanceHub";
import EditorialManager from "@/Components/admin/EditorialManager";
import type {EditorialItem} from "@/Components/cliente/EditorialCalendar";
import type { ExecutionItem } from "@/Components/cliente/ProjectTimeline";
import { supabase } from "@/lib/supabase";
import {useSessionBoundary} from "@/hooks/useSessionBoundary";

const NAV_ITEMS:{id:string;label:string;icon:RotevoIconName}[]=[
 {id:"overview",label:"Visão geral",icon:"layout-dashboard"},
 {id:"clients",label:"Clientes",icon:"users"},
 {id:"projects",label:"Projetos",icon:"report"},
 {id:"onboarding",label:"Onboarding",icon:"lifebuoy"},
 {id:"tasks",label:"Tarefas",icon:"list-check"},
 {id:"meetings",label:"Reuniões",icon:"calendar"},
 {id:"content",label:"Conteúdo",icon:"brand-instagram"},
 {id:"campaigns",label:"Campanhas",icon:"rocket"},
 {id:"team",label:"Equipe",icon:"users-group"},
 {id:"finance",label:"Financeiro",icon:"currency-dollar"},
];

type ClientRecord = {
  id: string;
  name: string;
  slug: string;
};

type ProjectData = {
  [key: string]: unknown;
  coverImageUrl?: string | null;
  executionTimeline?: ExecutionItem[];
  onboardingChecklist?: OnboardingItem[];
  operationalAgenda?: AgendaItem[];
  editorialCalendar?: EditorialItem[];
  marketingCampaigns?: CampaignRecord[];
  selectedModules?: string[];
  modules?: {
    title: string;
    slug: string;
    category: string;
    description: string;
  }[];
};

type PlanningProject = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "in_progress" | "published" | "archived";
  created_at: string;
  updated_at: string;
  data: ProjectData | null;
  clients: ClientRecord | ClientRecord[] | null;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

function getStatusLabel(status: PlanningProject["status"]) {
  if (status === "draft") return "Em produção";
  if (status === "in_progress") return "Em andamento";
  if (status === "published") return "Publicado";
  return "Arquivado";
}

function getStatusClass(status: PlanningProject["status"]) {
  if (status === "published") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "draft") {
    return "bg-slate-100 text-slate-600";
  }

  if (status === "in_progress") {
    return "bg-slate-100 text-slate-600";
  }

  if (status === "archived") {
    return "bg-slate-200 text-slate-500";
  }

  return "bg-slate-100 text-slate-600";
}

function getProjectClient(project: PlanningProject) {
  if (Array.isArray(project.clients)) {
    return project.clients[0] ?? null;
  }

  return project.clients ?? null;
}

export default function AdminPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<PlanningProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState("");
  const [isPublishingId, setIsPublishingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId,setUserId]=useState<string|null>(null);
  const sessionBlocked=useSessionBoundary(userId,"strategist","/estrategista/login");
  const [overviewForbidden,setOverviewForbidden]=useState(false);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  useEffect(()=>{
    if(!openMenuId)return;
    const handleKey=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      event.preventDefault();
      const target=document.getElementById("project-actions-trigger-"+openMenuId);
      setOpenMenuId(null);
      target?.focus();
    };
    const handlePointer=(event:PointerEvent)=>{
      if(event.target instanceof Element&&!event.target.closest("[data-project-actions]"))setOpenMenuId(null);
    };
    document.addEventListener("keydown",handleKey);
    document.addEventListener("pointerdown",handlePointer);
    return()=>{document.removeEventListener("keydown",handleKey);document.removeEventListener("pointerdown",handlePointer);};
  },[openMenuId]);
  const [workspaceTab,setWorkspaceTab]=useState("overview");
  const [notificationTarget,setNotificationTarget]=useState<{projectId:string;contentId:string;nonce:number}|null>(null);
  // Keep the active module, deep links, reloads and browser Back/Forward in sync.
  useEffect(()=>{
    const readSection=()=>{
      const section=new URLSearchParams(window.location.search).get("section");
      setWorkspaceTab(NAV_ITEMS.some(item=>item.id===section)?section!:"overview");
    };
    readSection();
    window.addEventListener("popstate",readSection);
    return()=>window.removeEventListener("popstate",readSection);
  },[]);
  function navigateWorkspace(section:string){
    if(!NAV_ITEMS.some(item=>item.id===section))return;
    if(section===workspaceTab)return;
    const url=new URL(window.location.href);
    url.searchParams.set("section",section);
    window.history.pushState(null,"",url.pathname+url.search+url.hash);
    setWorkspaceTab(section);
  }
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [mobileMenu,setMobileMenu]=useState(false);
  useEffect(()=>{
    if(!mobileMenu)return;
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setMobileMenu(false);
    };
    window.addEventListener("keydown",closeOnEscape);
    return()=>window.removeEventListener("keydown",closeOnEscape);
  },[mobileMenu]);

  const totalProjects = projects.length;

  const inProgressProjects = useMemo(() => {
    return projects.filter((project) => project.status === "draft" || project.status === "in_progress").length;
  }, [projects]);

  const publishedProjects = useMemo(() => {
    return projects.filter((project) => project.status === "published").length;
  }, [projects]);

  const visibleProjects = useMemo(() => projects.filter((project) => {
    if (statusFilter === "draft" && project.status !== "draft" && project.status !== "in_progress") return false;
    if (statusFilter === "published" && project.status !== "published") return false;
    const text = ((getProjectClient(project)?.name ?? "") + " " + project.title).toLocaleLowerCase("pt-BR");
    return text.includes(searchTerm.trim().toLocaleLowerCase("pt-BR"));
  }), [projects, statusFilter, searchTerm]);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setIsLoading(true);
    setOverviewForbidden(false);
    setErrorMessage("");
    setSuccessMessage("");

    const loadingStartedAt = performance.now();
    const authStartedAt = performance.now();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const authDurationMs = Math.round(performance.now() - authStartedAt);

    if (userError || !userData.user) {
      window.localStorage.removeItem("metodo-epc-strategist-auth");
      router.replace("/estrategista/login");
      return;
    }

    const profileStartedAt = performance.now();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,full_name")
      .eq("id", userData.user.id)
      .single();

    if (profileError || profile?.role !== "strategist") {
      // Do not sign out a new session opened in another tab.
      window.localStorage.removeItem("metodo-epc-strategist-auth");
      router.push("/estrategista/login");
      return;
    }

    const profileDurationMs = Math.round(performance.now() - profileStartedAt);
    setUserId(userData.user.id);
    setUserEmail(userData.user.email ?? "");
    setUserName(profile.full_name ?? "");
    // Profile photo is optional; never block dashboard loading when absent.
    const {data:memberAvatar}=await supabase.from("team_members").select("avatar_url").eq("user_id",userData.user.id).maybeSingle();
    const avatar=memberAvatar?.avatar_url;
    setUserAvatar(typeof avatar==="string"&&/^https:\/\//.test(avatar)?avatar:null);
    const projectsStartedAt = performance.now();

    let data:PlanningProject[]|null=null;
    let error:Error|null=null;
    try {
      const {data:session,error:sessionError}=await supabase.auth.getSession();
      const token=session.session?.access_token;
      if(sessionError||!token)throw new Error("Sessão expirada.");
      const response=await fetch("/api/admin/projects",{
        headers:{Authorization:`Bearer ${token}`},cache:"no-store"
      });
      if(response.status===403)setOverviewForbidden(true);
      if(!response.ok)throw new Error("Consulta administrativa não autorizada.");
      const result=await response.json();
      if(!Array.isArray(result?.projects))throw new Error("Resposta administrativa inválida.");
      data=result.projects as PlanningProject[];
    }catch(cause){
      error=cause instanceof Error?cause:new Error("Não foi possível carregar os planejamentos.");
    }

    const projectsDurationMs = Math.round(performance.now() - projectsStartedAt);
    console.info("[Rotevo] Tempos de carregamento do painel (ms)", {
      autenticacao: authDurationMs,
      perfil: profileDurationMs,
      planejamentos: projectsDurationMs,
      total: Math.round(performance.now() - loadingStartedAt),
      quantidadeProjetos: data?.length ?? 0,
    });

    if (error) {
      setErrorMessage("Não foi possível carregar os planejamentos.");
      setIsLoading(false);
      return;
    }

    setProjects((data ?? []) as unknown as PlanningProject[]);
    setIsLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.localStorage.removeItem("metodo-epc-strategist-auth");
    window.localStorage.removeItem("metodo-epc-strategist-remember");
    router.push("/estrategista/login");
  }

  async function handleDeleteProject(project: PlanningProject) {
    const client = getProjectClient(project);
    const clientName = client?.name ?? "este cliente";

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o planejamento de ${clientName}? Essa ação não pode ser desfeita.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingId(project.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {data:session,error:sessionError}=await supabase.auth.getSession();
      const token=session.session?.access_token;
      if(sessionError||!token)throw new Error("Sessão expirada.");
      const response=await fetch("/api/admin/project/delete",{
        method:"DELETE",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({projectId:project.id,expectedUpdatedAt:project.updated_at,confirmed:true}),
        cache:"no-store"
      });
      if(response.status===409)throw new Error("Este planejamento foi alterado ou excluído em outra sessão. Recarregue a página.");
      if(!response.ok)throw new Error("Não foi possível excluir o planejamento autorizado.");
      const result=await response.json();
      if(result?.deletedId!==project.id)throw new Error("Não foi possível confirmar a exclusão.");
    }catch(error){
      setErrorMessage(error instanceof Error?error.message:"Não foi possível excluir o planejamento.");
      setIsDeletingId("");
      return;
    }

    setProjects((currentProjects) =>
      currentProjects.filter((currentProject) => currentProject.id !== project.id)
    );

    setSuccessMessage("Planejamento excluído com sucesso.");
    setIsDeletingId("");
  }

  async function handlePublishProject(
    project: PlanningProject,
    newStatus: "draft" | "published"
  ) {
    const action=newStatus==="published"?"Publicar a apresentação deste projeto para os clientes autorizados? Esta ação não publica automaticamente documentos estratégicos individuais.":"Retornar este projeto a rascunho e retirar a apresentação do acesso do cliente?";
    if(!window.confirm(action))return;
    setIsPublishingId(project.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {data:session,error:sessionError}=await supabase.auth.getSession();
      const token=session.session?.access_token;
      if(sessionError||!token)throw new Error("Sessão expirada.");
      const response=await fetch("/api/admin/project/status",{
        method:"PATCH",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({projectId:project.id,expectedUpdatedAt:project.updated_at,status:newStatus}),cache:"no-store"
      });
      if(response.status===409)throw new Error("O planejamento foi modificado em outra sessão. Recarregue antes de alterar o status.");
      if(!response.ok)throw new Error("Não foi possível atualizar o status autorizado.");
      const result=await response.json();
      if(!result?.project||typeof result.project.updated_at!=="string")throw new Error("Resposta inválida ao atualizar o status.");
      setProjects(current=>current.map(p=>p.id===project.id?{...p,status:newStatus,updated_at:result.project.updated_at}:p));
    }catch(error){
      setErrorMessage(error instanceof Error?error.message:"Não foi possível atualizar o status.");
      setIsPublishingId("");
      return;
    }

    setSuccessMessage(
      newStatus === "published"
        ? "Apresentação publicada com sucesso."
        : "Planejamento voltou para rascunho."
    );
    setIsPublishingId("");
  }


  if(sessionBlocked)return <main role="status" className="flex min-h-screen items-center justify-center bg-white p-6 text-sm">Sessão alterada. Redirecionando...</main>;
  return (
    <main className="admin-v2 rv-ui2 rv-ui3 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
      <style jsx global>{`
        .admin-v2,
        .admin-v2 h1,
        .admin-v2 h2,
        .admin-v2 h3 {
          font-family: var(--font-body), Arial, Helvetica, sans-serif !important;
        }
      `}</style>
      <header className="rv-ui2-topbar sticky top-0 z-40 border-b border-[#E5E8EF] bg-white text-[#303648]">
        <div className="flex w-full items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3"><Link href="/admin" aria-label="Rotevo - Painel do Estrategista"><RotevoLogo variant="black" size={27}/></Link><span className="hidden border-l border-[#E5E8EF] pl-3 text-xs font-medium text-[#697386] sm:inline">Painel do Estrategista</span></div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Abrir menu do estrategista" aria-expanded={mobileMenu} onClick={()=>setMobileMenu(!mobileMenu)} className="cursor-pointer rounded-lg border border-[#DCE1EB] px-3 py-2 text-xs lg:hidden"><RotevoTablerIcon name="menu-2" size={19} stroke={1.7}/><span className="sr-only">Menu</span></button>
            {process.env.NEXT_PUBLIC_ROTEVO_WORKFLOW_APPROVALS_ENABLED==="true"&&userId&&!sessionBlocked&&<WorkflowNotificationBell userId={userId} onOpenContent={(projectId,contentId)=>{if(!projects.some(p=>p.id===projectId&&p.data?.editorialCalendar?.some(item=>item.id===contentId&&!item.archivedAt&&!item.deletedAt)))return;if(!confirmDiscardChanges())return;setNotificationTarget({projectId,contentId,nonce:Date.now()});navigateWorkspace("content");}}/>}
            <AdminUserMenu email={userEmail} name={userName} avatarUrl={userAvatar} onLogout={handleLogout}/>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
      <aside className={`rv-ui2-sidebar relative hidden shrink-0 border-r border-[#E3E7F0] bg-white px-2.5 py-5 lg:block ${sidebarCollapsed?"w-[68px]":"w-[232px]"}`}>
        <nav aria-label="Menu do estrategista" className="space-y-0.5">
          {NAV_ITEMS.map(item=><button key={item.id} type="button" onClick={()=>{if(item.id!==workspaceTab&&!confirmDiscardChanges())return;navigateWorkspace(item.id)}} title={item.label} aria-current={workspaceTab===item.id?"page":undefined} className={`rv-ui2-nav-item flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${sidebarCollapsed?"justify-center":""} ${workspaceTab===item.id?"bg-[#EDEAFF] text-[#6251CA]":"text-[#4A5266] hover:bg-[#F6F7FB]"}`}><RotevoTablerIcon name={item.icon} size={19} stroke={1.7}/>{!sidebarCollapsed&&<span>{item.label}</span>}</button>)}
        </nav>
        <button type="button" onClick={()=>setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed?"Expandir menu":"Recolher menu"} className="absolute -right-3 top-[45%] flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[#DDE1E9] bg-white text-[#6251CA] shadow-sm"><RotevoTablerIcon name={sidebarCollapsed?"chevron-right":"chevron-left"} size={17} stroke={1.7}/></button>
      </aside>
      {mobileMenu&&<aside className="rv-ui3-mobile-nav w-full border-b border-[#E3E7F0] bg-white p-4 lg:hidden"><div className="space-y-2">{NAV_ITEMS.map(item=><button key={item.id} type="button" onClick={()=>{if(item.id!==workspaceTab&&!confirmDiscardChanges())return;navigateWorkspace(item.id);setMobileMenu(false)}} aria-current={workspaceTab===item.id?"page":undefined} className={`block w-full cursor-pointer rounded-lg p-3 text-left text-sm ${workspaceTab===item.id?"bg-[#EDEAFF] text-[#6251CA]":"text-[#4A5266] hover:bg-[#F6F7FB]"}`}>{item.label}</button>)}</div></aside>}
      <div className={`min-w-0 flex-1 ${mobileMenu?"hidden lg:block":""}`}>
      <section className="rv-ui2-workspace mx-auto w-full max-w-[1580px] px-4 pb-14 pt-7 sm:px-6 lg:px-8">
        <header className="rv-page-heading rv-ui2-workspace-heading">
          <div className="rv-ui2-heading-copy">
            <h1>{workspaceTab==="overview"?"Visão geral":NAV_ITEMS.find(item=>item.id===workspaceTab)?.label??"Visão geral"}</h1>
          </div>
          <div className="rv-ui2-heading-actions">
            {(workspaceTab==="overview"||workspaceTab==="projects")&&<Link href="/admin/novo-planejamento" className="rv-ui2-heading-primary inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#5949D1]"><RotevoTablerIcon name="square-rounded-plus" size={17} stroke={1.7}/>Novo planejamento</Link>}
            {workspaceTab==="overview"&&<button type="button" onClick={()=>navigateWorkspace("tasks")} className="rv-ui2-heading-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#D8D2FF] bg-white px-4 py-2.5 text-xs font-semibold text-[#5949D1] hover:bg-[#F7F6FF]"><RotevoTablerIcon name="list-check" size={17} stroke={1.7}/>Minhas tarefas</button>}
          </div>
        </header>
        {errorMessage && !isLoading && <div role="alert" className="mt-7 rounded-xl border border-red-200 bg-red-50 p-5"><p className="text-sm font-semibold text-red-800">{errorMessage}</p><p className="mt-2 text-xs text-red-700">Os totais e os vínculos de projetos não podem ser apresentados enquanto a consulta estiver indisponível.</p><button type="button" onClick={()=>void loadAdminData()} className="mt-3 rounded-lg bg-[#0B142A] px-4 py-2 text-sm font-semibold text-white">Tentar novamente</button></div>}
        {workspaceTab==="overview" && <div className="mt-8"><AdminOperationsOverview projects={projects} userId={userId} userName={userName} state={isLoading?"loading":overviewForbidden?"forbidden":errorMessage?"error":"ready"} onOpenProjects={()=>navigateWorkspace("projects")} onOpenTasks={()=>navigateWorkspace("tasks")} onOpenMeetings={()=>navigateWorkspace("meetings")} onOpenContent={()=>navigateWorkspace("content")} onOpenFinance={()=>navigateWorkspace("finance")}/></div>}
        {workspaceTab==="projects" && !errorMessage && <>
        <section aria-labelledby="projects-heading" className="rv-ui2-section rv-ui3-projects-surface mt-3 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="projects-heading" className="sr-only">Planejamentos cadastrados</h2>
              <p className="text-xs text-[#687487]">{isLoading?"Carregando...":totalProjects} planejamentos · {inProgressProjects} em produção · {publishedProjects} publicados</p>
            </div>
            {!isLoading && <span className="shrink-0 text-xs text-[#697386]">{visibleProjects.length} de {projects.length}</span>}
          </div>
          <div className="rv-ui3-projects-filters mt-3 flex flex-col gap-3 border-b border-[#E3E6ED] pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar planejamentos">
              {([{value:"all",label:"Todos"},{value:"draft",label:"Em produção"},{value:"published",label:"Publicados"}] as const).map(f=><button key={f.value} type="button" aria-pressed={statusFilter===f.value} onClick={()=>{setStatusFilter(f.value);setOpenMenuId(null)}} className={"min-h-9 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium "+(statusFilter===f.value?"bg-[#EDEAFF] text-[#5949D1]":"text-[#687487] hover:bg-[#F6F7FB]")}>{f.label}</button>)}
            </div>
            <label className="flex w-full items-center gap-2 lg:max-w-[330px]"><span className="sr-only">Buscar cliente ou planejamento</span><input id="admin-search" type="search" placeholder="Buscar cliente ou planejamento..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="min-h-10 w-full rounded-lg border border-[#E3E6ED] bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#6C5CE7]"/></label>
          </div>
          {errorMessage && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}
          {successMessage && <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{successMessage}</div>}
          {isLoading && <p role="status" className="mt-6 text-sm text-[#697386]">Carregando planejamentos...</p>}
          {!isLoading && projects.length===0 && <div className="mt-6 rounded-xl border border-dashed border-[#E3E7F0] p-8 text-center"><h3 className="text-lg font-semibold">Nenhum planejamento encontrado</h3><p className="mt-2 text-sm text-[#697386]">Crie seu primeiro planejamento para começar.</p><Link className="mt-4 inline-block rounded-xl bg-[#0B142A] px-5 py-3 text-sm font-semibold text-white" href="/admin/novo-planejamento">Novo planejamento</Link></div>}
          {!isLoading && projects.length>0 && visibleProjects.length===0 && <div className="mt-6 rounded-xl border border-dashed border-[#E3E7F0] p-8 text-center"><h3 className="font-semibold">Nenhum resultado encontrado</h3><p className="mt-2 text-sm text-[#697386]">Tente outro nome ou filtro.</p><button type="button" onClick={()=>{setSearchTerm("");setStatusFilter("all");}} className="mt-3 cursor-pointer text-sm font-semibold text-[#5123C5] underline">Limpar filtros</button></div>}
          {!isLoading && visibleProjects.length>0 && (
            <div className="rv-ui2-project-list rv-ui3-project-list mt-2 divide-y divide-[#E3E6ED]">
              {visibleProjects.map((project) => {
                const client=getProjectClient(project);
                const clientName=client?.name ?? "Cliente sem nome";
                const clientSlug=client?.slug ?? "demo";
                const imageUrl=project.data?.coverImageUrl ?? "";
                const deleting=isDeletingId===project.id;
                const publishing=isPublishingId===project.id;
                const demo=clientSlug==="demo";
                const menuOpen=openMenuId===project.id;
                return (
                  <article key={project.id} className="rv-ui2-project-row rv-ui3-project-row relative bg-white px-2 py-3 transition-colors hover:bg-[#FAFBFE] sm:px-3">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F3F1FC] text-xs font-semibold text-[#6251CA]">
                          {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <span aria-hidden="true">{clientName.split(" ").slice(0,2).map(w=>w.charAt(0).toUpperCase()).join("")}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-[13px] leading-5 font-semibold">{clientName}</h3>
                            <span className={"rounded-full px-2.5 py-1 text-xs font-medium " + getStatusClass(project.status)}>{getStatusLabel(project.status)}</span>
                          </div>
                          <p className="mt-1 break-words text-sm text-[#525B70]">{project.title}</p>
                          {project.description && <p className="mt-1 line-clamp-2 text-xs text-[#697386]">{project.description}</p>}
                          <p className="mt-1 text-[11px] text-[#687487]">Atualizado em {formatDate(project.updated_at)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                        <Link href={"/admin/planejamentos/"+clientSlug+"?projectId="+encodeURIComponent(project.id)} className="inline-flex min-h-9 items-center rounded-lg border border-[#E3E6ED] px-3 py-2 text-xs font-medium text-[#323647] hover:bg-[#F6F7FB]">Editar planejamento</Link>
                        <div className="relative" data-project-actions>
                          <button type="button" id={"project-actions-trigger-"+project.id} aria-controls={"project-actions-menu-"+project.id} aria-expanded={menuOpen} aria-label={"Mais ações para "+clientName} onClick={()=>setOpenMenuId(menuOpen?null:project.id)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#E3E6ED] text-xl hover:bg-[#F6F7FB]"><span aria-hidden="true">⋯</span></button>
                          {menuOpen && (
                            <div id={"project-actions-menu-"+project.id} className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-[#E3E7F0] bg-white p-1.5 shadow-xl">
                              <Link href={"/apresentacao/"+project.slug+"?from=projects"} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-[#F6F7FB]">Ver apresentação</Link>
                              <Link href={"/admin/planejamentos/"+clientSlug+"/acesso"} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-[#F6F7FB]">Configurar acesso</Link>
                              {project.status==="draft" && <button type="button" disabled={publishing||deleting} onClick={()=>{setOpenMenuId(null);handlePublishProject(project,"published");}} className="block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#F6F7FB] disabled:opacity-40">{publishing?"Publicando...":"Publicar"}</button>}
                              {project.status==="published" && <button type="button" disabled={publishing||deleting} onClick={()=>{setOpenMenuId(null);handlePublishProject(project,"draft");}} className="block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#F6F7FB] disabled:opacity-40">{publishing?"Atualizando...":"Voltar para rascunho"}</button>}
                              <div className="my-1 border-t border-[#E3E7F0]" />
                              <button type="button" disabled={deleting||demo} onClick={()=>{setOpenMenuId(null);handleDeleteProject(project);}} className="block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-40">{deleting?"Excluindo...":demo?"Modelo protegido":"Excluir"}</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        </>}
        {workspaceTab==="content" && !isLoading && <EditorialManager projects={projects} notificationTarget={notificationTarget} onChanged={(id,data,updatedAt)=>setProjects(prev=>prev.map(p=>p.id===id?{...p,data,updated_at:updatedAt}:p))}/>}
        {workspaceTab==="clients" && !isLoading && <ClientsDirectory projects={projects}/>}
        {workspaceTab==="team" && !isLoading && <TeamDirectory/>}
        {workspaceTab==="tasks" && !isLoading && <CentralTarefas projects={projects} onOpenContent={()=>navigateWorkspace("content")} onChanged={(id,data,updatedAt)=>setProjects(prev=>prev.map(p=>p.id===id?{...p,data,updated_at:updatedAt}:p))}/>}
        {workspaceTab==="onboarding" && !isLoading && <AdminOnboardingHub projects={projects.map(p=>({...p,data:p.data??{}}))} onChanged={(id,data,updatedAt)=>setProjects(prev=>prev.map(p=>p.id===id?{...p,data,updated_at:updatedAt}:p))}/>}
        {workspaceTab==="meetings" && !isLoading && <AdminMeetingsHub projects={projects.map(p=>({...p,data:p.data??{}}))} onChanged={(id,data,updatedAt)=>setProjects(prev=>prev.map(p=>p.id===id?{...p,data,updated_at:updatedAt}:p))}/>}

        {workspaceTab==="campaigns" && !isLoading && <CampaignsHub projects={projects.map(p=>({...p,data:p.data??{}}))} onChanged={(id,data,updatedAt)=>setProjects(prev=>prev.map(p=>p.id===id?{...p,data,updated_at:updatedAt}:p))}/>}
        {workspaceTab==="finance" && !isLoading && userEmail && <FinanceHub/>}
        {workspaceTab!=="finance" && workspaceTab!=="campaigns" && workspaceTab!=="projects" && workspaceTab!=="overview" && workspaceTab!=="tasks" && workspaceTab!=="content" && workspaceTab!=="clients" && workspaceTab!=="team" && workspaceTab!=="onboarding" && workspaceTab!=="meetings" && <section className="mt-8 rounded-2xl border border-[#E3E7F0] bg-white p-6"><h2 className="text-lg font-semibold">{workspaceTab==="tasks"?"Central de tarefas":workspaceTab==="clients"?"Gestão de clientes":"Área em preparação"}</h2><p className="mt-3 text-sm leading-6 text-[#525B70]">{workspaceTab==="tasks"?"O cadastro de entregas já está disponível dentro de cada projeto. A consulta centralizada por cliente e responsável será conectada nesta área.":workspaceTab==="clients"?"Os clientes vinculados aos projetos podem ser acessados na seção Projetos. A ficha administrativa individual será integrada nesta área.":"Esta seção será integrada aos registros e permissões existentes. Não há dados fictícios ou funcionalidades simuladas."}</p><button type="button" onClick={()=>navigateWorkspace("projects")} className="mt-4 cursor-pointer text-sm font-semibold text-[#6D35F5]">Ver projetos →</button></section>}

      </section>
      </div>
      </div>
      <footer className="rv-ui2-footer mt-auto shrink-0 border-t border-[#E6E9F0] bg-white"><div className="mx-auto flex max-w-[1580px] flex-col gap-2 px-5 py-4 text-xs font-normal text-[#7A8392] sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia & Consultoria</span></div></footer>
    </main>
  );
}
