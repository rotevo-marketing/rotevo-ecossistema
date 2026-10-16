"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import RichTextEditor from "@/Components/RichTextEditor";
import { planningModules } from "@/data/modules";
import { MetodoFooter, MetodoLogo } from "@/Components/MetodoBrand";
import EspecialistaForm, {
  initialSpecialistData,
  SpecialistData,
} from "@/Components/modulos/EspecialistaForm";
import { supabase } from "@/lib/supabase";
import EmpresaForm, {
  CompanyData,
  initialCompanyData,
} from "@/Components/modulos/EmpresaForm";
import DnaConteudoForm, {
  ContentDnaData,
  initialContentDnaData,
} from "@/Components/modulos/DnaConteudoForm";
import TomDeVozForm, {
  initialToneVoiceData,
  ToneVoiceData,
} from "@/Components/modulos/TomDeVozForm";
import IdentidadeVisualForm, {
  initialVisualIdentityData,
  VisualIdentityData,
} from "@/Components/modulos/IdentidadeVisualForm";
import ObjetivosProjetoForm, {
  initialProjectObjectivesData,
  ProjectObjectivesData,
} from "@/Components/modulos/ObjetivosProjetoForm";
import ReferenciasConcorrentesForm, {
  initialReferencesCompetitorsData,
  ReferencesCompetitorsData,
} from "@/Components/modulos/ReferenciasConcorrentesForm";
import PesquisaConcorrenciaForm, {
  CompetitorResearchData,
  initialCompetitorResearchData,
} from "@/Components/modulos/PesquisaConcorrenciaForm";
import AnaliseSwotForm, {
  initialSwotData,
  SwotData,
} from "@/Components/modulos/AnaliseSwotForm";
import PalavrasChaveForm, {
  initialKeywordsData,
  KeywordsData,
} from "@/Components/modulos/PalavrasChaveForm";
import PersonasForm, {
  createEmptyPersona,
  createPersonasWithStableIds,
  getPersonasWithoutStableId,
  initialPersonasData,
  PersonaData,
  PersonasData,
} from "@/Components/modulos/PersonasForm";

import JornadaCompraForm, {
  awarenessLevels,
  buildInitialPersonaJourneysData,
  BuyingJourneyData,
  createEmptyBuyingJourneyData,
  getOrphanedPersonaJourneys,
  hasMeaningfulJourneyContent,
  initialBuyingJourneyData,
  journeyStages,
  LegacyMigrationState,
  PersonaJourneysData,
} from "@/Components/modulos/JornadaCompraForm";
import JornadaPorPersonaForm from "@/Components/modulos/JornadaPorPersonaForm";

import CanaisDigitaisAtuaisForm, {
  CurrentChannelsData,
  initialChannels,
  initialCurrentChannelsData,
} from "@/Components/modulos/CanaisDigitaisAtuaisForm";

import FunilConteudoForm, {
  ContentFunnelData,
  funnelStages,
  initialContentFunnelData,
} from "@/Components/modulos/FunilConteudoForm";
import { normalizeContentFunnelFormatItems } from "@/lib/normalizeContentFunnelThemes";

import LinhasEditoriaisForm, {
  EditorialLinesData,
  initialEditorialLinesData,
} from "@/Components/modulos/LinhasEditoriaisForm";
import {
  normalizeEditorialChannelFrequencies,
  normalizeEditorialTextList,
} from "@/lib/normalizeEditorialLineData";

import InstagramForm from "@/Components/modulos/InstagramForm";
import type { InstagramData } from "@/types/instagram";
import {
  createEmptyInstagramData,
  normalizeInstagramData,
} from "@/lib/normalizeInstagramData";

import TikTokForm, {
  initialTikTokData,
  TikTokData,
  normalizeTikTokData,
} from "@/Components/modulos/TikTokForm";

import YoutubeForm, {
  initialYoutubeData,
  YoutubeData,
  normalizeYoutubeData,
} from "@/Components/modulos/YoutubeForm";

import FacebookForm, {
  initialFacebookData,
  initialFacebookFrequencyItems,
  FacebookData,
  normalizeFacebookTextList,
} from "@/Components/modulos/FacebookForm";

import LinkedInForm, {
  initialLinkedInData,
  LinkedInData,
  normalizeLinkedInData,
} from "@/Components/modulos/LinkedInForm";

import WhatsAppForm, {
  initialWhatsAppData,
  WhatsAppData,
  normalizeWhatsAppData,
} from "@/Components/modulos/WhatsAppForm";

import BlogForm, {
  initialBlogData,
  BlogData,
  normalizeBlogData,
} from "@/Components/modulos/BlogForm";

import PinterestForm, {
  initialPinterestData,
  initialPinterestFrequencyItems,
  PinterestData,
  normalizePinterestTextList,
} from "@/Components/modulos/PinterestForm";

import PodcastsForm, {
  initialPodcastsData,
  initialPodcastsFrequencyItems,
  PodcastsData,
  normalizePodcastsTextList,
} from "@/Components/modulos/PodcastsForm";

import LivesForm, {
  initialLivesData,
  LivesData,
  normalizeLivesData,
} from "@/Components/modulos/LivesForm";

import MateriaisEducacionaisForm, {
  initialEducationalMaterialsData,
  EducationalMaterialsData,
  normalizeEducationalMaterialsData,
} from "@/Components/modulos/MateriaisEducacionaisForm";

import EstrategiaDoSiteForm, {
  initialSiteStrategyData,
  SiteStrategyData,
} from "@/Components/modulos/EstrategiaDoSiteForm";

import MapaDoSiteForm, {
  initialSiteMapData,
  SiteMapData,
} from "@/Components/modulos/MapaDoSiteForm";

import CampanhaCaptacaoLeadForm, {
  initialLeadCaptureCampaignData,
  LeadCaptureCampaignData,
} from "@/Components/modulos/CampanhaCaptacaoLeadForm";

import CampanhaConversaoVendasForm, {
  initialSalesConversionCampaignData,
  SalesConversionCampaignData,
} from "@/Components/modulos/CampanhaConversaoVendasForm";

import CampanhaDistribuicaoConteudoForm, {
  initialContentDistributionCampaignData,
  ContentDistributionCampaignData,
} from "@/Components/modulos/CampanhaDistribuicaoConteudoForm";

import FluxoAutomacaoForm, {
  initialAutomationSystemData,
  AutomationSystemData,
} from "@/Components/modulos/FluxoAutomacaoForm";

import LinhaDoTempoForm, {
  initialTimelineData,
  TimelineData,
} from "@/Components/modulos/LinhaDoTempoForm";

import CalendarioConteudoForm, {
  initialContentCalendarData,
  ContentCalendarData,
} from "@/Components/modulos/CalendarioConteudoForm";

import MetricasIndicadoresForm, {
  initialMetricsData,
  MetricsData,
} from "@/Components/modulos/MetricasIndicadoresForm";

import OrientacoesAdicionaisForm, {
  initialAdditionalGuidelinesData,
  AdditionalGuidelinesData,
} from "@/Components/modulos/OrientacoesAdicionaisForm";

type ClientRecord = {
  id: string;
  name: string;
  slug: string;
};

type GenericModuleData = {
  mainText?: string;
  notes?: string;
  references?: string;
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

type PersonaJourneysMutationContext = {
  personas: PersonaData[];
  legacyJourneyData: BuyingJourneyData | null;
  hasMeaningfulLegacyJourney: boolean;
};

function getProjectClient(project: PlanningProject) {
  if (Array.isArray(project.clients)) {
    return project.clients[0] ?? null;
  }

  return project.clients ?? null;
}

function getStatusLabel(status: PlanningProject["status"]) {
  if (status === "draft") return "Rascunho";
  if (status === "in_progress") return "Em andamento";
  if (status === "published") return "Publicado";
  return "Arquivado";
}

function getStatusClass(status: PlanningProject["status"]) {
  if (status === "published") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "in_progress") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "archived") {
    return "bg-slate-200 text-slate-500";
  }

  return "bg-slate-100 text-slate-600";
}

function isSpecialistData(value: unknown): value is SpecialistData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "fields" in value || "photo" in value || "characteristics" in value;
}

function isGenericModuleData(value: unknown): value is GenericModuleData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "mainText" in value || "notes" in value || "references" in value;
}

