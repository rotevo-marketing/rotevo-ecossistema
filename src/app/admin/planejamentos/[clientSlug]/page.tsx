"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { moduleCategories, planningModules } from "@/data/modules";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { ecosystemDocuments } from "@/data/ecosystem2027";
import { supabase } from "@/lib/supabase";

type ClientRecord = {
  id: string;
  name: string;
  slug: string;
};

type ProjectData = {
  coverImageUrl?: string | null;
  selectedModules?: string[];
  modules?: {
    title: string;
    slug: string;
    category: string;
    description: string;
  }[];
  moduleContent?: Record<string, unknown>;
  ecosystem2027?: { version?: number; selectedDocumentCodes?: string[]; presentedDocumentCodes?: string[] };
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

function getDefaultSelectedModules() {
  return planningModules
    .filter((module) => module.presentation)
    .map((module) => module.slug);
}

export default function PlanejamentoClientePage() {
  const router = useRouter();
  const params = useParams();

  const clientSlug =
    typeof params.clientSlug === "string" ? params.clientSlug : "";

  const [project, setProject] = useState<PlanningProject | null>(null);
  const [selectedModuleSlugs, setSelectedModuleSlugs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const client = project ? getProjectClient(project) : null;

  const selectedModules = useMemo(() => {
    return planningModules.filter(
      (module) =>
        module.presentation && selectedModuleSlugs.includes(module.slug)
    );
  }, [selectedModuleSlugs]);

  const coverImageUrl = project?.data?.coverImageUrl || "";
  const hasEcosystem = !!project?.data?.ecosystem2027;
  const documentCodes = project?.data?.ecosystem2027?.selectedDocumentCodes ?? [];
  const presentedCodes = project?.data?.ecosystem2027?.presentedDocumentCodes ?? [];
  const selectedDocuments = ecosystemDocuments.filter((doc) => documentCodes.includes(doc.code));
  const documentAreas = Array.from(new Set(selectedDocuments.map((doc) => doc.area)));

  useEffect(() => {
    async function loadProject() {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const { data: userData, error: userError } = await supabase.auth.getUser();

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

      if (profileError || profile?.role !== "strategist") {
        await supabase.auth.signOut();
        window.localStorage.removeItem("metodo-epc-strategist-auth");
        router.push("/estrategista/login");
        return;
      }

      setUserEmail(userData.user.email ?? "");
      const { data, error } = await supabase
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
          data,
          clients!inner (
            id,
            name,
            slug
          )
        `
        )
        .eq("clients.slug", clientSlug)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        setErrorMessage(
          error.message || "Não foi possível carregar este planejamento."
        );
        setIsLoading(false);
        return;
      }

      const foundProject = (data?.[0] ?? null) as unknown as PlanningProject | null;

      if (!foundProject) {
        setErrorMessage("Planejamento não encontrado para este cliente.");
        setIsLoading(false);
        return;
      }

      setProject(foundProject);

      const storedSelectedModules = foundProject.data?.selectedModules;

      if (storedSelectedModules?.length) {
        setSelectedModuleSlugs(storedSelectedModules);
      } else {
        setSelectedModuleSlugs(getDefaultSelectedModules());
      }

      setIsLoading(false);
    }

    if (clientSlug) {
      loadProject();
    }
  }, [clientSlug, router]);

  function toggleModule(moduleSlug: string) {
    setSuccessMessage("");

    setSelectedModuleSlugs((currentModules) => {
      if (currentModules.includes(moduleSlug)) {
        return currentModules.filter((slug) => slug !== moduleSlug);
      }

      return [...currentModules, moduleSlug];
    });
  }

  function selectAllModules() {
    setSuccessMessage("");
    setSelectedModuleSlugs(getDefaultSelectedModules());
  }

  function clearModules() {
    setSuccessMessage("");
    setSelectedModuleSlugs([]);
  }

  async function saveModuleSelection() {
    if (!project) {
      return;
    }

    if (selectedModuleSlugs.length === 0) {
      setErrorMessage("Selecione pelo menos um módulo para este planejamento.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const selectedModuleRecords = planningModules
      .filter((module) => selectedModuleSlugs.includes(module.slug))
      .map((module) => ({
        title: module.title,
        slug: module.slug,
        category: module.category,
        description: module.description,
      }));

    const nextData: ProjectData = {
      ...(project.data ?? {}),
      selectedModules: selectedModuleSlugs,
      modules: selectedModuleRecords,
    };

    const { error } = await supabase
      .from("planning_projects")
      .update({
        data: nextData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    if (error) {
      setErrorMessage(
        error.message || "Não foi possível salvar a seleção de módulos."
      );
      setIsSaving(false);
      return;
    }

    setProject({
      ...project,
      data: nextData,
      updated_at: new Date().toISOString(),
    });

    setSuccessMessage("Seleção de módulos salva com sucesso.");
    setIsSaving(false);
  }

  async function handlePublish(newStatus: "draft" | "published") {
    if (!project) return;

    setIsPublishing(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("planning_projects")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", project.id);

    if (error) {
      setErrorMessage(error.message || "Não foi possível atualizar o status.");
      setIsPublishing(false);
      return;
    }

    setProject({ ...project, status: newStatus, updated_at: new Date().toISOString() });
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

      <section className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-9 sm:px-8 lg:px-10">
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
            <div className="overflow-hidden rounded-2xl border border-[#E3E7F0] bg-white">
              <div className="h-1 bg-slate-200" />
              <div className="p-8 lg:p-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#697386]">
                      Gerenciar planejamento
                    </p>

                    <div className="mt-5 flex items-center gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                        {coverImageUrl ? (
                          <img
                            src={coverImageUrl}
                            alt={client?.name ?? "Cliente"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                            {(client?.name ?? "C").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div>
                        <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-[#090D1C]">
                          {client?.name ?? "Cliente"}
                        </h1>

                        <p className="mt-1.5 text-base font-medium text-slate-500">
                          {project.title}
                        </p>
                      </div>
                    </div>

                    {project.description ? (
                      <p className="mt-6 max-w-3xl text-base leading-7 text-slate-500">
                        {project.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200 lg:min-w-72">
                    <div className="h-0.5 bg-slate-200" />
                    <div className="p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        Status
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          project.status
                        )}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>

                      <div className="mt-4">
                        {project.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => handlePublish("published")}
                            disabled={isPublishing}
                            className="w-full cursor-pointer rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPublishing ? "Publicando..." : "Publicar apresentação"}
                          </button>
                        )}

                        {project.status === "published" && (
                          <button
                            type="button"
                            onClick={() => handlePublish("draft")}
                            disabled={isPublishing}
                            className="w-full cursor-pointer rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPublishing ? "Atualizando..." : "Voltar para rascunho"}
                          </button>
                        )}
                      </div>

                      <div className="mt-5 border-t border-slate-200 pt-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Atualizado em
                        </p>
                        <strong className="mt-2 block text-xl font-bold tracking-[-0.03em]">
                          {formatDate(project.updated_at)}
                        </strong>
                      </div>

                      <div className="mt-5 border-t border-slate-200 pt-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Módulos selecionados
                        </p>
                        <strong className="mt-2 block text-xl font-bold tracking-[-0.03em]">
                          {selectedModules.length}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!hasEcosystem && <div className="mt-8 rounded-xl border border-[#E3E7F0] bg-white p-5 lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Seleção de módulos
                  </p>

                  <h2 className="mt-1.5 text-2xl font-bold tracking-[-0.03em]">
                    Escolha o que entra neste planejamento
                  </h2>

                  <p className="mt-1.5 text-sm text-slate-500">
                    Apenas os módulos selecionados devem ser preenchidos e aparecer no planejamento final.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={selectAllModules}
                    className="cursor-pointer rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
                  >
                    Selecionar todos
                  </button>

                  <button
                    type="button"
                    onClick={clearModules}
                    className="cursor-pointer rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
                  >
                    Limpar
                  </button>

                  <button
                    type="button"
                    onClick={saveModuleSelection}
                    disabled={isSaving}
                    className="cursor-pointer rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Salvando..." : "Salvar seleção"}
                  </button>
                </div>
              </div>

              {errorMessage ? (
                <div className="mt-4 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
                  {successMessage}
                </div>
              ) : null}
            </div>}

            {!hasEcosystem && <div className="mt-8 space-y-10">
              {moduleCategories.map((category) => {
                const categoryModules = planningModules.filter(
                  (module) => module.category === category && module.presentation
                );

                if (categoryModules.length === 0) {
                  return null;
                }

                return (
                  <section key={category}>
                    <h3 className="border-l-2 border-slate-300 pl-3 text-xl font-bold tracking-[-0.03em]">
                      {category}
                    </h3>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {categoryModules.map((module) => {
                        const isSelected = selectedModuleSlugs.includes(
                          module.slug
                        );

                        return (
                          <div
                            key={module.slug}
                            className={`rounded-3xl bg-white p-6 shadow-sm ring-1 transition ${
                              isSelected
                                ? "ring-slate-950 hover:shadow-md"
                                : "opacity-60 ring-slate-200 hover:opacity-80"
                            }`}
                          >
                            <label className="flex cursor-pointer items-start gap-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleModule(module.slug)}
                                className="mt-1 h-5 w-5 rounded border-slate-300"
                              />

                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                                    Módulo
                                  </p>

                                  {isSelected ? (
                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                      Selecionado
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-400">
                                      Fora do planejamento
                                    </span>
                                  )}
                                </div>

                                <h4 className="mt-2 text-lg font-bold tracking-[-0.02em]">
                                  {module.title}
                                </h4>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                  {module.description}
                                </p>
                              </div>
                            </label>

                            <div className="mt-5 flex justify-end">
                              {isSelected ? (
                                <Link
                                  href={`/admin/planejamentos/${clientSlug}/modulos/${module.slug}`}
                                  className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                                >
                                  Preencher módulo
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex cursor-not-allowed rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-400"
                                >
                                  Selecione para preencher
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>}

            {hasEcosystem && <div className="mt-7 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">Documentos selecionados</p><strong className="mt-2 block text-2xl">{selectedDocuments.length}</strong></div>
                <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">Visíveis ao cliente</p><strong className="mt-2 block text-2xl">{presentedCodes.length}</strong></div>
                <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">Áreas do projeto</p><strong className="mt-2 block text-2xl">{documentAreas.length}</strong></div>
              </div>
              <div className="rounded-xl border border-[#E3E7F0] bg-white p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="text-xl font-bold">Documentos do planejamento</h2><p className="mt-1 text-sm text-[#525B70]">Escopo selecionado na criação, organizado pelas áreas do Ecossistema 2027.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/planejamentos/${clientSlug}/acesso`} className="rounded-xl border border-[#E3E7F0] bg-white px-4 py-2.5 text-sm font-medium">Configurar acesso</Link>
                    <Link href={`/apresentacao/${project.slug}`} className="rounded-xl bg-[#0B142A] px-4 py-2.5 text-sm font-medium text-white">Ver apresentação</Link>
                  </div>
                </div>
                <div className="mt-5 rounded-xl bg-[#F6F7FB] p-4 text-xs leading-5 text-[#525B70]">Os editores e a apresentação do modelo 2027 ainda serão integrados aos documentos selecionados. Esta tela mostra o escopo salvo sem alterar o conteúdo de projetos existentes.</div>
                <div className="mt-5 space-y-4">
                  {documentAreas.map((area) => <section key={area} className="rounded-xl border border-[#E3E7F0] p-4"><h3 className="mb-3 text-sm font-bold">{area}</h3><div className="divide-y divide-[#EEF0F5]">{selectedDocuments.filter((doc) => doc.area === area).map((doc) => <div key={doc.code} className="flex items-center justify-between gap-3 py-3"><div className="flex items-baseline gap-3"><span className="text-xs font-semibold text-[#697386]">{doc.code}</span><span className="text-sm font-medium">{doc.title}</span></div><span className="shrink-0 text-xs text-[#697386]">{presentedCodes.includes(doc.code) ? "Exibir ao cliente" : "Uso interno"}</span></div>)}</div></section>)}
                </div>
              </div>
            </div>}
          </>
        ) : null}
      </section>

      <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
    </main>
  );
}