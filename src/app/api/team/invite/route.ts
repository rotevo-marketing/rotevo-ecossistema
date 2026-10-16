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
  if (!input || typeof input !== "object") return response("Dados inválidos.", 400);
  const { email, displayName, role } = input as Record<string, unknown>;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof displayName !== "string" || displayName.trim().length < 2 || displayName.length > 120 ||
      typeof role !== "string" || !roles.has(role)) return response("Revise nome, e-mail e função.", 400);
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: identityError } = await authClient.auth.getUser(auth.slice(7));
  if (identityError || !identity.user) return response("Sessão inválida.", 401);
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
  const cleanEmail = email.trim().toLowerCase();
  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
    data: { full_name: displayName.trim() }
  });
  if (inviteError || !invite.user) return response("Não foi possível enviar o convite. Verifique se o usuário já possui uma conta.", 409);
  const { error: insertError } = await admin.from("team_members").insert({
    user_id: invite.user.id, display_name: displayName.trim(), role, active: false
  });
  if (insertError) {
    // The invited account stays inactive until the administrator reconciles membership.
    return response("Convite enviado, mas o cadastro interno ficou pendente. Solicite revisão administrativa antes de habilitar o acesso.", 500);
  }
  return NextResponse.json({ ok: true, message: "Convite enviado. O acesso permanece inativo até a autorização administrativa." },
    { status: 202, headers: { "Cache-Control": "no-store" } });
}
