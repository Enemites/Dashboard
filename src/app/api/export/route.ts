import { getSession } from "@/lib/session";
import { parseFilters, whereClause, csvCell } from "@/lib/filters";
import { readDatabase } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await getSession();
  if (!session.authenticated) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams));
  try {
    const rows = await readDatabase(async client => {
      const { rows: [clock] } = await client.query("SELECT now()::text AS now, date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta' AS today");
      const start = filters.range === "all" ? null : new Date(new Date(clock.today).getTime() - (Number(filters.range) - 1) * 86400000).toISOString();
      const w = whereClause(filters, start, new Date(clock.now).toISOString(), true);
      const { rows: [count] } = await client.query(`SELECT count(*)::int AS total FROM public.waitlist WHERE ${w.sql}`, w.values);
      if (count.total > 10000) throw new Error("EXPORT_LIMIT");
      return (await client.query(`SELECT name, email, phone_number, age_group, receive_updates, country, city, device_type, browser, operating_system, created_at::text FROM public.waitlist WHERE ${w.sql} ORDER BY created_at DESC, id DESC`, w.values)).rows;
    });
    const columns = ["name", "email", "phone_number", "age_group", "receive_updates", "country", "city", "device_type", "browser", "operating_system", "created_at"];
    const csv = "\uFEFF" + [columns.map(csvCell).join(","), ...rows.map(row => columns.map(c => csvCell(row[c])).join(","))].join("\r\n");
    return new Response(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="enemites-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error && error.message === "EXPORT_LIMIT" ? "Export limit: 10,000 rows. Narrow the filters and try again." : "Export failed. Please try again." }, { status: error instanceof Error && error.message === "EXPORT_LIMIT" ? 413 : 503 });
  }
}
