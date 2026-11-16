"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotevoLogo } from "@/Components/RotevoLogo";

import { PLANNING_V5 } from "@/lib/planning/v5";
import { supabase } from "@/lib/supabase";

type NewPlanningDraft = {
  clientId?: string;
  clientName: string;
  clientSlug: string;
  projectTitle: string;
  projectSlug: string;
  description: string;
  coverImageUrl: string;
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
    return {
      clientId:typeof fields.clientId==="string"&&/^[0-9a-f-]{36}$/i.test(fields.clientId)?fields.clientId:undefined,
      clientName: fields.clientName,
      clientSlug: fields.clientSlug,
      projectTitle: fields.projectTitle,
      projectSlug: fields.projectSlug,
      description: fields.description,
      coverImageUrl: fields.coverImageUrl,
    } as NewPlanningDraft;
  } catch {
    return null;
  }
}

export default function SelecionarModulosPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<NewPlanningDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [userEmail, setUserEmail] = useState("");


  const finalProjectSlug = useMemo(() => {
    if (!draft) return "";
    if (draft.projectSlug === draft.clientSlug || draft.projectSlug.startsWith(`${draft.clientSlug}-`)) return draft.projectSlug;
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

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    if (isPreview) {
      setErrorMessage("Modo de pré-visualização: nenhum projeto será criado. Para criar um planejamento real, volte ao painel.");
      return;
    }

    if (!draft) {
      setErrorMessage("Os dados iniciais do planejamento não foram encontrados.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    // Reuse an existing customer without overwriting their registered name or contact details.
    const query=supabase.from("clients").select("id,name,slug");
    const existing=await (draft.clientId?query.eq("id",draft.clientId):query.eq("slug",draft.clientSlug)).maybeSingle();
    let client = existing.data;
    let clientError = existing.error;
    if (!client && !clientError && !draft.clientId) {
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

    let createdProjectId="";
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
          data: {
            planningStructureVersion: PLANNING_V5,
            coverImageUrl: draft.coverImageUrl || null,
          }
        }),cache:"no-store"
      });
      if(response.status===409)throw new Error("Já existe um planejamento com esses identificadores.");
      if(!response.ok)throw new Error("Não foi possível criar o planejamento autorizado.");
      const result=await response.json();
      if(typeof result?.project?.id!=="string")throw new Error("Não foi possível confirmar a criação do planejamento.");
      createdProjectId=result.project.id;
    }catch(error){
      setErrorMessage(error instanceof Error?error.message:"Não foi possível criar o planejamento.");
      setIsSaving(false);
      return;
    }
    setIsSaving(false);

    window.localStorage.removeItem("metodo-epc-new-planning-draft");
    router.push(`/admin/planejamentos/${encodeURIComponent(client.slug)}?projectId=${encodeURIComponent(createdProjectId)}`);
  }


  return (
    <main className="admin-modules-v2 rv-ui2 rv-ui3 flex min-h-screen flex-col bg-[#F6F7FB] text-[#323647]">
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
            <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em]">Planejamento Rotevo V5</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#525B70]">O planejamento será criado como rascunho.</p>
          </div>
          {draft && <div className="rounded-xl border border-[#E3E7F0] bg-white px-5 py-3 text-sm">
            <span className="block text-xs text-[#697386]">Projeto</span>
            <strong>{draft.projectTitle}</strong>
            <span className="mt-1 block text-xs text-[#525B70]">{draft.clientName}</span>
          </div>}
        </div>
        {isPreview && <div role="status" className="mb-6 rounded-xl border border-[#A7E000] bg-[#F5FBDD] px-5 py-4 text-sm text-[#243100]"><strong>Modo de pré-visualização.</strong>  Nenhum cliente ou planejamento será cadastrado.</div>}
        {errorMessage && <div role="alert" className="mb-6 rounded-xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{errorMessage}</div>}
        {isLoading || !draft ? <div className="rounded-xl border border-[#E3E7F0] bg-white p-8 text-sm text-[#697386]">Carregando planejamento...</div> : <form onSubmit={handleSubmit} className="flex flex-wrap justify-end gap-3">
          <Link href="/admin/novo-planejamento" className="rounded-xl border border-[#E3E7F0] bg-white px-6 py-3 text-sm font-medium">Voltar aos dados</Link>
          <button type="submit" disabled={isSaving || isPreview} className="rounded-lg bg-[#6C5CE7] px-7 py-3 text-sm font-semibold text-white hover:bg-[#5949D1] disabled:opacity-45">{isSaving ? "Criando..." : "Criar planejamento"}</button>
        </form>}
      </div>
      <footer className="border-t border-[#E3E6ED] bg-white text-[#687487]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
    </main>
  );
}
