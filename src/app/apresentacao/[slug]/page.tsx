"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { moduleCategories, planningModules } from "@/data/modules";
import { MetodoFooter, MetodoLogo } from "@/Components/MetodoBrand";
import ResumoEstrategico from "@/Components/apresentacao/ResumoEstrategico";
import EspecialistaPresentation from "@/Components/apresentacao/EspecialistaPresentation";
import EmpresaPresentation from "@/Components/apresentacao/EmpresaPresentation";
import DnaConteudoPresentation from "@/Components/apresentacao/DnaConteudoPresentation";
import TomDeVozPresentation from "@/Components/apresentacao/TomDeVozPresentation";
import IdentidadeVisualPresentation from "@/Components/apresentacao/IdentidadeVisualPresentation";
import ObjetivosPresentation from "@/Components/apresentacao/ObjetivosPresentation";
import ReferenciasConcorrentesPresentation from "@/Components/apresentacao/ReferenciasConcorrentesPresentation";
import PesquisaConcorrenciaPresentation from "@/Components/apresentacao/PesquisaConcorrenciaPresentation";
import AnaliseSwotPresentation from "@/Components/apresentacao/AnaliseSwotPresentation";
import PalavrasChavePresentation from "@/Components/apresentacao/PalavrasChavePresentation";
import PersonasPresentation from "@/Components/apresentacao/PersonasPresentation";
import JornadaCompraPresentation from "@/Components/apresentacao/JornadaCompraPresentation";
import CanaisDigitaisPresentation from "@/Components/apresentacao/CanaisDigitaisPresentation";
import FunilConteudoPresentation from "@/Components/apresentacao/FunilConteudoPresentation";
import LinhasEditoriaisPresentation from "@/Components/apresentacao/LinhasEditoriaisPresentation";
import InstagramPresentation from "@/Components/apresentacao/InstagramPresentation";
import TiktokPresentation from "@/Components/apresentacao/TiktokPresentation";
import YoutubePresentation from "@/Components/apresentacao/YoutubePresentation";
import FacebookPresentation from "@/Components/apresentacao/FacebookPresentation";
import LinkedinPresentation from "@/Components/apresentacao/LinkedinPresentation";
import WhatsappPresentation from "@/Components/apresentacao/WhatsappPresentation";
import BlogPresentation from "@/Components/apresentacao/BlogPresentation";
import PinterestPresentation from "@/Components/apresentacao/PinterestPresentation";
import PodcastsPresentation from "@/Components/apresentacao/PodcastsPresentation";
import LivesPresentation from "@/Components/apresentacao/LivesPresentation";
import MateriaisEducacionaisPresentation from "@/Components/apresentacao/MateriaisEducacionaisPresentation";
import EstrategiaSitePresentation from "@/Components/apresentacao/EstrategiaSitePresentation";
import MapaSitePresentation from "@/Components/apresentacao/MapaSitePresentation";
import CampanhaCaptacaoLeadPresentation from "@/Components/apresentacao/CampanhaCaptacaoLeadPresentation";
import CampanhaConversaoVendasPresentation from "@/Components/apresentacao/CampanhaConversaoVendasPresentation";
import CampanhaDistribuicaoConteudoPresentation from "@/Components/apresentacao/CampanhaDistribuicaoConteudoPresentation";
import FluxoAutomacaoPresentation from "@/Components/apresentacao/FluxoAutomacaoPresentation";
import LinhaTempoPresentation from "@/Components/apresentacao/LinhaTempoPresentation";
import CalendarioConteudoPresentation from "@/Components/apresentacao/CalendarioConteudoPresentation";
import MetricasIndicadoresPresentation from "@/Components/apresentacao/MetricasIndicadoresPresentation";
import OrientacoesAdicionaisPresentation from "@/Components/apresentacao/OrientacoesAdicionaisPresentation";
import { ModuleIcon, ModuleCardIcon } from "@/Components/apresentacao/ModuleIcon";
import { PresentationHeader } from "@/Components/apresentacao/PresentationHeader";
import EcosystemPresentationOverview from "@/Components/apresentacao/EcosystemPresentationOverview";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientRecord = { id: string; name: string; slug: string };

