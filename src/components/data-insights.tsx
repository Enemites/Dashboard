"use client";
import type { Analytics } from "@/lib/analytics";
import { changeLabel, localDate } from "@/lib/metrics";

const num = (value: number) => value.toLocaleString("en-US");
const dayLabel = (value: string) => new Date(value + "T00:00:00+07:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Jakarta" });
export function GrowthInsights({ data, onPeriod }: { data: Analytics; onPeriod: (from: string, to: string) => void }) {
  const g = data.growth;
  const today = localDate(data.updatedAt);
  const clock = new Date(data.updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const cards = [
    { title: "Today", count: g.today, baseline: g.yesterdayElapsed, context: `vs yesterday through ${clock}`, full: `Yesterday, full day: ${num(g.yesterday)}`, peak: g.peaks.day, from: today, to: today, unit: "day" },
    { title: "This month", count: g.month, baseline: g.previousMonthElapsed, context: "vs last month at the same elapsed time", full: `Last month, full month: ${num(g.previousMonth)} · ${changeLabel(g.month, g.previousMonth)} so far`, peak: g.peaks.month, from: today.slice(0, 7) + "-01", to: today, unit: "month" }
  ];
  return <section className="growth-section" aria-label="Growth comparisons"><div className="section-heading"><div><h2>Growth & records</h2><p>New registrations · current audience filters · independent of the date range and search</p></div><span className="subtle-pill">Asia/Jakarta · UTC+7</span></div>
    <div className="growth-grid">{cards.map(c => {
      const peak = c.peak?.count ?? 0;
      const achievement = peak ? c.count / peak * 100 : 0;
      return <article className="panel growth-card" key={c.title}>
        <div className="growth-title"><h3>{c.title}</h3><button onClick={() => onPeriod(c.from, c.to)}>View registrations ↗</button></div>
        <div className="growth-value"><strong>{num(c.count)}</strong><span className={`change-badge ${c.count > c.baseline ? "positive" : c.count < c.baseline ? "negative" : ""}`}>{changeLabel(c.count, c.baseline)}</span></div>
        <p>{c.context} · {num(c.baseline)} registrations</p><p className="growth-full">{c.full}</p>
        <div className="record-row"><span>All-time {c.unit} high</span><b>{peak ? num(peak) : "No record yet"}</b></div>
        <div className="record-track"><span style={{ width: `${Math.min(achievement, 100)}%` }}/></div>
        <p className="record-caption">{peak ? `${achievement.toFixed(1)}% of record · ${changeLabel(c.count, peak)} vs ATH · ${c.unit === "month" ? c.peak!.date.slice(0, 7) : dayLabel(c.peak!.date)}` : "No registrations in this audience yet."}</p>
      </article>;
    })}</div><p className="panel-note">Today and this month are incomplete. The previous month comparison is capped at its full length. ATH uses all recorded calendar days / months, including the current period; ties show the earliest record.</p>
  </section>;
}

export function DataHealth({ data, compact = false }: { data: Analytics; compact?: boolean }) {
  const age = data.all.last ? Math.max(0, Math.floor((new Date(data.updatedAt).getTime() - new Date(data.all.last).getTime()) / 86400000)) : null;
  const s = compact ? data.stats : data.health;
  const fields = [["Country", s.unknown_country], ["Device", s.unknown_device], ["Browser", s.unknown_browser], ["Operating system", s.unknown_os], ["Age group", s.unknown_age], ["Update consent", s.unknown_consent]] as const;
  return <section className="panel health-panel"><div className="panel-head"><div><h2>{compact ? "Data completeness" : "Data health"}</h2><p>{compact ? "Selected dates and audience filters" : "All recorded registrations · independent of filters"} · {num(s.total)} records</p></div><span className="subtle-pill">{compact ? "Recorded fields" : "Query succeeded"}</span></div>
    {!compact && <><div className="health-summary"><div><span>Data read time</span><b>{data.queryMs.toLocaleString("en-US")} ms</b><small>Connection and read-only queries</small></div><div><span>Last registration</span><b>{age === null ? "No activity recorded" : age === 0 ? "Today" : `${age} days ago`}</b><small>Activity age, not ingestion health</small></div><div><span>Duplicate email rows</span><b>{num(data.health.duplicate_emails)}</b><small>Extra rows after case-insensitive matching</small></div><div><span>Future-dated records</span><b>{num(data.health.future_records)}</b><small>Excluded from registration metrics</small></div></div><p className="health-explanation">A successful query confirms database access. No tracking heartbeat is recorded, so a quiet period does not prove the collection pipeline has failed. This is a check at page load or refresh.</p></>}
    <div className="quality-grid">{fields.map(([label, missing]) => {
      const percent = s.total ? (s.total - missing) / s.total * 100 : null;
      return <div key={label}><div className="quality-label"><span>{label}</span><b>{percent === null ? "—" : `${percent.toFixed(0)}% complete`}</b></div><div className="bar-track"><div style={{ width: `${percent ?? 0}%`, background: "var(--chart-1)" }}/></div><small>{num(missing)} missing / {num(s.total)} records</small></div>;
    })}</div>
    <p className="panel-note">Unknown fields stay unknown. Location inferred from timezone is counted as missing; consent is separated into opted in, opted out, and unknown.</p>
  </section>;
}
