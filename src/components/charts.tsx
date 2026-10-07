"use client";
import { useState } from "react";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Segment } from "@/lib/analytics";
const colors = ["#72d9be", "#8ea1dd", "#d6b07b", "#a1aaae", "#727d82"];
const dateLabel = (date: string) => new Date(date + "T00:00:00+07:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
export function SignupChart({ points, total }: { points: { date: string; count: number }[]; total: number }) {
  const [mode, setMode] = useState("daily");
  let accumulated = 0;
  const series = points.map(p => ({ ...p, value: mode === "daily" ? p.count : (accumulated += p.count) }));
  return <section className="panel chart-panel"><div className="panel-head"><div><h2>Pertumbuhan waitlist</h2><p>Pendaftaran berdasarkan tanggal · WIB</p></div><div className="segmented" aria-label="Jenis grafik"><button aria-pressed={mode === "daily"} onClick={() => setMode("daily")}>Harian</button><button aria-pressed={mode === "cumulative"} onClick={() => setMode("cumulative")}>Kumulatif</button></div></div>
    <div className="chart-total"><strong>{total.toLocaleString("id-ID")}</strong><span>pendaftar pada periode ini</span><span className="chart-legend"><i/>Pendaftaran</span></div>
    <div className="chart" role="img" aria-label={`${total} pendaftaran dalam ${points.length} hari. ${mode === "daily" ? "Grafik harian" : "Grafik kumulatif periode terpilih"}.`}>
      <ResponsiveContainer width="100%" height={235}><AreaChart data={series} margin={{ top: 15, right: 8, bottom: 0, left: -28 }}>
        <defs><linearGradient id="signup-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#72d9be" stopOpacity={0.24}/><stop offset="100%" stopColor="#72d9be" stopOpacity={0.01}/></linearGradient></defs>
        <CartesianGrid stroke="var(--line)" vertical={false} strokeDasharray="3 5"/>
        <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={50} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} dy={10}/>
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }}/>
        <Tooltip labelFormatter={label => dateLabel(String(label))} formatter={value => [value, "Pendaftar"]} contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--text)", fontSize: 12 }}/>
        <Area type="linear" dataKey="value" stroke="#72d9be" strokeWidth={2} fill="url(#signup-fill)" isAnimationActive={false}/>
      </AreaChart></ResponsiveContainer>
    </div>{total === 0 && <div className="chart-empty">Belum ada pendaftaran pada periode ini.</div>}
  </section>;
}
export function Segments({ title, description, segments, total, donut = false }: { title: string; description?: string; segments: Segment[]; total: number; donut?: boolean }) {
  let offset = 0;
  const stops = segments.map((s, i) => { const start = offset; offset += total ? s.count / total * 100 : 0; return `${colors[i % colors.length]} ${start}% ${offset}%`; });
  if (offset < 100) stops.push(`var(--line) ${offset}% 100%`);
  return <section className="panel segment-panel"><div className="panel-head"><div><h2>{title}</h2><p>{description || "Distribusi pendaftar pada periode ini"}</p></div></div>
    {donut && <div className="donut-wrap"><div className="donut" style={{ background: total ? `conic-gradient(${stops.join(",")})` : "var(--line)" }}><div><strong>{total}</strong><span>pendaftar</span></div></div></div>}
    <div className="segment-list">{segments.length ? segments.map((s, i) => <div className="segment" key={s.label}><div className="segment-row"><span><i style={{ background: colors[i % colors.length] }}/>{s.label}</span><span><b>{s.count}</b><em>{total ? Math.round(s.count / total * 100) : 0}%</em></span></div>{!donut && <div className="bar-track"><div style={{ width: `${total ? s.count / total * 100 : 0}%`, background: colors[i % colors.length] }}/></div>}</div>) : <p className="empty-inline">Belum ada data untuk periode ini.</p>}</div>
    {offset < 99.5 && total > 0 && <p className="panel-note">Menampilkan 12 kategori teratas; sisanya {Math.round(100 - offset)}%.</p>}
  </section>;
}
