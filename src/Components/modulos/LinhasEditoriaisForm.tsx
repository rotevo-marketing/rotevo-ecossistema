"use client";

import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import RichTextEditor from "@/Components/RichTextEditor";
import { initialChannels } from "@/Components/modulos/CanaisDigitaisAtuaisForm";
import { journeyStages } from "@/Components/modulos/JornadaCompraForm";
import type { EditorialChannelFrequency } from "@/lib/normalizeEditorialLineData";

export type EditorialLineItem = {
  title: string;
  objective: string;
  description: string;
  targetAudience: string;
  contentPillars: string;
  formats: string;
  frequency: string;
  examples: string;
  notes: string;
  lineType: string;
  priority: string;
  channelFrequencies: EditorialChannelFrequency[];
  priorityPersonas: string[];
  journeyRoles: string[];
  mainPillars: string[];
  priorityFormats: string[];
  contentExamples: string[];
  relatedOffers: string[];
  conductionMoment: string;
  primaryIndicators: string[];
};

export type EditorialLineReference = {
  title: string;
  link: string;
};

export type EditorialLinesData = {
  lines: EditorialLineItem[];
  generalGuidelines: string;
  references: EditorialLineReference[];
};

const initialEditorialLine: EditorialLineItem = {
  title: "",
  objective: "",
  description: "",
  targetAudience: "",
  contentPillars: "",
  formats: "",
  frequency: "",
  examples: "",
  notes: "",
  lineType: "",
  priority: "",
  channelFrequencies: [],
  priorityPersonas: [],
  journeyRoles: [],
  mainPillars: [],
  priorityFormats: [],
  contentExamples: [],
  relatedOffers: [],
  conductionMoment: "",
  primaryIndicators: [],
};

export const initialEditorialLinesData: EditorialLinesData = {
  lines: [{ ...initialEditorialLine }],
  generalGuidelines: "",
  references: [
    {
      title: "",
      link: "",
    },
  ],
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>

      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      ) : null}

      <div className="mt-6">{children}</div>
    </section>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  rows: _rows,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-600">
        {label}
      </label>
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={_rows ? Math.max(110, _rows * 28) : 130}
      />
    </div>
  );
}

function BlockTitle({ title }: { title: string }) {
  return (
    <h4 className="border-b border-slate-200 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      {title}
    </h4>
  );
}

