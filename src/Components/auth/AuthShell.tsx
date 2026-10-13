import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth.module.css";

export { styles as authStyles };

export function AuthShell({ title, children, strategist = false }: { title: string; children: ReactNode; strategist?: boolean }) {
  return (
    <main className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" aria-label="Rotevo — login do cliente">
            <Image src="/brand/logo-light.png" width={170} height={54} alt="Rotevo" className={styles.logo} priority />
          </Link>
          <span className={styles.separator} aria-hidden="true" />
          <Link href={strategist ? "/" : "/estrategista/login"} className={styles.headerLink}>
            {strategist ? "Login do cliente" : "Área do estrategista"}
          </Link>
        </header>
        <section className={styles.card} aria-labelledby="auth-title">
          <h1 id="auth-title" className={styles.title}>{title}</h1>
          {children}
        </section>
        <p className={styles.footer}>© 2026 Rotevo. Todos os direitos reservados.</p>
      </div>
    </main>
  );
}
