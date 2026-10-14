"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotevoLogo } from "@/Components/RotevoLogo";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const totalProjects = projects.length;

  const inProgressProjects = useMemo(() => {
    return projects.filter((project) => project.status === "draft").length;
  }, [projects]);

  const publishedProjects = useMemo(() => {
    return projects.filter((project) => project.status === "published").length;
  }, [projects]);

  const visibleProjects = useMemo(() => projects.filter((project) => {
    if (statusFilter !== "all" && project.status !== statusFilter) return false;
    const text = ((getProjectClient(project)?.name ?? "") + " " + project.title).toLocaleLowerCase("pt-BR");
    return text.includes(searchTerm.trim().toLocaleLowerCase("pt-BR"));
  }), [projects, statusFilter, searchTerm]);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const loadingStartedAt = performance.now();
    const authStartedAt = performance.now();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const authDurationMs = Math.round(performance.now() - authStartedAt);

    if (userError || !userData.user) {
      window.localStorage.removeItem("metodo-epc-strategist-auth");
      router.push("/estrategista/login");
      return;
    }

    const profileStartedAt = performance.now();
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

    const profileDurationMs = Math.round(performance.now() - profileStartedAt);
    setUserEmail(userData.user.email ?? "");
    const projectsStartedAt = performance.now();

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
        clients (
          id,
          name,
          slug
        )
      `
      )
      .order("updated_at", { ascending: false });

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

    const { error } = await supabase
      .from("planning_projects")
      .delete()
      .eq("id", project.id);

    if (error) {
      setErrorMessage(error.message || "Não foi possível excluir o planejamento.");
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
    setIsPublishingId(project.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("planning_projects")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", project.id);

    if (error) {
      setErrorMessage(error.message || "Não foi possível atualizar o status.");
      setIsPublishingId("");
      return;
    }

    setProjects((current) =>
      current.map((p) =>
        p.id === project.id ? { ...p, status: newStatus } : p
      )
    );
    setSuccessMessage(
      newStatus === "published"
        ? "Apresentação publicada com sucesso."
        : "Planejamento voltou para rascunho."
    );
    setIsPublishingId("");
  }


  return (
    <main className="admin-v2 min-h-screen bg-[#F6F7FB] text-[#090D1C]">
      <style jsx global>{`
        .admin-v2,
        .admin-v2 h1,
        .admin-v2 h2,
        .admin-v2 h3 {
          font-family: var(--font-body), Arial, Helvetica, sans-serif !important;
        }
      `}</style>
      <header className="border-b border-[#E3E7F0] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Rotevo - Painel administrativo"><RotevoLogo size={27} /></Link>
            <span className="hidden h-6 w-px bg-[#E3E7F0] sm:block" />
            <span className="hidden text-sm text-[#697386] sm:block">Administração</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="flex items-center gap-2" title={userEmail} aria-label={"Usuário conectado: " + userEmail}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0ECFF] text-sm font-semibold text-[#5123C5]" aria-hidden="true">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-48 truncate text-xs text-[#525B70] md:block">{userEmail}</span>
              </div>
            )}
            <button type="button" onClick={handleLogout} className="cursor-pointer rounded-xl border border-[#E3E7F0] bg-white px-5 py-2.5 text-sm font-medium text-[#525B70] hover:bg-[#F6F7FB]">Sair</button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] leading-[38px] font-bold tracking-[-0.02em] text-[#090D1C]">Painel Administrativo</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#525B70]">Acompanhe os projetos e organize seus planejamentos estratégicos em um só lugar.</p>
          </div>
          <Link href="/admin/novo-planejamento" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#A7E000] px-5 py-3 text-sm font-semibold text-[#090D1C] hover:bg-[#98CC00]"><span aria-hidden="true" className="text-xl">+</span>Novo planejamento</Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total de planejamentos", value: totalProjects },
            { label: "Em produção", value: inProgressProjects },
            { label: "Publicados", value: publishedProjects }
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-[#E3E7F0] bg-white p-6">
              <p className="text-sm font-medium text-[#525B70]">{metric.label}</p>
              <strong className="mt-3 block text-[34px] leading-10 font-bold tabular-nums">{isLoading ? "..." : metric.value}</strong>
            </div>
          ))}
        </div>
        <section aria-labelledby="projects-heading" className="mt-8 rounded-2xl border border-[#E3E7F0] bg-white p-4 sm:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="projects-heading" className="text-2xl leading-8 font-bold tracking-[-0.02em]">Projetos recentes</h2>
              <p className="mt-1 text-sm text-[#697386]">Localize, acompanhe e gerencie seus planejamentos.</p>
            </div>
            {!isLoading && <span className="shrink-0 text-xs text-[#697386]">{visibleProjects.length} de {projects.length}</span>}
          </div>
          <div className="mt-6 space-y-4">
            <label htmlFor="admin-search" className="sr-only">Buscar cliente ou planejamento</label>
            <input id="admin-search" type="search" placeholder="Buscar cliente ou planejamento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="min-h-11 w-full rounded-xl border border-[#E3E7F0] px-4 py-3 text-sm outline-none focus:border-[#6D35F5] focus:ring-2 focus:ring-[#6D35F5]/15" />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar planejamentos">
              {([{value:"all",label:"Todos"},{value:"draft",label:"Em produção"},{value:"published",label:"Publicados"}] as const).map((f) => (
                <button key={f.value} type="button" aria-pressed={statusFilter===f.value} onClick={() => {setStatusFilter(f.value);setOpenMenuId(null);}} className={"cursor-pointer rounded-full border px-4 py-2 text-sm font-medium " + (statusFilter===f.value ? "border-[#6D35F5] bg-[#F0ECFF] text-[#5123C5]" : "border-[#E3E7F0] text-[#525B70] hover:bg-[#F6F7FB]")}>{f.label}</button>
              ))}
            </div>
          </div>
          {errorMessage && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}
          {successMessage && <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{successMessage}</div>}
          {isLoading && <p role="status" className="mt-6 text-sm text-[#697386]">Carregando planejamentos...</p>}
          {!isLoading && projects.length===0 && <div className="mt-6 rounded-xl border border-dashed border-[#E3E7F0] p-8 text-center"><h3 className="text-lg font-semibold">Nenhum planejamento encontrado</h3><p className="mt-2 text-sm text-[#697386]">Crie seu primeiro planejamento para começar.</p><Link className="mt-4 inline-block rounded-xl bg-[#0B142A] px-5 py-3 text-sm font-semibold text-white" href="/admin/novo-planejamento">Novo planejamento</Link></div>}
          {!isLoading && projects.length>0 && visibleProjects.length===0 && <div className="mt-6 rounded-xl border border-dashed border-[#E3E7F0] p-8 text-center"><h3 className="font-semibold">Nenhum resultado encontrado</h3><p className="mt-2 text-sm text-[#697386]">Tente outro nome ou filtro.</p><button type="button" onClick={()=>{setSearchTerm("");setStatusFilter("all");}} className="mt-3 cursor-pointer text-sm font-semibold text-[#5123C5] underline">Limpar filtros</button></div>}
          {!isLoading && visibleProjects.length>0 && (
            <div className="mt-6 space-y-3">
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
                  <article key={project.id} className="relative rounded-2xl border border-[#E3E7F0] bg-white p-4 hover:border-[#CDD3E0] sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F0ECFF] text-sm font-semibold text-[#5123C5]">
                          {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <span aria-hidden="true">{clientName.split(" ").slice(0,2).map(w=>w.charAt(0).toUpperCase()).join("")}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-[17px] leading-6 font-bold">{clientName}</h3>
                            <span className={"rounded-full px-2.5 py-1 text-xs font-medium " + getStatusClass(project.status)}>{getStatusLabel(project.status)}</span>
                          </div>
                          <p className="mt-1 break-words text-sm text-[#525B70]">{project.title}</p>
                          {project.description && <p className="mt-1 line-clamp-2 text-xs text-[#697386]">{project.description}</p>}
                          <p className="mt-2 text-xs text-[#697386]">Atualizado em {formatDate(project.updated_at)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                        <Link href={"/admin/planejamentos/"+clientSlug} className="inline-flex min-h-10 items-center rounded-xl bg-[#0B142A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#24304D]">Editar planejamento</Link>
                        <div className="relative">
                          <button type="button" aria-expanded={menuOpen} aria-label={"Mais ações para "+clientName} onClick={()=>setOpenMenuId(menuOpen?null:project.id)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#E3E7F0] text-xl hover:bg-[#F6F7FB]"><span aria-hidden="true">⋯</span></button>
                          {menuOpen && (
                            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-[#E3E7F0] bg-white p-1.5 shadow-xl">
                              <Link href={"/apresentacao/"+project.slug} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-[#F6F7FB]">Ver apresentação</Link>
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
      </section>
      <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-sm font-medium text-[#090D1C] sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia & Consultoria</span></div></footer>
    </main>
  );
}
