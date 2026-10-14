"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { moduleCategories, planningModules } from "@/data/modules";
import { MetodoFooter, MetodoLogo } from "@/Components/MetodoBrand";
import { supabase } from "@/lib/supabase";

type NewPlanningDraft = {
  clientName: string;
  clientSlug: string;
  projectTitle: string;
  projectSlug: string;
  description: string;
  coverImageUrl: string;
};

type ScheduleKey =
  | "essencia-do-projeto"
  | "fundamentos-estrategicos"
  | "estrategia-editorial-e-canais"
  | "campanhas-automacoes-e-conversao"
  | "execucao-acompanhamento-e-gestao";

type DeliverySchedule = Record<ScheduleKey, string>;

const SCHEDULE_GROUPS: { key: ScheduleKey; label: string }[] = [
  { key: "essencia-do-projeto", label: "Essência do Projeto" },
  { key: "fundamentos-estrategicos", label: "Fundamentos Estratégicos do Projeto" },
  { key: "estrategia-editorial-e-canais", label: "Estratégia Editorial e Canais de Conteúdo" },
  { key: "campanhas-automacoes-e-conversao", label: "Campanhas, Automações e Conversão" },
  { key: "execucao-acompanhamento-e-gestao", label: "Execução, Acompanhamento e Gestão" },
];

const EMPTY_SCHEDULE: DeliverySchedule = {
  "essencia-do-projeto": "",
  "fundamentos-estrategicos": "",
  "estrategia-editorial-e-canais": "",
  "campanhas-automacoes-e-conversao": "",
  "execucao-acompanhamento-e-gestao": "",
};

function getStoredDraft(): NewPlanningDraft | null {
  if (typeof window === "undefined") return null;

  const storedDraft = window.localStorage.getItem("metodo-epc-new-planning-draft");
  if (!storedDraft) return null;

  try {
    return JSON.parse(storedDraft) as NewPlanningDraft;
  } catch {
    return null;
  }
}

