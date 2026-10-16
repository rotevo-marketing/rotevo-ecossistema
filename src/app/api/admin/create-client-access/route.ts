import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let body: { email?: string; password?: string; fullName?: string; clientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const { email, password, fullName, clientId } = body;

  // ── 2. Validate required fields ────────────────────────────────────────────
  if (!email || !password || !fullName || !clientId) {
    return NextResponse.json(
      { success: false, error: "Campos obrigatórios: email, password, fullName, clientId." },
      { status: 400 }
    );
  }

  // ── 3. Require JWT from Authorization header ───────────────────────────────
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Token de autenticação ausente. Faça login novamente." },
      { status: 401 }
    );
  }

  // ── 4. Verify JWT with anon client (no persistence) ───────────────────────
  // This confirms the token is a valid Supabase JWT and extracts user.id.
  // We do NOT use this client to query profiles — RLS would block it.
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json(
      { success: false, error: "Sessão inválida ou expirada. Faça login novamente." },
      { status: 401 }
    );
  }

  const callerId = userData.user.id;

  // ── 5. Build admin client (service role — server only) ─────────────────────
  // Must be done before the profile lookup so we bypass RLS on profiles.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Configure esta variável na Vercel (Settings → Environment Variables) ou no arquivo .env.local.",
      },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 6. Fetch caller's profile using service role (bypasses RLS) ────────────
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", callerId)
    .single();

  if (profileError || !callerProfile) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Perfil do estrategista não encontrado. Verifique se o usuário logado possui registro na tabela profiles.",
      },
      { status: 403 }
    );
  }

  // ── 7. Allow only strategists ──────────────────────────────────────────────
  if (callerProfile.role !== "strategist") {
    return NextResponse.json(
      {
        success: false,
        error: "Apenas estrategistas podem criar acesso de cliente.",
      },
      { status: 403 }
    );
  }

  // Verify that the target client exists before performing any privileged Auth write.
  // Avoid creating orphaned accounts for invalid or missing client records.
  const { data: targetClient, error: targetClientError } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  if (targetClientError || !targetClient) {
    return NextResponse.json(
      { success: false, error: "Cliente não encontrado ou indisponível para criar acesso." },
      { status: targetClientError ? 503 : 404 }
    );
  }

  // ── 8. Create auth user for the client ────────────────────────────────────
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "client" },
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    const alreadyExists =
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("duplicate") ||
      msg.includes("email address") ||
      msg.includes("unique");

    if (alreadyExists) {
      return NextResponse.json(
        {
          success: false,
          error: `Já existe um usuário com este e-mail: ${email}. Use outro e-mail ou atualize o profile manualmente.`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Erro ao criar usuário no Supabase Auth: ${createError.message}` },
      { status: 500 }
    );
  }

  const userId = newUser.user?.id;
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Usuário criado no Auth mas o UID não foi retornado. Verifique o painel do Supabase e crie o profile manualmente.",
      },
      { status: 500 }
    );
  }

  // ── 9. Upsert client profile ───────────────────────────────────────────────
  const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      email: email,
      role: "client",
      client_id: clientId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    return NextResponse.json(
      {
        success: false,
        error: `Usuário criado no Auth (UID: ${userId}), mas houve erro ao criar o profile: ${upsertError.message}. Crie o profile manualmente usando o UID informado.`,
      },
      { status: 500 }
    );
  }

  // ── 10. Success ────────────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    userId,
    email,
    fullName,
    clientId,
  });
}
