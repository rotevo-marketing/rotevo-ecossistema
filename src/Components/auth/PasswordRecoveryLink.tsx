"use client";

import { useId } from "react";
import Link from "next/link";
import { authStyles as s } from "./AuthShell";

// Enable only after SMTP/delivery, redirect URLs and end-to-end recovery tests
// are validated and both recovery routes are included in the release.
const PASSWORD_RECOVERY_ENABLED = false;

export function PasswordRecoveryLink({ strategist = false }: { strategist?: boolean }) {
  const descriptionId = useId();
  const href = strategist ? "/esqueci-senha?area=estrategista" : "/esqueci-senha";
  if (PASSWORD_RECOVERY_ENABLED) {
    return <Link className={s.link} href={href}>Esqueceu sua senha?</Link>;
  }
  return (
    <>
      <span role="link" aria-disabled="true" tabIndex={0} aria-describedby={descriptionId} data-recovery-href={href} className={s.link + " " + s.recoveryDisabled}>
        Esqueceu sua senha?
      </span>
      <span id={descriptionId} className="sr-only">Recuperação temporariamente indisponível até a validação do envio de e-mails.</span>
    </>
  );
}
