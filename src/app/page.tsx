import { requireSession } from "@/lib/session";
import { parseFilters } from "@/lib/filters";
import { getAnalytics } from "@/lib/analytics";
import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSession();
  const params = await searchParams;
  const filters = parseFilters(params);
  const view = ["overview", "waitlist", "audience", "forms", "sources"].includes(String(params.view)) ? String(params.view) : "overview";
  let data;
  try { data = await getAnalytics(filters); }
  catch { console.error("Analytics read failed; check connection and reader permissions"); }
  return <Dashboard data={data ?? null} filters={filters} view={view}/>;
}
