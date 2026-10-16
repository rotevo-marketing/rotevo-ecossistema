"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { AuthShell, authStyles as s } from "@/Components/auth/AuthShell";
import { PasswordField } from "@/Components/auth/PasswordField";
import { PasswordRecoveryLink } from "@/Components/auth/PasswordRecoveryLink";

export default function EstrategistaLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsLoading(true);

    try {
      const typedEmail = email.trim().toLowerCase();
      const typedPassword = password;

      if (!typedEmail || !typedPassword.trim()) {
        setErrorMessage("Informe o e-mail e a senha para acessar.");
        setIsLoading(false);
        return;
      }

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: typedEmail,
          password: typedPassword,
        });

      if (loginError || !loginData.user) {
        setErrorMessage("E-mail ou senha inválidos.");
        setIsLoading(false);
        return;
      }

      if(loginData.user.app_metadata?.rotevo_password_reset_required===true){
        router.replace("/primeiro-acesso");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", loginData.user.id)
        .single();

      if (!profileError && profile?.role === "staff") {
        router.replace("/equipe/meu-acesso");
        return;
      }

      if (profileError || profile?.role !== "strategist") {
        await supabase.auth.signOut();
        setErrorMessage("Este usuário não tem permissão de estrategista.");
        setIsLoading(false);
        return;
      }

      window.localStorage.setItem("metodo-epc-strategist-auth", "true");

      if (rememberMe) {
        window.localStorage.setItem("metodo-epc-strategist-remember", "true");
      } else {
        window.localStorage.removeItem("metodo-epc-strategist-remember");
      }

      router.push("/admin");
    } catch {
      setErrorMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell title="Acesso do estrategista" strategist={true}>
      <form onSubmit={handleLogin} className={s.form} aria-busy={isLoading}>
        <label className={s.field} htmlFor="email">
          E-mail
          <input id="email" type="email" autoComplete="username" required disabled={isLoading} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" className={s.input} />
        </label>
        <PasswordField id="password" value={password} onChange={setPassword} disabled={isLoading} />
        <PasswordRecoveryLink strategist />
        {errorMessage && <p role="alert" className={s.message + " " + s.error}>{errorMessage}</p>}
        <button type="submit" className={s.button} disabled={isLoading}>{isLoading ? "Entrando..." : "Acessar Ecossistema"}</button>
        <label className={s.remember}><input type="checkbox" checked={rememberMe} disabled={isLoading} onChange={(event) => setRememberMe(event.target.checked)} />Lembrar de mim</label>
        <p className={s.note}>Acesso exclusivo para estrategistas autorizados.</p>
      </form>
    </AuthShell>
  );
}