export default function ModuloPlanejamentoPage() {
  const router = useRouter();
  const params = useParams();

  const clientSlug =
    typeof params.clientSlug === "string" ? params.clientSlug : "";

  const moduleSlug =
    typeof params.moduleSlug === "string" ? params.moduleSlug : "";

  const [project, setProject] = useState<PlanningProject | null>(null);
  const [specialistData, setSpecialistData] = useState<SpecialistData>(
    initialSpecialistData
  );
  const [companyData, setCompanyData] = useState<CompanyData>(
  initialCompanyData
);
const [contentDnaData, setContentDnaData] = useState<ContentDnaData>(
  initialContentDnaData
);
const [toneVoiceData, setToneVoiceData] =
  useState<ToneVoiceData>(initialToneVoiceData);
  const [genericData, setGenericData] = useState<GenericModuleData>({
    mainText: "",
    notes: "",
    references: "",
  });
  const [visualIdentityData, setVisualIdentityData] =
  useState<VisualIdentityData>(initialVisualIdentityData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [projectObjectivesData, setProjectObjectivesData] =
  useState<ProjectObjectivesData>(initialProjectObjectivesData);
  const [referencesCompetitorsData, setReferencesCompetitorsData] =
  useState<ReferencesCompetitorsData>(initialReferencesCompetitorsData);
  const [competitorResearchData, setCompetitorResearchData] =
  useState<CompetitorResearchData>(initialCompetitorResearchData);
  const [swotData, setSwotData] = useState<SwotData>(initialSwotData);
  const [keywordsData, setKeywordsData] =
  useState<KeywordsData>(initialKeywordsData);
  const [personasData, setPersonasData] =
  useState<PersonasData>(initialPersonasData);
  const [buyingJourneyData, setBuyingJourneyData] =
  useState<BuyingJourneyData>(initialBuyingJourneyData);
const [personaJourneysData, setPersonaJourneysData] =
  useState<PersonaJourneysData>(buildInitialPersonaJourneysData(false));
const [isPreparingPersonas, setIsPreparingPersonas] = useState(false);
const [preparePersonasError, setPreparePersonasError] = useState("");
const [isSavingPersonaJourneys, setIsSavingPersonaJourneys] = useState(false);
const [personaJourneysSaveError, setPersonaJourneysSaveError] = useState("");
const [journeyPersonasSource, setJourneyPersonasSource] = useState<
  "loading" | "ready" | "missing" | "invalid"
>("loading");
const [selectedLegacyPersonaId, setSelectedLegacyPersonaId] = useState("");
  const [currentChannelsData, setCurrentChannelsData] =
  useState<CurrentChannelsData>(initialCurrentChannelsData);
  const [contentFunnelData, setContentFunnelData] =
  useState<ContentFunnelData>(initialContentFunnelData);
  const [editorialLinesData, setEditorialLinesData] =
  useState<EditorialLinesData>(initialEditorialLinesData);
  const [instagramData, setInstagramData] =
  useState<InstagramData>(() => createEmptyInstagramData());
  const [tiktokData, setTiktokData] =
  useState<TikTokData>(initialTikTokData);
  const [youtubeData, setYoutubeData] =
  useState<YoutubeData>(initialYoutubeData);
  const [facebookData, setFacebookData] =
  useState<FacebookData>(initialFacebookData);
  const [linkedinData, setLinkedinData] =
  useState<LinkedInData>(initialLinkedInData);
  const [whatsappData, setWhatsappData] =
  useState<WhatsAppData>(initialWhatsAppData);
  const [blogData, setBlogData] =
  useState<BlogData>(initialBlogData);
  const [pinterestData, setPinterestData] =
  useState<PinterestData>(initialPinterestData);
  const [podcastsData, setPodcastsData] =
  useState<PodcastsData>(initialPodcastsData);
  const [livesData, setLivesData] =
  useState<LivesData>(initialLivesData);
  const [educationalMaterialsData, setEducationalMaterialsData] =
  useState<EducationalMaterialsData>(initialEducationalMaterialsData);
  const [siteStrategyData, setSiteStrategyData] =
  useState<SiteStrategyData>(initialSiteStrategyData);
  const [siteMapData, setSiteMapData] =
  useState<SiteMapData>(initialSiteMapData);
  const [leadCaptureCampaignData, setLeadCaptureCampaignData] =
  useState<LeadCaptureCampaignData>(initialLeadCaptureCampaignData);
  const [salesConversionCampaignData, setSalesConversionCampaignData] =
  useState<SalesConversionCampaignData>(initialSalesConversionCampaignData);
  const [contentDistributionCampaignData, setContentDistributionCampaignData] =
  useState<ContentDistributionCampaignData>(initialContentDistributionCampaignData);
  const [automationSystemData, setAutomationSystemData] =
  useState<AutomationSystemData>(initialAutomationSystemData);
  const [timelineData, setTimelineData] =
  useState<TimelineData>(initialTimelineData);
  const [contentCalendarData, setContentCalendarData] =
  useState<ContentCalendarData>(initialContentCalendarData);
  const [metricsData, setMetricsData] =
  useState<MetricsData>(initialMetricsData);
  const [additionalGuidelinesData, setAdditionalGuidelinesData] =
  useState<AdditionalGuidelinesData>(initialAdditionalGuidelinesData);

  const module = useMemo(() => {
    return planningModules.find((item) => item.slug === moduleSlug) ?? null;
  }, [moduleSlug]);

  const client = project ? getProjectClient(project) : null;

  const selectedModules = useMemo(() => {
    return project?.data?.selectedModules ?? [];
  }, [project]);

  const isModuleSelected = selectedModules.includes(moduleSlug);
  const isSpecialistModule = moduleSlug === "dna-do-especialista";
  const isCompanyModule = moduleSlug === "dna-da-empresa";
  const isContentDnaModule = moduleSlug === "dna-de-conteudo";
  const isToneVoiceModule = moduleSlug === "tom-de-voz";
  const isVisualIdentityModule = moduleSlug === "identidade-visual";
  const isProjectObjectivesModule = moduleSlug === "objetivos-do-projeto";
  const isReferencesCompetitorsModule =
  moduleSlug === "referencias-e-concorrentes";
  const isCompetitorResearchModule = moduleSlug === "pesquisa-de-concorrencia";
  const isSwotModule = moduleSlug === "analise-swot";
  const isKeywordsModule = moduleSlug === "palavras-chave";
  const isPersonasModule = moduleSlug === "personas";
  const isBuyingJourneyModule = moduleSlug === "jornada-de-compra";
  const isCurrentChannelsModule = moduleSlug === "canais-digitais-atuais";
  const isContentFunnelModule = moduleSlug === "funil-de-conteudo";
  const isEditorialLinesModule = moduleSlug === "linhas-editoriais";
  const isInstagramModule = moduleSlug === "instagram";
  const isTiktokModule = moduleSlug === "tiktok";
  const isYoutubeModule = moduleSlug === "youtube";
  const isFacebookModule = moduleSlug === "facebook";
  const isLinkedinModule = moduleSlug === "linkedin";
  const isWhatsappModule = moduleSlug === "whatsapp";
  const isBlogModule = moduleSlug === "blog";
  const isPinterestModule = moduleSlug === "pinterest";
  const isPodcastsModule = moduleSlug === "podcasts";
  const isLivesModule = moduleSlug === "lives";
  const isEducationalMaterialsModule = moduleSlug === "materiais-educacionais";
  const isSiteStrategyModule = moduleSlug === "estrategia-do-site";
  const isSiteMapModule = moduleSlug === "mapa-do-site";
  const isLeadCaptureCampaignModule =
  moduleSlug === "campanha-captacao-de-lead";
  const isSalesConversionCampaignModule =
  moduleSlug === "campanha-conversao-de-vendas";
  const isContentDistributionCampaignModule =
  moduleSlug === "campanha-distribuicao-de-conteudo";
  const isAutomationSystemModule = moduleSlug === "fluxo-de-automacao";
  const isTimelineModule = moduleSlug === "linha-do-tempo";
  const isContentCalendarModule = moduleSlug === "calendario-de-conteudo";
  const isMetricsModule = moduleSlug === "metricas-e-indicadores";
  const isAdditionalGuidelinesModule = moduleSlug === "orientacoes-adicionais";

  const relatedModules = useMemo(() => {
    return planningModules.filter(
      (item) =>
        item.presentation &&
        item.category === module?.category &&
        selectedModules.includes(item.slug)
    );
  }, [module?.category, selectedModules]);

  const needsPersonaPreparation = useMemo(
    () =>
      isBuyingJourneyModule
        ? getPersonasWithoutStableId(personasData.personas).length > 0
        : false,
    [isBuyingJourneyModule, personasData.personas]
  );

  const orphanedPersonaJourneys = useMemo(
    () =>
      isBuyingJourneyModule
        ? getOrphanedPersonaJourneys(
            personasData.personas,
            personaJourneysData.journeys
          )
        : {},
    [isBuyingJourneyModule, personasData.personas, personaJourneysData.journeys]
  );

  const eligiblePersonasForLegacyMigration = useMemo(
    () =>
      isBuyingJourneyModule &&
      personaJourneysData.legacyMigration.status === "pending"
        ? personasData.personas.filter(
            (p) => p.id?.trim() && !personaJourneysData.journeys[p.id]
          )
        : [],
    [
      isBuyingJourneyModule,
      personaJourneysData.legacyMigration.status,
      personaJourneysData.journeys,
      personasData.personas,
    ]
  );

  useEffect(() => {
    async function loadModuleData() {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      setJourneyPersonasSource("loading");

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

      const savedContent =
        foundProject.data?.moduleContent?.[moduleSlug] ?? null;

      setProject(foundProject);

      if (isSpecialistModule && isSpecialistData(savedContent)) {
        setSpecialistData({
          fields: savedContent.fields || {},
          photo: savedContent.photo || "",
          characteristics: savedContent.characteristics?.length
            ? savedContent.characteristics
            : initialSpecialistData.characteristics,
        });
      }

      if (isCompanyModule && isCompanyData(savedContent)) {
  setCompanyData({
    fields: savedContent.fields || {},
  });
}

if (isContentDnaModule && isContentDnaData(savedContent)) {
  setContentDnaData({
    fields: savedContent.fields || {},
    secondaryIdeas: savedContent.secondaryIdeas?.length
      ? savedContent.secondaryIdeas
      : initialContentDnaData.secondaryIdeas,
  });
}

if (isToneVoiceModule && isToneVoiceData(savedContent)) {
  setToneVoiceData({
    characteristics: savedContent.characteristics?.length
      ? savedContent.characteristics
      : initialToneVoiceData.characteristics,
    toneChoices: savedContent.toneChoices || {},
    vocabulary: savedContent.vocabulary || {},
    emotions: Array.isArray(savedContent.emotions)
      ? savedContent.emotions
      : [],
    observations: savedContent.observations || "",
    references: savedContent.references?.length
      ? savedContent.references
      : initialToneVoiceData.references,
  });
}

if (isVisualIdentityModule && isVisualIdentityData(savedContent)) {
  setVisualIdentityData({
    fields: savedContent.fields || {},
    colors:
      Array.isArray(savedContent.colors) && savedContent.colors.length
        ? savedContent.colors
        : initialVisualIdentityData.colors,
    visualReferences: savedContent.visualReferences?.length
      ? savedContent.visualReferences
      : initialVisualIdentityData.visualReferences,
    externalReferences: savedContent.externalReferences?.length
      ? savedContent.externalReferences
      : initialVisualIdentityData.externalReferences,
  });
}

if (isProjectObjectivesModule && isProjectObjectivesData(savedContent)) {
  setProjectObjectivesData({
    mainObjective:
      savedContent.mainObjective || initialProjectObjectivesData.mainObjective,
    secondaryObjectives: Array.isArray(savedContent.secondaryObjectives)
      ? savedContent.secondaryObjectives
      : initialProjectObjectivesData.secondaryObjectives,
    priorities: Array.isArray(savedContent.priorities)
      ? savedContent.priorities
      : initialProjectObjectivesData.priorities,
    successIndicators: Array.isArray(savedContent.successIndicators)
      ? savedContent.successIndicators
      : initialProjectObjectivesData.successIndicators,
    expectedResults: Array.isArray(savedContent.expectedResults)
      ? savedContent.expectedResults
      : initialProjectObjectivesData.expectedResults,
    phases: Array.isArray(savedContent.phases)
      ? savedContent.phases
      : initialProjectObjectivesData.phases,
    strategicObservation: savedContent.strategicObservation || "",
  });
}

if (
  isReferencesCompetitorsModule &&
  isReferencesCompetitorsData(savedContent)
) {
  setReferencesCompetitorsData({
    items:
      Array.isArray(savedContent.items) && savedContent.items.length
        ? savedContent.items
        : initialReferencesCompetitorsData.items,
  });
}

if (
  isCompetitorResearchModule &&
  isCompetitorResearchData(savedContent)
) {
  setCompetitorResearchData({
    competitors:
      Array.isArray(savedContent.competitors) &&
      savedContent.competitors.length
        ? savedContent.competitors.map((competitor) => ({
            image: competitor.image || "",
            name: competitor.name || "",
            website: competitor.website || "",
            positioning: competitor.positioning || "",
            targetAudience: competitor.targetAudience || "",
            productAndDelivery: competitor.productAndDelivery || "",
            channelsAndVisibility: competitor.channelsAndVisibility || "",
            contentAndCommunication: competitor.contentAndCommunication || "",
            funnelAndConversion: competitor.funnelAndConversion || "",
            strengths: competitor.strengths || "",
            opportunities: competitor.opportunities || "",
          }))
        : initialCompetitorResearchData.competitors,
  });
}

function isCompetitorResearchData(
  value: unknown
): value is CompetitorResearchData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "competitors" in value;
}

if (isSwotModule && isSwotData(savedContent)) {
  setSwotData({
    fields: savedContent.fields || {},
    synthesis: savedContent.synthesis || "",
  });
}

if (isKeywordsModule && isKeywordsData(savedContent)) {
  setKeywordsData({
    sortBy: savedContent.sortBy || "adicao",
    keywords:
      Array.isArray(savedContent.keywords) && savedContent.keywords.length
        ? savedContent.keywords.map((item) => ({
            keyword: item.keyword || "",
            volume: item.volume || "",
            observation: item.observation || "",
          }))
        : initialKeywordsData.keywords,
    strategicObservation: savedContent.strategicObservation || "",
  });
}

if (isPersonasModule && isPersonasData(savedContent)) {
  setPersonasData({
    personas:
      Array.isArray(savedContent.personas) && savedContent.personas.length
        ? savedContent.personas.map((persona) => ({
            ...createEmptyPersona(),
            ...persona,
            behaviors: {
              ...createEmptyPersona().behaviors,
              ...(persona.behaviors || {}),
            },
          }))
        : initialPersonasData.personas,
  });
}

if (isBuyingJourneyModule && isBuyingJourneyData(savedContent)) {
  setBuyingJourneyData({
    overview: savedContent.overview || "",
    stages:
      Array.isArray(savedContent.stages) && savedContent.stages.length
        ? journeyStages.map((_, index) => ({
            awarenessLevel:
              savedContent.stages[index]?.awarenessLevel || awarenessLevels[0],
            thoughts: savedContent.stages[index]?.thoughts || "",
            pains: savedContent.stages[index]?.pains || "",
            recommendedContent:
              savedContent.stages[index]?.recommendedContent || "",
            recommendedChannels:
              savedContent.stages[index]?.recommendedChannels || "",
            desiredNextStep:
              savedContent.stages[index]?.desiredNextStep || "",
            conversionPoint:
              savedContent.stages[index]?.conversionPoint || "",
          }))
        : initialBuyingJourneyData.stages,
    turningPoints: {
      discoveryToPain: savedContent.turningPoints?.discoveryToPain || "",
      painToSolution: savedContent.turningPoints?.painToSolution || "",
      solutionToComparison:
        savedContent.turningPoints?.solutionToComparison || "",
      comparisonToDecision:
        savedContent.turningPoints?.comparisonToDecision || "",
    },
    objections: {
      beginning: savedContent.objections?.beginning || "",
      middle: savedContent.objections?.middle || "",
      end: savedContent.objections?.end || "",
    },
    advancementTriggers: savedContent.advancementTriggers || "",
    essentialContent: {
      awareness: savedContent.essentialContent?.awareness || "",
      decision: savedContent.essentialContent?.decision || "",
    },
    funnelCampaignsAutomation: savedContent.funnelCampaignsAutomation || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((reference) => ({
            title: reference.title || "",
            link: reference.link || "",
          }))
        : initialBuyingJourneyData.references,
  });
}

if (isBuyingJourneyModule) {
  // Load personas from the persisted source; never fall back to initialPersonasData
  const rawPersonasContent =
    foundProject.data?.moduleContent?.["personas"];

  if (rawPersonasContent == null) {
    setPersonasData({ personas: [] });
    setJourneyPersonasSource("missing");
  } else if (!isPersonasData(rawPersonasContent)) {
    setPersonasData({ personas: [] });
    setJourneyPersonasSource("invalid");
  } else {
    const loadedPersonas =
      Array.isArray(rawPersonasContent.personas) &&
      rawPersonasContent.personas.length > 0
        ? rawPersonasContent.personas.map((persona) => ({
            ...createEmptyPersona(),
            ...persona,
            // Preserve the stored id exactly; do not generate one during load
            id: persona.id?.trim() || undefined,
            behaviors: {
              ...createEmptyPersona().behaviors,
              ...(persona.behaviors || {}),
            },
          }))
        : [];
    setPersonasData({ personas: loadedPersonas });
    setJourneyPersonasSource("ready");
  }

  // Load per-persona journeys from the new key
  const rawPersonaJourneys =
    foundProject.data?.moduleContent?.["jornadas-por-persona"] ?? null;

  if (
    !rawPersonaJourneys ||
    typeof rawPersonaJourneys !== "object" ||
    Array.isArray(rawPersonaJourneys)
  ) {
    // Key does not exist yet — build initial state; detect legacy content
    setPersonaJourneysData(
      buildInitialPersonaJourneysData(hasMeaningfulJourneyContent(savedContent))
    );
  } else {
    const raw = rawPersonaJourneys as Record<string, unknown>;

    // Normalize journeys map — preserve every valid entry, skip nothing silently
    const normalizedJourneys: Record<string, BuyingJourneyData> = {};
    if (
      raw.journeys &&
      typeof raw.journeys === "object" &&
      !Array.isArray(raw.journeys)
    ) {
      for (const [personaId, entry] of Object.entries(
        raw.journeys as Record<string, unknown>
      )) {
        if (isBuyingJourneyData(entry)) {
          normalizedJourneys[personaId] = {
            overview: entry.overview || "",
            stages:
              Array.isArray(entry.stages) && entry.stages.length
                ? journeyStages.map((_, i) => ({
                    awarenessLevel:
                      entry.stages[i]?.awarenessLevel || awarenessLevels[0],
                    thoughts: entry.stages[i]?.thoughts || "",
                    pains: entry.stages[i]?.pains || "",
                    recommendedContent:
                      entry.stages[i]?.recommendedContent || "",
                    recommendedChannels:
                      entry.stages[i]?.recommendedChannels || "",
                    desiredNextStep: entry.stages[i]?.desiredNextStep || "",
                    conversionPoint: entry.stages[i]?.conversionPoint || "",
                  }))
                : initialBuyingJourneyData.stages,
            turningPoints: {
              discoveryToPain: entry.turningPoints?.discoveryToPain || "",
              painToSolution: entry.turningPoints?.painToSolution || "",
              solutionToComparison:
                entry.turningPoints?.solutionToComparison || "",
              comparisonToDecision:
                entry.turningPoints?.comparisonToDecision || "",
            },
            objections: {
              beginning: entry.objections?.beginning || "",
              middle: entry.objections?.middle || "",
              end: entry.objections?.end || "",
            },
            advancementTriggers: entry.advancementTriggers || "",
            essentialContent: {
              awareness: entry.essentialContent?.awareness || "",
              decision: entry.essentialContent?.decision || "",
            },
            funnelCampaignsAutomation: entry.funnelCampaignsAutomation || "",
            references:
              Array.isArray(entry.references) && entry.references.length
                ? entry.references.map(
                    (r: { title?: string; link?: string }) => ({
                      title: r.title || "",
                      link: r.link || "",
                    })
                  )
                : initialBuyingJourneyData.references,
          };
        }
      }
    }

    // Normalize legacyMigration — recover status; fill gaps without discarding data
    const rawMigration = raw.legacyMigration as
      | Record<string, unknown>
      | undefined;
    const validStatuses = ["not-required", "pending", "completed"] as const;
    const migrationStatus: LegacyMigrationState["status"] =
      rawMigration?.status &&
      validStatuses.includes(
        rawMigration.status as (typeof validStatuses)[number]
      )
        ? (rawMigration.status as LegacyMigrationState["status"])
        : hasMeaningfulJourneyContent(savedContent)
        ? "pending"
        : "not-required";

    setPersonaJourneysData({
      version: 2,
      journeys: normalizedJourneys,
      legacyMigration: {
        status: migrationStatus,
        assignedPersonaId:
          typeof rawMigration?.assignedPersonaId === "string"
            ? rawMigration.assignedPersonaId
            : undefined,
        migratedAt:
          typeof rawMigration?.migratedAt === "string"
            ? rawMigration.migratedAt
            : undefined,
      },
    });
  }
}

if (isCurrentChannelsModule && isCurrentChannelsData(savedContent)) {
  setCurrentChannelsData({
    channels:
      Array.isArray(savedContent.channels) && savedContent.channels.length
        ? savedContent.channels.map((channel) => ({
            nome: channel.nome || "",
            descricao: channel.descricao || "",
            link: channel.link || "",
          }))
        : initialChannels,
    observation: savedContent.observation || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((reference) => ({
            title: reference.title || "",
            link: reference.link || "",
          }))
        : initialCurrentChannelsData.references,
  });
}

if (isContentFunnelModule && isContentFunnelData(savedContent)) {
  setContentFunnelData({
    stages:
      Array.isArray(savedContent.stages) && savedContent.stages.length
        ? funnelStages.map((_, index) => ({
            strategy: savedContent.stages[index]?.strategy || "",
            objective: savedContent.stages[index]?.objective || "",
            nextStep: savedContent.stages[index]?.nextStep || "",
            themes: savedContent.stages[index]?.themes || "",
            recommendedFormat:
              savedContent.stages[index]?.recommendedFormat || "Reels",
            themeItems: savedContent.stages[index]?.themeItems,
            formatItems: normalizeContentFunnelFormatItems(
              savedContent.stages[index]?.formatItems,
              savedContent.stages[index]?.themeItems,
              savedContent.stages[index]?.themes
            ),
            ctas: savedContent.stages[index]?.ctas || "",
          }))
        : initialContentFunnelData.stages,
    overview: savedContent.overview || "",
    distribution: {
      attraction: savedContent.distribution?.attraction || "",
      connection: savedContent.distribution?.connection || "",
      bonding: savedContent.distribution?.bonding || "",
      sales: savedContent.distribution?.sales || "",
      repurchase: savedContent.distribution?.repurchase || "",
    },
    metrics: {
      attraction: savedContent.metrics?.attraction || "",
      connection: savedContent.metrics?.connection || "",
      bonding: savedContent.metrics?.bonding || "",
      sales: savedContent.metrics?.sales || "",
      repurchase: savedContent.metrics?.repurchase || "",
    },
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((reference) => ({
            title: reference.title || "",
            link: reference.link || "",
          }))
        : initialContentFunnelData.references,
  });
}

if (isEditorialLinesModule && isEditorialLinesData(savedContent)) {
  setEditorialLinesData({
    lines:
      Array.isArray(savedContent.lines) && savedContent.lines.length
        ? savedContent.lines.map((line) => ({
            title: line.title || "",
            objective: line.objective || "",
            description: line.description || "",
            targetAudience: line.targetAudience || "",
            contentPillars: line.contentPillars || "",
            formats: line.formats || "",
            frequency: line.frequency || "",
            examples: line.examples || "",
            notes: line.notes || "",
            lineType: line.lineType || "",
            priority: line.priority || "",
            channelFrequencies: normalizeEditorialChannelFrequencies(line.channelFrequencies),
            priorityPersonas: normalizeEditorialTextList(line.priorityPersonas, ""),
            journeyRoles: normalizeEditorialTextList(line.journeyRoles, ""),
            mainPillars: normalizeEditorialTextList(line.mainPillars, line.contentPillars),
            priorityFormats: normalizeEditorialTextList(line.priorityFormats, line.formats),
            contentExamples: normalizeEditorialTextList(line.contentExamples, line.examples),
            relatedOffers: normalizeEditorialTextList(line.relatedOffers, ""),
            conductionMoment: line.conductionMoment || "",
            primaryIndicators: normalizeEditorialTextList(line.primaryIndicators, ""),
          }))
        : initialEditorialLinesData.lines,
    generalGuidelines: savedContent.generalGuidelines || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((reference) => ({
            title: reference.title || "",
            link: reference.link || "",
          }))
        : initialEditorialLinesData.references,
  });
}

if (isInstagramModule) {
  setInstagramData(normalizeInstagramData(savedContent));
}

if (isTiktokModule && isTikTokData(savedContent)) {
  setTiktokData(normalizeTikTokData(savedContent));
}

if (isYoutubeModule && isYoutubeData(savedContent)) {
  setYoutubeData(normalizeYoutubeData(savedContent));
}

if (isFacebookModule && isFacebookData(savedContent)) {
  setFacebookData({
    frequencyItems:
      Array.isArray(savedContent.frequencyItems) &&
      savedContent.frequencyItems.length
        ? savedContent.frequencyItems.map((item) => ({
            format: item.format || "",
            quantity: item.quantity || "",
            period: item.period || "por semana",
            observation: item.observation || "",
          }))
        : initialFacebookFrequencyItems,
    objectives: normalizeFacebookTextList(savedContent.objectives),
    languageStructures: normalizeFacebookTextList(savedContent.languageStructures),
    contents: normalizeFacebookTextList(savedContent.contents),
    visualStrategy: savedContent.visualStrategy || "",
    visualReferences:
      Array.isArray(savedContent.visualReferences) &&
      savedContent.visualReferences.length
        ? savedContent.visualReferences.map((reference) => ({
            image: reference.image || "",
          }))
        : initialFacebookData.visualReferences,
    pagePhoto: savedContent.pagePhoto || "",
    pageCover: savedContent.pageCover || "",
    pageName: savedContent.pageName || "",
    pageCategory: savedContent.pageCategory || "",
    pageDescription: savedContent.pageDescription || "",
    siteLink: savedContent.siteLink || "",
    contactLink: savedContent.contactLink || "",
    serviceRegion: savedContent.serviceRegion || "",
    otherLinks: savedContent.otherLinks || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((reference) => ({
            title: reference.title || "",
            link: reference.link || "",
          }))
        : initialFacebookData.references,
  });
}

if (isLinkedinModule && isLinkedInData(savedContent)) {
  setLinkedinData(normalizeLinkedInData(savedContent));
}

if (isWhatsappModule && isWhatsAppData(savedContent)) {
  setWhatsappData(normalizeWhatsAppData(savedContent));
}

if (isBlogModule && isBlogData(savedContent)) {
  setBlogData(normalizeBlogData(savedContent));
}

if (isPodcastsModule && isPodcastsData(savedContent)) {
  setPodcastsData({
    frequencyItems:
      Array.isArray(savedContent.frequencyItems) &&
      savedContent.frequencyItems.length
        ? savedContent.frequencyItems.map((item) => ({
            format: item.format || "",
            quantity: item.quantity || "",
            period: item.period || "por semana",
            observation: item.observation || "",
          }))
        : initialPodcastsFrequencyItems,
    objectives: normalizePodcastsTextList(savedContent.objectives),
    languageStructures: normalizePodcastsTextList(savedContent.languageStructures),
    mainFormat: savedContent.mainFormat || "",
    durationAndRhythm: savedContent.durationAndRhythm || "",
    seriesOrSegments: savedContent.seriesOrSegments || "",
    guestsAndParticipants: savedContent.guestsAndParticipants || "",
    visualStrategy: savedContent.visualStrategy || "",
    visualReferences:
      Array.isArray(savedContent.visualReferences) &&
      savedContent.visualReferences.length
        ? savedContent.visualReferences.map((r) => ({
            image: r.image || "",
          }))
        : initialPodcastsData.visualReferences,
    contents:
      Array.isArray(savedContent.contents) && savedContent.contents.length
        ? savedContent.contents.map((c) => ({
            title: c.title || "",
            suggestedDate: c.suggestedDate || "",
            guestOrResponsible: c.guestOrResponsible || "",
            format: c.format || "",
            observation: c.observation || "",
          }))
        : initialPodcastsData.contents,
    publishingPlatforms: savedContent.publishingPlatforms || "",
    repurposingStrategy: savedContent.repurposingStrategy || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((r) => ({
            title: r.title || "",
            link: r.link || "",
          }))
        : initialPodcastsData.references,
  });
}

if (isSiteMapModule && isSiteMapData(savedContent)) {
  setSiteMapData({
    pages:
      Array.isArray(savedContent.pages) && savedContent.pages.length
        ? savedContent.pages.map((p) => ({
            title: p.title || "",
            type: p.type || "Institucional",
            objective: p.objective || "",
            description: p.description || "",
            requiredSections: p.requiredSections || "",
            mainCta: p.mainCta || "",
            priority: p.priority || "Alta",
          }))
        : initialSiteMapData.pages,
    strategicNotes: savedContent.strategicNotes || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((r) => ({
            title: r.title || "",
            link: r.link || "",
          }))
        : initialSiteMapData.references,
  });
}

if (isSiteStrategyModule && isSiteStrategyData(savedContent)) {
  setSiteStrategyData({
    visualIdentity: savedContent.visualIdentity || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((r) => ({
            title: r.title || "",
            url: r.url || "",
          }))
        : [{ title: "", url: "" }],
    integrations:
      Array.isArray(savedContent.integrations) && savedContent.integrations.length
        ? savedContent.integrations.map((i) => ({ name: i.name || "" }))
        : [{ name: "" }],
    essentialPages:
      Array.isArray(savedContent.essentialPages) && savedContent.essentialPages.length
        ? savedContent.essentialPages.map((p) => ({ value: p.value || "" }))
        : [{ value: "" }],
    importantFeatures:
      Array.isArray(savedContent.importantFeatures) && savedContent.importantFeatures.length
        ? savedContent.importantFeatures.map((f) => ({ value: f.value || "" }))
        : [{ value: "" }],
    strategicNotes: savedContent.strategicNotes || "",
    externalReferences:
      Array.isArray(savedContent.externalReferences) && savedContent.externalReferences.length
        ? savedContent.externalReferences.map((r) => ({
            title: r.title || "",
            link: r.link || "",
          }))
        : [{ title: "", link: "" }],
  });
}

if (isEducationalMaterialsModule && isEducationalMaterialsData(savedContent)) {
  setEducationalMaterialsData(normalizeEducationalMaterialsData(savedContent));
}

if (isLivesModule && isLivesData(savedContent)) {
  setLivesData(normalizeLivesData(savedContent));
}

if (isPinterestModule && isPinterestData(savedContent)) {
  setPinterestData({
    frequencyItems:
      Array.isArray(savedContent.frequencyItems) &&
      savedContent.frequencyItems.length
        ? savedContent.frequencyItems.map((item) => ({
            format: item.format || "",
            quantity: item.quantity || "",
            period: item.period || "por semana",
            observation: item.observation || "",
          }))
        : initialPinterestFrequencyItems,
    objectives: normalizePinterestTextList(savedContent.objectives),
    languageStructures: normalizePinterestTextList(savedContent.languageStructures),
    contents: normalizePinterestTextList(savedContent.contents),
    mainBoards: savedContent.mainBoards || "",
    priorityVisualThemes: savedContent.priorityVisualThemes || "",
    visualStrategy: savedContent.visualStrategy || "",
    visualReferences:
      Array.isArray(savedContent.visualReferences) &&
      savedContent.visualReferences.length
        ? savedContent.visualReferences.map((r) => ({
            image: r.image || "",
          }))
        : initialPinterestData.visualReferences,
    pinKeywords: savedContent.pinKeywords || "",
    destinationLinks: savedContent.destinationLinks || "",
    descriptionGuidelines: savedContent.descriptionGuidelines || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((r) => ({
            title: r.title || "",
            link: r.link || "",
          }))
        : initialPinterestData.references,
  });
}

if (
  isContentDistributionCampaignModule &&
  isContentDistributionCampaignData(savedContent)
) {
  setContentDistributionCampaignData({
    campaignType: savedContent.campaignType || "Distribuição de conteúdo",
    campaignPhase: savedContent.campaignPhase || "Teste inicial",
    mediaObjective: savedContent.mediaObjective || "Alcance",
    audienceTemperature: savedContent.audienceTemperature || "Frio",
    recommendedChannels: savedContent.recommendedChannels || "",
    budget: savedContent.budget || "",
    materials:
      Array.isArray(savedContent.materials) && savedContent.materials.length
        ? savedContent.materials.map((material) => ({
            title: material.title || "",
            link: material.link || "",
          }))
        : initialContentDistributionCampaignData.materials,
    objective: savedContent.objective || "",
    audience: savedContent.audience || "",
    positioning: savedContent.positioning || "",
    creativeDirection: savedContent.creativeDirection || "",
    strategicScenario: savedContent.strategicScenario || "",
    authorityContent: savedContent.authorityContent || "",
    relationshipContent: savedContent.relationshipContent || "",
    indirectConversionContent: savedContent.indirectConversionContent || "",
    remarketingContent: savedContent.remarketingContent || "",
    channelPlans:
      Array.isArray(savedContent.channelPlans) && savedContent.channelPlans.length
        ? savedContent.channelPlans.map((plan) => ({
            channel: plan.channel || "",
            contentType: plan.contentType || "",
            channelRole: plan.channelRole || "",
          }))
        : initialContentDistributionCampaignData.channelPlans,
    mainContent: savedContent.mainContent || "",
    possibleDerivations: savedContent.possibleDerivations || "",
    distributionSequence: savedContent.distributionSequence || "",
    metrics: savedContent.metrics || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((reference) => ({
            title: reference.title || "",
            link: reference.link || "",
          }))
        : initialContentDistributionCampaignData.references,
  });
}

function isContentDistributionCampaignData(
  value: unknown
): value is ContentDistributionCampaignData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "mediaObjective" in value ||
    "authorityContent" in value ||
    "relationshipContent" in value ||
    "indirectConversionContent" in value ||
    "remarketingContent" in value ||
    "channelPlans" in value ||
    "mainContent" in value ||
    "possibleDerivations" in value ||
    "distributionSequence" in value
  );
}

if (
  isSalesConversionCampaignModule &&
  isSalesConversionCampaignData(savedContent)
) {
  setSalesConversionCampaignData({
    campaignType: savedContent.campaignType || "Venda direta",
    campaignPhase: savedContent.campaignPhase || "Teste inicial",
    salesObjective: savedContent.salesObjective || "Conversões",
    audienceTemperature: savedContent.audienceTemperature || "Morno",
    recommendedChannels: savedContent.recommendedChannels || "",
    budget: savedContent.budget || "",
    objective: savedContent.objective || "",
    offerProduct: savedContent.offerProduct || "",
    offerPrice: savedContent.offerPrice || "",
    offerPromise: savedContent.offerPromise || "",
    offerBenefits: savedContent.offerBenefits || "",
    mainCall: savedContent.mainCall || "",
    audienceCold: savedContent.audienceCold || "",
    audienceWarm: savedContent.audienceWarm || "",
    audienceHot: savedContent.audienceHot || "",
    positioning: savedContent.positioning || "",
    creativeDirection: savedContent.creativeDirection || "",
    strategicScenario: savedContent.strategicScenario || "",
    destinations:
      Array.isArray(savedContent.destinations) && savedContent.destinations.length
        ? savedContent.destinations.map((destination) => ({
            title: destination.title || "",
            link: destination.link || "",
          }))
        : initialSalesConversionCampaignData.destinations,
    mainObjections: savedContent.mainObjections || "",
    strategicResponses: savedContent.strategicResponses || "",
    salesPageDestination: savedContent.salesPageDestination || "",
    mainCta: savedContent.mainCta || "",
    proofElements: savedContent.proofElements || "",
    urgencyAndScarcity: savedContent.urgencyAndScarcity || "",
    remarketingStructure: savedContent.remarketingStructure || "",
    metrics: savedContent.metrics || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((reference) => ({
            title: reference.title || "",
            link: reference.link || "",
          }))
        : initialSalesConversionCampaignData.references,
  });
}

function isSalesConversionCampaignData(
  value: unknown
): value is SalesConversionCampaignData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "salesObjective" in value ||
    "offerProduct" in value ||
    "offerPrice" in value ||
    "offerBenefits" in value ||
    "audienceCold" in value ||
    "audienceWarm" in value ||
    "audienceHot" in value ||
    "destinations" in value ||
    "mainObjections" in value ||
    "strategicResponses" in value ||
    "proofElements" in value ||
    "urgencyAndScarcity" in value ||
    "remarketingStructure" in value
  );
}