export default function SelecionarModulosPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<NewPlanningDraft | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule>(EMPTY_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  const selectedCount = selectedModules.length;

  const finalProjectSlug = useMemo(() => {
    if (!draft) return "";
    if (draft.projectSlug.startsWith(draft.clientSlug)) return draft.projectSlug;
    return `${draft.clientSlug}-${draft.projectSlug}`;
  }, [draft]);

  useEffect(() => {
    async function validateAndLoadDraft() {
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

      // Read-only demonstration: no client details or project creation required.
      const previewMode = new URLSearchParams(window.location.search).get("preview") === "1";
      setIsPreview(previewMode);
      const storedDraft = previewMode
        ? { clientName: "Cliente de demonstração", clientSlug: "cliente-demonstracao", projectTitle: "Planejamento Estratégico 2027 — Prévia", projectSlug: "planejamento-demo", description: "", coverImageUrl: "" }
        : getStoredDraft();
      if (!storedDraft) {
        router.push("/admin/novo-planejamento");
        return;
      }

      setDraft(storedDraft);
      setSelectedModules(
        planningModules.filter((m) => m.presentation).map((m) => m.slug)
      );
      setIsLoading(false);
    }

    validateAndLoadDraft();
  }, [router]);

  function toggleModule(moduleSlug: string) {
    setSelectedModules((current) =>
      current.includes(moduleSlug)
        ? current.filter((s) => s !== moduleSlug)
        : [...current, moduleSlug]
    );
  }

  function selectAllModules() {
    setSelectedModules(
      planningModules.filter((m) => m.presentation).map((m) => m.slug)
    );
  }

  function clearModules() {
    setSelectedModules([]);
  }

  function updateScheduleDate(key: ScheduleKey, value: string) {
    setDeliverySchedule((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPreview) {
      setErrorMessage("Modo de pré-visualização: nenhum projeto será criado. Para criar um planejamento real, volte ao painel.");
      return;
    }

    if (!draft) {
      setErrorMessage("Os dados iniciais do planejamento não foram encontrados.");
      return;
    }

    if (selectedModules.length === 0) {
      setErrorMessage("Selecione pelo menos um módulo para o planejamento.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .upsert(
        { name: draft.clientName, slug: draft.clientSlug },
        { onConflict: "slug" }
      )
      .select("id, name, slug")
      .single();

    if (clientError || !client) {
      setErrorMessage(
        clientError?.message || "Não foi possível criar ou atualizar o cliente."
      );
      setIsSaving(false);
      return;
    }

    const selectedModuleRecords = planningModules
      .filter((m) => selectedModules.includes(m.slug))
      .map((m) => ({
        title: m.title,
        slug: m.slug,
        category: m.category,
        description: m.description,
      }));

    // Only save schedule keys that have a date filled
    const filledSchedule = Object.fromEntries(
      Object.entries(deliverySchedule).filter(([, v]) => v !== "")
    );

    const { error: projectError } = await supabase
      .from("planning_projects")
      .insert({
        client_id: client.id,
        title: draft.projectTitle,
        slug: finalProjectSlug,
        description: draft.description || null,
        status: "draft",
        data: {
          coverImageUrl: draft.coverImageUrl || null,
          selectedModules,
          modules: selectedModuleRecords,
          deliverySchedule: Object.keys(filledSchedule).length > 0 ? filledSchedule : null,
        },
      });

    if (projectError) {
      setErrorMessage(
        projectError.message || "Não foi possível criar o planejamento."
      );
      setIsSaving(false);
      return;
    }

    window.localStorage.removeItem("metodo-epc-new-planning-draft");
    router.push("/admin");
  }

  if (isLoading || !draft) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 lg:px-10">
          <MetodoLogo variant="dark" />
          <Link
            href="/admin"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
          >
            Voltar
          </Link>
        </header>
        <section className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-500">Carregando módulos...</p>
          </div>
        </section>
        <MetodoFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 lg:px-10">
        <MetodoLogo variant="dark" />

        <div className="flex items-center gap-3">
          <Link
            href="/admin/novo-planejamento"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
          >
            Voltar
          </Link>
          <Link
            href="/admin"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
          >
            Cancelar
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 lg:px-10">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            Novo planejamento
          </p>

          <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-[-0.04em] text-slate-950">
                Configuração da apresentação
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Selecione quais módulos farão parte do planejamento final do
                cliente. Os módulos escolhidos serão salvos no projeto.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 lg:min-w-72">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-300">
                  {draft.coverImageUrl ? (
                    <img
                      src={draft.coverImageUrl}
                      alt={draft.clientName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-500">
                      {draft.clientName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Cliente</p>
                  <strong className="block text-lg text-slate-950">
                    {draft.clientName}
                  </strong>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <p className="text-sm font-semibold text-slate-500">Planejamento</p>
                <strong className="mt-1 block text-lg text-slate-950">
                  {draft.projectTitle}
                </strong>
                <p className="mt-2 text-xs text-slate-400">
                  Slug final: {finalProjectSlug}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Módulos disponíveis</p>
              <strong className="mt-2 block text-3xl text-slate-950">
                {planningModules.filter((m) => m.presentation).length}
              </strong>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Módulos selecionados</p>
              <strong className="mt-2 block text-3xl text-slate-950">
                {selectedCount}
              </strong>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Status inicial</p>
              <strong className="mt-2 block text-3xl text-slate-950">
                Rascunho
              </strong>
            </div>
          </div>

          {isPreview && (
            <div role="status" className="mt-6 rounded-2xl border border-[#A7E000] bg-[#F5FBDD] px-5 py-4 text-sm font-medium text-[#243100]">
              Modo de pré-visualização — dados fictícios. Você pode testar a seleção dos módulos sem cadastrar um cliente. Nenhum planejamento será criado.
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={selectAllModules}
              className="cursor-pointer rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={clearModules}
              className="cursor-pointer rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
            >
              Limpar seleção
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-10">
            {/* Module selection by category */}
            {moduleCategories.map((category) => {
              const categoryModules = planningModules.filter(
                (m) => m.category === category && m.presentation
              );
              if (categoryModules.length === 0) return null;

              return (
                <section key={category}>
                  <div className="mb-4">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                      Categoria
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em]">
                      {category}
                    </h2>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {categoryModules.map((module) => {
                      const isSelected = selectedModules.includes(module.slug);
                      return (
                        <label
                          key={module.slug}
                          className={`block cursor-pointer rounded-3xl bg-white p-6 shadow-sm ring-1 transition ${
                            isSelected
                              ? "ring-slate-950"
                              : "ring-slate-200 hover:ring-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleModule(module.slug)}
                              className="mt-1 h-5 w-5 rounded border-slate-300"
                            />
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="text-sm font-semibold text-slate-400">
                                  Módulo
                                </p>
                                {isSelected && (
                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                    Selecionado
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-2 text-xl font-bold">{module.title}</h3>
                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                {module.description}
                              </p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* Delivery schedule */}
            <section>
              <div className="mb-4">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Opcional
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em]">
                  Cronograma previsto de entrega
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Essas datas serão exibidas ao cliente enquanto o planejamento estiver em produção.
                  Todos os campos são opcionais.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {SCHEDULE_GROUPS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        {label}
                      </label>
                      <input
                        type="date"
                        value={deliverySchedule[key]}
                        onChange={(e) => updateScheduleDate(key, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-black/10"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/admin/novo-planejamento"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
              >
                Voltar aos dados
              </Link>

              <button
                type="submit"
                disabled={isSaving || isPreview}
                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPreview ? "Pré-visualização — não salva" : isSaving ? "Criando..." : "Criar planejamento"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <MetodoFooter />
    </main>
  );
}
