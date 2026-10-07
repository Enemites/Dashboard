export type Filters = { range: "7" | "30" | "90" | "all" | "custom"; from: string; to: string; country: string; browser: string; os: string; search: string; device: string; updates: string; age: string; page: number };
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "2000-01-01" && value <= "2100-12-31" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const get = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const range = get("range");
  return {
    range: range === "custom" && validDate(get("from")) && validDate(get("to")) && get("from") <= get("to") ? "custom" : ["7", "30", "90", "all"].includes(range) ? range as Filters["range"] : "all",
    from: validDate(get("from")) ? get("from") : "", to: validDate(get("to")) ? get("to") : "",
    country: get("country").trim().slice(0, 100), browser: get("browser").trim().slice(0, 100), os: get("os").trim().slice(0, 100),
    search: get("search").trim().slice(0, 100),
    device: ["Desktop", "Mobile", "Tablet", "unknown"].includes(get("device")) ? get("device") : "",
    updates: ["yes", "no", "unknown"].includes(get("updates")) ? get("updates") : "",
    age: ["<10", "10-18", "18-20", "20+", "unknown"].includes(get("age")) ? get("age") : "",
    page: Math.min(100000, Math.max(1, Number.parseInt(get("page"), 10) || 1))
  };
}
export function whereClause(f: Filters, start: string | null, end: string, withSearch = false) {
  const values: unknown[] = [end];
  const clauses = ["created_at < $1::timestamptz"];
  const add = (expression: string, value: unknown) => { values.push(value); clauses.push(expression.replace("?", `$${values.length}`)); };
  if (start) add("created_at >= ?::timestamptz", start);
  if (f.device) add("COALESCE(NULLIF(device_type, ''), 'unknown') = ?", f.device);
  if (f.age) add("COALESCE(NULLIF(age_group, ''), 'unknown') = ?", f.age);
  if (f.updates) add("receive_updates IS NOT DISTINCT FROM ?::boolean", f.updates === "unknown" ? null : f.updates === "yes");
  if (f.country) add("CASE WHEN country LIKE 'Local (%)' THEN 'Unknown' ELSE COALESCE(NULLIF(country, ''), 'Unknown') END = ?", f.country);
  if (f.browser) add("COALESCE(NULLIF(browser, ''), 'Unknown') = ?", f.browser);
  if (f.os) add("COALESCE(NULLIF(operating_system, ''), 'Unknown') = ?", f.os);
  if (withSearch && f.search) {
    values.push(`%${f.search.replace(/[\\%_]/g, "\\$&")}%`);
    const p = `$${values.length}`;
    clauses.push(`(name ILIKE ${p} OR email ILIKE ${p} OR phone_number ILIKE ${p})`);
  }
  return { sql: clauses.join(" AND "), values };
}
export function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
