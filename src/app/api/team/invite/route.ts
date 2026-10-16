import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const roles = new Set(["strategist", "project_manager", "producer", "finance"]);
function response(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
/**
 * Server-only invitation endpoint. Deliberately fail-closed:
 * - requires service role key and deployed RLS migration
 * - only an active admin in team_members can invite
 * - never takes a project/customer permission grant from untrusted client input
 * - client-facing UI must remain disabled until policies are validated.
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return response("Convites ainda não estão habilitados neste ambiente.", 503);
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return response("Sessão não informada.", 401);
  let input: unknown;
  try { input = await req.json(); } catch { return response("Dados inválidos.", 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return response("Dados inválidos.", 400);
  const { email, displayName, role, temporaryPassword } = input as Record<string, unknown>;
  if (Object.keys(input).some(key => !["email", "displayName", "role", "temporaryPassword"].includes(key))) return response("Campos não autorizados.", 400);
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof displayName !== "string" || displayName.trim().length < 2 || displayName.length > 120 ||
      typeof role !== "string" || !roles.has(role) ||
      typeof temporaryPassword !== "string" || temporaryPassword.length < 12 || temporaryPassword.length > 128) return response("Revise nome, e-mail e função.", 400);
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: identityError } = await authClient.auth.getUser(auth.slice(7));
  if (identityError || !identity.user) return response("Sessão inválida.", 401);
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("role").eq("id",identity.user.id).maybeSingle();
  if (profileError) return response("Perfil indisponível.",503);
  if (profile?.role !== "strategist") return response("Acesso restrito.",403);
  const { data: member, error: membershipError } = await admin.from("team_members")
    .select("role,active").eq("user_id", identity.user.id).maybeSingle();
  if (membershipError) return response("Controle de permissões ainda não está configurado.", 503);
  if (!member || member.role !== "admin" || member.active !== true) return response("Acesso restrito a administradores.", 403);
  // Detached CI-only authorization probe: never call Supabase invite/email APIs.
  // All three exact conditions must hold; impossible with a hosted Supabase URL.
  if (process.env.ROTEVO_LOCAL_INVITE_AUTH_PROBE === "YES_LOCAL_ONLY" &&
      url === "http://127.0.0.1:54321" &&
      req.headers.get("x-rotevo-local-probe") === "authorized-no-send") {
    return NextResponse.json({ authorized: true, delivery: "disabled" },
      { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  // Invitations remain disabled until RLS and role activation are explicitly approved.
  if (process.env.ROTEVO_TEAM_INVITES_ENABLED !== "true")
    return response("Convites de equipe aguardam homologação de permissões.", 503);
  const cleanEmail = email.trim().toLowerCase();
  // Initial password is accepted only over the authenticated server route and never persisted in team metadata.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: displayName.trim() },
    app_metadata: { rotevo_password_reset_required: true }
  });
  if (createError || !created.user)
    return response("Não foi possível cadastrar o usuário. Confirme se o e-mail já está em uso.",409);
  // A restricted employee must never inherit legacy strategist RLS privileges.
  const { error: profileInsertError } = await admin.from("profiles").insert({
    id: created.user.id, full_name: displayName.trim(), email: cleanEmail, role: "staff"
  });
  if (profileInsertError) {
    const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
    if (rollbackError) return response("Cadastro incompleto: acesso bloqueado e revisão administrativa necessária.",500);
    return response("Não foi possível configurar o perfil limitado; cadastro revertido.",503);
  }
  const { error: insertError } = await admin.from("team_members").insert({
    user_id: created.user.id, display_name: displayName.trim(), role, active: false
  });
  if (insertError) {
    // Compensate only the brand-new Auth identity. Never delete a pre-existing account.
    const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
    if (rollbackError) return response("Cadastro incompleto: conta bloqueada e revisão administrativa necessária.",500);
    return response("Não foi possível registrar o colaborador; a criação foi revertida.",503);
  }
  return NextResponse.json({ ok: true, message: "Usuário cadastrado. O acesso permanece bloqueado até a ativação pelo administrador." },
    { status: 201, headers: { "Cache-Control": "no-store" } });
}
