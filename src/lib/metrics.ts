import type { Filters } from "./filters";

const DAY = 86400000;
const OFFSET = 7 * 3600000;
export const localDate = (value: Date | string) => new Date(new Date(value).getTime() + OFFSET).toISOString().slice(0, 10);
export const midnight = (day: string) => new Date(day + "T00:00:00+07:00");
export function periodBounds(filters: Filters, now: Date) {
  const today = midnight(localDate(now));
  let start: Date | null = null;
  let end = now;
  if (filters.range === "custom") {
    start = midnight(filters.from);
    end = new Date(Math.min(midnight(filters.to).getTime() + DAY, now.getTime()));
  } else if (filters.range !== "all") start = new Date(today.getTime() - (Number(filters.range) - 1) * DAY);
  // A future date selection is a valid empty window, not a negative interval.
  if (start && start > end) end = start;
  const duration = start ? end.getTime() - start.getTime() : 0;
  return { start: start?.toISOString() ?? null, end: end.toISOString(), previousStart: start ? new Date(start.getTime() - duration).toISOString() : null, previousEnd: start?.toISOString() ?? null };
}
export function growthBounds(now: Date) {
  const today = midnight(localDate(now));
  const month = midnight(localDate(now).slice(0, 7) + "-01");
  const shifted = new Date(month.getTime() + OFFSET);
  shifted.setUTCMonth(shifted.getUTCMonth() - 1);
  const previousMonth = new Date(shifted.getTime() - OFFSET);
  return {
    today: today.toISOString(), yesterday: new Date(today.getTime() - DAY).toISOString(),
    yesterdayElapsed: new Date(now.getTime() - DAY).toISOString(), month: month.toISOString(),
    previousMonth: previousMonth.toISOString(),
    previousMonthElapsed: new Date(Math.min(previousMonth.getTime() + now.getTime() - month.getTime(), month.getTime())).toISOString()
  };
}
export function percentChange(current: number, previous: number): number | null {
  return previous === 0 ? current === 0 ? 0 : null : (current - previous) / previous * 100;
}
export function changeLabel(current: number, previous: number) {
  const pct = percentChange(current, previous);
  return pct === null ? "No baseline" : `${pct > 0 ? "+" : ""}${pct.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}
export type Point = { date: string; count: number };
export function groupPoints(points: Point[], grouping: "day" | "week" | "month") {
  const grouped = new Map<string, { date: string; count: number; from: string; to: string }>();
  for (const point of points) {
    const day = new Date(point.date + "T00:00:00Z");
    if (grouping === "week") day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
    if (grouping === "month") day.setUTCDate(1);
    const key = day.toISOString().slice(0, 10);
    const bucket = grouped.get(key);
    if (bucket) { bucket.count += point.count; bucket.to = point.date; }
    else grouped.set(key, { date: key, count: point.count, from: point.date, to: point.date });
  }
  return [...grouped.values()];
}
export function records(points: Point[]) {
  const peak = (items: Point[]) => items.reduce<Point | null>((best, p) => !best || p.count > best.count ? p : best, null);
  return { day: peak(points), month: peak(groupPoints(points, "month")) };
}