if (
  isLeadCaptureCampaignModule &&
  isLeadCaptureCampaignData(savedContent)
) {
  setLeadCaptureCampaignData({
    campaignType: savedContent.campaignType || "Captação direta",
    campaignPhase: savedContent.campaignPhase || "Teste inicial",
    trafficObjective: savedContent.trafficObjective || "Leads",
    audienceTemperature: savedContent.audienceTemperature || "Frio",
    recommendedChannels: savedContent.recommendedChannels || "",
    budget: savedContent.budget || "",
    materials:
      Array.isArray(savedContent.materials) && savedContent.materials.length
        ? savedContent.materials.map((material) => ({
            title: material.title || "",
            type: material.type || "",
          }))
        : initialLeadCaptureCampaignData.materials,
    objective: savedContent.objective || "",
    audience: savedContent.audience || "",
    positioning: savedContent.positioning || "",
    creativeDirection: savedContent.creativeDirection || "",
    strategicScenario: savedContent.strategicScenario || "",
    offerPromise: savedContent.offerPromise || "",
    perceivedBenefit: savedContent.perceivedBenefit || "",
    mainCall: savedContent.mainCall || "",
    offerName: savedContent.offerName || "",
    pageHeadline: savedContent.pageHeadline || "",
    pageArgument: savedContent.pageArgument || "",
    formFields: savedContent.formFields || "",
    pageCta: savedContent.pageCta || "",
    nextStepAfterSignup: savedContent.nextStepAfterSignup || "",
    qualificationCriteria: savedContent.qualificationCriteria || "",
    initialNurturingSequence:
      savedContent.initialNurturingSequence || "",
    metrics: savedContent.metrics || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((reference) => ({
            title: reference.title || "",
            link: reference.link || "",
          }))
        : initialLeadCaptureCampaignData.references,
  });
}

