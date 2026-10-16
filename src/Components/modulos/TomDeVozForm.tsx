"use client";

import { ChangeEvent } from "react";
import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import RichTextEditor from "@/Components/RichTextEditor";

export type CharacteristicItem = {
  title: string;
  description: string;
};

export type ReferenceItem = {
  image: string;
  title: string;
  link: string;
};

export type ToneVoiceData = {
  characteristics: CharacteristicItem[];
  toneChoices: Record<string, string>;
  vocabulary: Record<string, string>;
  emotions: string[];
  observations: string;
  references: ReferenceItem[];
};

export const initialToneVoiceData: ToneVoiceData = {
  characteristics: [
    {
      title: "",
      description: "",
    },
  ],
  toneChoices: {},
  vocabulary: {},
  emotions: [],
  observations: "",
  references: [
    {
      image: "",
      title: "",
      link: "",
    },
  ],
};

const tonePairs = [
  { key: "acolhedorCritico", number: 1, left: "Acolhedor", right: "Crítico" },
  { key: "engracadoSerio", number: 2, left: "Engraçado", right: "Sério" },
  { key: "sarcasticoSolene", number: 3, left: "Sarcástico", right: "Solene" },
  { key: "formalCasual", number: 4, left: "Formal", right: "Casual" },
  {
    key: "respeitosoIrreverente",
    number: 5,
    left: "Respeitoso",
    right: "Irreverente",
  },
  { key: "filosoficoLogico", number: 6, left: "Filosófico", right: "Lógico" },
  { key: "tecnicoLeigo", number: 7, left: "Técnico", right: "Leigo" },
  {
    key: "inspiradorRepreensor",
    number: 8,
    left: "Inspirador",
    right: "Repreensor",
  },
  { key: "educativoNarrativo", number: 9, left: "Educativo", right: "Narrativo" },
  { key: "emocionalRacional", number: 10, left: "Emocional", right: "Racional" },
  { key: "suaveEnfatico", number: 11, left: "Suave", right: "Enfático" },
  {
    key: "amorosoContestador",
    number: 12,
    left: "Amoroso",
    right: "Contestador",
  },
  { key: "agressivoAmigavel", number: 13, left: "Agressivo", right: "Amigável" },
  { key: "rapidoLento", number: 14, left: "Rápido", right: "Lento" },
];

const vocabularyFields = [
  {
    key: "termosAutorais",
    label: "Termos autorais",
    placeholder:
      "Liste termos próprios, expressões criadas pela marca ou palavras que reforçam sua assinatura verbal.",
  },
  {
    key: "termosTecnicosNecessarios",
    label: "Termos técnicos necessários",
    placeholder:
      "Liste termos técnicos importantes que precisam aparecer na comunicação.",
  },
  {
    key: "termosQueSeRepetem",
    label: "Termos que se repetem",
    placeholder:
      "Liste palavras, expressões ou estruturas que devem aparecer com frequência na comunicação.",
  },
  {
    key: "termosProibidos",
    label: "Termos proibidos",
    placeholder:
      "Liste palavras, expressões ou abordagens que devem ser evitadas.",
  },
  {
    key: "metaforasEAnalogias",
    label: "Metáforas e analogias",
    placeholder:
      "Liste metáforas, comparações e analogias que combinam com a narrativa da marca.",
  },
  {
    key: "elementosDaNarrativa",
    label: "Elementos da narrativa",
    placeholder:
      "Registre elementos importantes da história, abordagem, argumento ou construção narrativa.",
  },
];

const emotionOptions = [
  "Indignação",
  "Confiança",
  "Preocupação",
  "Empolgação",
  "Ansiedade",
  "Envolvimento",
  "Sarcasmo",
  "Determinação",
  "Solidariedade",
  "Melancolia",
  "Alegria",
  "Nostalgia",
  "Medo",
  "Tranquilidade",
];

