"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import PlanningV5 from "@/Components/strategic-editor/PlanningV5";
import {publicCompanyAnalysis,type CompanyAnalysis} from "@/lib/planning/companyAnalysis";
import { isPlanningV5 } from "@/lib/planning/v5";
import { projectForClient } from "@/lib/security/projectForClient";
import ExecutionTimelineEditor from "@/Components/admin/ExecutionTimelineEditor";

import type {StrategicPlanningData} from "@/Components/strategic-editor/StrategicDocumentEditor";
import { supabase } from "@/lib/supabase";

type ClientRecord = {
  id: string;
  name: string;
  slug: string;
};

type ProjectData = {
  planningStructureVersion?: number;
  companyAnalysis0201?:CompanyAnalysis;
  publishedCompanyAnalysis0201?:CompanyAnalysis;
  coverImageUrl?: string | null;
  planningClientAccessEnabled?: boolean;
  executionTimeline?: import("@/Components/cliente/ProjectTimeline").ExecutionItem[];
  ecosystem2027?: StrategicPlanningData["ecosystem2027"];
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

function getProjectClient(project: PlanningProject) {
  if (Array.isArray(project.clients)) {
    return project.clients[0] ?? null;
  }

  return project.clients ?? null;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

function getStatusLabel(status: PlanningProject["status"]) {
  if (status === "draft") return "Em elaboração";
  if (status === "in_progress") return "Em andamento";
  if (status === "published") return "Publicado";
  return "Arquivado";
}

function PlanejamentoClienteContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("projectId");

  const clientSlug =
    typeof params.clientSlug === "string" ? params.clientSlug : "";

  const [project, setProject] = useState<PlanningProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");


  const [planningTab,setPlanningTab]=useState<"preview"|"editor">("editor");

  const client = project ? getProjectClient(project) : null;

  const coverImageUrl = project?.data?.coverImageUrl || "";
  const previewTimeline = project ? projectForClient({...project, client_id: client?.id ?? ""}, ["execution"]).data : null;

  useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      setIsLoading(true);
      setProject(null);
      setErrorMessage("");
      setSuccessMessage("");

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userError || !userData.user) {
        window.localStorage.removeItem("metodo-epc-strategist-auth");
        router.push("/estrategista/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      if (cancelled) return;

      if (profileError || profile?.role !== "strategist") {
        await supabase.auth.signOut();
        window.localStorage.removeItem("metodo-epc-strategist-auth");
        router.push("/estrategista/login");
        return;
      }


      // Legacy client-only links still open the latest project. Explicit links
      // select the requested project without crossing the client boundary.
      const projectIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (requestedProjectId !== null && !projectIdPattern.test(requestedProjectId)) {
        setErrorMessage("Identificador de planejamento inválido.");
        setIsLoading(false);
        return;
      }
      let query = supabase
        .from("planning_projects")
        .select(
          `
          id,
          title,
          slug,
          description,
          status,
          created_at,
          updated_at,
          clients!inner (
            id,
            name,
            slug
          )
        `
        )
        .eq("clients.slug", clientSlug);
      if (requestedProjectId) query = query.eq("id", requestedProjectId);
      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .limit(1);
      if (cancelled) return;

      if (error) {
        setErrorMessage(
          error.message || "Não foi possível carregar este planejamento."
        );
        setIsLoading(false);
        return;
      }

      const projectMetadata = (data?.[0] ?? null) as unknown as PlanningProject | null;

      if (!projectMetadata) {
        setErrorMessage("Planejamento não encontrado para este cliente.");
        setIsLoading(false);
        return;
      }

      let foundProject:PlanningProject;
      try {
        const {data:session,error:sessionError}=await supabase.auth.getSession();
        if (cancelled) return;
        const token=session.session?.access_token;
        if(sessionError||!token)throw new Error("Sessão expirada.");
        const response=await fetch(`/api/admin/project?id=${encodeURIComponent(projectMetadata.id)}`,{
          headers:{Authorization:`Bearer ${token}`},cache:"no-store"
        });
        if (cancelled) return;
        if(!response.ok)throw new Error("Não foi possível carregar os documentos do planejamento autorizado.");
        const loaded=await response.json();
        if (cancelled) return;
        if(!loaded?.project||loaded.project.id!==projectMetadata.id)throw new Error("Resposta administrativa inválida.");
        foundProject={...projectMetadata,data:(loaded.project.data??{}) as ProjectData,updated_at:loaded.project.updated_at};
      }catch(error){
        if (cancelled) return;
        setErrorMessage(error instanceof Error?error.message:"Não foi possível carregar este planejamento.");
        setIsLoading(false);
        return;
      }
      setProject(foundProject);

      setIsLoading(false);
    }

    if (clientSlug) {
      void loadProject();
    }
    return () => { cancelled = true; };
  }, [clientSlug, requestedProjectId, router]);

  async function saveAuthorizedProjectData(current: PlanningProject, nextData: ProjectData): Promise<{data: ProjectData; updated_at: string}> {
    const {data:session,error:sessionError}=await supabase.auth.getSession();
    const token=session.session?.access_token;
    if(sessionError||!token) throw new Error("Sessão expirada. Entre novamente para salvar.");
    const response=await fetch("/api/admin/project/update",{
      method:"PATCH",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
      body:JSON.stringify({projectId:current.id,expectedUpdatedAt:current.updated_at,data:nextData}),
      cache:"no-store"
    });
    if(response.status===409) throw new Error("Este planejamento foi modificado em outra sessão. Recarregue a página antes de salvar.");
    if(!response.ok) throw new Error("Não foi possível salvar. Confira suas permissões e tente novamente.");
    const result=await response.json();
    if(!result?.project||typeof result.project.updated_at!=="string") throw new Error("Não foi possível confirmar a gravação.");
    return {data:result.project.data as ProjectData,updated_at:result.project.updated_at};
  }

  async function handlePublish(newStatus: "draft" | "published") {
    if (!project) return;

    setIsPublishing(true);
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
      setProject(p=>p?.id===project.id?{...p,status:newStatus,updated_at:result.project.updated_at}:p);
    }catch(error){
      setErrorMessage(error instanceof Error?error.message:"Não foi possível atualizar o status.");
      setIsPublishing(false);
      return;
    }

    setSuccessMessage(
      newStatus === "published"
        ? "Apresentação publicada com sucesso."
        : "Planejamento voltou para rascunho."
    );
    setIsPublishing(false);
  }

  return (
    <main className="admin-manage-v2 rv-ui2 rv-ui3 workspace-project-page flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
      <style jsx global>{` .admin-manage-v2, .admin-manage-v2 h1, .admin-manage-v2 h2, .admin-manage-v2 h3, .admin-manage-v2 h4 { font-family: var(--font-body), Arial, Helvetica, sans-serif !important; } `}</style>

      <section className="rv-ui3-planning-intro mx-auto w-full max-w-none px-5 pb-2 pt-5 sm:px-8 lg:px-10">
        {isLoading ? (
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10">
            <p className="text-slate-500">Carregando planejamento...</p>
          </div>
        ) : null}

        {errorMessage && !project ? (
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-500">
              Atenção
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em]">
              {errorMessage}
            </h1>

            <Link
              href="/admin"
              className="mt-8 inline-flex rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Voltar ao painel
            </Link>
          </div>
        ) : null}

        {!isLoading && project ? (
          <>
            <section className="pw-project-header rv-ui3-planning-header"><div className="pw-breadcrumb"><Link href="/admin?section=projects">Projetos</Link><span>/</span>{client?.name}<span>/</span>Planejamento</div><div className="pw-project-title rv-ui3-planning-title"><div className="pw-project-photo-wrap"><div className="pw-project-photo">{coverImageUrl?<img src={coverImageUrl} alt={`Foto do projeto ${project.title}`}/>:<span>{(client?.name??project.title).charAt(0).toUpperCase()}</span>}</div></div><div className="pw-project-identity"><p className="pw-project-client">{client?.name}</p><h1>{project.title}</h1><div className="pw-project-meta"><span>Planejamento Rotevo V5</span><span className="pw-meta-divider" aria-hidden="true"/><span className="pw-status pw-project-status"><span className="pw-project-status-dot"/>{getStatusLabel(project.status)}</span></div></div><button className="pw-outline pw-project-client-view" onClick={()=>setPlanningTab("preview")}>Visão do cliente ↗</button></div><div className="workspace-project-controls rv-ui3-planning-controls"><span>Atualizado em {formatDate(project.updated_at)}</span><Link href={`/admin/planejamentos/${clientSlug}/acesso?projectId=${project.id}`}>Configurar acesso</Link><Link href={`/apresentacao/${project.slug}`}>Abrir apresentação ↗</Link>{project.status!=="archived"&&<button className="pw-outline" disabled={isPublishing} onClick={()=>{if(window.confirm(project.status==="published"?"Retirar a apresentação do acesso do cliente?":"Disponibilizar ao cliente a apresentação e as páginas V5 já disponibilizadas?"))void handlePublish(project.status==="published"?"draft":"published");}}>{isPublishing?"Atualizando…":project.status==="published"?"Retirar apresentação":"Disponibilizar apresentação"}</button>}</div>{errorMessage&&<p role="alert" className="se-notice">{errorMessage}</p>}{successMessage&&<p role="status" className="se-notice">{successMessage}</p>}</section>

            {!isPlanningV5(project.data) && project.status !== "archived" && <section className="rv-ui3-progressive-settings mx-auto w-full max-w-none px-5 pt-4 sm:px-8 lg:px-10"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E7F0] bg-white py-4"><div className="max-w-xl"><h2 className="text-sm font-bold">Leitura progressiva no Portal do Cliente</h2><p className="mt-1 text-xs leading-5 text-[#697386]">Permitir acesso às páginas V5 disponibilizadas, mesmo antes da publicação integral do projeto.</p></div><button type="button" disabled={isPublishing} onClick={async()=>{try{setErrorMessage("");const enabled=project.data?.planningClientAccessEnabled===true;const saved=await saveAuthorizedProjectData(project,{...project.data,planningClientAccessEnabled:!enabled});setProject(p=>p?.id===project.id?{...p,data:saved.data,updated_at:saved.updated_at}:p);setSuccessMessage(!enabled?"Leitura progressiva habilitada.":"Leitura progressiva desabilitada.");}catch(e){setErrorMessage(e instanceof Error?e.message:"Não foi possível atualizar o acesso.");}}} className={"cursor-pointer rounded-lg px-4 py-2.5 text-xs font-semibold "+(project.data?.planningClientAccessEnabled?"border border-[#D1DBE4] bg-white text-[#4B5563]":"bg-[#6D35F5] text-white")}>{project.data?.planningClientAccessEnabled?"Desabilitar leitura progressiva":"Habilitar leitura progressiva"}</button></div></section>}
          </>
        ) : null}
      </section>

      {project && !isLoading && <div className="w-full px-5 pb-12 sm:px-8 lg:px-10">
        <PlanningV5 key={project.id} project={project}
          preview={planningTab === "preview"}
          onPreviewChange={value => setPlanningTab(value ? "preview" : "editor")}
          companyAnalysis={project.data?.companyAnalysis0201??null}
          publishedCompanyAnalysis={project.data?.publishedCompanyAnalysis0201??null}
          onPublishCompanyAnalysis={async()=>{const snapshot=publicCompanyAnalysis(project.data?.companyAnalysis0201);if(!snapshot)throw new Error("Salve uma análise válida antes de disponibilizar.");const saved=await saveAuthorizedProjectData(project,{...project.data,publishedCompanyAnalysis0201:snapshot});setProject(p=>p?.id===project.id?{...p,data:saved.data,updated_at:saved.updated_at}:p);}}
          onSaveCompanyAnalysis={async(value)=>{const saved=await saveAuthorizedProjectData(project,{...project.data,companyAnalysis0201:value});setProject(p=>p?.id===project.id?{...p,data:saved.data,updated_at:saved.updated_at}:p);}}
          timeline={previewTimeline?.portalModules.includes("execution") ? previewTimeline : null}
          editingTimeline={<ExecutionTimelineEditor key={project.id} projectId={project.id} projectData={project.data??{}} updatedAt={project.updated_at} onSaved={(data,updated_at)=>setProject(p=>p?.id===project.id?{...p,data,updated_at}:p)}/>}/>
      </div>}
      <footer className="rv-ui3-planning-footer bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
    </main>
  );
}
export default function PlanejamentoClientePage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#F6F7FB] p-8 text-sm text-[#525B70]">Carregando planejamento...</main>}><PlanejamentoClienteContent/></Suspense>;
}