function isContentFunnelData(value: unknown): value is ContentFunnelData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "stages" in value ||
    "overview" in value ||
    "distribution" in value ||
    "metrics" in value ||
    "references" in value
  );
}

function isEditorialLinesData(value: unknown): value is EditorialLinesData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "lines" in value || "generalGuidelines" in value || "references" in value;
}


function isTikTokData(value: unknown): value is TikTokData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "frequencyItems" in value ||
    "languageStructures" in value ||
    "mainFormats" in value ||
    "contentSeries" in value ||
    "openingHooks" in value ||
    "retentionResources" in value
  );
}

function isYoutubeData(value: unknown): value is YoutubeData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "editingStyle" in value ||
    "seoStrategies" in value ||
    "channelName" in value ||
    "channelDescription" in value ||
    "suggestedPlaylists" in value
  );
}

function isFacebookData(value: unknown): value is FacebookData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "pageName" in value ||
    "pageCategory" in value ||
    "pageDescription" in value ||
    "visualStrategy" in value ||
    "siteLink" in value
  );
}

function isLinkedInData(value: unknown): value is LinkedInData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "profileName" in value ||
    "headline" in value ||
    "professionalTitle" in value ||
    "strategicRole" in value ||
    "newsletter" in value ||
    "frequencyItems" in value ||
    "objectives" in value ||
    "authorityThemes" in value ||
    "aboutProfile" in value
  );
}

function isWhatsAppData(value: unknown): value is WhatsAppData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "firstContactFlow" in value ||
    "nurtureFlow" in value ||
    "salesFlow" in value ||
    "postSaleFlow" in value ||
    "strategicRole" in value ||
    "segments" in value ||
    "routes" in value ||
    "recurringCommunications" in value ||
    "mainNumber" in value ||
    "directLink" in value
  );
}

function isBlogData(value: unknown): value is BlogData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "priorityKeywords" in value ||
    "blogCategories" in value ||
    "seoGuidelines" in value ||
    "strategicRole" in value ||
    "blogName" in value ||
    "pillars" in value ||
    "topics" in value
  );
}

function isPinterestData(value: unknown): value is PinterestData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "mainBoards" in value ||
    "priorityVisualThemes" in value ||
    "pinKeywords" in value ||
    "destinationLinks" in value ||
    "descriptionGuidelines" in value
  );
}

function isPodcastsData(value: unknown): value is PodcastsData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "mainFormat" in value ||
    "durationAndRhythm" in value ||
    "seriesOrSegments" in value ||
    "publishingPlatforms" in value ||
    "repurposingStrategy" in value
  );
}

function isLivesData(value: unknown): value is LivesData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "networkFrequencies" in value ||
    "openingScript" in value ||
    "centralContent" in value ||
    "publicInteraction" in value ||
    "closingAndCall" in value ||
    "beforeAndAfterPromotion" in value
  );
}

function isEducationalMaterialsData(value: unknown): value is EducationalMaterialsData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "materials" in value || "strategy" in value;
}

function isSiteStrategyData(value: unknown): value is SiteStrategyData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "integrations" in value ||
    "essentialPages" in value ||
    "importantFeatures" in value ||
    "visualIdentity" in value
  );
}

function isLeadCaptureCampaignData(
  value: unknown
): value is LeadCaptureCampaignData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "campaignType" in value ||
    "campaignPhase" in value ||
    "trafficObjective" in value ||
    "audienceTemperature" in value ||
    "recommendedChannels" in value ||
    "budget" in value ||
    "materials" in value ||
    "objective" in value ||
    "audience" in value ||
    "positioning" in value ||
    "creativeDirection" in value ||
    "strategicScenario" in value ||
    "offerPromise" in value ||
    "perceivedBenefit" in value ||
    "mainCall" in value ||
    "offerName" in value ||
    "pageHeadline" in value ||
    "pageArgument" in value ||
    "formFields" in value ||
    "pageCta" in value ||
    "nextStepAfterSignup" in value ||
    "qualificationCriteria" in value ||
    "initialNurturingSequence" in value ||
    "metrics" in value ||
    "references" in value
  );
}

function isSiteMapData(value: unknown): value is SiteMapData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "pages" in value;
}

function isPersonasData(value: unknown): value is PersonasData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "personas" in value;
}

function isBuyingJourneyData(value: unknown): value is BuyingJourneyData {
  if (!value || typeof value !== "object") {
    return false;
  }
  
  return (
    "overview" in value ||
    "stages" in value ||
    "turningPoints" in value ||
    "objections" in value ||
    "advancementTriggers" in value ||
    "essentialContent" in value ||
    "funnelCampaignsAutomation" in value ||
    "references" in value
  );
}

function isCurrentChannelsData(value: unknown): value is CurrentChannelsData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "channels" in value || "observation" in value || "references" in value;
}

function isKeywordsData(value: unknown): value is KeywordsData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "sortBy" in value ||
    "keywords" in value ||
    "strategicObservation" in value
  );
}

function isSwotData(value: unknown): value is SwotData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "fields" in value || "synthesis" in value;
}

function isReferencesCompetitorsData(
  value: unknown
): value is ReferencesCompetitorsData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "items" in value;
}

function isVisualIdentityData(value: unknown): value is VisualIdentityData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "fields" in value ||
    "colors" in value ||
    "visualReferences" in value ||
    "externalReferences" in value
  );
}

