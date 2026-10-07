import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const session = await getSession();
  if (session.authenticated) redirect("/");
  return <main className="login-page"><div className="login-brand"><span className="brand-mark">e</span>enemites<span className="internal-tag">INTERNAL</span></div>
    <section className="login-card"><div className="eyebrow">ENEMITES ANALYTICS</div><h1>Internal analytics.<br/><span>Team workspace.</span></h1><p className="login-intro">Sign in to monitor registrations and review audience insights.</p><LoginForm/></section>
    <footer className="login-footer">Enemites · Internal workspace</footer>
  </main>;
}
