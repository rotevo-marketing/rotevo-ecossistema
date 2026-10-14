"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell, authStyles as s } from "@/Components/auth/AuthShell";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const strategist = searchParams.get("area") === "estrategista";
  const backHref = strategist ? "/estrategista/login" : "/";
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase emits PASSWORD_RECOVERY when it consumes a recovery link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthorized(true);
        setChecking(false);
      }
    });
    // Do not treat an ordinary signed-in session as a recovery grant.
    // Wait briefly for the async callback that processes the URL token.
    const timeout = window.setTimeout(() => setChecking(false), 3500);
    return () => { subscription.unsubscribe(); window.clearTimeout(timeout); };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authorized) return;
    if (password.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas informadas não coincidem.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setComplete(true);
      await supabase.auth.signOut();
    } catch {
      setError("Não foi possível redefinir a senha. Solicite um novo link e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Criar nova senha" strategist={strategist}>
      {complete ? (
        <div className={s.form}>
          <p className={s.note}>Senha redefinida com sucesso. Entre novamente com sua nova senha.</p>
          <Link href={backHref} className={s.link}>Voltar ao login</Link>
        </div>
      ) : checking ? (
        <p className={s.note}>Validando link de recuperação...</p>
      ) : !authorized ? (
        <div className={s.form}>
          <p role="alert" className={s.message + " " + s.error}>Link inválido, expirado ou já utilizado. Solicite uma nova recuperação de senha.</p>
          <Link href={strategist ? "/esqueci-senha?area=estrategista" : "/esqueci-senha"} className={s.link}>Solicitar novo link</Link>
        </div>
      ) : (
        <form onSubmit={submit} className={s.form} aria-busy={loading}>
          <label htmlFor="new-password" className={s.field}>
            Nova senha
            <input id="new-password" type="password" className={s.input} autoComplete="new-password" minLength={8} required value={password} disabled={loading} onChange={e => setPassword(e.target.value)} />
          </label>
          <label htmlFor="confirm-password" className={s.field}>
            Confirmar nova senha
            <input id="confirm-password" type="password" className={s.input} autoComplete="new-password" minLength={8} required value={confirmation} disabled={loading} onChange={e => setConfirmation(e.target.value)} />
          </label>
          {error && <p role="alert" className={s.message + " " + s.error}>{error}</p>}
          <button type="submit" className={s.button} disabled={loading}>{loading ? "Salvando..." : "Salvar nova senha"}</button>
        </form>
      )}
    </AuthShell>
  );
}
