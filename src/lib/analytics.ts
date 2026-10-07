import "server-only";
import { readDatabase } from "./database";
import { requireSession } from "./session";
import { whereClause, type Filters } from "./filters";
import { growthBounds, periodBounds, records, type Point } from "./metrics";

export type Segment = { label: string; count: number };
export type Signup = { id: string; name: string; email: string; phone_number: string; age_group: string | null; country: string | null; city: string | null; device_type: string | null; browser: string | null; operating_system: string | null; receive_updates: boolean | null; created_at: string };
type Stats = { total: number; opted_in: number; opted_out: number; unknown_consent: number; countries: number; unknown_country: number; unknown_device: number; unknown_browser: number; unknown_os: number; unknown_age: number; first: string | null; last: string | null };
export type Growth = { today: number; yesterday: number; yesterdayElapsed: number; month: number; previousMonth: number; previousMonthElapsed: number; peaks: ReturnType<typeof records> };
export type Health = { total: number; unknown_country: number; unknown_device: number; unknown_browser: number; unknown_os: number; unknown_age: number; unknown_consent: number; duplicate_emails: number; future_records: number };
export type Analytics = {
  stats: Stats; all: { total: number; last: string | null }; previous: number | null;
  chart: { date: string; count: number }[]; groups: Record<string, Segment[]>;
  signups: Signup[]; matches: number; page: number; pages: number;
  forms: { id: string; title: string; slug: string; is_active: boolean; expires_at: string | null; count: number; total_count: number }[];
  updatedAt: string; start: string | null; end: string; filters: Filters;
  growth: Growth; health: Health; queryMs: number; options: Record<string, Segment[]>;
  previousStart: string | null; previousEnd: string | null;
};
export async function getAnalytics(filters: Filters): Promise<Analytics> {
  await requireSession();
  const started = performance.now();
  const result = await readDatabase(async client => {
    const { rows: [clock] } = await client.query<{ now: string; today: string }>("SELECT now()::text AS now, date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta' AS today");
    const now = new Date(clock.now);
    const { start, end, previousStart, previousEnd } = periodBounds(filters, now);
    const current = whereClause(filters, start, end);
    const search = whereClause(filters, start, end, true);
    const prior = whereClause(filters, previousStart, previousEnd ?? end);
    const values = [...search.values];
    let priorSql = "";
    if (start) {
      priorSql = prior.sql.replace(/\$(\d+)/g, (_, index) => `$${Number(index) + values.length}`);
      values.push(...prior.values);
    }
    const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const startParam = bind(start);
    const pageParam = bind(filters.page);
    const nowParam = bind(now.toISOString());
    const columns = "id, name, email, phone_number, age_group, receive_updates, country, city, device_type, browser, operating_system, created_at";
    // Fixed columns only. Aggregate in Postgres to avoid many network round trips.
    const groups = ["device_type", "country", "age_group", "browser", "operating_system"].map(column => {
      const expression = column === "country" ? "CASE WHEN country LIKE 'Local (%)' THEN 'Unknown' ELSE COALESCE(NULLIF(country, ''), 'Unknown') END" : `COALESCE(NULLIF(${column}, ''), 'Unknown')`;
      return `'${column}', (SELECT COALESCE(jsonb_agg(g), '[]'::jsonb) FROM (SELECT ${expression} AS label, count(*)::int AS count FROM selected GROUP BY 1 ORDER BY count DESC, label LIMIT 12) g)`;
    }).join(",");
    const { rows: [{ payload }] } = await client.query<{ payload: Pick<Analytics, "stats" | "all" | "previous" | "groups" | "chart" | "matches" | "page" | "pages" | "signups" | "forms"> }>(`
      WITH selected AS MATERIALIZED (SELECT ${columns} FROM public.waitlist WHERE ${current.sql}),
      matching AS MATERIALIZED (SELECT ${columns} FROM public.waitlist WHERE ${search.sql}),
      summary AS (SELECT count(*)::int AS total,
        count(*) FILTER (WHERE receive_updates = true)::int AS opted_in,
        count(*) FILTER (WHERE receive_updates = false)::int AS opted_out,
        count(*) FILTER (WHERE receive_updates IS NULL)::int AS unknown_consent,
        count(DISTINCT country) FILTER (WHERE country IS NOT NULL AND country <> '' AND country NOT LIKE 'Local (%)')::int AS countries,
        count(*) FILTER (WHERE country IS NULL OR country = '' OR country LIKE 'Local (%)')::int AS unknown_country,
        count(*) FILTER (WHERE device_type IS NULL OR device_type = '')::int AS unknown_device,
        count(*) FILTER (WHERE browser IS NULL OR browser = '')::int AS unknown_browser,
        count(*) FILTER (WHERE operating_system IS NULL OR operating_system = '')::int AS unknown_os,
        count(*) FILTER (WHERE age_group IS NULL OR age_group = '')::int AS unknown_age,
        min(created_at)::text AS first, max(created_at)::text AS last FROM selected),
      pagination AS (SELECT count(*)::int AS matches,
        GREATEST(1, ceil(count(*) / 10.0))::int AS pages,
        LEAST(${pageParam}::int, GREATEST(1, ceil(count(*) / 10.0))::int) AS page FROM matching),
      dates AS (SELECT generate_series((COALESCE(${startParam}::timestamptz, (SELECT min(created_at) FROM selected), $1::timestamptz) AT TIME ZONE 'Asia/Jakarta')::date,
        (($1::timestamptz - interval '1 microsecond') AT TIME ZONE 'Asia/Jakarta')::date, '1 day')::date AS day),
      daily AS (SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::date AS day, count(*)::int AS count FROM selected GROUP BY 1)
      SELECT jsonb_build_object(
        'stats', (SELECT to_jsonb(summary) FROM summary),
        'all', (SELECT jsonb_build_object('total', count(*)::int, 'last', max(created_at)::text) FROM public.waitlist WHERE created_at < ${nowParam}::timestamptz),
        'previous', ${start ? `(SELECT count(*)::int FROM public.waitlist WHERE ${priorSql})` : "NULL"},
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
    // Growth ignores the selected reporting dates and search, but keeps audience filters.
    const audience = whereClause(filters, null, now.toISOString());
    const growthValues = [...audience.values];
    const growthParams = Object.fromEntries(Object.entries(growthBounds(now)).map(([key, value]) => { growthValues.push(value); return [key, `$${growthValues.length}::timestamptz`]; }));
    const g = growthParams;
    const { rows: [{ growth, history }] } = await client.query<{ growth: Omit<Growth, "peaks">; history: Point[] }>(`
      WITH audience AS MATERIALIZED (SELECT created_at FROM public.waitlist WHERE ${audience.sql}),
      daily AS (SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::date::text AS date, count(*)::int AS count FROM audience GROUP BY 1)
      SELECT (SELECT jsonb_build_object(
        'today', count(*) FILTER (WHERE created_at >= ${g.today}),
        'yesterday', count(*) FILTER (WHERE created_at >= ${g.yesterday} AND created_at < ${g.today}),
        'yesterdayElapsed', count(*) FILTER (WHERE created_at >= ${g.yesterday} AND created_at < ${g.yesterdayElapsed}),
        'month', count(*) FILTER (WHERE created_at >= ${g.month}),
        'previousMonth', count(*) FILTER (WHERE created_at >= ${g.previousMonth} AND created_at < ${g.month}),
        'previousMonthElapsed', count(*) FILTER (WHERE created_at >= ${g.previousMonth} AND created_at < ${g.previousMonthElapsed})
      ) FROM audience) AS growth,
      (SELECT COALESCE(jsonb_agg(daily ORDER BY date), '[]'::jsonb) FROM daily) AS history`, growthValues);
    const optionGroups = ["country", "browser", "operating_system"].map(column => {
      const expression = column === "country" ? "CASE WHEN country LIKE 'Local (%)' THEN 'Unknown' ELSE COALESCE(NULLIF(country, ''), 'Unknown') END" : `COALESCE(NULLIF(${column}, ''), 'Unknown')`;
      return `'${column}', (SELECT COALESCE(jsonb_agg(o), '[]'::jsonb) FROM (SELECT ${expression} AS label, count(*)::int AS count FROM public.waitlist WHERE created_at < $1::timestamptz GROUP BY 1 ORDER BY label) o)`;
    }).join(",");
    const { rows: [{ health, options }] } = await client.query<{ health: Health; options: Analytics["options"] }>(`
      SELECT (SELECT jsonb_build_object('total', count(*)::int,
        'unknown_country', count(*) FILTER (WHERE country IS NULL OR country = '' OR country LIKE 'Local (%)'),
        'unknown_device', count(*) FILTER (WHERE device_type IS NULL OR device_type = ''),
        'unknown_browser', count(*) FILTER (WHERE browser IS NULL OR browser = ''),
        'unknown_os', count(*) FILTER (WHERE operating_system IS NULL OR operating_system = ''),
        'unknown_age', count(*) FILTER (WHERE age_group IS NULL OR age_group = ''),
        'unknown_consent', count(*) FILTER (WHERE receive_updates IS NULL),
        'future_records', (SELECT count(*) FROM public.waitlist WHERE created_at >= $1::timestamptz),
        'duplicate_emails', (SELECT COALESCE(sum(n - 1), 0)::int FROM (SELECT count(*) AS n FROM public.waitlist WHERE created_at < $1::timestamptz AND NULLIF(trim(email), '') IS NOT NULL GROUP BY lower(trim(email)) HAVING count(*) > 1) duplicates)
      ) FROM public.waitlist WHERE created_at < $1::timestamptz) AS health,
      jsonb_build_object(${optionGroups}) AS options`, [now.toISOString()]);
    return { ...payload, growth: { ...growth, peaks: records(history) }, health, options, updatedAt: now.toISOString(), start, end, filters, previousStart, previousEnd };
  });
  return { ...result, queryMs: Math.round(performance.now() - started) };
}
