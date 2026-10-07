import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const session = await getSession();
  if (session.authenticated) redirect("/");
  return <main className="login-page"><div className="login-brand"><span className="brand-mark">e</span>enemites<span className="internal-tag">INTERNAL</span></div>
    <section className="login-card"><div className="eyebrow">ENEMITES ANALYTICS</div><h1>Kenali audiens.<br/><span>Pahami pertumbuhan.</span></h1><p className="login-intro">Satu tempat untuk memantau waitlist dan memahami orang-orang yang bergabung.</p><LoginForm/></section>
    <footer className="login-footer">Enemites · Internal workspace</footer>
  </main>;
}