if (isAutomationSystemModule && isAutomationSystemData(savedContent)) {
  setAutomationSystemData({
    strategicVision: savedContent.strategicVision || initialAutomationSystemData.strategicVision,
    centralPrinciple: savedContent.centralPrinciple || initialAutomationSystemData.centralPrinciple,
    systemFunction: savedContent.systemFunction || initialAutomationSystemData.systemFunction,
    successCondition: savedContent.successCondition || initialAutomationSystemData.successCondition,
    failureRisk: savedContent.failureRisk || initialAutomationSystemData.failureRisk,
    architecture: savedContent.architecture || initialAutomationSystemData.architecture,
    architectureCharacteristics: savedContent.architectureCharacteristics || initialAutomationSystemData.architectureCharacteristics,
    entryTriggers: savedContent.entryTriggers || initialAutomationSystemData.entryTriggers,
    advanceTriggers: savedContent.advanceTriggers || initialAutomationSystemData.advanceTriggers,
    reentryTriggers: savedContent.reentryTriggers || initialAutomationSystemData.reentryTriggers,
    exitTriggers: savedContent.exitTriggers || initialAutomationSystemData.exitTriggers,
    tags: Array.isArray(savedContent.tags) && savedContent.tags.length
      ? savedContent.tags.map((t) => ({ name: t.name || "", description: t.description || "" }))
      : initialAutomationSystemData.tags,
    channelPriorities: Array.isArray(savedContent.channelPriorities) && savedContent.channelPriorities.length
      ? savedContent.channelPriorities.map((i) => ({ flow: i.flow || "", dominantChannel: i.dominantChannel || "", supportChannel: i.supportChannel || "" }))
      : initialAutomationSystemData.channelPriorities,
    cadences: Array.isArray(savedContent.cadences) && savedContent.cadences.length
      ? savedContent.cadences.map((i) => ({ flow: i.flow || "", cadence: i.cadence || "" }))
      : initialAutomationSystemData.cadences,
    flows: Array.isArray(savedContent.flows) && savedContent.flows.length
      ? savedContent.flows.map((f) => ({
          code: f.code || "",
          name: f.name || "",
          objective: f.objective || "",
          dominantChannel: f.dominantChannel || "",
          supportChannel: f.supportChannel || "",
          cadence: f.cadence || "",
          entryTrigger: f.entryTrigger || "",
          advanceTrigger: f.advanceTrigger || "",
          exitCondition: f.exitCondition || "",
          strategicNotes: f.strategicNotes || "",
          steps: Array.isArray(f.steps) && f.steps.length
            ? f.steps.map((s) => ({
                moment: s.moment || "",
                channel: s.channel || "E-mail",
                type: s.type || "Mensagem",
                title: s.title || "",
                purpose: s.purpose || "",
                condition: s.condition || "",
                cta: s.cta || "",
              }))
            : [{ moment: "", channel: "E-mail", type: "Mensagem", title: "", purpose: "", condition: "", cta: "" }],
        }))
      : initialAutomationSystemData.flows,
    transmissionIntegration: savedContent.transmissionIntegration || initialAutomationSystemData.transmissionIntegration,
    mainKpi: savedContent.mainKpi || initialAutomationSystemData.mainKpi,
    secondaryKpis: savedContent.secondaryKpis || initialAutomationSystemData.secondaryKpis,
    platforms: Array.isArray(savedContent.platforms) && savedContent.platforms.length
      ? savedContent.platforms.map((p) => ({ category: p.category || "", tool: p.tool || "", purpose: p.purpose || "" }))
      : initialAutomationSystemData.platforms,
    references: Array.isArray(savedContent.references) && savedContent.references.length
      ? savedContent.references.map((r) => ({ title: r.title || "", link: r.link || "" }))
      : initialAutomationSystemData.references,
  });
}

function isAutomationSystemData(value: unknown): value is AutomationSystemData {
  if (!value || typeof value !== "object") return false;
  return (
    "strategicVision" in value ||
    "flows" in value ||
    "transmissionIntegration" in value ||
    "mainKpi" in value ||
    "centralPrinciple" in value ||
    "entryTriggers" in value
  );
}

if (isTimelineModule && isTimelineData(savedContent)) {
  setTimelineData({
    events:
      Array.isArray(savedContent.events) && savedContent.events.length
        ? savedContent.events.map((event) => ({
            title: event.title || "",
            description: event.description || "",
            date: event.date || "",
            phase: event.phase || "Diagnóstico",
            priority: event.priority || "Alta",
            status: event.status || "Não iniciado",
            responsible: event.responsible || "",
            dependency: event.dependency || "",
            sprints:
              Array.isArray(event.sprints) && event.sprints.length
                ? event.sprints.map((sprint) => ({
                    title: sprint.title || "",
                    startDate: sprint.startDate || "",
                    endDate: sprint.endDate || "",
                    period: sprint.period || "",
                    deliverables: sprint.deliverables || "",
                  }))
                : [{ title: "", startDate: "", endDate: "", period: "", deliverables: "" }],
          }))
        : initialTimelineData.events,
    macroVision: savedContent.macroVision || "",
    firstMilestone: savedContent.firstMilestone || "",
    secondMilestone: savedContent.secondMilestone || "",
    thirdMilestone: savedContent.thirdMilestone || "",
    risks: savedContent.risks || "",
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((r) => ({ title: r.title || "", link: r.link || "" }))
        : initialTimelineData.references,
  });
}

function isTimelineData(value: unknown): value is TimelineData {
  if (!value || typeof value !== "object") return false;
  return (
    "macroVision" in value ||
    "firstMilestone" in value ||
    "secondMilestone" in value ||
    "thirdMilestone" in value
  );
}

if (isContentCalendarModule && isContentCalendarData(savedContent)) {
  setContentCalendarData({
    calendarTitle: savedContent.calendarTitle || "",
    platform: savedContent.platform || "Notion",
    calendarLink: savedContent.calendarLink || "",
    calendarFunction: savedContent.calendarFunction || initialContentCalendarData.calendarFunction,
    usageGuidelines: savedContent.usageGuidelines || initialContentCalendarData.usageGuidelines,
    responsiblePeople: savedContent.responsiblePeople || "",
    updateFrequency: savedContent.updateFrequency || "Semanal",
    updateRoutine: savedContent.updateRoutine || initialContentCalendarData.updateRoutine,
    notionStructure: savedContent.notionStructure || initialContentCalendarData.notionStructure,
    approvalFlowDescription: savedContent.approvalFlowDescription || initialContentCalendarData.approvalFlowDescription,
    approvalSteps:
      Array.isArray(savedContent.approvalSteps) && savedContent.approvalSteps.length
        ? savedContent.approvalSteps.map((step) => ({
            title: step.title || "",
            description: step.description || "",
          }))
        : initialContentCalendarData.approvalSteps,
    approvalRules: savedContent.approvalRules || initialContentCalendarData.approvalRules,
    driveMainFolderTitle: savedContent.driveMainFolderTitle || "",
    driveMainFolderLink: savedContent.driveMainFolderLink || "",
    driveFolderStructure: savedContent.driveFolderStructure || initialContentCalendarData.driveFolderStructure,
    driveFolders:
      Array.isArray(savedContent.driveFolders) && savedContent.driveFolders.length
        ? savedContent.driveFolders.map((folder) => ({
            title: folder.title || "",
            description: folder.description || "",
            link: folder.link || "",
          }))
        : initialContentCalendarData.driveFolders,
    strategicObservations: savedContent.strategicObservations || initialContentCalendarData.strategicObservations,
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((r) => ({ title: r.title || "", link: r.link || "" }))
        : initialContentCalendarData.references,
  });
}

function isContentCalendarData(value: unknown): value is ContentCalendarData {
  if (!value || typeof value !== "object") return false;
  return (
    "calendarTitle" in value ||
    "calendarFunction" in value ||
    "approvalSteps" in value ||
    "driveFolders" in value ||
    "driveMainFolderTitle" in value
  );
}

if (isMetricsModule && isMetricsData(savedContent)) {
  setMetricsData({
    indicators:
      Array.isArray(savedContent.indicators) && savedContent.indicators.length
        ? savedContent.indicators.map((ind) => ({
            name: ind.name || "",
            type: ind.type || "Alcance",
            channel: ind.channel || "Instagram",
            goal: ind.goal || "",
            frequency: ind.frequency || "Semanal",
            tool: ind.tool || "",
            responsible: ind.responsible || "",
            interpretation: ind.interpretation || "",
            decisionCriteria: ind.decisionCriteria || "",
          }))
        : initialMetricsData.indicators,
    mainIndicators: savedContent.mainIndicators || initialMetricsData.mainIndicators,
    journeyMetrics:
      Array.isArray(savedContent.journeyMetrics) && savedContent.journeyMetrics.length
        ? savedContent.journeyMetrics.map((item) => ({
            stage: item.stage || "",
            metrics: item.metrics || "",
            purpose: item.purpose || "",
          }))
        : initialMetricsData.journeyMetrics,
    channelMetrics:
      Array.isArray(savedContent.channelMetrics) && savedContent.channelMetrics.length
        ? savedContent.channelMetrics.map((item) => ({
            channel: item.channel || "",
            metrics: item.metrics || "",
            tool: item.tool || "",
          }))
        : initialMetricsData.channelMetrics,
    tools:
      Array.isArray(savedContent.tools) && savedContent.tools.length
        ? savedContent.tools.map((t) => ({ name: t.name || "", purpose: t.purpose || "" }))
        : initialMetricsData.tools,
    analysisRoutine: savedContent.analysisRoutine || initialMetricsData.analysisRoutine,
    decisionCriteria: savedContent.decisionCriteria || initialMetricsData.decisionCriteria,
    reportingFormat: savedContent.reportingFormat || initialMetricsData.reportingFormat,
    strategicObservations: savedContent.strategicObservations || initialMetricsData.strategicObservations,
    references:
      Array.isArray(savedContent.references) && savedContent.references.length
        ? savedContent.references.map((r) => ({ title: r.title || "", link: r.link || "" }))
        : initialMetricsData.references,
  });
}

function isMetricsData(value: unknown): value is MetricsData {
  if (!value || typeof value !== "object") return false;
  return (
    "indicators" in value ||
    "journeyMetrics" in value ||
    "channelMetrics" in value ||
    "analysisRoutine" in value ||
    "reportingFormat" in value
  );
}

if (isAdditionalGuidelinesModule && isAdditionalGuidelinesData(savedContent)) {
  setAdditionalGuidelinesData({
    executionGuidelines: savedContent.executionGuidelines || initialAdditionalGuidelinesData.executionGuidelines,
    attentionPoints: savedContent.attentionPoints || initialAdditionalGuidelinesData.attentionPoints,
    pendingItems: Array.isArray(savedContent.pendingItems) && savedContent.pendingItems.length
      ? savedContent.pendingItems.map((item) => ({ title: item.title || "", description: item.description || "", responsible: item.responsible || "", status: item.status || "Pendente" }))
      : initialAdditionalGuidelinesData.pendingItems,
    nextSteps: Array.isArray(savedContent.nextSteps) && savedContent.nextSteps.length
      ? savedContent.nextSteps.map((step) => ({ title: step.title || "", description: step.description || "", priority: step.priority || "Alta" }))
      : initialAdditionalGuidelinesData.nextSteps,
    teamRecommendations: Array.isArray(savedContent.teamRecommendations) && savedContent.teamRecommendations.length
      ? savedContent.teamRecommendations.map((item) => ({ area: item.area || "", recommendation: item.recommendation || "" }))
      : initialAdditionalGuidelinesData.teamRecommendations,
    finalObservations: savedContent.finalObservations || initialAdditionalGuidelinesData.finalObservations,
    references: Array.isArray(savedContent.references) && savedContent.references.length
      ? savedContent.references.map((r) => ({ title: r.title || "", link: r.link || "" }))
      : initialAdditionalGuidelinesData.references,
  });
}

function isAdditionalGuidelinesData(value: unknown): value is AdditionalGuidelinesData {
  if (!value || typeof value !== "object") return false;
  return (
    "executionGuidelines" in value ||
    "attentionPoints" in value ||
    "pendingItems" in value ||
    "nextSteps" in value ||
    "teamRecommendations" in value
  );
}

      if (!isSpecialistModule && isGenericModuleData(savedContent)) {
        setGenericData({
          mainText: savedContent.mainText || "",
          notes: savedContent.notes || "",
          references: savedContent.references || "",
        });
      }

      function isCompanyData(value: unknown): value is CompanyData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "fields" in value;
}

function isContentDnaData(value: unknown): value is ContentDnaData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "fields" in value || "secondaryIdeas" in value;
}

function isToneVoiceData(value: unknown): value is ToneVoiceData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "characteristics" in value ||
    "toneChoices" in value ||
    "vocabulary" in value ||
    "emotions" in value ||
    "observations" in value ||
    "references" in value
  );
}

