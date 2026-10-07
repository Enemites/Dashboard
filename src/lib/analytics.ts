import "server-only";
import { readDatabase } from "./database";
import { requireSession } from "./session";
import { whereClause, type Filters } from "./filters";

export type Segment = { label: string; count: number };
export type Signup = { id: string; name: string; email: string; phone_number: string; age_group: string | null; country: string | null; city: string | null; device_type: string | null; browser: string | null; operating_system: string | null; receive_updates: boolean | null; created_at: string };
type Stats = { total: number; opted_in: number; countries: number; unknown_country: number; unknown_device: number; first: string | null; last: string | null };
export type Analytics = {
  stats: Stats; all: { total: number; last: string | null }; previous: number | null;
  chart: { date: string; count: number }[]; groups: Record<string, Segment[]>;
  signups: Signup[]; matches: number; page: number; pages: number;
  forms: { id: string; title: string; slug: string; is_active: boolean; expires_at: string | null; count: number; total_count: number }[];
  updatedAt: string; start: string | null; end: string; filters: Filters;
};
export async function getAnalytics(filters: Filters): Promise<Analytics> {
  await requireSession();
  return readDatabase(async client => {
    const { rows: [clock] } = await client.query<{ now: string; today: string }>("SELECT now()::text AS now, date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta' AS today");
    const now = new Date(clock.now);
    const end = now.toISOString();
    const today = new Date(clock.today);
    const days = filters.range === "all" ? null : Number(filters.range);
    const startDate = days ? new Date(today.getTime() - (days - 1) * 86400000) : null;
    const start = startDate?.toISOString() ?? null;
    const previousStart = startDate && days ? new Date(startDate.getTime() - days * 86400000).toISOString() : null;
    const previousEnd = days ? new Date(now.getTime() - days * 86400000).toISOString() : end;
    const current = whereClause(filters, start, end);
    const search = whereClause(filters, start, end, true);
    const prior = whereClause(filters, previousStart, previousEnd);
    const values = [...search.values];
    let priorSql = "";
    if (days) {
      priorSql = prior.sql.replace(/\$(\d+)/g, (_, index) => `$${Number(index) + values.length}`);
      values.push(...prior.values);
    }
    const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const startParam = bind(start);
    const pageParam = bind(filters.page);
    const columns = "id, name, email, phone_number, age_group, receive_updates, country, city, device_type, browser, operating_system, created_at";
    // Fixed columns only. Aggregate in Postgres to avoid many network round trips.
    const groups = ["device_type", "country", "age_group", "browser", "operating_system"].map(column => {
      const expression = column === "country" ? "CASE WHEN country LIKE 'Local (%)' THEN 'Unknown' ELSE COALESCE(NULLIF(country, ''), 'Unknown') END" : `COALESCE(NULLIF(${column}, ''), 'Unknown')`;
      return `'${column}', (SELECT COALESCE(jsonb_agg(g), '[]'::jsonb) FROM (SELECT ${expression} AS label, count(*)::int AS count FROM selected GROUP BY 1 ORDER BY count DESC, label LIMIT 12) g)`;
    }).join(",");
    const { rows: [{ payload }] } = await client.query<{ payload: Omit<Analytics, "updatedAt" | "start" | "end" | "filters"> }>(`
      WITH selected AS MATERIALIZED (SELECT ${columns} FROM public.waitlist WHERE ${current.sql}),
      matching AS MATERIALIZED (SELECT ${columns} FROM public.waitlist WHERE ${search.sql}),
      summary AS (SELECT count(*)::int AS total,
        count(*) FILTER (WHERE receive_updates = true)::int AS opted_in,
        count(DISTINCT country) FILTER (WHERE country IS NOT NULL AND country <> '' AND country NOT LIKE 'Local (%)')::int AS countries,
        count(*) FILTER (WHERE country IS NULL OR country = '' OR country LIKE 'Local (%)')::int AS unknown_country,
        count(*) FILTER (WHERE device_type IS NULL OR device_type = '')::int AS unknown_device,
        min(created_at)::text AS first, max(created_at)::text AS last FROM selected),
      pagination AS (SELECT count(*)::int AS matches,
        GREATEST(1, ceil(count(*) / 10.0))::int AS pages,
        LEAST(${pageParam}::int, GREATEST(1, ceil(count(*) / 10.0))::int) AS page FROM matching),
      dates AS (SELECT generate_series((COALESCE(${startParam}::timestamptz, (SELECT min(created_at) FROM selected), $1::timestamptz) AT TIME ZONE 'Asia/Jakarta')::date,
        ($1::timestamptz AT TIME ZONE 'Asia/Jakarta')::date, '1 day')::date AS day),
      daily AS (SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::date AS day, count(*)::int AS count FROM selected GROUP BY 1)
      SELECT jsonb_build_object(
        'stats', (SELECT to_jsonb(summary) FROM summary),
        'all', (SELECT jsonb_build_object('total', count(*)::int, 'last', max(created_at)::text) FROM public.waitlist),
        'previous', ${days ? `(SELECT count(*)::int FROM public.waitlist WHERE ${priorSql})` : "NULL"},
        'groups', jsonb_build_object(${groups}),
        'chart', (SELECT COALESCE(jsonb_agg(c ORDER BY c.date), '[]'::jsonb) FROM (SELECT dates.day::text AS date, COALESCE(daily.count, 0)::int AS count FROM dates LEFT JOIN daily USING(day)) c),
        'matches', (SELECT matches FROM pagination), 'page', (SELECT page FROM pagination), 'pages', (SELECT pages FROM pagination),
        'signups', (SELECT COALESCE(jsonb_agg(s ORDER BY s.created_at DESC, s.id DESC), '[]'::jsonb) FROM
          (SELECT id, name, email, phone_number, age_group, country, city, device_type, browser, operating_system, receive_updates, created_at::text FROM matching
           ORDER BY created_at DESC, id DESC LIMIT 10 OFFSET (SELECT (page - 1) * 10 FROM pagination)) s),
        'forms', (SELECT COALESCE(jsonb_agg(f ORDER BY f.created_at DESC), '[]'::jsonb) FROM
          (SELECT id, title, slug, is_active, expires_at::text, created_at,
            (SELECT count(*)::int FROM public.enemites_form_submissions s WHERE s.form_id = forms.id AND s.created_at < $1::timestamptz AND (${startParam}::timestamptz IS NULL OR s.created_at >= ${startParam}::timestamptz)) AS count,
            (SELECT count(*)::int FROM public.enemites_form_submissions s WHERE s.form_id = forms.id) AS total_count
           FROM public.enemites_forms forms) f)
      ) AS payload`, values);
    return { ...payload, updatedAt: end, start, end, filters };
  });
}
