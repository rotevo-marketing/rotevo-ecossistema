"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { supabase } from "@/lib/supabase";

type ClientRecord = {
  id: string;
  name: string;
  slug: string;
};

type PlanningProject = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "in_progress" | "published" | "archived";
  clients: ClientRecord | ClientRecord[] | null;
};

function getProjectClient(project: PlanningProject): ClientRecord | null {
  if (Array.isArray(project.clients)) return project.clients[0] ?? null;
  return project.clients ?? null;
}

function getStatusLabel(status: PlanningProject["status"]) {
  if (status === "draft") return "Rascunho";
  if (status === "in_progress") return "Em andamento";
  if (status === "published") return "Publicado";
  return "Arquivado";
}

function getStatusClass(status: PlanningProject["status"]) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "in_progress") return "bg-slate-100 text-slate-600";
  if (status === "archived") return "bg-slate-200 text-slate-500";
  return "bg-slate-100 text-slate-600";
}

function generatePassword(name: string): string {
  const firstName = name.trim().split(" ")[0] ?? "cliente";
  return `${firstName.toLowerCase()}@2026`;
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#F6F7FB] px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200"
    >
      {copied ? "Copiado!" : (label ?? "Copiar")}
    </button>
  );
}

function MonoBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-slate-950 px-6 py-5 text-sm leading-7 text-emerald-300">
      <pre className="whitespace-pre-wrap font-mono">{children}</pre>
    </div>
  );
}

