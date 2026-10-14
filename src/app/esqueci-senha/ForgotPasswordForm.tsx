"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell, authStyles as s } from "@/Components/auth/AuthShell";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const strategist = searchParams.get("area") === "estrategista";
  const backHref = strategist ? "/estrategista/login" : "/";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const redirectTo = new URL("/redefinir-senha", window.location.origin);
      if (strategist) redirectTo.searchParams.set("area", "estrategista");
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: redirectTo.toString() }
      );
      if (sendError) throw sendError;
      setSubmitted(true);
    } catch {
      setError("Não foi possível processar a solicitação. Aguarde um instante e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Recuperar acesso" strategist={strategist}>
      {submitted ? (
        <div className={s.form}>
          <p className={s.note}>Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a pasta de spam.</p>
          <Link className={s.link} href={backHref}>Voltar ao login</Link>
        </div>
      ) : (
        <form className={s.form} onSubmit={submit} aria-busy={loading}>
          <p className={s.note}>Informe o e-mail da sua conta para receber as instruções de recuperação.</p>
          <label className={s.field} htmlFor="recovery-email">
            E-mail
            <input id="recovery-email" className={s.input} type="email" autoComplete="email" required value={email} disabled={loading} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
          </label>
          {error && <p role="alert" className={s.message + " " + s.error}>{error}</p>}
          <button className={s.button} type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar link de recuperação"}</button>
          <Link className={s.link} href={backHref}>Voltar ao login</Link>
        </form>
      )}
    </AuthShell>
  );
}
