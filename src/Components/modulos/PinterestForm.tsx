"use client";

import { ChangeEvent } from "react";
import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import RichTextEditor from "@/Components/RichTextEditor";

export type PinterestFrequencyItem = {
  format: string;
  quantity: string;
  period: string;
  observation: string;
};

export type PinterestTextListItem = {
  value: string;
};

export type PinterestVisualReference = {
  image: string;
};

export type PinterestExternalReference = {
  title: string;
  link: string;
};

export type PinterestData = {
  frequencyItems: PinterestFrequencyItem[];
  objectives: PinterestTextListItem[];
  languageStructures: PinterestTextListItem[];
  contents: PinterestTextListItem[];
  mainBoards: string;
  priorityVisualThemes: string;
  visualStrategy: string;
  visualReferences: PinterestVisualReference[];
  pinKeywords: string;
  destinationLinks: string;
  descriptionGuidelines: string;
  references: PinterestExternalReference[];
};

export const initialPinterestFrequencyItems: PinterestFrequencyItem[] = [
  { format: "Pins estáticos", quantity: "", period: "por semana", observation: "" },
  { format: "Pins verticais", quantity: "", period: "por semana", observation: "" },
  { format: "Pins de portfólio", quantity: "", period: "por semana", observation: "" },
  { format: "Atualização de pastas", quantity: "", period: "por mês", observation: "" },
];

export const initialPinterestData: PinterestData = {
  frequencyItems: initialPinterestFrequencyItems,
  objectives: [{ value: "" }],
  languageStructures: [{ value: "" }],
  contents: [{ value: "" }],
  mainBoards: "",
  priorityVisualThemes: "",
  visualStrategy: "",
  visualReferences: [{ image: "" }, { image: "" }, { image: "" }],
  pinKeywords: "",
  destinationLinks: "",
  descriptionGuidelines: "",
  references: [{ title: "", link: "" }],
};

export function normalizePinterestTextList(value: unknown): PinterestTextListItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ value: "" }];
  }

  return value.map((item) => {
    if (typeof item === "string") return { value: item };
    if (item && typeof item === "object") {
      return { value: (item as Partial<PinterestTextListItem>).value || "" };
    }
    return { value: "" };
  });
}

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
    <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

type PinterestFormProps = {
  data: PinterestData;
  setData: Dispatch<SetStateAction<PinterestData>>;
  clientSlug: string;
  presentationHref: string;
  isSaving: boolean;
  isDisabled: boolean;
  onSave: () => void;
};

