import { test } from "node:test";
import assert from "node:assert/strict";
import { changeLabel, percentChange, growthBounds, periodBounds, groupPoints, records, localDate } from "../src/lib/metrics";
import { parseFilters } from "../src/lib/filters";

test("growth percentages distinguish new activity, no change, and a decrease", () => {
  assert.equal(percentChange(15, 10), 50);
  assert.equal(percentChange(0, 10), -100);
  assert.equal(percentChange(0, 0), 0);
  assert.equal(percentChange(10, 0), null);
  assert.equal(changeLabel(10, 0), "No baseline");
  assert.equal(changeLabel(15, 10), "+50%");
});
test("reporting boundaries use Jakarta midnight and adjacent equal-duration periods", () => {
  const now = new Date("2026-10-07T06:30:00Z");
  const p = periodBounds(parseFilters({ range: "7" }), now);
  assert.equal(p.start, "2026-09-30T17:00:00.000Z");
  assert.equal(p.end, now.toISOString());
  assert.equal(p.previousEnd, p.start);
  assert.equal(Date.parse(p.end) - Date.parse(p.start!), Date.parse(p.previousEnd!) - Date.parse(p.previousStart!));
  assert.equal(localDate("2026-10-06T17:00:00Z"), "2026-10-07");
});
test("custom through-date is inclusive and current day is capped at the read time", () => {
  const p = periodBounds(parseFilters({ range: "custom", from: "2026-02-18", to: "2026-02-18" }), new Date("2026-10-07T06:00:00Z"));
  assert.equal(p.start, "2026-02-17T17:00:00.000Z");
  assert.equal(p.end, "2026-02-18T17:00:00.000Z");
  const today = periodBounds(parseFilters({ range: "custom", from: "2026-10-07", to: "2026-10-07" }), new Date("2026-10-07T06:00:00Z"));
  assert.equal(today.end, "2026-10-07T06:00:00.000Z");
});
test("matched comparisons cross year boundaries and cap short months, including leap years", () => {
  const january = growthBounds(new Date("2026-01-01T00:30:00Z"));
  assert.equal(january.previousMonth, "2025-11-30T17:00:00.000Z");
  assert.equal(january.previousMonthElapsed, "2025-12-01T00:30:00.000Z");
  assert.equal(january.yesterdayElapsed, "2025-12-31T00:30:00.000Z");
  const march = growthBounds(new Date("2026-03-31T06:00:00Z"));
  assert.equal(march.previousMonthElapsed, march.month);
  const leap = growthBounds(new Date("2024-03-29T06:00:00Z"));
  assert.equal(leap.previousMonthElapsed, "2024-02-29T06:00:00.000Z");
});
test("chart grouping uses Monday weeks and preserves clipped drill-down dates and totals", () => {
  const points = [{ date: "2026-10-04", count: 2 }, { date: "2026-10-05", count: 3 }, { date: "2026-10-06", count: 0 }];
  assert.deepEqual(groupPoints(points, "week"), [{ date: "2026-09-28", count: 2, from: "2026-10-04", to: "2026-10-04" }, { date: "2026-10-05", count: 3, from: "2026-10-05", to: "2026-10-06" }]);
  assert.equal(groupPoints(points, "month")[0].count, 5);
});
test("ATH measures period registrations and resolves ties to the earliest period", () => {
  const peaks = records([{ date: "2026-01-01", count: 4 }, { date: "2026-01-02", count: 4 }, { date: "2026-02-01", count: 6 }]);
  assert.deepEqual(peaks.day, { date: "2026-02-01", count: 6 });
  assert.equal(peaks.month?.count, 8);
  assert.equal(peaks.month?.date, "2026-01-01");
  assert.equal(records([]).day, null);
});
