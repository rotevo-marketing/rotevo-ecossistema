"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { AuthShell, authStyles as s } from "@/Components/auth/AuthShell";
import { PasswordField } from "@/Components/auth/PasswordField";
import { PasswordRecoveryLink } from "@/Components/auth/PasswordRecoveryLink";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const loginPassword = password;

      if (!trimmedEmail || !loginPassword.trim()) {
        setErrorMessage("Informe o e-mail e a senha para acessar.");
        setIsLoading(false);
        return;
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: loginPassword,
      });

      if (loginError || !loginData.user) {
        setErrorMessage("E-mail ou senha inválidos.");
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", loginData.user.id)
        .single();

      if (!profile) {
        await supabase.auth.signOut();
        setErrorMessage("Usuário sem perfil configurado. Fale com o estrategista.");
        setIsLoading(false);
        return;
      }

      if (profile.role === "client") {
        router.push("/cliente");
        return;
      }

      if (profile.role === "strategist") {
        router.push("/admin");
        return;
      }

      await supabase.auth.signOut();
      setErrorMessage("Acesso não autorizado. Fale com o estrategista.");
      setIsLoading(false);
    } catch {
      setErrorMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell title="Faça login na sua conta" strategist={false}>
      <form onSubmit={handleLogin} className={s.form} aria-busy={isLoading}>
        <label className={s.field} htmlFor="email">
          E-mail
          <input id="email" type="email" autoComplete="username" required disabled={isLoading} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" className={s.input} />
        </label>
        <PasswordField id="password" value={password} onChange={setPassword} disabled={isLoading} />
        <PasswordRecoveryLink />

        {errorMessage && <p role="alert" className={s.message + " " + s.error}>{errorMessage}</p>}
        <button type="submit" className={s.button} disabled={isLoading}>{isLoading ? "Entrando..." : "Acessar Ecossistema"}</button>
      </form>
    </AuthShell>
  );
}
