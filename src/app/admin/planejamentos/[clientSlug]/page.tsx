"use client";

import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RotevoLogo } from "@/Components/RotevoLogo";
import ExecutionTimelineEditor from "@/Components/admin/ExecutionTimelineEditor";
import EcosystemDocumentEditor from "@/Components/admin/EcosystemDocumentEditor";
import PlanningScheduleEditor,{safePlanningStages,type PlanningStage} from "@/Components/admin/PlanningScheduleEditor";
import PlanningLayoutDemo from "@/Components/admin/PlanningLayoutDemo";
import DynamicStrategicEditor from "@/Components/strategic-editor/DynamicStrategicEditor";
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
  ecosystem2027?: { version?: number; selectedDocumentCodes?: string[]; presentedDocumentCodes?: string[]; documents?: Record<string,{content:string;updatedAt:string}> };
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
    return "bg-amber-100 text-amber-800";
  }

  if (status === "in_progress") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "archived") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-slate-100 text-slate-600";
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
  const [userEmail, setUserEmail] = useState("");
  const [legacyDirty,setLegacyDirty]=useState(false);
  const [editingScope, setEditingScope] = useState(false);
  const [planningTab,setPlanningTab]=useState<"documents"|"schedule"|"preview"|"editor"|"execution">("documents");
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

      setUserEmail(userData.user.email ?? "");
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
    if(legacyDirty){setErrorMessage("Salve ou descarte as alterações no editor anterior antes de mudar o escopo.");return;}
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
    <main className="admin-manage-v2 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
      <style jsx global>{` .admin-manage-v2, .admin-manage-v2 h1, .admin-manage-v2 h2, .admin-manage-v2 h3, .admin-manage-v2 h4 { font-family: var(--font-body), Arial, Helvetica, sans-serif !important; } `}</style>
      <header className="sticky top-0 z-50 border-b border-[#E3E7F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Rotevo - Painel administrativo"><RotevoLogo size={27}/></Link>
            <span className="hidden h-6 w-px bg-[#E3E7F0] sm:block"/>
            <span className="hidden text-sm text-[#697386] sm:block">Administração</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {userEmail && <div title={userEmail} className="hidden items-center gap-2 sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0ECFF] text-sm font-semibold text-[#5123C5]">{userEmail.charAt(0).toUpperCase()}</span><span className="hidden max-w-44 truncate text-xs text-[#525B70] lg:block">{userEmail}</span></div>}
            <Link href="/admin" className="rounded-xl border border-[#E3E7F0] bg-white px-3 py-2.5 text-xs font-medium text-[#090D1C] sm:px-4 sm:text-sm">Voltar ao painel</Link>
          </div>
        </div>
      </header>

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
            <div className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#F1F3F7]">
                    {coverImageUrl ? <img src={coverImageUrl} alt={client?.name ?? "Cliente"} className="h-full w-full object-cover"/> :
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[#697386]">{(client?.name ?? "C").charAt(0).toUpperCase()}</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#697386]">Gerenciar planejamento</p>
                    <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#090D1C]">{project.title}</h1>
                    <p className="mt-1 text-sm text-[#525B70]">{client?.name ?? "Cliente"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${getStatusClass(project.status)}`}>{getStatusLabel(project.status)}</span>
                  <Link href={`/admin/planejamentos/${clientSlug}/acesso`} className="cursor-pointer rounded-xl border border-[#E3E7F0] bg-white px-4 py-2.5 text-sm font-medium">Configurar acesso</Link>
                  <Link href={`/apresentacao/${project.slug}`} className="cursor-pointer rounded-xl bg-[#0B142A] px-4 py-2.5 text-sm font-medium text-white">Ver apresentação</Link>
                </div>
              </div>
              {project.description && <p className="mt-5 max-w-3xl text-sm leading-6 text-[#525B70]">{project.description}</p>}
              <div className="mt-6 flex flex-col gap-4 border-t border-[#E3E7F0] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#525B70]">Atualizado em <strong className="font-semibold text-[#090D1C]">{formatDate(project.updated_at)}</strong></p>
                {project.status === "draft" && <button type="button" onClick={() => handlePublish("published")} disabled={isPublishing}
                  className="cursor-pointer rounded-xl bg-[#A7E000] px-5 py-3 text-sm font-semibold text-[#090D1C] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">{isPublishing ? "Publicando..." : "Publicar apresentação"}</button>}
                {project.status === "published" && <button type="button" onClick={() => handlePublish("draft")} disabled={isPublishing}
                  className="cursor-pointer rounded-xl border border-[#E3E7F0] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">{isPublishing ? "Atualizando..." : "Voltar para rascunho"}</button>}
              </div>
              {errorMessage && <p role="alert" className="mt-4 text-sm text-red-700">{errorMessage}</p>}
              {successMessage && <p role="status" className="mt-4 text-sm text-emerald-700">{successMessage}</p>}
            </div>

            {hasEcosystem && <div className="mt-7 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">Documentos selecionados</p><strong className="mt-2 block text-2xl">{selectedDocuments.length}</strong></div>
                <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">Marcados para exibição</p><strong className="mt-2 block text-2xl">{presentedCodes.length}</strong></div>
                <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">Áreas do projeto</p><strong className="mt-2 block text-2xl">{documentAreas.length}</strong></div>
              </div>
              <nav aria-label="Seções do planejamento" className="flex flex-wrap gap-2 border-b border-[#E3E7F0] pb-4" role="tablist">{([{id:"documents",label:"Documentos"},{id:"schedule",label:"Cronograma"},{id:"preview",label:"Prévia do Cliente"},{id:"editor",label:"Editor Estratégico"},{id:"execution",label:"Plano de Execução"}] as const).map(item=><button key={item.id} type="button" role="tab" id={"planning-tab-"+item.id} aria-controls={"planning-panel-"+item.id} aria-selected={planningTab===item.id} tabIndex={planningTab===item.id?0:-1} onKeyDown={event=>{
 if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
 event.preventDefault();
 const tabs=Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
 const index=tabs.indexOf(event.currentTarget);
 const next=event.key==="Home"?0:event.key==="End"?tabs.length-1:(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
 tabs[next]?.click();tabs[next]?.focus();
 }} onClick={()=>setPlanningTab(item.id)} className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold ${planningTab===item.id?"bg-[#6D35F5] text-white":"border border-[#E3E7F0] bg-white text-[#525B70] hover:border-[#6D35F5]"}`}>{item.label}</button>)}</nav>
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
                {!editingScope && <div className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-xs leading-5 text-[#525B70]">A seleção define o escopo e a visibilidade. Na aba Editor Estratégico, edite os documentos e controle revisão, aprovação e publicação. Somente versões explicitamente publicadas podem aparecer na apresentação do cliente.</div>}
              </div>
              </div>
            </div>}
          </>
        ) : null}
      </section>

      {project && !isLoading && hasEcosystem && <div role="tabpanel" tabIndex={0} id="planning-panel-schedule" aria-labelledby="planning-tab-schedule" hidden={planningTab!=="schedule"}><PlanningScheduleEditor key={project.id} initial={safePlanningStages(project.data?.planningStages)} onSave={async(stages)=>{const saved=await saveAuthorizedProjectData(project,{...project.data,planningStages:stages});setProject(p=>p?.id===project.id?{...p,data:saved.data,updated_at:saved.updated_at}:p);}}/></div>}
      {project && !isLoading && hasEcosystem && <div role="tabpanel" tabIndex={0} id="planning-panel-preview" aria-labelledby="planning-tab-preview" hidden={planningTab!=="preview"}><PlanningLayoutDemo/></div>}
      {project && !isLoading && hasEcosystem && <div role="tabpanel" tabIndex={0} id="planning-panel-editor" aria-labelledby="planning-tab-editor" hidden={planningTab!=="editor"}><section className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-10"><div className="mb-4 rounded-2xl border border-[#E3E7F0] bg-white p-5"><h2 className="text-xl font-bold">Editor Estratégico profissional</h2><p className="mt-2 text-sm text-[#525B70]">Demonstração BlockNote com conteúdo fictício. Para documentos reais utilize o editor anterior, preservado abaixo.</p></div><DynamicStrategicEditor embedded/><details className="mt-5 rounded-2xl border border-[#E3E7F0] bg-white p-5"><summary className="cursor-pointer font-semibold">Editor anterior — documentos reais e publicação</summary><EcosystemDocumentEditor onDirtyChange={setLegacyDirty} key={project.id} projectId={project.id} projectData={project.data??{}} updatedAt={project.updated_at} onSaved={(data,updated_at)=>setProject(p=>p?.id===project.id?{...p,data,updated_at}:p)}/></details></section></div>}
      {project && !isLoading && <div role="tabpanel" tabIndex={0} id="planning-panel-execution" aria-labelledby="planning-tab-execution" hidden={hasEcosystem && planningTab!=="execution"}><section className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8 lg:px-10"><ExecutionTimelineEditor key={project.id} projectId={project.id} projectData={project.data??{}} updatedAt={project.updated_at} onSaved={(data,updated_at)=>setProject(p=>p?.id===project.id?{...p,data,updated_at}:p)}/></section></div>}
      <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
    </main>
  );
}
export default function PlanejamentoClientePage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#F6F7FB] p-8 text-sm text-[#525B70]">Carregando planejamento...</main>}><PlanejamentoClienteContent/></Suspense>;
}