export default function AcessoClientePage() {
  const router = useRouter();
  const params = useParams();
  const clientSlug = typeof params.clientSlug === "string" ? params.clientSlug : "";

  const [project, setProject] = useState<PlanningProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Credential fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Automatic creation state
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdUid, setCreatedUid] = useState("");

  // Manual fallback state
  const [uid, setUid] = useState("");
  const [showManual, setShowManual] = useState(false);

  const client = project ? getProjectClient(project) : null;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setErrorMessage("");

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
        .select(`id, title, slug, status, clients!inner (id, name, slug)`)
        .eq("clients.slug", clientSlug)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        setErrorMessage(error.message || "Não foi possível carregar este planejamento.");
        setIsLoading(false);
        return;
      }

      const found = (data?.[0] ?? null) as unknown as PlanningProject | null;
      if (!found) {
        setErrorMessage("Planejamento não encontrado para este cliente.");
        setIsLoading(false);
        return;
      }

      setProject(found);

      const clientRecord = Array.isArray(found.clients)
        ? found.clients[0]
        : found.clients;
      const name = clientRecord?.name ?? "";
      setPassword(generatePassword(name));
      setIsLoading(false);
    }

    if (clientSlug) load();
  }, [clientSlug, router]);

  async function handleCreateAccess() {
    if (!client || !email || !password) return;

    setIsCreating(true);
    setCreateError("");
    setCreateSuccess(false);
    setCreatedUid("");

    // Get the current session token to send to the API route
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setCreateError("Sessão expirada. Faça login novamente.");
      setIsCreating(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/create-client-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName: client.name,
          clientId: client.id,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setCreateError(result.error ?? "Erro desconhecido ao criar acesso.");
        setIsCreating(false);
        return;
      }

      setCreatedUid(result.userId);
      setUid(result.userId); // also populate manual UID field
      setCreateSuccess(true);
    } catch {
      setCreateError("Erro de conexão. Tente novamente.");
    } finally {
      setIsCreating(false);
    }
  }

  // SQL used in manual fallback (also shown after auto-creation)
  const activeUid = createdUid || uid;
  const profileSql = activeUid
    ? `insert into profiles (id, full_name, email, role, client_id)\nvalues (\n  '${activeUid}',\n  '${client?.name ?? ""}',\n  '${email}',\n  'client',\n  '${client?.id ?? ""}'\n)\non conflict (id) do update set\n  full_name = excluded.full_name,\n  email = excluded.email,\n  role = excluded.role,\n  client_id = excluded.client_id,\n  updated_at = now();`
    : null;

  const clientMessage = `Olá, ${client?.name ?? ""}.\nSeu acesso ao planejamento estratégico está disponível:\n\nURL: https://app.rotevo.com.br\nLogin: ${email}\nSenha provisória: ${password}`;

  return (
    <main className="admin-access-v2 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
      <style jsx global>{` .admin-access-v2, .admin-access-v2 h1, .admin-access-v2 h2, .admin-access-v2 h3 { font-family: var(--font-body), Arial, Helvetica, sans-serif !important; } `}</style>
      <header className="sticky top-0 z-50 border-b border-[#E3E7F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4"><Link href="/admin" aria-label="Rotevo - Painel administrativo"><RotevoLogo size={27}/></Link><span className="hidden h-6 w-px bg-[#E3E7F0] sm:block"/><span className="hidden text-sm text-[#697386] sm:block">Administração</span></div>
          <Link href={`/admin/planejamentos/${clientSlug}`} className="cursor-pointer rounded-xl border border-[#E3E7F0] bg-white px-4 py-2.5 text-sm font-medium text-[#090D1C] hover:bg-[#F6F7FB]">Voltar ao planejamento</Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-9 sm:px-8 lg:px-10">
        {isLoading && (
          <div className="rounded-2xl border border-[#E3E7F0] bg-white p-6 sm:p-8">
            <p className="text-slate-500">Carregando...</p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-2xl border border-[#E3E7F0] bg-white p-6 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-500">Atenção</p>
            <h1 className="mt-4 text-2xl font-bold tracking-[-0.04em]">{errorMessage}</h1>
            <Link
              href="/admin"
              className="mt-8 inline-flex rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Voltar ao painel
            </Link>
          </div>
        )}

        {!isLoading && project && client && (
          <div className="space-y-6">
            {/* ── Header card ──────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-[#E3E7F0] bg-white p-6 sm:p-8">
              <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em]">
                Configurar acesso
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#525B70]">
                Crie o acesso do cliente diretamente por aqui. O usuário é criado no Supabase Auth e o perfil é configurado automaticamente — sem precisar acessar o painel do Supabase.
              </p>
            </div>

            {/* ── Client data ───────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-[#E3E7F0] bg-white p-6 sm:p-8">
              <p className="text-sm font-bold text-[#090D1C]">
                Dados do cliente e planejamento
              </p>

              <div className="mt-6 divide-y divide-slate-100">
                <DataRow label="Cliente" value={client.name} copyable />
                <DataRow label="Slug do cliente" value={client.slug} copyable />
                <DataRow label="ID do cliente (client_id)" value={client.id} copyable mono />
                <DataRow label="Planejamento" value={project.title} />
                <DataRow label="Slug da apresentação" value={project.slug} copyable />
                <DataRow
                  label="Status"
                  value={getStatusLabel(project.status)}
                  badge={getStatusClass(project.status)}
                />
              </div>
            </div>

            {/* ── Credentials ──────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-[#E3E7F0] bg-white p-6 sm:p-8">
              <p className="text-sm font-bold text-[#090D1C]">
                Credenciais de acesso
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Defina o e-mail e a senha provisória. A senha não é salva em nenhum lugar — apenas exibida nesta tela durante a criação.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    E-mail do cliente
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@cliente.com"
                      disabled={createSuccess}
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                    />
                    {email && <CopyButton value={email} label="Copiar e-mail" />}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Senha provisória
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={createSuccess}
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-950 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                    />
                    <CopyButton value={password} label="Copiar senha" />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Gerada como: primeiro nome em minúsculo + @2026
                  </p>
                </div>
              </div>

              {/* Auto-create button */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                {!createSuccess ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCreateAccess}
                      disabled={isCreating || !email || !password}
                      className="cursor-pointer rounded-full bg-slate-950 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCreating ? "Criando acesso..." : "Criar acesso automaticamente"}
                    </button>

                    {createError && (
                      <div className="mt-4 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                        {createError}
                        {createError.includes("SUPABASE_SERVICE_ROLE_KEY") && (
                          <p className="mt-2 text-xs font-normal text-red-600">
                            Configure a variável <span className="font-mono font-semibold">SUPABASE_SERVICE_ROLE_KEY</span> no painel da Vercel (Settings → Environment Variables) ou no arquivo <span className="font-mono">.env.local</span>.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                        <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">Acesso criado com sucesso.</p>
                        <p className="mt-1 text-sm text-emerald-700">
                          Usuário criado no Supabase Auth e perfil configurado automaticamente.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 divide-y divide-emerald-100 rounded-2xl bg-white px-4 ring-1 ring-emerald-100">
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">UID criado</p>
                          <p className="mt-0.5 font-mono text-sm text-slate-900">{createdUid}</p>
                        </div>
                        <CopyButton value={createdUid} label="Copiar UID" />
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">E-mail</p>
                          <p className="mt-0.5 text-sm text-slate-900">{email}</p>
                        </div>
                        <CopyButton value={email} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Client message ────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-[#E3E7F0] bg-white p-6 sm:p-8">
              <p className="text-sm font-bold text-[#090D1C]">
                Mensagem para o cliente
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Copie e envie esta mensagem ao cliente após criar o acesso.
              </p>

              <div className="mt-5">
                <MonoBlock>{clientMessage}</MonoBlock>
              </div>

              <div className="mt-3 flex justify-end">
                <CopyButton value={clientMessage} label="Copiar mensagem para cliente" />
              </div>
            </div>

            {/* ── Manual fallback ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-[#E3E7F0] bg-white p-6 sm:p-8">
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                    Fallback
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-700">
                    Criar manualmente pelo Supabase
                  </h2>
                </div>
                <span className="text-slate-400">{showManual ? "▲" : "▼"}</span>
              </button>

              {showManual && (
                <div className="mt-8 space-y-8">
                  {/* Step 1 */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                        1
                      </span>
                      <h3 className="text-lg font-bold tracking-[-0.03em]">
                        Criar usuário no Supabase Auth
                      </h3>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                      <p className="text-sm font-semibold text-slate-700">
                        Authentication → Users → Add user → Create new user
                      </p>

                      <div className="mt-4 divide-y divide-slate-200">
                        <div className="flex items-center justify-between py-3">
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">Email:</span>{" "}
                            {email || <span className="italic text-slate-400">preencha o e-mail acima</span>}
                          </p>
                          {email && <CopyButton value={email} />}
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">Password:</span>{" "}
                            <span className="font-mono">{password}</span>
                          </p>
                          <CopyButton value={password} />
                        </div>

                        <div className="flex items-start gap-3 py-3">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500">
                            <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">Auto confirm user</span> — marque esta opção para o acesso funcionar imediatamente.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 ring-1 ring-amber-100">
                        Com <span className="font-semibold">Auto confirm user</span> marcado, o cliente não recebe e-mail automático.
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                        2
                      </span>
                      <h3 className="text-lg font-bold tracking-[-0.03em]">
                        Copiar o UID gerado
                      </h3>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                      <label className="block text-sm font-semibold text-slate-700">
                        UID do usuário criado
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={uid}
                          onChange={(e) => setUid(e.target.value)}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-950 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                        {uid.trim() && <CopyButton value={uid.trim()} label="Copiar UID" />}
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                        3
                      </span>
                      <h3 className="text-lg font-bold tracking-[-0.03em]">
                        Inserir profile no banco
                      </h3>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                      <p className="text-sm text-slate-700">
                        Execute no <span className="font-mono font-semibold">SQL Editor</span> do Supabase:
                      </p>

                      {!activeUid ? (
                        <div className="mt-4 rounded-2xl bg-white px-5 py-4 text-sm text-slate-400 ring-1 ring-slate-200">
                          Cole o UID no campo acima para gerar o SQL.
                        </div>
                      ) : (
                        <>
                          <div className="mt-4">
                            <MonoBlock>{profileSql}</MonoBlock>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <CopyButton value={profileSql ?? ""} label="Copiar SQL do profile" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium text-[#090D1C] sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
    </main>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function DataRow({
  label,
  value,
  copyable,
  mono,
  badge,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          {label}
        </p>
        {badge ? (
          <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge}`}>
            {value}
          </span>
        ) : (
          <p className={`mt-0.5 break-all text-base font-medium text-slate-950 ${mono ? "font-mono text-sm" : ""}`}>
            {value}
          </p>
        )}
      </div>
      {copyable && <CopyButton value={value} />}
    </div>
  );
}
