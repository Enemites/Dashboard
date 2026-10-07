"use server";
import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// The credential is a generated 256-bit team access key, not a user-chosen password.
// This bounded per-instance throttle supplements its high entropy.
const attempts = new Map<string, { count: number; until: number }>();
export async function login(_previous: { error: string }, form: FormData) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "local").split(",")[0];
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
  const entry = attempts.get(ip);
  if (entry && entry.count >= 8) return { error: "Too many attempts. Try again in 15 minutes." };
  const expected = process.env.DASHBOARD_ACCESS_KEY;
  if (!expected || expected.length < 32) return { error: "Dashboard access has not been configured." };
  const supplied = String(form.get("key") || "").trim();
  const digest = (v: string) => createHash("sha256").update(v).digest();
  if (supplied.length > 200 || !timingSafeEqual(digest(supplied), digest(expected))) {
    if (attempts.size >= 2000) attempts.delete(attempts.keys().next().value!);
    attempts.set(ip, { count: (entry?.count || 0) + 1, until: entry?.until || now + 900000 });
    return { error: "The access key is incorrect. Check it and try again." };
  }
  attempts.delete(ip);
  const session = await getSession();
  session.authenticated = true;
  await session.save();
  redirect("/");
}
export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
