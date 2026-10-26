"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { supabase } from "@/lib/supabase";
import {request} from "@/lib/operations/api";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-6 w-6 text-slate-400"
    >
      <path
        d="M12 16V8m0 0-3 3m3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 16v2a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NovoPlanejamentoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [registeredClients,setRegisteredClients]=useState<{id:string;name:string;slug:string;status:string}[]>([]);
  const [clientId,setClientId]=useState("");
  const [clientsReady,setClientsReady]=useState(false);
  const [clientName, setClientName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const clientSlug = useMemo(() => registeredClients.find(c=>c.id===clientId)?.slug??createSlug(clientName), [clientName,clientId,registeredClients]);

  const projectSlug = useMemo(() => {
    const baseSlug = createSlug(projectTitle);
    if (baseSlug) return baseSlug;
    if (clientSlug) return clientSlug;
    return "";
  }, [clientSlug, projectTitle]);

  useEffect(() => {
    async function validateStrategist() {
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

      try{const result=await request<{clients:{id:string;name:string;slug:string;status:string}[]}>("/api/admin/clients");setRegisteredClients(result.clients);setClientsReady(true);}catch{setErrorMessage("Não foi possível carregar os clientes cadastrados. Atualize antes de continuar.");}
      setUserEmail(userData.user.email ?? "");
      setIsLoading(false);
    }

    validateStrategist();
  }, [router]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Formato inválido. Use apenas PNG, JPEG ou WebP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("Arquivo muito grande. O limite é 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!clientSlug) {
      setUploadError("Informe o nome do cliente antes de enviar a imagem.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${clientSlug}/${timestamp}-${safeName}`;

    const { error: storageError } = await supabase.storage
      .from("planning-covers")
      .upload(path, file, { contentType: file.type });

    if (storageError) {
      setUploadError("Erro ao enviar a imagem. Tente novamente.");
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const { data: urlData } = supabase.storage
      .from("planning-covers")
      .getPublicUrl(path);

    setCoverImageUrl(urlData.publicUrl);
    setIsUploading(false);
  }

  function handleRemoveImage() {
    setCoverImageUrl("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if(!clientsReady){setErrorMessage("Aguarde o carregamento dos clientes antes de continuar.");return;}
    if(!clientId&&registeredClients.some(c=>c.name.trim().toLocaleLowerCase("pt-BR")===clientName.trim().toLocaleLowerCase("pt-BR"))){setErrorMessage("Este cliente já está cadastrado. Selecione-o na lista acima.");return;}
    if (!clientName.trim()) {
      setErrorMessage("Informe o nome do cliente.");
      return;
    }

    if (!projectTitle.trim()) {
      setErrorMessage("Informe o título do planejamento.");
      return;
    }

    if (!clientSlug || !projectSlug) {
      setErrorMessage("Não foi possível gerar o slug do cliente ou do projeto.");
      return;
    }

    // Keep the first step consistent with client identifiers and server project limits.
    const finalSlug = projectSlug === clientSlug || projectSlug.startsWith(`${clientSlug}-`)
      ? projectSlug : `${clientSlug}-${projectSlug}`;
    if ((!clientId && clientSlug.length > 65) || finalSlug.length > 180 || projectTitle.trim().length > 180) {
      setErrorMessage("O nome ou título é longo demais para o identificador do planejamento. Utilize uma versão mais curta.");
      return;
    }

    const draft = {
      clientId:clientId||undefined,
      clientName: clientName.trim(),
      clientSlug,
      projectTitle: projectTitle.trim(),
      projectSlug,
      description: description.trim(),
      coverImageUrl: coverImageUrl.trim(),
    };

    window.localStorage.setItem(
      "metodo-epc-new-planning-draft",
      JSON.stringify(draft)
    );

    router.push("/admin/novo-planejamento/modulos");
  }

  return (
    <main className="admin-new-project-v2 min-h-screen bg-[#F6F7FB] text-[#090D1C]">
      <header className="sticky top-0 z-50 border-b border-[#E3E7F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Rotevo - Painel administrativo"><RotevoLogo size={27} /></Link>
            <span aria-hidden="true" className="hidden h-6 w-px bg-[#E3E7F0] sm:block" />
            <span className="hidden text-sm text-[#697386] sm:block">Administração</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="flex items-center gap-2" title={userEmail} aria-label={"Usuário conectado: " + userEmail}>
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0ECFF] text-sm font-semibold text-[#5123C5]">{userEmail.charAt(0).toUpperCase()}</span>
                <span className="hidden max-w-48 truncate text-xs text-[#525B70] md:block">{userEmail}</span>
              </div>
            )}
            <Link href="/admin" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E3E7F0] bg-white px-4 py-2.5 text-sm font-medium text-[#090D1C] transition hover:bg-[#F6F7FB]">Voltar ao painel</Link>
          </div>
        </div>
      </header>

      <style jsx global>{` .admin-new-project-v2, .admin-new-project-v2 h1, .admin-new-project-v2 h2, .admin-new-project-v2 h3 { font-family: var(--font-body), Arial, Helvetica, sans-serif !important; } `}</style>
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8 lg:px-10">
        <div className="rounded-2xl border border-[#E3E7F0] bg-white p-6 sm:p-8 lg:p-10">
          <h1 className="text-[30px] leading-[38px] font-bold tracking-[-0.02em] text-[#090D1C]">
            Criar novo projeto
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#525B70]">
            Preencha as informações iniciais do cliente para começar seu planejamento estratégico.
          </p>

          {errorMessage && (
            <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Nome do cliente */}
            <div>
              <label className="mb-4 block text-sm font-medium">Cliente cadastrado<select value={clientId} onChange={e=>{setClientId(e.target.value);setClientName(registeredClients.find(c=>c.id===e.target.value)?.name??"");}} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">Cadastrar uma nova empresa</option>{registeredClients.filter(c=>c.status!=="archived").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label htmlFor="planning-client-name" className="mb-2 block text-sm font-semibold text-slate-700">
                Nome do cliente
              </label>
              <input
                id="planning-client-name"
                type="text"
                readOnly={Boolean(clientId)}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Cliente Demo"
                className="w-full rounded-xl border border-[#E3E7F0] px-4 py-3 outline-none transition focus:border-[#6D35F5] focus:ring-2 focus:ring-[#6D35F5]/15"
              />
              {clientSlug && (
                <p className="mt-2 text-xs text-slate-400">
                  Slug do cliente: {clientSlug}
                </p>
              )}
            </div>

            {/* Título do planejamento */}
            <div>
              <label htmlFor="planning-project-title" className="mb-2 block text-sm font-semibold text-slate-700">
                Título do planejamento
              </label>
              <input
                type="text"
                id="planning-project-title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Ex: Planejamento Estratégico 2026"
                className="w-full rounded-xl border border-[#E3E7F0] px-4 py-3 outline-none transition focus:border-[#6D35F5] focus:ring-2 focus:ring-[#6D35F5]/15"
              />
              {projectSlug && (
                <p className="mt-2 text-xs text-slate-400">
                  Slug da apresentação: {projectSlug}
                </p>
              )}
            </div>

            {/* Imagem de capa — upload */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Imagem de capa do cliente
              </label>

              {/* Upload area */}
              {!coverImageUrl && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#CDD3E0] bg-[#F8F9FC] px-6 py-10 text-center transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                      <p className="text-sm font-medium text-slate-600">
                        Enviando imagem...
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadIcon />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Clique para selecionar uma imagem
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          PNG, JPEG ou WebP · Máximo 5 MB
                        </p>
                      </div>
                    </>
                  )}
                </button>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Upload error */}
              {uploadError && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {uploadError}
                </p>
              )}

              {/* Preview after upload */}
              {coverImageUrl && (
                <div className="mt-4 flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    <img
                      src={coverImageUrl}
                      alt="Prévia da imagem de capa"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">
                      Imagem enviada com sucesso
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Aparecerá no card e no hero da apresentação.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600 hover:ring-red-200"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Descrição opcional
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Planejamento estratégico inicial do cliente."
                className="w-full rounded-xl border border-[#E3E7F0] px-4 py-3 outline-none transition focus:border-[#6D35F5] focus:ring-2 focus:ring-[#6D35F5]/15"
              />
            </div>

            {/* Info box */}
            <div className="rounded-xl bg-[#F6F7FB] p-5 ring-1 ring-[#E3E7F0]">
              <p className="text-sm font-semibold text-slate-700">
                Próxima etapa
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Depois de avançar, você escolherá quais módulos entram no
                planejamento deste cliente.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={isUploading}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#0B142A] px-8 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Escolher documentos
              </button>
            </div>
          </form>
        </div>
      </section>

      <footer className="bg-[#A7E000]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-sm font-medium text-[#090D1C] sm:flex-row sm:justify-between sm:px-8 lg:px-10">
          <span>© 2026 Rotevo. Todos os direitos reservados.</span>
          <span>Rotevo Estratégia &amp; Consultoria</span>
        </div>
      </footer>
    </main>
  );
}
