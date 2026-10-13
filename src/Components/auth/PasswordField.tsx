"use client";

import { useState } from "react";
import { authStyles as s } from "./AuthShell";

export function PasswordField({ id, label = "Senha", value, onChange, newPassword = false, disabled = false }: { id: string; label?: string; value: string; onChange: (value: string) => void; newPassword?: boolean; disabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <div className={s.password}>
        <input id={id} className={s.input} type={visible ? "text" : "password"} autoComplete={newPassword ? "new-password" : "current-password"} required disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} />
        <button className={s.reveal} type="button" disabled={disabled} aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Mostrar"}</button>
      </div>
    </div>
  );
}