function isProjectObjectivesData(
  value: unknown
): value is ProjectObjectivesData {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "mainObjective" in value ||
    "secondaryObjectives" in value ||
    "priorities" in value ||
    "successIndicators" in value ||
    "expectedResults" in value ||
    "phases" in value ||
    "strategicObservation" in value
  );
}

      setIsLoading(false);
    }

    if (clientSlug && moduleSlug) {
      loadModuleData();
    }
  }, [clientSlug, moduleSlug, router, isSpecialistModule]);

  async function saveModule(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!project) {
      return;
    }

    if (!isModuleSelected) {
      setErrorMessage(
        "Este módulo não está selecionado para este planejamento. Volte para a configuração e selecione o módulo antes de preencher."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const currentData = project.data ?? {};

    const contentToSave = isSpecialistModule
  ? specialistData
  : isCompanyModule
    ? companyData
    : isContentDnaModule
      ? contentDnaData
      : isToneVoiceModule
        ? toneVoiceData
        : isVisualIdentityModule
          ? visualIdentityData
          : isProjectObjectivesModule
            ? projectObjectivesData
            : isReferencesCompetitorsModule
              ? referencesCompetitorsData
              : isCompetitorResearchModule
                ? competitorResearchData
                : isSwotModule
                  ? swotData
                  : isKeywordsModule
                    ? keywordsData
                    : isPersonasModule
                      ? personasData
                      : isBuyingJourneyModule
                        ? buyingJourneyData
                        : isCurrentChannelsModule
                          ? currentChannelsData
                          : isContentFunnelModule
                            ? contentFunnelData
                            : isEditorialLinesModule
                              ? editorialLinesData
                              : isInstagramModule
                                ? instagramData
                                : isTiktokModule
                                  ? tiktokData
                                  : isYoutubeModule
                                    ? youtubeData
                                    : isFacebookModule
                                      ? facebookData
                                      : isLinkedinModule
                                        ? linkedinData
                                        : isWhatsappModule
                                          ? whatsappData
                                          : isBlogModule
                                            ? blogData
                                            : isPinterestModule
                                              ? pinterestData
                                              : isPodcastsModule
                                                ? podcastsData
                                                : isLivesModule
                                                  ? livesData
                                                  : isEducationalMaterialsModule
                                                    ? educationalMaterialsData
                                                    : isSiteStrategyModule
                                                      ? siteStrategyData
                                                      : isSiteMapModule
                                                        ? siteMapData
                                                        : isLeadCaptureCampaignModule
                                                          ? leadCaptureCampaignData
                                                          : isSalesConversionCampaignModule
                                                            ? salesConversionCampaignData
                                                            : isContentDistributionCampaignModule
                                                              ? contentDistributionCampaignData
                                                              : isAutomationSystemModule
                                                                ? automationSystemData
                                                                : isTimelineModule
                                                                  ? timelineData
                                                                  : isContentCalendarModule
                                                                    ? contentCalendarData
                                                                    : isMetricsModule
                                                                      ? metricsData
                                                                      : isAdditionalGuidelinesModule
                                                                        ? additionalGuidelinesData
                                                                        : {
                                                            mainText:
                                                              genericData.mainText?.trim() || "",
                                                            notes: genericData.notes?.trim() || "",
                                                            references:
                                                              genericData.references?.trim() || "",
                                                          };

    const nextData: ProjectData = {
      ...currentData,
      moduleContent: {
        ...(currentData.moduleContent ?? {}),
        [moduleSlug]: contentToSave,
      },
    };

    try {
      const saved=await authorizedProjectRequest("PATCH",project.id,nextData,project.updated_at);
      setProject({...project,data:saved.data,updated_at:saved.updated_at});
      setSuccessMessage("Módulo salvo com sucesso.");
    }catch(error){
      setErrorMessage(error instanceof Error?error.message:"Não foi possível salvar este módulo.");
      setIsSaving(false);
      return;
    }
    setIsSaving(false);

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 2800);
  }

  async function authorizedProjectRequest(method:"GET"|"PATCH", projectId:string, data?:ProjectData, expectedUpdatedAt?:string):Promise<{data:ProjectData;updated_at:string}> {
    const {data:session,error:sessionError}=await supabase.auth.getSession();
    const token=session.session?.access_token;
    if(sessionError||!token)throw new Error("Sessão expirada. Entre novamente para continuar.");
    const response=await fetch(method==="GET"?`/api/admin/project?id=${encodeURIComponent(projectId)}`:"/api/admin/project/update",{
      method,headers:{"Authorization":`Bearer ${token}`,...(method==="PATCH"?{"Content-Type":"application/json"}:{})},
      ...(method==="PATCH"?{body:JSON.stringify({projectId,expectedUpdatedAt,data})}:{}),cache:"no-store"
    });
    if(response.status===409)throw new Error("O projeto foi atualizado em outra sessão. Recarregue a página antes de salvar.");
    if(!response.ok)throw new Error("Não foi possível acessar o projeto. Confira suas permissões.");
    const result=await response.json();
    if(!result?.project||typeof result.project.updated_at!=="string")throw new Error("Resposta administrativa inválida.");
    return {data:(result.project.data??{}) as ProjectData,updated_at:result.project.updated_at};
  }

  async function preparePersonasForJourneys() {
    if (!project) return;

    setIsPreparingPersonas(true);
    setPreparePersonasError("");

    let freshRow: {data:ProjectData;updated_at:string};
    try {
      freshRow=await authorizedProjectRequest("GET",project.id);
    }catch(fetchError){

      setPreparePersonasError(
        fetchError instanceof Error ? fetchError.message : "Não foi possível buscar os dados atuais do planejamento."
      );
      setIsPreparingPersonas(false);
      return;
    }

    const freshData = (freshRow.data ?? {}) as ProjectData;
    const freshPersonasRaw = freshData.moduleContent?.["personas"];

    if (
      !freshPersonasRaw ||
      typeof freshPersonasRaw !== "object" ||
      !Array.isArray((freshPersonasRaw as { personas?: unknown }).personas)
    ) {
      setPreparePersonasError(
        "Módulo de personas não encontrado nos dados atuais. Salve o módulo de personas antes de preparar as jornadas."
      );
      setIsPreparingPersonas(false);
      return;
    }

    const freshPersonas = (
      freshPersonasRaw as { personas: PersonaData[] }
    ).personas;

    const currentPersonas = personasData.personas;

    if (freshPersonas.length !== currentPersonas.length) {
      setPreparePersonasError(
        "Os dados de personas foram alterados por outra sessão. Recarregue a página e tente novamente."
      );
      setIsPreparingPersonas(false);
      return;
    }

    const preparedPersonas = createPersonasWithStableIds(freshPersonas);

    const allHaveIds = preparedPersonas.every((p) => p.id?.trim());
    if (!allHaveIds) {
      setPreparePersonasError(
        "Não foi possível atribuir IDs estáveis a todas as personas. Tente novamente."
      );
      setIsPreparingPersonas(false);
      return;
    }

    const ids = preparedPersonas.map((p) => p.id as string);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      setPreparePersonasError(
        "IDs duplicados detectados após a preparação. Tente novamente."
      );
      setIsPreparingPersonas(false);
      return;
    }

    const nextData: ProjectData = {
      ...freshData,
      moduleContent: {
        ...(freshData.moduleContent ?? {}),
        ["personas"]: { personas: preparedPersonas },
      },
    };

    try {
      const saved=await authorizedProjectRequest("PATCH",project.id,nextData,freshRow.updated_at);
      setPersonasData({ personas: preparedPersonas });
      setProject({...project,data:saved.data,updated_at:saved.updated_at});
    }catch(saveError){
      setPreparePersonasError(saveError instanceof Error?saveError.message:"Não foi possível salvar as personas preparadas.");
      setIsPreparingPersonas(false);
      return;
    }
    setIsPreparingPersonas(false);
  }

  async function mutatePersonaJourneysData(
    mutator: (
      current: PersonaJourneysData,
      context: PersonaJourneysMutationContext
    ) => {
      data: PersonaJourneysData;
      removeJourneyIds?: string[];
    }
  ): Promise<boolean> {
    if (!project || isSavingPersonaJourneys) return false;

    setIsSavingPersonaJourneys(true);
    setPersonaJourneysSaveError("");

    let freshRow: {data:ProjectData;updated_at:string};
    try {
      freshRow=await authorizedProjectRequest("GET",project.id);
    }catch(fetchError){

      setPersonaJourneysSaveError(
        fetchError instanceof Error ? fetchError.message :
          "Não foi possível buscar os dados atuais do planejamento."
      );
      setIsSavingPersonaJourneys(false);
      return false;
    }

    const freshData = (freshRow.data ?? {}) as ProjectData;
    const legacyJourneyContent = freshData.moduleContent?.["jornada-de-compra"];
    const hasLegacy = hasMeaningfulJourneyContent(legacyJourneyContent);
    const rawPersonaJourneys =
      freshData.moduleContent?.["jornadas-por-persona"];

    // Build mutation context exclusively from fresh Supabase data
    const rawPersonasContent = freshData.moduleContent?.["personas"];
    const personasStructureValid =
      rawPersonasContent != null &&
      typeof rawPersonasContent === "object" &&
      !Array.isArray(rawPersonasContent) &&
      Array.isArray((rawPersonasContent as { personas?: unknown }).personas);

    if (!personasStructureValid) {
      setPersonaJourneysSaveError(
        "O módulo Personas ainda não possui dados válidos salvos. Salve as personas antes de criar uma Jornada de Compra."
      );
      setIsSavingPersonaJourneys(false);
      return false;
    }

    const freshPersonas: PersonaData[] = (
      rawPersonasContent as { personas: PersonaData[] }
    ).personas;

    const freshLegacyJourney: BuyingJourneyData | null =
      legacyJourneyContent &&
      typeof legacyJourneyContent === "object" &&
      !Array.isArray(legacyJourneyContent)
        ? (legacyJourneyContent as BuyingJourneyData)
        : null;

    const mutationContext: PersonaJourneysMutationContext = {
      personas: freshPersonas,
      legacyJourneyData: freshLegacyJourney,
      hasMeaningfulLegacyJourney: hasLegacy,
    };

    let normalized: PersonaJourneysData;
    let rawRoot: Record<string, unknown> | undefined;
    let rawJourneys: Record<string, unknown> | undefined;

    if (
      !rawPersonaJourneys ||
      typeof rawPersonaJourneys !== "object" ||
      Array.isArray(rawPersonaJourneys)
    ) {
      normalized = buildInitialPersonaJourneysData(hasLegacy);
    } else {
      const raw = rawPersonaJourneys as Record<string, unknown>;
      rawRoot = raw;

      const normalizedJourneys: Record<string, BuyingJourneyData> = {};
      if (
        raw.journeys &&
        typeof raw.journeys === "object" &&
        !Array.isArray(raw.journeys)
      ) {
        rawJourneys = raw.journeys as Record<string, unknown>;
        for (const [pid, entry] of Object.entries(rawJourneys)) {
          if (entry && typeof entry === "object" && !Array.isArray(entry)) {
            const e = entry as BuyingJourneyData;
            normalizedJourneys[pid] = {
              overview: e.overview || "",
              stages:
                Array.isArray(e.stages) && e.stages.length
                  ? journeyStages.map((_, i) => ({
                      awarenessLevel:
                        e.stages[i]?.awarenessLevel || awarenessLevels[0],
                      thoughts: e.stages[i]?.thoughts || "",
                      pains: e.stages[i]?.pains || "",
                      recommendedContent:
                        e.stages[i]?.recommendedContent || "",
                      recommendedChannels:
                        e.stages[i]?.recommendedChannels || "",
                      desiredNextStep: e.stages[i]?.desiredNextStep || "",
                      conversionPoint: e.stages[i]?.conversionPoint || "",
                    }))
                  : initialBuyingJourneyData.stages,
              turningPoints: {
                discoveryToPain: e.turningPoints?.discoveryToPain || "",
                painToSolution: e.turningPoints?.painToSolution || "",
                solutionToComparison:
                  e.turningPoints?.solutionToComparison || "",
                comparisonToDecision:
                  e.turningPoints?.comparisonToDecision || "",
              },
              objections: {
                beginning: e.objections?.beginning || "",
                middle: e.objections?.middle || "",
                end: e.objections?.end || "",
              },
              advancementTriggers: e.advancementTriggers || "",
              essentialContent: {
                awareness: e.essentialContent?.awareness || "",
                decision: e.essentialContent?.decision || "",
              },
              funnelCampaignsAutomation: e.funnelCampaignsAutomation || "",
              references:
                Array.isArray(e.references) && e.references.length
                  ? e.references.map(
                      (r: { title?: string; link?: string }) => ({
                        title: r.title || "",
                        link: r.link || "",
                      })
                    )
                  : initialBuyingJourneyData.references,
            };
          }
        }
      }

      const rawMigration = raw.legacyMigration as
        | Record<string, unknown>
        | undefined;
      const legacyStatuses = [
        "not-required",
        "pending",
        "completed",
      ] as const;
      const migrationStatus: LegacyMigrationState["status"] =
        rawMigration?.status &&
        legacyStatuses.includes(
          rawMigration.status as (typeof legacyStatuses)[number]
        )
          ? (rawMigration.status as LegacyMigrationState["status"])
          : hasLegacy
          ? "pending"
          : "not-required";

      normalized = {
        version: 2,
        journeys: normalizedJourneys,
        legacyMigration: {
          status: migrationStatus,
          assignedPersonaId:
            typeof rawMigration?.assignedPersonaId === "string"
              ? rawMigration.assignedPersonaId
              : undefined,
          migratedAt:
            typeof rawMigration?.migratedAt === "string"
              ? rawMigration.migratedAt
              : undefined,
        },
      };
    }

    let mutatorResult: {
      data: PersonaJourneysData;
      removeJourneyIds?: string[];
    };
    try {
      mutatorResult = mutator(normalized, mutationContext);
    } catch (err) {
      setPersonaJourneysSaveError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao processar a mutação."
      );
      setIsSavingPersonaJourneys(false);
      return false;
    }

    const { data: mutated, removeJourneyIds = [] } = mutatorResult;

    // Validate mutator result
    if (mutated.version !== 2) {
      setPersonaJourneysSaveError("Resultado inválido: version deve ser 2.");
      setIsSavingPersonaJourneys(false);
      return false;
    }
    if (
      !mutated.journeys ||
      typeof mutated.journeys !== "object" ||
      Array.isArray(mutated.journeys)
    ) {
      setPersonaJourneysSaveError(
        "Resultado inválido: journeys deve ser um objeto."
      );
      setIsSavingPersonaJourneys(false);
      return false;
    }
    const mutatorStatuses = [
      "not-required",
      "pending",
      "completed",
    ] as const;
    if (
      !mutatorStatuses.includes(
        mutated.legacyMigration?.status as (typeof mutatorStatuses)[number]
      )
    ) {
      setPersonaJourneysSaveError(
        "Resultado inválido: legacyMigration.status inválido."
      );
      setIsSavingPersonaJourneys(false);
      return false;
    }
    if (Object.keys(mutated.journeys).some((k) => !k.trim())) {
      setPersonaJourneysSaveError(
        "Resultado inválido: nenhuma chave de jornada pode ser vazia."
      );
      setIsSavingPersonaJourneys(false);
      return false;
    }
    if (removeJourneyIds.some((id) => !id.trim())) {
      setPersonaJourneysSaveError(
        "Resultado inválido: removeJourneyIds contém strings vazias."
      );
      setIsSavingPersonaJourneys(false);
      return false;
    }

    // Preserve unknown journey entries from raw; merge known entries over their raw base
    const mergedJourneys: Record<string, unknown> = { ...(rawJourneys ?? {}) };
    for (const [id, journeyData] of Object.entries(mutated.journeys)) {
      const existingRaw = rawJourneys?.[id];
      mergedJourneys[id] =
        existingRaw &&
        typeof existingRaw === "object" &&
        !Array.isArray(existingRaw)
          ? { ...existingRaw, ...journeyData }
          : journeyData;
    }
    for (const id of removeJourneyIds) {
      delete mergedJourneys[id];
    }

    // Preserve unknown root properties of the existing jornadas-por-persona record
    const nextPersonaJourneysValue: Record<string, unknown> = {
      ...(rawRoot ?? {}),
      version: 2,
      journeys: mergedJourneys,
      legacyMigration: mutated.legacyMigration,
    };

    // Build full JSONB — only jornadas-por-persona changes; everything else is preserved
    const nextData: ProjectData = {
      ...freshData,
      moduleContent: {
        ...(freshData.moduleContent ?? {}),
        ["jornadas-por-persona"]: nextPersonaJourneysValue,
      },
    };

    try {
      const saved=await authorizedProjectRequest("PATCH",project.id,nextData,freshRow.updated_at);
      setPersonaJourneysData(mutated);
      setProject({...project,data:saved.data,updated_at:saved.updated_at});
    }catch(saveError){
      setPersonaJourneysSaveError(saveError instanceof Error?saveError.message:"Não foi possível salvar as jornadas por persona.");
      setIsSavingPersonaJourneys(false);
      return false;
    }
    setPersonaJourneysSaveError("");
    setIsSavingPersonaJourneys(false);
    return true;
  }

  async function migrateLegacyJourneyToPersona(
    personaId: string
  ): Promise<boolean> {
    return mutatePersonaJourneysData((current, context) => {
      if (!personaId.trim()) {
        throw new Error("ID da persona não pode ser vazio.");
      }
      const persona = context.personas.find((p) => p.id === personaId);
      if (!persona) {
        throw new Error(
          "Persona com este ID não encontrada nos dados atuais."
        );
      }
      if (!persona.id?.trim()) {
        throw new Error("A persona não possui um identificador estável.");
      }
      if (!context.hasMeaningfulLegacyJourney) {
        throw new Error(
          "A jornada legada não possui conteúdo real para migrar."
        );
      }
      if (!context.legacyJourneyData) {
        throw new Error("Jornada legada não encontrada nos dados atuais.");
      }
      if (current.legacyMigration.status === "completed") {
        throw new Error(
          "A migração da jornada legada já foi concluída e não pode ser repetida."
        );
      }
      if (current.legacyMigration.status !== "pending") {
        throw new Error("A migração não está no estado pendente.");
      }
      if (current.journeys[personaId]) {
        throw new Error(
          "Esta persona já possui uma jornada de compra. Não é possível sobrescrever."
        );
      }

      const legacy = context.legacyJourneyData;

      // Safe deep copy — never hold a mutable reference to the original object
      const legacyCopy: BuyingJourneyData = {
        overview: legacy.overview || "",
        stages:
          Array.isArray(legacy.stages) && legacy.stages.length
            ? legacy.stages.map((s) => ({ ...s }))
            : initialBuyingJourneyData.stages.map((s) => ({ ...s })),
        turningPoints: { ...legacy.turningPoints },
        objections: { ...legacy.objections },
        advancementTriggers: legacy.advancementTriggers || "",
        essentialContent: { ...legacy.essentialContent },
        funnelCampaignsAutomation: legacy.funnelCampaignsAutomation || "",
        references: Array.isArray(legacy.references)
          ? legacy.references.map((r) => ({ ...r }))
          : [],
      };

      return {
        data: {
          ...current,
          version: 2,
          journeys: {
            ...current.journeys,
            [personaId]: legacyCopy,
          },
          legacyMigration: {
            status: "completed",
            assignedPersonaId: personaId,
            migratedAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function createPersonaJourneyDraft(
    personaId: string
  ): BuyingJourneyData | null {
    setPersonaJourneysSaveError("");

    if (journeyPersonasSource !== "ready") {
      setPersonaJourneysSaveError(
        "O módulo Personas ainda não possui dados válidos salvos. Salve as personas antes de criar uma Jornada de Compra."
      );
      return null;
    }

    if (!personaId.trim()) {
      setPersonaJourneysSaveError("ID da persona não pode ser vazio.");
      return null;
    }
    const persona = personasData.personas.find((p) => p.id === personaId);
    if (!persona) {
      setPersonaJourneysSaveError(
        "Persona com este ID não encontrada nos dados atuais."
      );
      return null;
    }
    if (!persona.id?.trim()) {
      setPersonaJourneysSaveError(
        "A persona não possui um identificador estável."
      );
      return null;
    }
    if (personaJourneysData.journeys[personaId]) {
      setPersonaJourneysSaveError(
        "Esta persona já possui uma jornada. Use o modo de edição para atualizar."
      );
      return null;
    }

    return createEmptyBuyingJourneyData();
  }

  async function savePersonaJourney(
    personaId: string,
    journeyData: BuyingJourneyData,
    mode: "create" | "update"
  ): Promise<boolean> {
    return mutatePersonaJourneysData((current, context) => {
      if (!personaId.trim()) {
        throw new Error("ID da persona não pode ser vazio.");
      }
      const persona = context.personas.find((p) => p.id === personaId);
      if (!persona) {
        throw new Error(
          "Persona com este ID não encontrada nos dados atuais."
        );
      }
      if (!persona.id?.trim()) {
        throw new Error("A persona não possui um identificador estável.");
      }
      if (
        !journeyData ||
        typeof journeyData !== "object" ||
        !Array.isArray(journeyData.stages)
      ) {
        throw new Error("Dados da jornada inválidos.");
      }
      if (mode !== "create" && mode !== "update") {
        throw new Error("Modo de salvamento inválido.");
      }
      if (mode === "create" && current.journeys[personaId]) {
        throw new Error(
          "Esta persona já possui uma jornada. Use o modo de edição para atualizar."
        );
      }
      if (mode === "update" && !current.journeys[personaId]) {
        throw new Error(
          "Não é possível atualizar uma jornada inexistente. Use o modo de criação."
        );
      }

      const journeyCopy: BuyingJourneyData = structuredClone(journeyData);

      return {
        data: {
          ...current,
          version: 2,
          journeys: {
            ...current.journeys,
            [personaId]: journeyCopy,
          },
        },
      };
    });
  }

  async function reassignOrphanedPersonaJourney(
    orphanedPersonaId: string,
    targetPersonaId: string
  ): Promise<boolean> {
    return mutatePersonaJourneysData((current, context) => {
      if (!orphanedPersonaId.trim()) {
        throw new Error("ID da jornada órfã não pode ser vazio.");
      }
      if (!targetPersonaId.trim()) {
        throw new Error("ID da persona de destino não pode ser vazio.");
      }
      if (orphanedPersonaId === targetPersonaId) {
        throw new Error(
          "O ID de origem e o de destino não podem ser iguais."
        );
      }

      const orphanJourney = current.journeys[orphanedPersonaId];
      if (!orphanJourney) {
        throw new Error(
          "A jornada de origem não existe ou já foi removida. Recarregue a página para ver o estado atual."
        );
      }

      // A origem deve continuar sem persona correspondente nos dados recentes.
      const sourceStillActive = context.personas.some(
        (p) => p.id === orphanedPersonaId
      );
      if (sourceStillActive) {
        throw new Error(
          "A jornada de origem não é mais órfã: uma persona com esse ID foi encontrada nos dados atuais. Revise os dados antes de continuar."
        );
      }

      const targetPersona = context.personas.find(
        (p) => p.id === targetPersonaId
      );
      if (!targetPersona) {
        throw new Error(
          "A persona de destino não foi encontrada nos dados atuais."
        );
      }
      if (!targetPersona.id?.trim()) {
        throw new Error(
          "A persona de destino não possui um identificador estável."
        );
      }

      if (current.journeys[targetPersonaId]) {
        throw new Error(
          "A persona de destino já possui uma jornada de compra. A reassociação não é permitida para evitar sobrescrita."
        );
      }

      const journeyCopy: BuyingJourneyData = structuredClone(orphanJourney);

      return {
        data: {
          ...current,
          version: 2,
          journeys: {
            ...current.journeys,
            [targetPersonaId]: journeyCopy,
          },
        },
        removeJourneyIds: [orphanedPersonaId],
      };
    });
  }

  async function deleteOrphanedPersonaJourney(
    orphanedPersonaId: string
  ): Promise<boolean> {
    return mutatePersonaJourneysData((current, context) => {
      if (!orphanedPersonaId.trim()) {
        throw new Error("ID da jornada órfã não pode ser vazio.");
      }

      const orphanJourney = current.journeys[orphanedPersonaId];
      if (!orphanJourney) {
        throw new Error(
          "A jornada de origem não existe ou já foi removida. Nenhuma alteração foi feita."
        );
      }

      // Rejeita exclusão se o id voltou a corresponder a uma persona ativa.
      const stillActive = context.personas.some(
        (p) => p.id === orphanedPersonaId
      );
      if (stillActive) {
        throw new Error(
          "A jornada não é mais órfã: uma persona com esse ID existe nos dados atuais. A exclusão foi cancelada para proteger dados ativos."
        );
      }

      return {
        data: current,
        removeJourneyIds: [orphanedPersonaId],
      };
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 lg:px-10">
        <MetodoLogo variant="dark" />

        <div className="flex items-center gap-3">
          <Link
            href={`/admin/planejamentos/${clientSlug}`}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Voltar aos módulos
          </Link>

          {project ? (
            <Link
              href={`/apresentacao/${project.slug}`}
              className="rounded-full bg-slate-950 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Ver apresentação
            </Link>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 lg:px-10">
        {isLoading ? (
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10">
            <p className="text-slate-500">Carregando módulo...</p>
          </div>
        ) : null}

        {!isLoading && errorMessage && !project ? (
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-500">
              Atenção
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em]">
              {errorMessage}
            </h1>

            <Link
              href="/admin"
              className="mt-8 inline-flex rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Voltar ao painel
            </Link>
          </div>
        ) : null}

        {!isLoading && project ? (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="self-start rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Planejamento
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">
                {client?.name ?? "Cliente"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {project.title}
              </p>

              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                  project.status
                )}`}
              >
                {getStatusLabel(project.status)}
              </span>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Categoria
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {module?.category ?? "Módulo"}
                </p>
              </div>

              {relatedModules.length > 0 ? (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Módulos da categoria
                  </p>

                  <div className="mt-4 space-y-2">
                    {relatedModules.map((item) => (
                      <Link
                        key={item.slug}
                        href={`/admin/planejamentos/${clientSlug}/modulos/${item.slug}`}
                        className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          item.slug === moduleSlug
                            ? "bg-slate-950 text-white"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>

            <div>
              <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Módulo estratégico
                </p>

                <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em]">
                  {module?.title ?? "Módulo não encontrado"}
                </h1>

                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                  {module?.description ??
                    "Este módulo não foi encontrado na base de módulos do planejamento."}
                </p>

                {!isModuleSelected ? (
                  <div className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
                    Este módulo não está selecionado para este planejamento.
                    Para preencher, volte aos módulos e selecione este item.
                  </div>
                ) : null}

                {errorMessage && project ? (
                  <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}
              </div>

              {isSpecialistModule ? (
  <EspecialistaForm
    data={specialistData}
    setData={setSpecialistData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isCompanyModule ? (
  <EmpresaForm
    data={companyData}
    setData={setCompanyData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isContentDnaModule ? (
  <DnaConteudoForm
    data={contentDnaData}
    setData={setContentDnaData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isToneVoiceModule ? (
  <TomDeVozForm
    data={toneVoiceData}
    setData={setToneVoiceData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isVisualIdentityModule ? (
  <IdentidadeVisualForm
    data={visualIdentityData}
    setData={setVisualIdentityData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isProjectObjectivesModule ? (
  <ObjetivosProjetoForm
    data={projectObjectivesData}
    setData={setProjectObjectivesData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isReferencesCompetitorsModule ? (
  <ReferenciasConcorrentesForm
    data={referencesCompetitorsData}
    setData={setReferencesCompetitorsData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isCompetitorResearchModule ? (
  <PesquisaConcorrenciaForm
    data={competitorResearchData}
    setData={setCompetitorResearchData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isSwotModule ? (
  <AnaliseSwotForm
    data={swotData}
    setData={setSwotData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isKeywordsModule ? (
  <PalavrasChaveForm
    data={keywordsData}
    setData={setKeywordsData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isPersonasModule ? (
  <PersonasForm
    data={personasData}
    setData={setPersonasData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isBuyingJourneyModule ? (
  journeyPersonasSource === "missing" ||
  (journeyPersonasSource === "ready" && personasData.personas.length === 0) ? (
    <div className="mt-8 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-8 sm:py-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          Cadastrar personas antes das jornadas
        </h2>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <p className="text-sm leading-7 text-slate-700 sm:text-base">
          Este planejamento ainda não possui personas salvas. Cadastre e salve ao menos uma persona antes de criar Jornadas de Compra específicas.
        </p>
      </div>
    </div>
  ) : journeyPersonasSource === "invalid" ? (
    <div className="mt-8 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-8 sm:py-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          Personas com dados inválidos
        </h2>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <p className="text-sm leading-7 text-slate-700 sm:text-base">
          Não foi possível carregar corretamente as personas deste planejamento. Revise e salve novamente o módulo Personas antes de continuar.
        </p>
      </div>
    </div>
  ) : needsPersonaPreparation ? (
    <div className="mt-8 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-8 sm:py-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          Preparar personas para jornadas
        </h2>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <p className="text-sm leading-7 text-slate-700 sm:text-base">
          Algumas personas deste planejamento ainda não possuem um identificador
          estável. Essa preparação é necessária para vincular cada Jornada de
          Compra à persona correta.
        </p>

        <ul
          className="mt-4 space-y-1.5 text-sm leading-7 text-slate-600"
          aria-label="O que será feito nesta preparação"
        >
          <li className="flex items-start gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            nenhum conteúdo das personas será alterado
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            serão adicionados apenas identificadores internos
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            após a preparação, será possível criar uma jornada específica para cada persona
          </li>
        </ul>

        {preparePersonasError ? (
          <div
            className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
            role="alert"
            id="prepare-personas-error"
          >
            {preparePersonasError}
          </div>
        ) : null}

        <div className="mt-6">
          <button
            type="button"
            onClick={preparePersonasForJourneys}
            disabled={isPreparingPersonas}
            aria-busy={isPreparingPersonas}
            aria-describedby={preparePersonasError ? "prepare-personas-error" : undefined}
            className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-8"
          >
            {isPreparingPersonas ? "Preparando personas..." : "Preparar personas"}
          </button>
        </div>
      </div>
    </div>
  ) : personaJourneysData.legacyMigration.status === "pending" ? (
    <div className="mt-8 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-8 sm:py-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          Vincular jornada existente
        </h2>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <p className="text-sm leading-7 text-slate-700 sm:text-base">
          Uma Jornada de Compra criada anteriormente foi encontrada neste
          planejamento. Para preservar esse conteúdo e permitir uma jornada
          específica para cada persona, confirme a qual persona essa jornada
          pertence.
        </p>

        <ul
          className="mt-4 space-y-1.5 text-sm leading-7 text-slate-600"
          aria-label="Informações sobre a vinculação"
        >
          <li className="flex items-start gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            a jornada existente será copiada
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            nenhum conteúdo antigo será apagado
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            a jornada original continuará preservada
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            a vinculação não poderá sobrescrever uma jornada já criada para a persona
          </li>
        </ul>

        {/* Cenário 1: nenhuma persona cadastrada */}
        {personasData.personas.length === 0 ? (
          <p className="mt-6 text-sm leading-7 text-slate-600">
            Cadastre ao menos uma persona antes de vincular a Jornada de Compra
            existente.
          </p>
        ) : eligiblePersonasForLegacyMigration.length === 0 ? (
          /* Todas as personas já possuem jornada */
          <p className="mt-6 text-sm leading-7 text-slate-600">
            Nenhuma persona está disponível para receber a jornada existente,
            pois todas já possuem uma jornada vinculada.
          </p>
        ) : eligiblePersonasForLegacyMigration.length === 1 ? (
          /* Cenário 2: uma persona elegível */
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-slate-700">
              Persona disponível para receber a jornada:
            </p>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              {eligiblePersonasForLegacyMigration[0]?.photo ? (
                <img
                  src={eligiblePersonasForLegacyMigration[0].photo}
                  alt={eligiblePersonasForLegacyMigration[0].name || "Persona"}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-400 ring-1 ring-slate-200">
                  {(eligiblePersonasForLegacyMigration[0]?.name || "P")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-slate-900">
                {eligiblePersonasForLegacyMigration[0]?.name || "Persona sem nome"}
              </span>
            </div>

            {personaJourneysSaveError ? (
              <div
                className="mt-4 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
                role="alert"
                id="legacy-migration-error"
              >
                {personaJourneysSaveError}
              </div>
            ) : null}

            <div className="mt-5">
              <button
                type="button"
                disabled={isSavingPersonaJourneys}
                aria-busy={isSavingPersonaJourneys}
                aria-describedby={
                  personaJourneysSaveError ? "legacy-migration-error" : undefined
                }
                onClick={async () => {
                  const personaId =
                    eligiblePersonasForLegacyMigration[0]?.id ?? "";
                  const success =
                    await migrateLegacyJourneyToPersona(personaId);
                  if (success) setSelectedLegacyPersonaId("");
                }}
                className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-full sm:px-8"
              >
                {isSavingPersonaJourneys
                  ? "Vinculando jornada..."
                  : "Vincular jornada a esta persona"}
              </button>
            </div>
          </div>
        ) : (
          /* Cenário 3: múltiplas personas elegíveis */
          <div className="mt-6">
            <fieldset>
              <legend className="mb-3 text-sm font-medium text-slate-700">
                Selecione a persona para receber a jornada existente:
              </legend>
              <div className="space-y-2">
                {eligiblePersonasForLegacyMigration.map((p) => {
                  const isSelected = selectedLegacyPersonaId === p.id;
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3 transition-colors ${
                        isSelected
                          ? "border-slate-950 bg-slate-950/[0.04]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="legacy-persona-selection"
                        value={p.id}
                        checked={isSelected}
                        onChange={() =>
                          setSelectedLegacyPersonaId(p.id ?? "")
                        }
                        className="sr-only"
                      />
                      {p.photo ? (
                        <img
                          src={p.photo}
                          alt={p.name || "Persona"}
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-400 ring-1 ring-slate-200">
                          {(p.name || "P").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900">
                        {p.name || "Persona sem nome"}
                      </span>
                      <span
                        className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? "border-slate-950 bg-slate-950"
                            : "border-slate-300"
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>

              {personasData.personas.some(
                (p) => p.id?.trim() && personaJourneysData.journeys[p.id]
              ) && (
                <p className="mt-3 text-xs text-slate-400">
                  Personas com jornada existente não estão disponíveis para
                  seleção.
                </p>
              )}
            </fieldset>

            {personaJourneysSaveError ? (
              <div
                className="mt-4 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
                role="alert"
                id="legacy-migration-error"
              >
                {personaJourneysSaveError}
              </div>
            ) : null}

            <div className="mt-5">
              <button
                type="button"
                disabled={!selectedLegacyPersonaId || isSavingPersonaJourneys}
                aria-busy={isSavingPersonaJourneys}
                aria-describedby={
                  personaJourneysSaveError ? "legacy-migration-error" : undefined
                }
                onClick={async () => {
                  const success = await migrateLegacyJourneyToPersona(
                    selectedLegacyPersonaId
                  );
                  if (success) setSelectedLegacyPersonaId("");
                }}
                className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-full sm:px-8"
              >
                {isSavingPersonaJourneys
                  ? "Vinculando jornada..."
                  : "Vincular jornada à persona selecionada"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : (
    <JornadaPorPersonaForm
      personas={personasData.personas}
      journeysData={personaJourneysData}
      isSaving={isSavingPersonaJourneys}
      saveError={personaJourneysSaveError}
      createDraft={createPersonaJourneyDraft}
      saveJourney={savePersonaJourney}
      orphanedJourneys={orphanedPersonaJourneys}
      reassignOrphanedJourney={reassignOrphanedPersonaJourney}
      deleteOrphanedJourney={deleteOrphanedPersonaJourney}
    />
  )

  ) : isCurrentChannelsModule ? (
  <CanaisDigitaisAtuaisForm
    data={currentChannelsData}
    setData={setCurrentChannelsData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isContentFunnelModule ? (
  <FunilConteudoForm
    data={contentFunnelData}
    setData={setContentFunnelData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isEditorialLinesModule ? (
  <LinhasEditoriaisForm
    data={editorialLinesData}
    setData={setEditorialLinesData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />

  ) : isInstagramModule ? (
  <InstagramForm
    data={instagramData}
    setData={setInstagramData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
    planningProjectId={project.id}
  />
) : isTiktokModule ? (
  <TikTokForm
    data={tiktokData}
    setData={setTiktokData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
    planningProjectId={project.id}
  />
) : isYoutubeModule ? (
  <YoutubeForm
    data={youtubeData}
    setData={setYoutubeData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
    planningProjectId={project.id}
  />
) : isFacebookModule ? (
  <FacebookForm
    data={facebookData}
    setData={setFacebookData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isLinkedinModule ? (
  <LinkedInForm
    data={linkedinData}
    setData={setLinkedinData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
    planningProjectId={project.id}
  />
) : isWhatsappModule ? (
  <WhatsAppForm
    data={whatsappData}
    setData={setWhatsappData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
    planningProjectId={project.id}
  />
) : isBlogModule ? (
  <BlogForm
    data={blogData}
    setData={setBlogData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
    planningProjectId={project.id}
  />
) : isPinterestModule ? (
  <PinterestForm
    data={pinterestData}
    setData={setPinterestData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isPodcastsModule ? (
  <PodcastsForm
    data={podcastsData}
    setData={setPodcastsData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isLivesModule ? (
  <LivesForm
    data={livesData}
    setData={setLivesData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    planningProjectId={project.id}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isEducationalMaterialsModule ? (
  <MateriaisEducacionaisForm
    data={educationalMaterialsData}
    setData={setEducationalMaterialsData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    planningProjectId={project.id}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isSiteStrategyModule ? (
  <EstrategiaDoSiteForm
    data={siteStrategyData}
    setData={setSiteStrategyData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isSiteMapModule ? (
  <MapaDoSiteForm
    data={siteMapData}
    setData={setSiteMapData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isLeadCaptureCampaignModule ? (
  <CampanhaCaptacaoLeadForm
    data={leadCaptureCampaignData}
    setData={setLeadCaptureCampaignData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isSalesConversionCampaignModule ? (
  <CampanhaConversaoVendasForm
    data={salesConversionCampaignData}
    setData={setSalesConversionCampaignData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isContentDistributionCampaignModule ? (
  <CampanhaDistribuicaoConteudoForm
    data={contentDistributionCampaignData}
    setData={setContentDistributionCampaignData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isAutomationSystemModule ? (
  <FluxoAutomacaoForm
    data={automationSystemData}
    setData={setAutomationSystemData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isTimelineModule ? (
  <LinhaDoTempoForm
    data={timelineData}
    setData={setTimelineData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isContentCalendarModule ? (
  <CalendarioConteudoForm
    data={contentCalendarData}
    setData={setContentCalendarData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isMetricsModule ? (
  <MetricasIndicadoresForm
    data={metricsData}
    setData={setMetricsData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : isAdditionalGuidelinesModule ? (
  <OrientacoesAdicionaisForm
    data={additionalGuidelinesData}
    setData={setAdditionalGuidelinesData}
    clientSlug={clientSlug}
    presentationHref={`/apresentacao/${project.slug}`}
    isSaving={isSaving}
    isDisabled={!isModuleSelected}
    onSave={() => saveModule()}
  />
) : (
                <form
                  onSubmit={saveModule}
                  className="mt-6 rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Conteúdo principal do módulo
                    </label>

                    <RichTextEditor
                      value={genericData.mainText || ""}
                      onChange={(value) =>
                        setGenericData((current) => ({
                          ...current,
                          mainText: value,
                        }))
                      }
                      placeholder="Preencha aqui as informações estratégicas deste módulo."
                    />
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Observações internas
                    </label>

                    <RichTextEditor
                      value={genericData.notes || ""}
                      onChange={(value) =>
                        setGenericData((current) => ({
                          ...current,
                          notes: value,
                        }))
                      }
                      placeholder="Anote observações, decisões, pendências ou contexto para este cliente."
                    />
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Referências e links
                    </label>

                    <RichTextEditor
                      value={genericData.references || ""}
                      onChange={(value) =>
                        setGenericData((current) => ({
                          ...current,
                          references: value,
                        }))
                      }
                      placeholder="Cole referências, links, exemplos ou materiais usados neste módulo."
                    />
                  </div>

                  <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href={`/admin/planejamentos/${clientSlug}`}
                      className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                      Voltar para módulos
                    </Link>

                    <button
                      type="submit"
                      disabled={isSaving || !isModuleSelected}
                      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Salvando..." : "Salvar módulo"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <MetodoFooter />
    </main>
  );
}
