"use client";
import { useActionState } from "react";
import { ArrowRightIcon, LockKeyIcon } from "@phosphor-icons/react";
import { login } from "@/app/login/actions";
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return <form action={action} className="login-form">
    <label htmlFor="key">Team access key</label>
    <div className="key-field"><LockKeyIcon size={18}/><input id="key" name="key" type="password" autoComplete="current-password" required placeholder="Enter your access key" maxLength={200}/></div>
    {state.error && <p role="alert" className="error-text">{state.error}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Verifying…" : "Sign in"}<ArrowRightIcon size={17}/></button>
    <p className="login-footnote">For the Enemites team. Sessions expire after 8 hours.</p>
  </form>;
}
