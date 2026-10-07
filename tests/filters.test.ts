import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, parseFilters, whereClause } from "../src/lib/filters";
test("untrusted filter values cannot become SQL identifiers or clauses", () => {
  const filters = parseFilters({ device: "Desktop'; DROP TABLE waitlist;--", range: "-2", page: "-10", updates: "1", age: "NaN" });
  assert.deepEqual(filters, { device: "", range: "all", page: 1, updates: "", age: "", search: "", from: "", to: "", country: "", browser: "", os: "" });
});
test("custom dates reject impossible, inverted, and missing boundaries", () => {
  for (const [from, to] of [["2026-02-30", "2026-03-01"], ["2026-03-02", "2026-03-01"], ["", "2026-03-01"]]) assert.equal(parseFilters({ range: "custom", from, to }).range, "all");
  assert.equal(parseFilters({ range: "custom", from: "2024-02-29", to: "2024-02-29" }).range, "custom");
});
test("unknown consent uses NULL while opted-out uses false; metadata stays bound", () => {
  const filters = parseFilters({ updates: "unknown", country: "Unknown", browser: "x' OR true--", os: "Unknown" });
  const w = whereClause(filters, null, "2026-10-07T00:00:00Z");
  assert.deepEqual(w.values, ["2026-10-07T00:00:00Z", null, "Unknown", "x' OR true--", "Unknown"]);
  assert.equal(w.sql.includes(filters.browser), false);
  assert.match(w.sql, /receive_updates IS NOT DISTINCT FROM \$2::boolean/);
  assert.equal(whereClause(parseFilters({ updates: "no" }), null, "end").values[1], false);
});
test("search remains a bound literal and percent/underscore do not broaden results", () => {
  const filters = parseFilters({ search: "x%' OR 1=1 --_", device: "Mobile", updates: "no" });
  const where = whereClause(filters, "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z", true);
  assert.equal(where.sql.includes(filters.search), false);
  assert.deepEqual(where.values, ["2026-02-01T00:00:00Z", "2026-01-01T00:00:00Z", "Mobile", false, "%x\\%' OR 1=1 --\\_%"]);
  assert.match(where.sql, /created_at < \$1::timestamptz/);
  assert.match(where.sql, /created_at >= \$2::timestamptz/);
});
test("CSV neutralizes spreadsheet formulas and preserves quotes and newlines", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell("+628123"), '"\'+628123"');
  assert.equal(csvCell("  @SUM(1)"), '"\'  @SUM(1)"');
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csvCell(null), '""');
});