type ProjectData = {
  selectedModules?: string[];
  coverImageUrl?: string | null;
  moduleContent?: Record<string, unknown>;
  deliverySchedule?: Record<string, string> | null;
  ecosystem2027?: { selectedDocumentCodes?: string[]; presentedDocumentCodes?: string[]; version?: number };
};

type PlanningProject = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  data: ProjectData | null;
  client_id: string | null;
  clients: ClientRecord | ClientRecord[] | null;
};

type PresentationSection = {
  slug: string;
  title: string;
  category: string;
  description: string;
  hasContent: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEDULE_GROUPS: { key: string; label: string }[] = [
  { key: "essencia-do-projeto", label: "Essência do Projeto" },
  { key: "fundamentos-estrategicos", label: "Fundamentos Estratégicos do Projeto" },
  { key: "estrategia-editorial-e-canais", label: "Estratégia Editorial e Canais de Conteúdo" },
  { key: "campanhas-automacoes-e-conversao", label: "Campanhas, Automações e Conversão" },
  { key: "execucao-acompanhamento-e-gestao", label: "Execução, Acompanhamento e Gestão" },
];

const introSection: PresentationSection = {
  slug: "resumo-estrategico",
  title: "Comece por aqui",
  category: "Apresentação",
  description:
    "Entenda como navegar pelo planejamento, o que você vai encontrar em cada área e como usar este ambiente para orientar decisões estratégicas.",
  hasContent: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatScheduleDate(dateStr: string) {
  if (!dateStr) return "A definir";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getProjectClient(project: PlanningProject): ClientRecord | null {
  if (Array.isArray(project.clients)) return project.clients[0] ?? null;
  return project.clients ?? null;
}

function displayTitle(section: PresentationSection): string {
  const map: Record<string, string> = {
    "dna-do-especialista": "Especialista",
    "dna-da-empresa": "Empresa",
  };
  return map[section.slug] ?? section.title;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ─── Svg icons ────────────────────────────────────────────────────────────────

function ArrowIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M14 32h34M36 20l12 12-12 12"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── In-production screen (client + draft) ───────────────────────────────────

function InProducaoMode({
  clientName,
  projectTitle,
  coverImageUrl,
  deliverySchedule,
}: {
  clientName: string;
  projectTitle: string;
  coverImageUrl: string | null;
  deliverySchedule: Record<string, string> | null | undefined;
}) {
  const hasSchedule =
    deliverySchedule !== null &&
    deliverySchedule !== undefined &&
    Object.values(deliverySchedule).some(Boolean);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="relative min-h-[420px] overflow-hidden bg-slate-950 text-white">
        {coverImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-slate-950/70" />

        <div className="relative z-10 flex min-h-[420px] flex-col justify-between px-6 py-8 lg:px-16">
          <div>
            <MetodoLogo href="/cliente" size="sm" variant="light" />
          </div>

          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium uppercase tracking-[0.55em] text-white/70">
              Planejamento Estratégico
            </p>
            <h1 className="mt-6 text-5xl font-light tracking-[-0.06em] text-white lg:text-7xl">
              {clientName}
            </h1>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
          <div className="h-1 bg-slate-200" />
          <div className="p-8 lg:p-10">
            <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Em produção
            </span>

            <h2 className="mt-5 text-3xl font-bold tracking-[-0.04em] text-slate-950">
              {clientName}
            </h2>

            <p className="mt-1 text-base font-medium text-slate-500">
              {projectTitle}
            </p>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
              Seu planejamento estratégico está em produção. Nossa equipe está organizando os módulos e preparando a apresentação final. Assim que a entrega for liberada, você poderá visualizar tudo por aqui.
            </p>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <Link
                href="/cliente"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Voltar para minha área
              </Link>
            </div>
          </div>
        </div>

        {hasSchedule && (
          <div className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
            <div className="h-1 bg-slate-200" />
            <div className="p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Cronograma previsto
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">
                Entregas por grupo
              </h3>

              <div className="mt-5 divide-y divide-slate-100">
                {SCHEDULE_GROUPS.map(({ key, label }) => {
                  const dateStr = deliverySchedule?.[key] ?? "";
                  return (
                    <div key={key} className="flex flex-col gap-0.5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-slate-600">{label}</p>
                      <p
                        className={`text-sm font-semibold ${
                          dateStr ? "text-slate-950" : "text-slate-400"
                        }`}
                      >
                        {dateStr ? formatScheduleDate(dateStr) : "A definir"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <MetodoFooter description="Planejamento estratégico desenvolvido pela Rotevo." />
    </main>
  );
}

// ─── Overview (cards grid) ────────────────────────────────────────────────────

function OverviewMode({
  sections,
  clientName,
  projectTitle,
  coverImageUrl,
  isStrategist,
  projectSlug,
  onSelect,
}: {
  sections: PresentationSection[];
  clientName: string;
  projectTitle: string;
  coverImageUrl: string | null;
  isStrategist: boolean;
  projectSlug: string;
  onSelect: (slug: string) => void;
}) {
  const groupedSections = [
    { category: "Apresentação", items: [introSection] },
    ...moduleCategories
      .map((cat) => ({
        category: cat,
        items: sections.filter((s) => s.category === cat),
      }))
      .filter((g) => g.items.length > 0),
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      {/* Hero */}
      <section className="relative min-h-[520px] overflow-hidden bg-slate-950 text-white">
        {coverImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-slate-950/70" />

        <div className="relative z-10 flex min-h-[520px] flex-col justify-between px-6 py-8 lg:px-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <MetodoLogo href="/" size="sm" variant="light" />

            <div className="flex flex-wrap items-center justify-end gap-3">
              {isStrategist && (
                <a
                  href={`/admin/planejamentos/${projectSlug}`}
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-950"
                >
                  Voltar para planejamentos
                </a>
              )}

              {!isStrategist && (
                <a
                  href="/cliente"
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-950"
                >
                  Voltar para minha área
                </a>
              )}

              <a
                href="#modulos"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-950"
              >
                Ver módulos
              </a>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium uppercase tracking-[0.55em] text-white/70">
              Planejamento Estratégico
            </p>
            <h1 className="mt-6 text-5xl font-light tracking-[-0.06em] text-white lg:text-7xl">
              {clientName}
            </h1>
          </div>
        </div>
      </section>

      {/* Module grid */}
      <section id="modulos" className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Planejamento
          </p>
          <h2 className="mt-3 text-5xl font-light tracking-[-0.05em] text-slate-950">
            {clientName}
          </h2>
          {projectTitle && projectTitle !== clientName && (
            <p className="mt-2 text-base font-medium text-slate-500">{projectTitle}</p>
          )}
          <p className="mt-5 max-w-3xl text-lg leading-9 text-slate-600">
            Selecione abaixo o módulo que deseja visualizar. Cada área abre a
            apresentação estratégica correspondente.
          </p>
        </div>

        {sections.length === 0 && (
          <div className="rounded-[2rem] bg-white p-8 text-center ring-1 ring-slate-200">
            <p className="text-slate-500">
              Nenhum módulo foi selecionado para este planejamento ainda.
            </p>
          </div>
        )}

        <div className="space-y-14 border-t border-slate-200 pt-10">
          {groupedSections.map((group) => {
            if (!group.items.length) return null;

            return (
              <section key={group.category}>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  {group.category}
                </p>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((section) => (
                    <button
                      key={section.slug}
                      type="button"
                      onClick={() => onSelect(section.slug)}
                      className="group rotevo-module-card"
                    >
                      <div className="flex gap-5">
                        <ModuleCardIcon slug={section.slug} />

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                              {displayTitle(section)}
                            </h3>
                            {section.slug !== "resumo-estrategico" && (
                              <span
                                className={cx(
                                  "mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
                                  section.hasContent
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {section.hasContent ? "Preenchido" : "Vazio"}
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-sm leading-7 text-slate-600">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <MetodoFooter description="Planejamento estratégico desenvolvido pela Rotevo." />
    </main>
  );
}

// ─── Module placeholder (for modules not yet migrated to dynamic view) ────────

function ModulePlaceholder({ section }: { section: PresentationSection }) {
  return (
    <article className="divide-y divide-slate-100 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
      <PresentationHeader
        area={section.category}
        title={displayTitle(section)}
        slug={section.slug}
      />

      <div className="px-8 py-10 lg:px-12">
        <p className="max-w-2xl text-base leading-8 text-slate-600">
          {section.description}
        </p>

        <div className="mt-8 rounded-2xl bg-slate-50 px-6 py-5 ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <span
              className={cx(
                "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]",
                section.hasContent
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {section.hasContent ? "Conteúdo salvo" : "Sem conteúdo"}
            </span>
            <p className="text-sm text-slate-500">
              {section.hasContent
                ? "Este módulo possui dados preenchidos no planejamento."
                : "Este módulo ainda não foi preenchido no planejamento."}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Detail (sidebar + content) ───────────────────────────────────────────────

function DetailMode({
  sections,
  activeSlug,
  clientName,
  coverImageUrl,
  moduleContent,
  isStrategist,
  onChangeSlug,
  onBackToOverview,
}: {
  sections: PresentationSection[];
  activeSlug: string;
  clientName: string;
  coverImageUrl: string | null;
  moduleContent: Record<string, unknown>;
  isStrategist: boolean;
  onChangeSlug: (slug: string) => void;
  onBackToOverview: () => void;
}) {
  const allSections = [introSection, ...sections];
  const activeSection =
    allSections.find((s) => s.slug === activeSlug) ?? introSection;

  const groupedSections = [
    { category: "Apresentação", items: [introSection] },
    ...moduleCategories
      .map((cat) => ({
        category: cat,
        items: sections.filter((s) => s.category === cat),
      }))
      .filter((g) => g.items.length > 0),
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      {/* Hero */}
      <section className="relative min-h-[580px] overflow-hidden bg-slate-950">
        {coverImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

        <div className="absolute left-6 right-6 top-6 z-20 flex flex-wrap items-center justify-between gap-4">
          <MetodoLogo href="/" size="sm" variant="light" />

          <div className="flex flex-wrap items-center gap-3">
            {!isStrategist && (
              <a
                href="/cliente"
                className="inline-flex cursor-pointer items-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white hover:text-slate-950"
              >
                Voltar para minha área
              </a>
            )}

            <button
              type="button"
              onClick={onBackToOverview}
              className="inline-flex cursor-pointer items-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white hover:text-slate-950"
            >
              Ver módulos
            </button>
          </div>
        </div>

        <div className="relative z-10 flex min-h-[580px] items-center justify-center px-6 py-16 text-center">
          <div className="max-w-5xl">
            <p className="text-xs font-medium uppercase tracking-[0.55em] text-white/70 sm:text-sm">
              Planejamento Estratégico
            </p>
            <h1 className="mt-6 text-5xl font-light tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              {clientName}
            </h1>
          </div>
        </div>
      </section>

      {/* Content area */}
      <section className="px-6 py-8 lg:px-10 lg:py-10 xl:px-14">
        <div className="mx-auto grid max-w-[1520px] gap-8 lg:grid-cols-[315px_minmax(0,1fr)] xl:gap-10">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-[0.32em] text-slate-400">
                Navegação
              </p>
              <h2 className="mt-3 text-2xl font-light tracking-[-0.03em] text-slate-950">
                {clientName}
              </h2>

              <div className="mt-5 flex gap-3 rounded-[1.25rem] bg-slate-50 p-4 text-slate-600 ring-1 ring-slate-200">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm ring-1 ring-slate-200">
                  <ArrowIcon />
                </div>
                <p className="text-sm leading-6">
                  Selecione uma seção para visualizar a apresentação estratégica.
                </p>
              </div>

              <nav className="mt-7 space-y-6">
              {groupedSections.map((group) => (
                <div key={group.category}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {group.category}
                  </p>

                  <div className="space-y-1.5">
                    {group.items.map((section) => {
                      const isActive = section.slug === activeSlug;

                      return (
                        <button
                          key={section.slug}
                          type="button"
                          onClick={() => onChangeSlug(section.slug)}
                          className={cx(
                            "grid w-full cursor-pointer grid-cols-[30px_1fr_auto] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition",
                            isActive
                              ? "bg-slate-950 text-white"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                          )}
                        >
                          <span
                            className={cx(
                              "flex h-7 w-7 items-center justify-center rounded-full",
                              isActive ? "bg-white/10" : "bg-slate-100"
                            )}
                          >
                            <ModuleIcon slug={section.slug} inverted={isActive} />
                          </span>

                          <span className="font-medium">{displayTitle(section)}</span>

                          {section.slug !== "resumo-estrategico" && (
                            <span
                              className={cx(
                                "h-2 w-2 rounded-full shrink-0",
                                section.hasContent
                                  ? "bg-emerald-400"
                                  : "bg-slate-300"
                              )}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <section className="min-w-0">
            {activeSection.slug === "resumo-estrategico" ? (
              <ResumoEstrategico />
            ) : activeSection.slug === "dna-do-especialista" ? (
              <EspecialistaPresentation data={moduleContent["dna-do-especialista"]} />
            ) : activeSection.slug === "dna-da-empresa" ? (
              <EmpresaPresentation data={moduleContent["dna-da-empresa"]} />
            ) : activeSection.slug === "dna-de-conteudo" ? (
              <DnaConteudoPresentation data={moduleContent["dna-de-conteudo"]} />
            ) : activeSection.slug === "tom-de-voz" ? (
              <TomDeVozPresentation data={moduleContent["tom-de-voz"]} />
            ) : activeSection.slug === "identidade-visual" ? (
              <IdentidadeVisualPresentation data={moduleContent["identidade-visual"]} />
            ) : activeSection.slug === "objetivos-do-projeto" ? (
              <ObjetivosPresentation data={moduleContent["objetivos-do-projeto"]} />
            ) : activeSection.slug === "referencias-e-concorrentes" ? (
              <ReferenciasConcorrentesPresentation data={moduleContent["referencias-e-concorrentes"]} />
            ) : activeSection.slug === "pesquisa-de-concorrencia" ? (
              <PesquisaConcorrenciaPresentation data={moduleContent["pesquisa-de-concorrencia"]} />
            ) : activeSection.slug === "analise-swot" ? (
              <AnaliseSwotPresentation data={moduleContent["analise-swot"]} />
            ) : activeSection.slug === "palavras-chave" ? (
              <PalavrasChavePresentation data={moduleContent["palavras-chave"]} />
            ) : activeSection.slug === "personas" ? (
              <PersonasPresentation data={moduleContent["personas"]} />
            ) : activeSection.slug === "jornada-de-compra" ? (
              <JornadaCompraPresentation
                legacyData={moduleContent["jornada-de-compra"]}
                personaJourneysData={moduleContent["jornadas-por-persona"]}
                personasData={moduleContent["personas"]}
              />
            ) : activeSection.slug === "canais-digitais-atuais" ? (
              <CanaisDigitaisPresentation data={moduleContent["canais-digitais-atuais"]} />
            ) : activeSection.slug === "funil-de-conteudo" ? (
              <FunilConteudoPresentation data={moduleContent["funil-de-conteudo"]} />
            ) : activeSection.slug === "linhas-editoriais" ? (
              <LinhasEditoriaisPresentation data={moduleContent["linhas-editoriais"]} />
            ) : activeSection.slug === "instagram" ? (
              <InstagramPresentation data={moduleContent["instagram"]} />
            ) : activeSection.slug === "tiktok" ? (
              <TiktokPresentation data={moduleContent["tiktok"]} />
            ) : activeSection.slug === "youtube" ? (
              <YoutubePresentation data={moduleContent["youtube"]} />
            ) : activeSection.slug === "facebook" ? (
              <FacebookPresentation data={moduleContent["facebook"]} />
            ) : activeSection.slug === "linkedin" ? (
              <LinkedinPresentation data={moduleContent["linkedin"]} />
            ) : activeSection.slug === "whatsapp" ? (
              <WhatsappPresentation data={moduleContent["whatsapp"]} />
            ) : activeSection.slug === "blog" ? (
              <BlogPresentation data={moduleContent["blog"]} />
            ) : activeSection.slug === "pinterest" ? (
              <PinterestPresentation data={moduleContent["pinterest"]} />
            ) : activeSection.slug === "podcasts" ? (
              <PodcastsPresentation data={moduleContent["podcasts"]} />
            ) : activeSection.slug === "lives" ? (
              <LivesPresentation data={moduleContent["lives"]} />
            ) : activeSection.slug === "materiais-educacionais" ? (
              <MateriaisEducacionaisPresentation data={moduleContent["materiais-educacionais"]} />
            ) : activeSection.slug === "estrategia-do-site" ? (
              <EstrategiaSitePresentation data={moduleContent["estrategia-do-site"]} />
            ) : activeSection.slug === "mapa-do-site" ? (
              <MapaSitePresentation data={moduleContent["mapa-do-site"]} />
            ) : activeSection.slug === "campanha-captacao-de-lead" ? (
              <CampanhaCaptacaoLeadPresentation data={moduleContent["campanha-captacao-de-lead"]} />
            ) : activeSection.slug === "campanha-conversao-de-vendas" ? (
              <CampanhaConversaoVendasPresentation data={moduleContent["campanha-conversao-de-vendas"]} />
            ) : activeSection.slug === "campanha-distribuicao-de-conteudo" ? (
              <CampanhaDistribuicaoConteudoPresentation data={moduleContent["campanha-distribuicao-de-conteudo"]} />
            ) : activeSection.slug === "fluxo-de-automacao" ? (
              <FluxoAutomacaoPresentation data={moduleContent["fluxo-de-automacao"]} />
            ) : activeSection.slug === "linha-do-tempo" ? (
              <LinhaTempoPresentation data={moduleContent["linha-do-tempo"]} />
            ) : activeSection.slug === "calendario-de-conteudo" ? (
              <CalendarioConteudoPresentation data={moduleContent["calendario-de-conteudo"]} />
            ) : activeSection.slug === "metricas-e-indicadores" ? (
              <MetricasIndicadoresPresentation data={moduleContent["metricas-e-indicadores"]} />
            ) : activeSection.slug === "orientacoes-adicionais" ? (
              <OrientacoesAdicionaisPresentation data={moduleContent["orientacoes-adicionais"]} />
            ) : (
              <ModulePlaceholder section={activeSection} />
            )}
          </section>
        </div>
      </section>

      <MetodoFooter description="Planejamento estratégico desenvolvido pela Rotevo." />
    </main>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApresentacaoDinamicaPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [project, setProject] = useState<PlanningProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isStrategist, setIsStrategist] = useState(false);
  const [fetchedClientName, setFetchedClientName] = useState("");
  const [viewMode, setViewMode] = useState<"overview" | "detail">("overview");
  const [activeSlug, setActiveSlug] = useState("resumo-estrategico");

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setIsLoading(true);

      // 1. Require authentication
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/");
        return;
      }

      // 2. Fetch profile with client_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, client_id")
        .eq("id", userData.user.id)
        .single();

      if (!profile) {
        await supabase.auth.signOut();
        router.push("/");
        return;
      }

      const isStrat = profile.role === "strategist";
      setIsStrategist(isStrat);

      // 3. Load project
      const { data, error } = await supabase
        .from("planning_projects")
        .select(
          `id, title, slug, description, status, data, client_id, clients (id, name, slug)`
        )
        .eq("slug", slug)
        .single();

      if (error || !data) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      // 4. If client, verify ownership using client_id directly from the project row
      if (!isStrat && profile.role === "client") {
        if (data.client_id !== profile.client_id) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }
        // Fetch client name directly — the join is blocked by RLS for client role
        const { data: clientRow } = await supabase
          .from("clients")
          .select("name")
          .eq("id", profile.client_id)
          .single();
        setFetchedClientName(clientRow?.name ?? "");
      } else if (!isStrat) {
        // Unknown role
        await supabase.auth.signOut();
        router.push("/");
        return;
      }

      setProject(data as unknown as PlanningProject);
      setIsLoading(false);
    }

    load();
  }, [slug, router]);

  const client = project ? getProjectClient(project) : null;
  const clientName = fetchedClientName || client?.name || project?.title || "";
  const selectedModuleSlugs = project?.data?.selectedModules ?? [];
  const coverImageUrl = project?.data?.coverImageUrl ?? null;
  const moduleContent = project?.data?.moduleContent ?? {};

  const sections = useMemo<PresentationSection[]>(() => {
    return selectedModuleSlugs.map((moduleSlug) => {
      const mod = planningModules.find((m) => m.slug === moduleSlug);
      return {
        slug: moduleSlug,
        title: mod?.title ?? moduleSlug,
        category: mod?.category ?? "Outros",
        description: mod?.description ?? "",
        hasContent: moduleSlug in moduleContent,
      };
    });
  }, [selectedModuleSlugs, moduleContent]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">Carregando apresentação...</p>
      </main>
    );
  }

  if (isUnauthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="max-w-md rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-500">
            Acesso não autorizado
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em]">
            Você não tem permissão para acessar esta apresentação.
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Este planejamento não está vinculado à sua conta.
          </p>
          <Link
            href="/cliente"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Ir para minha área
          </Link>
        </div>
      </main>
    );
  }

  if (notFound || !project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="max-w-md rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-500">
            Não encontrado
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em]">
            Apresentação não encontrada.
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            O projeto{" "}
            <span className="font-mono font-semibold">"{slug}"</span> não existe
            ou não está disponível.
          </p>
        </div>
      </main>
    );
  }

  if (!isStrategist && project.status === "draft") {
    return (
      <InProducaoMode
        clientName={clientName}
        projectTitle={project.title}
        coverImageUrl={coverImageUrl}
        deliverySchedule={project.data?.deliverySchedule}
      />
    );
  }

  if (project.data?.ecosystem2027) {
    return (
      <EcosystemPresentationOverview
        clientName={clientName}
        projectTitle={project.title}
        coverImageUrl={coverImageUrl}
        clientSlug={client?.slug ?? ""}
        projectSlug={project.slug}
        isStrategist={isStrategist}
        selectedCodes={project.data.ecosystem2027.selectedDocumentCodes ?? []}
        presentedCodes={project.data.ecosystem2027.presentedDocumentCodes ?? []}
      />
    );
  }

  if (viewMode === "overview") {
    return (
      <OverviewMode
        sections={sections}
        clientName={clientName}
        projectTitle={project.title}
        coverImageUrl={coverImageUrl}
        isStrategist={isStrategist}
        projectSlug={project.slug}
        onSelect={(s) => {
          setActiveSlug(s);
          setViewMode("detail");
        }}
      />
    );
  }

  return (
    <DetailMode
      sections={sections}
      activeSlug={activeSlug}
      clientName={clientName}
      coverImageUrl={coverImageUrl}
      moduleContent={moduleContent}
      isStrategist={isStrategist}
      onChangeSlug={setActiveSlug}
      onBackToOverview={() => setViewMode("overview")}
    />
  );
}
