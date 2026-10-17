"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { ecosystemDocuments, ecosystemDocumentAreas } from "@/data/ecosystem2027";

// O Painel Executivo (00) é um dashboard padrão, não um módulo selecionável.
const selectableDocuments = ecosystemDocuments.filter((doc) => !doc.area.startsWith("00 "));
const selectableAreas = ecosystemDocumentAreas.filter((area) => !area.startsWith("00 "));
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
    const value: unknown = JSON.parse(storedDraft);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const fields = value as Record<string, unknown>;
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (typeof fields.clientName !== "string" || !fields.clientName.trim() ||
        typeof fields.projectTitle !== "string" || !fields.projectTitle.trim() ||
        typeof fields.clientSlug !== "string" || !slugPattern.test(fields.clientSlug) ||
        typeof fields.projectSlug !== "string" || !slugPattern.test(fields.projectSlug) ||
        typeof fields.description !== "string" || typeof fields.coverImageUrl !== "string") return null;
    return fields as NewPlanningDraft;
  } catch {
    return null;
  }
}

export default function SelecionarModulosPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<NewPlanningDraft | null>(null);
  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule>(EMPTY_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [taskExecution, setTaskExecution] = useState<string[]>([]);
  const [taskPresentation, setTaskPresentation] = useState<string[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<string[]>([selectableAreas[0]]);
  const [search, setSearch] = useState("");


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

      setUserEmail(userData.user.email ?? "");
      setDraft(storedDraft);
      setIsLoading(false);
    }

    validateAndLoadDraft();
  }, [router]);

  function toggleTask(code: string, target: "execution" | "presentation") {
    if (target === "execution") {
      setTaskExecution((prev) => {
        const next = prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code];
        if (!next.includes(code)) setTaskPresentation((shown) => shown.filter((item) => item !== code));
        return next;
      });
    } else {
      if (!taskExecution.includes(code)) return;
      setTaskPresentation((prev) => prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]);
    }
  }

  function toggleArea(area: string) {
    const codes = selectableDocuments.filter((task) => task.area === area).map((task) => task.code);
    const allSelected = codes.every((code) => taskExecution.includes(code));
    setTaskExecution((prev) => allSelected ? prev.filter((code) => !codes.includes(code)) : Array.from(new Set([...prev, ...codes])));
    if (allSelected) setTaskPresentation((prev) => prev.filter((code) => !codes.includes(code)));
  }

  function toggleExpanded(area: string) {
    setExpandedAreas((prev) => prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area]);
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

    if (taskExecution.length === 0) {
      setErrorMessage("Selecione pelo menos um documento do Ecossistema.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    // Reuse an existing customer without overwriting their registered name or contact details.
    const existing = await supabase.from("clients")
      .select("id,name,slug").eq("slug",draft.clientSlug).maybeSingle();
    let client = existing.data;
    let clientError = existing.error;
    if (!client && !clientError) {
      const inserted = await supabase.from("clients")
        .insert({name:draft.clientName,slug:draft.clientSlug})
        .select("id,name,slug").single();
      client=inserted.data;
      clientError=inserted.error;
      // Two concurrent creations may race; reuse the customer created first.
      if (clientError?.code==="23505") {
        const raced = await supabase.from("clients")
          .select("id,name,slug").eq("slug",draft.clientSlug).maybeSingle();
        client=raced.data;
        clientError=raced.error;
      }
    }

    if (clientError || !client) {
      setErrorMessage(
        clientError?.message || "Não foi possível criar ou atualizar o cliente."
      );
      setIsSaving(false);
      return;
    }

    // Only save schedule keys that have a date filled
    const filledSchedule = Object.fromEntries(
      Object.entries(deliverySchedule).filter(([, v]) => v !== "")
    );

    try {
      const {data:session,error:sessionError}=await supabase.auth.getSession();
      const token=session.session?.access_token;
      if(sessionError||!token)throw new Error("Sessão expirada. Entre novamente.");
      const response=await fetch("/api/admin/project/create",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({
          client_id:client.id,
          title:draft.projectTitle,
          slug:finalProjectSlug,
          description:draft.description||null,
          status:"draft",
          data:{
            coverImageUrl:draft.coverImageUrl||null,
            ecosystem2027:{
              version:1,
              selectedDocumentCodes:selectableDocuments.filter(doc=>taskExecution.includes(doc.code)).map(doc=>doc.code),
              presentedDocumentCodes:selectableDocuments.filter(doc=>taskPresentation.includes(doc.code)).map(doc=>doc.code)
            },
            deliverySchedule:Object.keys(filledSchedule).length>0?filledSchedule:null
          }
        }),cache:"no-store"
      });
      if(response.status===409)throw new Error("Já existe um planejamento com esses identificadores.");
      if(!response.ok)throw new Error("Não foi possível criar o planejamento autorizado.");
      const result=await response.json();
      if(typeof result?.project?.id!=="string")throw new Error("Não foi possível confirmar a criação do planejamento.");
    }catch(error){
      setErrorMessage(error instanceof Error?error.message:"Não foi possível criar o planejamento.");
      setIsSaving(false);
      return;
    }
    setIsSaving(false);

    window.localStorage.removeItem("metodo-epc-new-planning-draft");
    router.push("/admin");
  }


  const visibleAreas = selectableAreas.filter((area) => {
    const term = search.toLocaleLowerCase("pt-BR").trim();
    return !term || area.toLocaleLowerCase("pt-BR").includes(term) ||
      ecosystemDocuments.some((task) => task.area === area && (task.title.toLocaleLowerCase("pt-BR").includes(term) || task.code.includes(term)));
  });

  return (
    <main className="admin-modules-v2 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
      <style jsx global>{`
        .admin-modules-v2, .admin-modules-v2 h1, .admin-modules-v2 h2, .admin-modules-v2 h3 {
          font-family: var(--font-body), Arial, Helvetica, sans-serif !important;
        }
      `}</style>
      <header className="sticky top-0 z-50 border-b border-[#E3E7F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Rotevo - Painel administrativo"><RotevoLogo size={27}/></Link>
            <span className="hidden h-6 w-px bg-[#E3E7F0] sm:block"/>
            <span className="hidden text-sm text-[#697386] sm:block">Administração</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && <div title={userEmail} className="hidden items-center gap-2 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0ECFF] text-sm font-semibold text-[#5123C5]">{userEmail.charAt(0).toUpperCase()}</span>
              <span className="hidden max-w-44 truncate text-xs text-[#525B70] lg:block">{userEmail}</span>
            </div>}
            <Link href="/admin" className="rounded-xl border border-[#E3E7F0] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#F6F7FB]">Voltar ao painel</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 lg:px-10">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em]">Escolher módulos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#525B70]">Selecione os documentos que farão parte do planejamento e quais serão exibidos na apresentação do cliente.</p>
          </div>
          {draft && <div className="rounded-xl border border-[#E3E7F0] bg-white px-5 py-3 text-sm">
            <span className="block text-xs text-[#697386]">Projeto</span>
            <strong>{draft.projectTitle}</strong>
            <span className="mt-1 block text-xs text-[#525B70]">{draft.clientName}</span>
          </div>}
        </div>
        {isPreview && <div role="status" className="mb-6 rounded-xl border border-[#A7E000] bg-[#F5FBDD] px-5 py-4 text-sm text-[#243100]"><strong>Modo de pré-visualização.</strong> Explore as áreas, documentos e opções livremente. Nenhum cliente ou planejamento será cadastrado.</div>}
        {errorMessage && <div role="alert" className="mb-6 rounded-xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{errorMessage}</div>}
        {isLoading || !draft ? <div className="rounded-xl border border-[#E3E7F0] bg-white p-8 text-sm text-[#697386]">Carregando seleção de módulos...</div> : <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><span className="text-xs text-[#697386]">Áreas disponíveis</span><strong className="mt-2 block text-2xl">{selectableAreas.length}</strong></div>
            <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><span className="text-xs text-[#697386]">Documentos selecionados</span><strong className="mt-2 block text-2xl">{taskExecution.length} <span className="text-sm font-normal text-[#697386]">de {selectableDocuments.length}</span></strong></div>
            <div className="rounded-xl border border-[#E3E7F0] bg-white p-5"><span className="text-xs text-[#697386]">Visíveis ao cliente</span><strong className="mt-2 block text-2xl">{taskPresentation.length}</strong></div>
          </div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input aria-label="Buscar área ou tarefa" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar área, tarefa ou código..." className="w-full rounded-xl border border-[#E3E7F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#6D35F5] sm:max-w-md"/>
            <div className="flex gap-2">
              <button type="button" onClick={() => {setTaskExecution(selectableDocuments.map((doc) => doc.code));setTaskPresentation(selectableDocuments.map((doc) => doc.code));setExpandedAreas(selectableAreas);}} className="cursor-pointer rounded-xl border border-[#E3E7F0] bg-white px-4 py-3 text-xs font-semibold hover:bg-[#F6F7FB]">Selecionar todas</button>
              <button type="button" onClick={() => {setTaskExecution([]);setTaskPresentation([]);}} className="cursor-pointer rounded-xl border border-[#E3E7F0] bg-white px-4 py-3 text-xs font-semibold hover:bg-[#F6F7FB]">Limpar seleção</button>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              {visibleAreas.map((area) => {
                const tasks = selectableDocuments.filter((task) => task.area === area);
                const chosen = tasks.filter((task) => taskExecution.includes(task.code)).length;
                const open = expandedAreas.includes(area) || !!search.trim();
                const all = chosen === tasks.length;
                const partial = chosen > 0 && !all;
                return <section key={area} className="overflow-hidden rounded-xl border border-[#E3E7F0] bg-white">
                  <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                    <input type="checkbox" aria-label={`Selecionar todos os documentos de ${area}`} checked={all} ref={(element) => {if(element) element.indeterminate = partial;}} onChange={() => toggleArea(area)} className="h-5 w-5 cursor-pointer accent-[#6D35F5]"/>
                    <button type="button" aria-expanded={open} onClick={() => toggleExpanded(area)} className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-left">
                      <span className="text-sm font-bold sm:text-base">{area}</span>
                      <span className="shrink-0 text-xs text-[#697386]">{chosen} / {tasks.length} <span aria-hidden="true" className="ml-2">{open ? "▲" : "▼"}</span></span>
                    </button>
                  </div>
                  {open && <div className="border-t border-[#E3E7F0] px-4 pb-3 pt-2 sm:px-5">
                    <div className="grid grid-cols-[1fr_82px_82px] items-center gap-2 border-b border-[#E3E7F0] py-3 text-xs font-semibold text-[#697386] sm:grid-cols-[1fr_112px_112px]">
                      <span>Documento do Notion</span><span className="text-center">Executar</span><span className="text-center">Exibir</span>
                    </div>
                    {tasks.filter((task) => !search.trim() || area.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")) || task.title.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")) || task.code.includes(search)).map((task) =>
                      <div key={task.code} className="grid grid-cols-[1fr_82px_82px] items-center gap-2 border-b border-[#EEF0F5] py-3 last:border-0 sm:grid-cols-[1fr_112px_112px]">
                        <div className="min-w-0"><div className="flex flex-wrap items-baseline gap-2"><span className="text-xs font-semibold text-[#697386]">{task.code}</span><span className="text-sm font-medium">{task.title}</span></div>
                          <span className={task.visibility === "Condicional" ? "mt-1 inline-block text-[11px] text-[#4A5971]" : "mt-1 inline-block text-[11px] text-[#825E20]"}>{task.visibility || "Documento do planejamento"}</span>
                        </div>
                        <div className="text-center"><input type="checkbox" aria-label={`Executar ${task.code} ${task.title}`} checked={taskExecution.includes(task.code)} onChange={() => toggleTask(task.code,"execution")} className="h-5 w-5 accent-[#6D35F5]"/></div>
                        <div className="text-center"><input type="checkbox" aria-label={`Exibir ${task.code} ${task.title}`} disabled={!taskExecution.includes(task.code)} checked={taskPresentation.includes(task.code)} onChange={() => toggleTask(task.code,"presentation")} className="h-5 w-5 cursor-pointer accent-[#6D35F5] disabled:cursor-not-allowed disabled:opacity-30"/></div>
                      </div>
                    )}
                  </div>}
                </section>;
              })}
              {visibleAreas.length === 0 && <p className="rounded-xl bg-white p-6 text-sm text-[#697386]">Nenhum documento encontrado.</p>}
            </div>
            <div className="mt-6 rounded-xl bg-[#EEF0F5] px-5 py-4 text-xs leading-5 text-[#525B70]"><strong>Execução e apresentação são independentes.</strong> Para exibir um documento, marque primeiro “Executar”. Os títulos seguem a base Docs do Notion. A seleção para execução e exibição é configurada por documento.</div>
            <div className="mt-7 flex flex-col gap-3 border-t border-[#E3E7F0] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/admin/novo-planejamento" className="rounded-xl border border-[#E3E7F0] bg-white px-6 py-3 text-center text-sm font-medium">Voltar aos dados</Link>
              <button type="submit" disabled={isSaving || isPreview || taskExecution.length === 0} className="cursor-pointer rounded-xl bg-[#0B142A] px-7 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{isPreview ? "Pré-visualização — não salva" : isSaving ? "Criando..." : "Criar planejamento"}</button>
            </div>
          </form>
        </>}
      </div>
      <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
    </main>
  );
}