export default function PinterestForm({
  data,
  setData,
  clientSlug,
  presentationHref,
  isSaving,
  isDisabled,
  onSave,
}: PinterestFormProps) {
  function updateFrequencyItem(
    index: number,
    key: keyof PinterestFrequencyItem,
    value: string
  ) {
    setData((current) => {
      const nextItems = [...current.frequencyItems];
      nextItems[index] = { ...nextItems[index], [key]: value };
      return { ...current, frequencyItems: nextItems };
    });
  }

  function addFrequencyItem() {
    setData((current) => ({
      ...current,
      frequencyItems: [
        ...current.frequencyItems,
        { format: "", quantity: "", period: "por semana", observation: "" },
      ],
    }));
  }

  function removeFrequencyItem(index: number) {
    setData((current) => ({
      ...current,
      frequencyItems:
        current.frequencyItems.length > 1
          ? current.frequencyItems.filter((_, i) => i !== index)
          : [{ format: "", quantity: "", period: "por semana", observation: "" }],
    }));
  }

  function updateTextListItem(
    listKey: "objectives" | "languageStructures" | "contents",
    index: number,
    value: string
  ) {
    setData((current) => {
      const nextList = [...current[listKey]];
      nextList[index] = { value };
      return { ...current, [listKey]: nextList };
    });
  }

  function addTextListItem(
    listKey: "objectives" | "languageStructures" | "contents"
  ) {
    setData((current) => ({
      ...current,
      [listKey]: [...current[listKey], { value: "" }],
    }));
  }

  function removeTextListItem(
    listKey: "objectives" | "languageStructures" | "contents",
    index: number
  ) {
    setData((current) => ({
      ...current,
      [listKey]:
        current[listKey].length > 1
          ? current[listKey].filter((_, i) => i !== index)
          : [{ value: "" }],
    }));
  }

  function updateVisualReferenceImage(
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setData((current) => {
        const nextReferences = [...current.visualReferences];
        nextReferences[index] = { image: String(reader.result || "") };
        return { ...current, visualReferences: nextReferences };
      });
    };
    reader.readAsDataURL(file);
  }

  function removeVisualReferenceImage(index: number) {
    setData((current) => {
      const nextReferences = [...current.visualReferences];
      nextReferences[index] = { image: "" };
      return { ...current, visualReferences: nextReferences };
    });
  }

  function updateReference(
    index: number,
    key: keyof PinterestExternalReference,
    value: string
  ) {
    setData((current) => {
      const nextReferences = [...current.references];
      nextReferences[index] = { ...nextReferences[index], [key]: value };
      return { ...current, references: nextReferences };
    });
  }

  function addReference() {
    setData((current) => ({
      ...current,
      references: [...current.references, { title: "", link: "" }],
    }));
  }

  function removeReference(index: number) {
    setData((current) => ({
      ...current,
      references:
        current.references.length > 1
          ? current.references.filter((_, i) => i !== index)
          : [{ title: "", link: "" }],
    }));
  }

  function TextListSection({
    title,
    description,
    listKey,
    placeholder,
    buttonLabel,
  }: {
    title: string;
    description: string;
    listKey: "objectives" | "languageStructures" | "contents";
    placeholder: string;
    buttonLabel: string;
  }) {
    return (
      <SectionCard title={title} description={description}>
        <div className="space-y-3">
          {data[listKey].map((item, index) => (
            <div key={index} className="flex gap-3">
              <input
                type="text"
                value={item.value}
                onChange={(event) =>
                  updateTextListItem(listKey, index, event.target.value)
                }
                placeholder={placeholder}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
              <button
                type="button"
                onClick={() => removeTextListItem(listKey, index)}
                className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => addTextListItem(listKey)}
          className="mt-4 cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950 hover:border-slate-950 hover:text-white"
        >
          + {buttonLabel}
        </button>
      </SectionCard>
    );
  }

  return (
    <div>
      <SectionCard
        title="Frequência"
        description="Defina a frequência por tipo de pin ou organização visual. Use quantidade e período para deixar a orientação mais clara."
      >
        <div className="space-y-4">
          {data.frequencyItems.map((item, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_160px_180px_1fr_auto]"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Formato
                </label>
                <input
                  type="text"
                  value={item.format}
                  onChange={(event) =>
                    updateFrequencyItem(index, "format", event.target.value)
                  }
                  placeholder="Ex: Pins estáticos"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Quantidade
                </label>
                <input
                  type="text"
                  value={item.quantity}
                  onChange={(event) =>
                    updateFrequencyItem(index, "quantity", event.target.value)
                  }
                  placeholder="Ex: 5"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Período
                </label>
                <select
                  value={item.period}
                  onChange={(event) =>
                    updateFrequencyItem(index, "period", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="por dia">por dia</option>
                  <option value="por semana">por semana</option>
                  <option value="por quinzena">por quinzena</option>
                  <option value="por mês">por mês</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Observação
                </label>
                <input
                  type="text"
                  value={item.observation}
                  onChange={(event) =>
                    updateFrequencyItem(index, "observation", event.target.value)
                  }
                  placeholder="Ex: Direcionar pins para páginas, posts ou portfólio."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeFrequencyItem(index)}
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
          onClick={addFrequencyItem}
          className="mt-5 cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950 hover:border-slate-950 hover:text-white"
        >
          + Novo formato
        </button>
      </SectionCard>

      <TextListSection
        title="Objetivos"
        description="Defina os objetivos específicos do Pinterest: descoberta, tráfego para o site, fortalecimento visual da marca, portfólio, inspiração, SEO visual ou captação de interessados."
        listKey="objectives"
        placeholder="Ex: Gerar tráfego para o site, organizar portfólio, atrair público por referências visuais..."
        buttonLabel="Novo objetivo"
      />

      <TextListSection
        title="Estruturas de linguagem"
        description="Descreva estruturas de linguagem adequadas para títulos, descrições e textos de apoio dos pins."
        listKey="languageStructures"
        placeholder="Ex: Títulos objetivos, descrição com palavra-chave, chamada para salvar, acessar o site ou conhecer o projeto."
        buttonLabel="Nova estrutura de linguagem"
      />

      <TextListSection
        title="Conteúdos"
        description="Defina ideias, temas, formatos e séries de pins que podem ser publicados no Pinterest."
        listKey="contents"
        placeholder="Ex: Inspirações visuais, antes e depois, portfólio, guias, ideias por categoria, tendências, tutoriais..."
        buttonLabel="Novo conteúdo"
      />

      <SectionCard
        title="Pastas e organização do perfil"
        description="Organize as principais pastas, categorias e temas visuais que farão parte do perfil no Pinterest."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Pastas principais
            </label>
            <RichTextEditor
              value={data.mainBoards}
              onChange={(value) =>
                setData((current) => ({ ...current, mainBoards: value }))
              }
              placeholder="Ex: Inspirações, portfólio, projetos, tendências, guias, antes e depois, referências por tema..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Temas visuais prioritários
            </label>
            <RichTextEditor
              value={data.priorityVisualThemes}
              onChange={(value) =>
                setData((current) => ({ ...current, priorityVisualThemes: value }))
              }
              placeholder="Ex: Estilo visual, categorias de conteúdo, temas de interesse, referências de estética e tipos de imagem."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Identidade visual"
        description="Defina o estilo visual das imagens do Pinterest, considerando pins verticais, capas, referências, portfólio, moodboard e estética do projeto."
      >
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-600">
            Estratégia visual
          </label>
          <RichTextEditor
            value={data.visualStrategy}
            onChange={(value) =>
              setData((current) => ({ ...current, visualStrategy: value }))
            }
            placeholder="Explique a direção visual do Pinterest: tipos de imagem, composição, cores, textos sobrepostos, estilo dos pins, estética, portfólio e referências."
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.visualReferences.map((reference, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50"
            >
              <label className="flex aspect-[2/3] cursor-pointer items-center justify-center text-center text-sm font-semibold text-slate-500 transition hover:bg-slate-100">
                {reference.image ? (
                  <img
                    src={reference.image}
                    alt={`Referência ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>
                    +<br />
                    Adicionar referência
                  </span>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => updateVisualReferenceImage(index, event)}
                  className="hidden"
                />
              </label>
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => removeVisualReferenceImage(index)}
                  className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Tamanho recomendado para pin vertical: 1000x1500px.
        </p>
      </SectionCard>

      <SectionCard
        title="SEO visual e descoberta"
        description="Registre palavras-chave, descrições, termos e diretrizes para facilitar a descoberta dos pins dentro do Pinterest."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Palavras-chave dos pins
            </label>
            <RichTextEditor
              value={data.pinKeywords}
              onChange={(value) =>
                setData((current) => ({ ...current, pinKeywords: value }))
              }
              placeholder="Liste termos importantes para títulos, descrições e organização dos pins."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Links de destino
            </label>
            <RichTextEditor
              value={data.destinationLinks}
              onChange={(value) =>
                setData((current) => ({ ...current, destinationLinks: value }))
              }
              placeholder="Informe páginas, posts, produtos, portfólio, site ou landing pages que os pins devem direcionar."
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-slate-600">
            Diretrizes de descrição
          </label>
          <RichTextEditor
            value={data.descriptionGuidelines}
            onChange={(value) =>
              setData((current) => ({ ...current, descriptionGuidelines: value }))
            }
            placeholder="Explique como escrever títulos e descrições dos pins, quais termos usar e qual chamada deve aparecer."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Anexos e referências externas"
        description="Referências externas são opcionais, mas ajudam quem está visualizando o planejamento a entender melhor a estratégia do Pinterest."
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
                  placeholder="Ex: Pin, pasta, perfil, referência visual, moodboard ou portfólio"
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

      <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/admin/planejamentos/${clientSlug}`}
          className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Voltar para módulos
        </Link>

        <div className="flex gap-3">
          <Link
            href={presentationHref}
            className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Ver apresentação
          </Link>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isDisabled}
            className="cursor-pointer inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar módulo"}
          </button>
        </div>
      </div>
    </div>
  );
}