function VocabularyListField({
  label,
  value,
  onChange,
  addLabel = "+ Novo item",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  addLabel?: string;
}) {
  const items = value ? value.split("\n") : [];
  const displayItems = items.length > 0 ? items : [""];

  function updateItem(index: number, newVal: string) {
    const next = [...displayItems];
    next[index] = newVal;
    onChange(next.join("\n"));
  }

  function addItem() {
    onChange([...displayItems, ""].join("\n"));
  }

  function removeItem(index: number) {
    const next = displayItems.filter((_, i) => i !== index);
    onChange((next.length ? next : [""]).join("\n"));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="mb-3 text-sm font-semibold text-slate-800">{label}</p>
      <div className="space-y-2">
        {displayItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={i === 0 ? "Adicionar item..." : "Mais um item..."}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-black/10"
            />
            {displayItems.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="shrink-0 text-sm text-red-400 transition hover:text-red-600"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-3 cursor-pointer rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-950 hover:bg-slate-950 hover:text-black"
      >
        {addLabel}
      </button>
    </div>
  );
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

type TomDeVozFormProps = {
  data: ToneVoiceData;
  setData: Dispatch<SetStateAction<ToneVoiceData>>;
  clientSlug: string;
  presentationHref: string;
  isSaving: boolean;
  isDisabled: boolean;
  onSave: () => void;
};

export default function TomDeVozForm({
  data,
  setData,
  clientSlug,
  presentationHref,
  isSaving,
  isDisabled,
  onSave,
}: TomDeVozFormProps) {
  function updateCharacteristic(
    index: number,
    key: keyof CharacteristicItem,
    value: string
  ) {
    setData((current) => {
      const nextCharacteristics = [...current.characteristics];

      nextCharacteristics[index] = {
        ...nextCharacteristics[index],
        [key]: value,
      };

      return {
        ...current,
        characteristics: nextCharacteristics,
      };
    });
  }

  function addCharacteristic() {
    setData((current) => ({
      ...current,
      characteristics: [
        ...current.characteristics,
        {
          title: "",
          description: "",
        },
      ],
    }));
  }

  function removeCharacteristic(index: number) {
    setData((current) => ({
      ...current,
      characteristics:
        current.characteristics.length > 1
          ? current.characteristics.filter((_, itemIndex) => itemIndex !== index)
          : [
              {
                title: "",
                description: "",
              },
            ],
    }));
  }

  function updateToneChoice(key: string, value: string) {
    setData((current) => ({
      ...current,
      toneChoices: {
        ...current.toneChoices,
        [key]: value,
      },
    }));
  }

  function updateVocabulary(key: string, value: string) {
    setData((current) => ({
      ...current,
      vocabulary: {
        ...current.vocabulary,
        [key]: value,
      },
    }));
  }

  function toggleEmotion(emotion: string) {
    setData((current) => {
      const alreadySelected = current.emotions.includes(emotion);

      return {
        ...current,
        emotions: alreadySelected
          ? current.emotions.filter((item) => item !== emotion)
          : [...current.emotions, emotion],
      };
    });
  }

  function updateReference(index: number, key: keyof ReferenceItem, value: string) {
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

  function updateReferenceImage(
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateReference(index, "image", String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  }

  function removeReferenceImage(index: number) {
    updateReference(index, "image", "");
  }

  function addReference() {
    setData((current) => ({
      ...current,
      references: [
        ...current.references,
        {
          image: "",
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
                image: "",
                title: "",
                link: "",
              },
            ],
    }));
  }

  return (
    <div className="mt-6 space-y-6">
      <SectionCard
        title="Características do tom de voz"
        description="Registre características gerais que ajudam a definir como a marca deve falar, escrever, orientar, vender, responder e se posicionar."
      >
        <div className="space-y-5">
          {data.characteristics.map((characteristic, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Característica {String(index + 1).padStart(2, "0")}
                  </p>

                  <h3 className="mt-2 text-xl font-semibold text-slate-950">
                    {characteristic.title || "Nova característica"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => removeCharacteristic(index)}
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                    Título da característica
                  </label>

                  <input
                    type="text"
                    value={characteristic.title}
                    onChange={(event) =>
                      updateCharacteristic(index, "title", event.target.value)
                    }
                    placeholder="Ex: Acolhedor, direto, técnico, provocativo, inspirador..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                    Descrição da característica
                  </label>

                  <RichTextEditor
                    value={characteristic.description}
                    onChange={(value) =>
                      updateCharacteristic(index, "description", value)
                    }
                    placeholder="Explique como essa característica deve aparecer nos conteúdos, nas legendas, nos textos comerciais, nos vídeos, nos e-mails e nas interações com o público."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCharacteristic}
          className="mt-5 cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950 hover:border-slate-950 hover:text-white"
        >
          + Nova característica
        </button>
      </SectionCard>

      <SectionCard
        title="Tom de voz do discurso"
        description="Selecione qual lado representa melhor a forma como a marca deve falar. Somente as opções selecionadas aparecem na apresentação."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {tonePairs.map((pair) => {
            const selectedValue = data.toneChoices[pair.key];

            return (
              <div
                key={pair.key}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Tom {String(pair.number).padStart(2, "0")}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[pair.left, pair.right].map((option) => {
                    const isSelected = selectedValue === option;

                    return (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          isSelected
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name={pair.key}
                          value={option}
                          checked={isSelected}
                          onChange={() => updateToneChoice(pair.key, option)}
                          className="sr-only"
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Vocabulário e estrutura"
        description="Registre termos, expressões, metáforas e elementos narrativos que orientam a construção dos conteúdos."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {vocabularyFields.map((field) => (
            <VocabularyListField
              key={field.key}
              label={field.label}
              value={data.vocabulary[field.key] || ""}
              onChange={(value) => updateVocabulary(field.key, value)}
              addLabel={`+ Novo item`}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Emoção predominante"
        description="Selecione as emoções que devem aparecer com mais força na comunicação."
      >
        <div className="flex flex-wrap gap-3">
          {emotionOptions.map((emotion) => {
            const isSelected = data.emotions.includes(emotion);

            return (
              <label
                key={emotion}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleEmotion(emotion)}
                  className="sr-only"
                />
                {emotion}
              </label>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Observações sobre o tom de voz"
        description="Use este espaço para registrar orientações gerais sobre linguagem, narrativa, postura e cuidados de comunicação."
      >
        <RichTextEditor
          value={data.observations}
          onChange={(value) =>
            setData((current) => ({ ...current, observations: value }))
          }
          placeholder="Registre observações importantes sobre a forma como a marca deve falar, escrever, conduzir argumentos, lidar com objeções e construir sua narrativa."
        />
      </SectionCard>

      <SectionCard
        title="Anexos e referências externas"
        description="Adicione referências como canais no YouTube, perfis, marcas, vídeos, textos, páginas ou qualquer material que ajude a visualizar o tom desejado."
      >
        <div className="space-y-4">
          {data.references.map((reference, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Referência {String(index + 1).padStart(2, "0")}
                </p>

                <button
                  type="button"
                  onClick={() => removeReference(index)}
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-[130px_1fr] md:items-center">
                <div>
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-xs font-semibold text-white">
                    {reference.image ? (
                      <img
                        src={reference.image}
                        alt="Imagem da referência"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Imagem"
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <label className="cursor-pointer rounded-full bg-slate-950 px-4 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-800">
                      Escolher
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => updateReferenceImage(index, event)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => removeReferenceImage(index)}
                      className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="grid gap-4">
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
                      placeholder="Ex: Canal no YouTube, perfil, marca, texto ou vídeo"
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
                </div>
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