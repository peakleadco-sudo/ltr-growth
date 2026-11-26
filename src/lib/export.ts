/** Client-safe export helpers. Pure functions are unit tested. */

export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : Array.isArray(value) ? value.join(" ") : String(value);
  // Neutralize spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return [cols.map(csvEscape).join(","), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(","))].join("\r\n");
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "export";
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Generic structured-output → Markdown, used for briefs and exports. */
export function toMarkdown(value: unknown, labels: Record<string, string> = {}, depth = 2): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v && typeof v === "object") {
          const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== "" && x !== null && !(Array.isArray(x) && x.length === 0));
          return entries.map(([k, x], i) => `${i === 0 ? "- " : "  "}**${humanize(k, labels)}:** ${typeof x === "object" ? JSON.stringify(x) : String(x)}`).join("\n");
        }
        return `- ${String(v)}`;
      })
      .join("\n");
  }
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== "" && v !== null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${"#".repeat(Math.min(depth, 6))} ${humanize(k, labels)}\n\n${toMarkdown(v, labels, depth + 1)}`)
    .join("\n\n");
}

export function humanize(key: string, labels: Record<string, string> = {}) {
  if (labels[key]) return labels[key]!;
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
