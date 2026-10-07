import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return getIronSession<{ authenticated?: boolean }>(await cookies(), {
    password, cookieName: "enemites_analytics_session", ttl: 60 * 60 * 8,
    cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "strict", path: "/" }
  });
}
export async function requireSession() {
  const session = await getSession();
  if (!session.authenticated) redirect("/login");
  return session;
}
