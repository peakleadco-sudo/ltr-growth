/** Shared URL helpers (safe for client and server). Network safety checks live in lib/services/safe-fetch.ts. */
export function normalizeWebsiteUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const raw = (input || "").trim();
  if (!raw) return { ok: false, error: "Enter a website address." };
  if (raw.length > 2048) return { ok: false, error: "That address is too long." };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, error: "Enter a valid website address, like yourbusiness.com." };
  }
  if (!["http:", "https:"].includes(u.protocol)) return { ok: false, error: "Only http and https websites are supported." };
  if (u.username || u.password) return { ok: false, error: "Website addresses can't include credentials." };
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".") || /^[\d.]+$/.test(host) || host.includes(":") ) {
    return { ok: false, error: "Enter a public website domain, like yourbusiness.com." };
  }
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(host)) {
    return { ok: false, error: "Enter a public website domain." };
  }
  if (u.port && !["80", "443"].includes(u.port)) return { ok: false, error: "Custom ports aren't supported." };
  u.hash = "";
  return { ok: true, url: u.toString() };
}
