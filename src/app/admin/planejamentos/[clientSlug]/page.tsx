"use client";

import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import ExecutionTimelineEditor from "@/Components/admin/ExecutionTimelineEditor";

import PlanningScheduleEditor,{safePlanningStages,type PlanningStage} from "@/Components/admin/PlanningScheduleEditor";
import PublishedPlanningPreview from "@/Components/strategic-editor/PublishedPlanningPreview";
import type {StrategicPlanningData} from "@/Components/strategic-editor/StrategicDocumentEditor";
import DynamicDocumentEditor from "@/Components/strategic-editor/DynamicDocumentEditor";
import { ecosystemDocuments } from "@/data/ecosystem2027";
import { supabase } from "@/lib/supabase";

type ClientRecord = {
  id: string;
  name: string;
  slug: string;
};

type ProjectData = {
  coverImageUrl?: string | null;
  planningStages?: PlanningStage[];
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
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");


  const [richDirty,setRichDirty]=useState(false);
  const [richBusy,setRichBusy]=useState(false);
  const [editingScope, setEditingScope] = useState(false);
  const [planningTab,setPlanningTab]=useState<"documents"|"schedule"|"preview"|"editor"|"execution">("editor");
  const [draftDocumentCodes, setDraftDocumentCodes] = useState<string[]>([]);
  const [draftPresentedCodes, setDraftPresentedCodes] = useState<string[]>([]);

  const client = project ? getProjectClient(project) : null;

  const coverImageUrl = project?.data?.coverImageUrl || "";
  const hasEcosystem = !!project?.data?.ecosystem2027;
  const documentCodes = project?.data?.ecosystem2027?.selectedDocumentCodes ?? [];
  const presentedCodes = project?.data?.ecosystem2027?.presentedDocumentCodes ?? [];
  useUnsavedChanges(editingScope && (JSON.stringify(draftDocumentCodes)!==JSON.stringify(documentCodes)||JSON.stringify(draftPresentedCodes)!==JSON.stringify(presentedCodes)));
  const selectedDocuments = ecosystemDocuments.filter((doc) => documentCodes.includes(doc.code));
  const documentAreas = Array.from(new Set(selectedDocuments.map((doc) => doc.area)));

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
      setDraftDocumentCodes(foundProject.data?.ecosystem2027?.selectedDocumentCodes ?? []);
      setDraftPresentedCodes(foundProject.data?.ecosystem2027?.presentedDocumentCodes ?? []);

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

  function toggleScopeDocument(code: string, kind: "include" | "present") {
    if (kind === "include") {
      if (draftDocumentCodes.includes(code)) {
        setDraftDocumentCodes((prev) => prev.filter((item) => item !== code));
        setDraftPresentedCodes((prev) => prev.filter((item) => item !== code));
      } else {
        setDraftDocumentCodes((prev) => [...prev, code]);
      }
    } else if (draftDocumentCodes.includes(code)) {
      setDraftPresentedCodes((prev) => prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]);
    }
  }

  async function saveDocumentScope() {
    if (!project || !project.data?.ecosystem2027 || isSaving) return;
    if (draftDocumentCodes.length === 0) {
      setErrorMessage("Selecione pelo menos um documento para o planejamento.");
      return;
    }
    if(richDirty||richBusy){setErrorMessage("Salve ou descarte as alterações do editor antes de mudar o escopo.");return;}
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    const validCodes = new Set(ecosystemDocuments.filter((doc) => !doc.area.startsWith("00 ")).map((doc) => doc.code));
    const included = draftDocumentCodes.filter((code) => validCodes.has(code));
    const visible = draftPresentedCodes.filter((code) => included.includes(code));
    const nextData: ProjectData = {
      ...project.data,
      ecosystem2027: {
        ...project.data.ecosystem2027,
        selectedDocumentCodes: included,
        presentedDocumentCodes: visible,
      },
    };
    try {
      const saved=await saveAuthorizedProjectData(project,nextData);
      setProject(p=>p?.id===project.id?{...p,data:saved.data,updated_at:saved.updated_at}:p);
      setDraftDocumentCodes(included);
      setDraftPresentedCodes(visible);
      setEditingScope(false);
      setSuccessMessage("Documentos do planejamento atualizados com sucesso.");
    } catch(error) {
      setErrorMessage(error instanceof Error?error.message:"Não foi possível salvar os documentos.");
    } finally {
      setIsSaving(false);
    }
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
    <main className="admin-manage-v2 workspace-project-page flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
      <style jsx global>{` .admin-manage-v2, .admin-manage-v2 h1, .admin-manage-v2 h2, .admin-manage-v2 h3, .admin-manage-v2 h4 { font-family: var(--font-body), Arial, Helvetica, sans-serif !important; } `}</style>

      <section className="mx-auto w-full max-w-6xl px-5 pb-5 pt-9 sm:px-8 lg:px-10">
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
            <section className="pw-project-header"><div className="pw-breadcrumb"><Link href="/admin?section=projects">Projetos</Link><span>/</span>{client?.name}<span>/</span>Planejamento</div><div className="pw-project-title"><div className="pw-project-photo-wrap"><div className="pw-project-photo">{coverImageUrl?<img src={coverImageUrl} alt={`Foto do projeto ${project.title}`}/>:<span>{(client?.name??project.title).charAt(0).toUpperCase()}</span>}</div></div><div className="pw-project-identity"><p className="pw-project-client">{client?.name}</p><h1>{project.title}</h1><div className="pw-project-meta"><span>Planejamento estratégico</span><span className="pw-meta-divider" aria-hidden="true"/><span className="pw-status pw-project-status"><span className="pw-project-status-dot"/>{getStatusLabel(project.status)}</span></div></div><button className="pw-outline pw-project-client-view" onClick={()=>setPlanningTab("preview")}>Visão do cliente ↗</button></div><div className="workspace-project-controls"><span>Atualizado em {formatDate(project.updated_at)}</span><Link href={`/admin/planejamentos/${clientSlug}/acesso?projectId=${project.id}`}>Configurar acesso</Link><Link href={`/apresentacao/${project.slug}`}>Abrir apresentação ↗</Link>{project.status!=="archived"&&<button className="pw-outline" disabled={isPublishing||richDirty||richBusy||isSaving} onClick={()=>{if(window.confirm(project.status==="published"?"Retirar a apresentação do acesso do cliente?":"Disponibilizar ao cliente a apresentação e os documentos já publicados?"))void handlePublish(project.status==="published"?"draft":"published");}}>{isPublishing?"Atualizando…":project.status==="published"?"Retirar apresentação":"Disponibilizar apresentação"}</button>}</div>{errorMessage&&<p role="alert" className="se-notice">{errorMessage}</p>}{successMessage&&<p role="status" className="se-notice">{successMessage}</p>}</section>

            {hasEcosystem && <div className="mt-7 space-y-5">
              <nav aria-label="Seções do planejamento" className="pw-project-tabs workspace-project-tabs" role="tablist">{([{id:"editor",label:"Planejamento"},{id:"schedule",label:"Cronograma do projeto"},{id:"execution",label:"Plano de execução"},{id:"preview",label:"Visão do cliente"},{id:"documents",label:"Configurar documentos"}] as const).map(item=><button key={item.id} type="button" role="tab" id={"planning-tab-"+item.id} aria-controls={"planning-panel-"+item.id} aria-selected={planningTab===item.id} tabIndex={planningTab===item.id?0:-1} onKeyDown={event=>{
 if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
 event.preventDefault();
 const tabs=Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
 const index=tabs.indexOf(event.currentTarget);
 const next=event.key==="Home"?0:event.key==="End"?tabs.length-1:(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
 tabs[next]?.click();tabs[next]?.focus();
 }} disabled={richBusy||isSaving||isPublishing} onClick={()=>setPlanningTab(item.id)} className={planningTab===item.id?"workspace-tab-active":""}>{item.label}</button>)}</nav>
              <div id="planning-panel-documents" role="tabpanel" tabIndex={0} aria-labelledby="planning-tab-documents" hidden={planningTab!=="documents"}>
              <div className="rounded-xl border border-[#E3E7F0] bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="text-xl font-bold">Documentos do planejamento</h2><p className="mt-1 text-sm text-[#525B70]">Gerencie o escopo e a exibição dos documentos do Ecossistema 2027.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { if(isSaving)return;setEditingScope(!editingScope); setDraftDocumentCodes(documentCodes); setDraftPresentedCodes(presentedCodes); setErrorMessage(""); }} className="cursor-pointer rounded-xl bg-[#0B142A] px-4 py-2.5 text-sm font-medium text-white">{editingScope ? "Cancelar edição" : "Editar documentos"}</button>
                  </div>
                </div>
                {editingScope ? <div className="mt-5">
                  <div className="rounded-xl bg-[#F6F7FB] p-4 text-xs text-[#525B70]">Marque os documentos que farão parte do projeto e quais devem ser exibidos ao cliente. Ao retirar um documento, sua exibição também será desmarcada. Os conteúdos já salvos não serão excluídos.</div>
                  <div className="mt-4 max-h-[660px] space-y-4 overflow-y-auto">
                    {Array.from(new Set(ecosystemDocuments.filter((doc) => !doc.area.startsWith("00 ")).map((doc) => doc.area))).map((area) => <section key={area} className="rounded-xl border border-[#E3E7F0] p-4">
                      <h3 className="mb-3 text-sm font-bold">{area}</h3>
                      <div className="grid grid-cols-[1fr_64px_64px] gap-2 border-b border-[#E3E7F0] pb-2 text-xs text-[#697386] sm:grid-cols-[1fr_90px_90px]"><span>Documento</span><span className="text-center">Incluir</span><span className="text-center">Exibir</span></div>
                      {ecosystemDocuments.filter((doc) => doc.area === area).map((doc) => <div key={doc.code} className="grid grid-cols-[1fr_64px_64px] items-center gap-2 border-b border-[#EEF0F5] py-3 last:border-0 sm:grid-cols-[1fr_90px_90px]">
                        <div className="flex flex-wrap items-baseline gap-2"><span className="text-xs text-[#697386]">{doc.code}</span><span className="text-sm">{doc.title}</span></div>
                        <div className="text-center"><input aria-label={`Incluir ${doc.title}`} type="checkbox" disabled={isSaving} className="h-5 w-5 cursor-pointer accent-[#6D35F5]" checked={draftDocumentCodes.includes(doc.code)} onChange={() => toggleScopeDocument(doc.code,"include")}/></div>
                        <div className="text-center"><input aria-label={`Exibir ${doc.title}`} type="checkbox" className="h-5 w-5 cursor-pointer accent-[#6D35F5] disabled:cursor-not-allowed disabled:opacity-30" disabled={isSaving||!draftDocumentCodes.includes(doc.code)} checked={draftPresentedCodes.includes(doc.code)} onChange={() => toggleScopeDocument(doc.code,"present")}/></div>
                      </div>)}
                    </section>)}
                  </div>
                  {errorMessage && <p role="alert" className="mt-4 text-sm text-red-700">{errorMessage}</p>}
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E3E7F0] pt-5"><span className="text-xs text-[#525B70]">{draftDocumentCodes.length} documentos incluídos · {draftPresentedCodes.length} visíveis</span><button type="button" disabled={isSaving || draftDocumentCodes.length === 0} onClick={saveDocumentScope} className="cursor-pointer rounded-xl bg-[#0B142A] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isSaving ? "Salvando..." : "Salvar alterações"}</button></div>
                </div> : <div className="mt-5 space-y-4">
                  {documentAreas.map((area) => <section key={area} className="rounded-xl border border-[#E3E7F0] p-4"><h3 className="mb-3 text-sm font-bold">{area}</h3><div className="divide-y divide-[#EEF0F5]">{selectedDocuments.filter((doc) => doc.area === area).map((doc) => <div key={doc.code} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="flex items-baseline gap-3"><span className="text-xs font-semibold text-[#697386]">{doc.code}</span><span className="text-sm font-medium">{doc.title}</span></div><span className="text-xs text-[#697386]">{presentedCodes.includes(doc.code) ? "Marcado para exibição" : "Uso interno"}</span></div>)}</div></section>)}
                </div>}
                {!editingScope && <div className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-xs leading-5 text-[#525B70]">A seleção define o escopo e a visibilidade. Na aba Planejamento, edite os documentos e controle revisão, aprovação e publicação. Somente versões explicitamente publicadas podem aparecer na apresentação do cliente.</div>}
              </div>
              </div>
            </div>}
          </>
        ) : null}
      </section>

      {project && !isLoading && hasEcosystem && <div role="tabpanel" tabIndex={0} id="planning-panel-schedule" aria-labelledby="planning-tab-schedule" hidden={planningTab!=="schedule"}><PlanningScheduleEditor key={project.id} initial={safePlanningStages(project.data?.planningStages)} onSave={async(stages)=>{const saved=await saveAuthorizedProjectData(project,{...project.data,planningStages:stages});setProject(p=>p?.id===project.id?{...p,data:saved.data,updated_at:saved.updated_at}:p);}}/></div>}
      {project && !isLoading && hasEcosystem && <div role="tabpanel" tabIndex={0} id="planning-panel-preview" aria-labelledby="planning-tab-preview" hidden={planningTab!=="preview"}><PublishedPlanningPreview data={project.data??{}} status={project.status} title={project.title} clientName={client?.name??""}/></div>}
      {project && !isLoading && hasEcosystem && <div role="tabpanel" tabIndex={0} id="planning-panel-editor" aria-labelledby="planning-tab-editor" hidden={planningTab!=="editor"}><DynamicDocumentEditor key={project.id} projectId={project.id} projectData={project.data??{}} updatedAt={project.updated_at} onBusyChange={setRichBusy} onDirtyChange={setRichDirty} onSaved={(data,updated_at)=>setProject(p=>p?.id===project.id?{...p,data,updated_at}:p)}/></div>}
      {project && !isLoading && <div role="tabpanel" tabIndex={0} id="planning-panel-execution" aria-labelledby="planning-tab-execution" hidden={hasEcosystem && planningTab!=="execution"}><section className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8 lg:px-10"><ExecutionTimelineEditor key={project.id} projectId={project.id} projectData={project.data??{}} updatedAt={project.updated_at} onSaved={(data,updated_at)=>setProject(p=>p?.id===project.id?{...p,data,updated_at}:p)}/></section></div>}
      <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
    </main>
  );
}
export default function PlanejamentoClientePage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#F6F7FB] p-8 text-sm text-[#525B70]">Carregando planejamento...</main>}><PlanejamentoClienteContent/></Suspense>;
}
