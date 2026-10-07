"use client";
import { useActionState } from "react";
import { ArrowRightIcon, LockKeyIcon } from "@phosphor-icons/react";
import { login } from "@/app/login/actions";
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return <form action={action} className="login-form">
    <label htmlFor="key">Kunci akses tim</label>
    <div className="key-field"><LockKeyIcon size={18}/><input id="key" name="key" type="password" autoComplete="current-password" required placeholder="Masukkan kunci akses" maxLength={200}/></div>
    {state.error && <p role="alert" className="error-text">{state.error}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Memverifikasi…" : "Buka dashboard"}<ArrowRightIcon size={17}/></button>
    <p className="login-footnote">Akses khusus tim Enemites. Sesi berakhir setelah 8 jam.</p>
  </form>;
}