function DynamicTextList({
  label,
  description,
  itemLabel,
  addLabel,
  values,
  onChange,
}: {
  label: string;
  description?: string;
  itemLabel: string;
  addLabel: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600">{label}</label>
      {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      <div className="mt-3 space-y-3">
        {values.map((value, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">{itemLabel}</label>
              <input
                type="text"
                value={value}
                onChange={(event) => {
                  const nextValues = [...values];
                  nextValues[index] = event.target.value;
                  onChange(nextValues);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
                className="cursor-pointer rounded-full px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="mt-3 cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        {addLabel}
      </button>
    </div>
  );
}

function CompactTextarea({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600">{label}</label>
      {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </div>
  );
}

const editorialLineTypes = [
  "Técnica",
  "Científica",
  "Educacional",
  "Motivacional",
  "Cultural",
  "Estilo de Vida",
  "Entretenimento",
  "Tutorial",
  "Notícias",
];

const editorialPriorities = ["Principal", "Complementar", "Pontual"];
const frequencyPeriods = ["por dia", "por semana", "por quinzena", "por mês", "por trimestre"];
const contentChannelOptions = [
  "Instagram Feed",
  "Instagram Stories",
  "Facebook",
  "LinkedIn",
  "Newsletter do LinkedIn",
  "TikTok",
  "YouTube",
  "YouTube Shorts",
  "Blog",
  "E-mail / Newsletter",
  "WhatsApp",
  "Pinterest",
  "Podcast",
  "Lives",
  "Site",
  "Lista de cadastro",
];
const channelOptions = [
  ...contentChannelOptions,
  ...initialChannels
    .map((channel) => channel.nome)
    .filter((channel) => channel !== "Instagram" && !contentChannelOptions.includes(channel)),
];
const getChannelIdentity = (channel: string) =>
  channel === "Instagram" ? "Instagram Feed" : channel;
const getChannelLabel = (channel: string) =>
  channel === "Instagram" ? "Instagram Feed" : channel;
const journeyRoleOptions = journeyStages.map((stage) => stage.title);

type LinhasEditoriaisFormProps = {
  data: EditorialLinesData;
  setData: Dispatch<SetStateAction<EditorialLinesData>>;
  clientSlug: string;
  presentationHref: string;
  isSaving: boolean;
  isDisabled: boolean;
  onSave: () => void;
};

export default function LinhasEditoriaisForm({
  data,
  setData,
  clientSlug,
  presentationHref,
  isSaving,
  isDisabled,
  onSave,
}: LinhasEditoriaisFormProps) {
  function updateLine<K extends keyof EditorialLineItem>(
    index: number,
    key: K,
    value: EditorialLineItem[K]
  ) {
    setData((current) => {
      const nextLines = [...current.lines];

      nextLines[index] = {
        ...nextLines[index],
        [key]: value,
      };

      return {
        ...current,
        lines: nextLines,
      };
    });
  }

  function addLine() {
    setData((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          ...initialEditorialLine,
        },
      ],
    }));
  }

  function duplicateLine(index: number) {
    setData((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          ...current.lines[index],
          channelFrequencies: current.lines[index].channelFrequencies.map((item) => ({ ...item })),
          priorityPersonas: [...current.lines[index].priorityPersonas],
          journeyRoles: [...current.lines[index].journeyRoles],
          mainPillars: [...current.lines[index].mainPillars],
          priorityFormats: [...current.lines[index].priorityFormats],
          contentExamples: [...current.lines[index].contentExamples],
          relatedOffers: [...current.lines[index].relatedOffers],
          primaryIndicators: [...current.lines[index].primaryIndicators],
        },
      ],
    }));
  }

  function removeLine(index: number) {
    setData((current) => ({
      ...current,
      lines:
        current.lines.length > 1
          ? current.lines.filter((_, itemIndex) => itemIndex !== index)
          : [
              {
                ...initialEditorialLine,
              },
            ],
    }));
  }

  function moveLine(index: number, direction: "up" | "down") {
    setData((current) => {
      const nextLines = [...current.lines];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= nextLines.length) {
        return current;
      }

      const currentLine = nextLines[index];
      nextLines[index] = nextLines[targetIndex];
      nextLines[targetIndex] = currentLine;

      return {
        ...current,
        lines: nextLines,
      };
    });
  }

  function updateReference(
    index: number,
    key: keyof EditorialLineReference,
    value: string
  ) {
    setData((current) => {
      const nextReferences = [...current.references];

      nextReferences[index] = {
        ...nextReferences[index],
        [key]: value,
      };

      return {
        ...current,
        references: nextReferences,
      };
    });
  }

  function addReference() {
    setData((current) => ({
      ...current,
      references: [
        ...current.references,
        {
          title: "",
          link: "",
        },
      ],
    }));
  }

  function removeReference(index: number) {
    setData((current) => ({
      ...current,
      references:
        current.references.length > 1
          ? current.references.filter((_, itemIndex) => itemIndex !== index)
          : [
              {
                title: "",
                link: "",
              },
            ],
    }));
  }

  return (
    <div className="mt-6 space-y-6">
      <SectionCard
        title="Linhas editoriais"
        description="Organize os principais temas, assuntos, objetivos e formatos que vão guiar a produção de conteúdo do projeto."
      >
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={addLine}
            className="cursor-pointer rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Nova linha editorial
          </button>
        </div>

        <div className="space-y-6">
          {data.lines.map((line, index) => (
            <div
              key={`${line.title}-${index}`}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Linha editorial {String(index + 1).padStart(2, "0")}
                  </p>

                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                    {line.title || "Nova linha editorial"}
                  </h3>

                  {line.objective ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      {line.objective}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveLine(index, "up")}
                    className="cursor-pointer rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950 hover:border-slate-950 hover:text-black"
                  >
                    Subir
                  </button>

                  <button
                    type="button"
                    onClick={() => moveLine(index, "down")}
                    className="cursor-pointer rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950 hover:border-slate-950 hover:text-black"
                  >
                    Descer
                  </button>

                  <button
                    type="button"
                    onClick={() => duplicateLine(index)}
                    className="cursor-pointer rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950 hover:border-slate-950 hover:text-black"
                  >
                    Duplicar
                  </button>

                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="cursor-pointer rounded-full px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-5">
                  <BlockTitle title="Identificação" />
                  <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-600">
                      Nome da linha editorial
                    </label>

                    <input
                      type="text"
                      value={line.title}
                      onChange={(event) =>
                        updateLine(index, "title", event.target.value)
                      }
                      placeholder="Nome da linha"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-600">
                      Tipo da linha editorial
                    </label>
                    <select
                      value={line.lineType}
                      onChange={(event) => updateLine(index, "lineType", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">Selecione o tipo</option>
                      {line.lineType && !editorialLineTypes.includes(line.lineType) && (
                        <option value={line.lineType}>{line.lineType}</option>
                      )}
                      {editorialLineTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">Classifica a natureza predominante da linha editorial.</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-600">Prioridade editorial</label>
                    <select
                      value={line.priority}
                      onChange={(event) => updateLine(index, "priority", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">Selecione a prioridade</option>
                      {line.priority && !editorialPriorities.includes(line.priority) && (
                        <option value={line.priority}>{line.priority}</option>
                      )}
                      {editorialPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600">Frequência por canal</label>
                    <div className="mt-3 space-y-3">
                      {line.channelFrequencies.map((frequency, frequencyIndex) => (
                        <div key={frequencyIndex} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_120px_190px_auto]">
                          <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-500">Canal</label>
                            <select
                              value={frequency.channel}
                              onChange={(event) => {
                                const next = line.channelFrequencies.map((item, itemIndex) => itemIndex === frequencyIndex ? { ...item, channel: event.target.value } : item);
                                updateLine(index, "channelFrequencies", next);
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                              <option value="">Selecione o canal</option>
                              {frequency.channel && !channelOptions.includes(frequency.channel) && <option value={frequency.channel}>{getChannelLabel(frequency.channel)}</option>}
                              {channelOptions.filter((channel) => !(frequency.channel === "Instagram" && channel === "Instagram Feed")).map((channel) => (
                                <option key={channel} value={channel} disabled={line.channelFrequencies.some((item, itemIndex) => itemIndex !== frequencyIndex && getChannelIdentity(item.channel) === getChannelIdentity(channel))}>{channel}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-500">Quantidade</label>
                            <input
                              type="number"
                              min="0"
                              value={frequency.quantity}
                              onChange={(event) => {
                                if (event.target.value && Number(event.target.value) < 0) return;
                                const next = line.channelFrequencies.map((item, itemIndex) => itemIndex === frequencyIndex ? { ...item, quantity: event.target.value } : item);
                                updateLine(index, "channelFrequencies", next);
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-500">Período</label>
                            <select
                              value={frequency.period}
                              onChange={(event) => {
                                const next = line.channelFrequencies.map((item, itemIndex) => itemIndex === frequencyIndex ? { ...item, period: event.target.value } : item);
                                updateLine(index, "channelFrequencies", next);
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                              <option value="">Selecione o período</option>
                              {frequencyPeriods.map((period) => <option key={period} value={period}>{period}</option>)}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button type="button" onClick={() => updateLine(index, "channelFrequencies", line.channelFrequencies.filter((_, itemIndex) => itemIndex !== frequencyIndex))} className="cursor-pointer rounded-full px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50">Excluir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => updateLine(index, "channelFrequencies", [...line.channelFrequencies, { channel: "", quantity: "", period: "" }])} className="mt-3 cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Adicionar canal</button>
                    {line.frequency && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Frequência anterior</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{line.frequency}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  <BlockTitle title="Estratégia" />
                  <TextAreaField label="Objetivo estratégico" value={line.objective} placeholder="Descreva o movimento estratégico esperado." rows={4} onChange={(value) => updateLine(index, "objective", value)} />
                  <p className="-mt-3 text-xs text-slate-500">Qual movimento esta linha deve provocar na percepção ou na decisão do público?</p>
                  <TextAreaField label="Descrição resumida" value={line.description} placeholder="Descreva o território temático da linha." rows={5} onChange={(value) => updateLine(index, "description", value)} />
                  <p className="-mt-3 text-xs text-slate-500">Explique o território temático abordado por esta linha e seus limites.</p>
                  <DynamicTextList label="Personas prioritárias" description="Indique uma ou duas personas prioritárias para esta linha." itemLabel="Nome da persona" addLabel="Adicionar persona" values={line.priorityPersonas} onChange={(values) => updateLine(index, "priorityPersonas", values)} />
                  {line.targetAudience && line.priorityPersonas.length === 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Público ou intenção anterior</p><div className="mt-2"><RichTextEditor value={line.targetAudience} onChange={(value) => updateLine(index, "targetAudience", value)} minHeight={110} /></div></div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-slate-600">Papel na jornada</label>
                    <p className="mt-1 text-xs text-slate-500">Selecione as etapas em que esta linha exerce função relevante.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {journeyRoleOptions.map((role) => {
                        const selected = line.journeyRoles.includes(role);
                        return <button key={role} type="button" onClick={() => updateLine(index, "journeyRoles", selected ? line.journeyRoles.filter((item) => item !== role) : [...line.journeyRoles, role])} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition ${selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>{role}</button>;
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <BlockTitle title="Conteúdo" />
                  <DynamicTextList label="Pilares principais" description="Resuma os principais territórios temáticos desta linha." itemLabel="Pilar" addLabel="Adicionar pilar" values={line.mainPillars} onChange={(values) => updateLine(index, "mainPillars", values)} />
                  <DynamicTextList label="Formatos prioritários" description="Registre apenas os formatos em que esta linha tende a funcionar melhor." itemLabel="Formato" addLabel="Adicionar formato" values={line.priorityFormats} onChange={(values) => updateLine(index, "priorityFormats", values)} />
                  <DynamicTextList label="Exemplos de conteúdo" description="Registre exemplos que tornem a linha editorial concreta." itemLabel="Exemplo de conteúdo" addLabel="Adicionar exemplo" values={line.contentExamples} onChange={(values) => updateLine(index, "contentExamples", values)} />
                </div>

                <div className="space-y-5">
                  <BlockTitle title="Conversão" />
                  <DynamicTextList label="Ofertas relacionadas" itemLabel="Oferta" addLabel="Adicionar oferta" values={line.relatedOffers} onChange={(values) => updateLine(index, "relatedOffers", values)} />
                  <CompactTextarea label="Momento de condução" description="Explique em que situação o conteúdo deve conduzir o público para a oferta relacionada." value={line.conductionMoment} onChange={(value) => updateLine(index, "conductionMoment", value)} />
                  <DynamicTextList label="Indicadores principais" description="Registre os indicadores mais adequados para avaliar a função desta linha." itemLabel="Indicador" addLabel="Adicionar indicador" values={line.primaryIndicators} onChange={(values) => updateLine(index, "primaryIndicators", values)} />
                </div>

                <div className="space-y-5">
                  <BlockTitle title="Área interna" />
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Uso interno · Não exibido ao cliente</p>
                    <TextAreaField label="Observações internas" value={line.notes} placeholder="Registre observações internas." rows={4} onChange={(value) => updateLine(index, "notes", value)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Diretrizes gerais das linhas editoriais"
        description="Use este campo para orientar a lógica geral da produção de conteúdo, equilíbrio entre linhas, prioridades e cuidados editoriais."
      >
        <RichTextEditor
          value={data.generalGuidelines}
          onChange={(value) =>
            setData((current) => ({ ...current, generalGuidelines: value }))
          }
          placeholder="Ex: Manter equilíbrio entre autoridade, conexão e conversão. Priorizar conteúdos educativos no topo do funil, conteúdos de prova no meio e conteúdos de oferta no fundo. Evitar temas que não reforcem o posicionamento central."
        />
      </SectionCard>

      <SectionCard
        title="Anexos e referências externas"
        description="Referências externas são opcionais, mas ajudam a orientar exemplos de conteúdo, quadros, editorias e padrões visuais."
      >
        <div className="space-y-4">
          {data.references.map((reference, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Título da referência
                </label>

                <input
                  type="text"
                  value={reference.title}
                  onChange={(event) =>
                    updateReference(index, "title", event.target.value)
                  }
                  placeholder="Ex: Perfil, post, linha editorial, quadro, referência visual ou documento"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Link
                </label>

                <input
                  type="url"
                  value={reference.link}
                  onChange={(event) =>
                    updateReference(index, "link", event.target.value)
                  }
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeReference(index)}
                  className="cursor-pointer rounded-full px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addReference}
          className="mt-5 cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950 hover:border-slate-950 hover:text-white"
        >
          + Nova referência
        </button>
      </SectionCard>

      <div className="sticky bottom-0 rounded-[1.5rem] border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/admin/planejamentos/${clientSlug}`}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voltar para módulos
          </Link>

          <Link
            href={presentationHref}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver apresentação
          </Link>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isDisabled}
            className="cursor-pointer rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar módulo"}
          </button>
        </div>
      </div>
    </div>
  );
}
