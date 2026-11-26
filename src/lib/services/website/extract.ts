import "server-only";
import { parse, type HTMLElement } from "node-html-parser";

/** Facts read directly from a page's HTML. Nothing here is inferred. */
export type WebsiteFacts = {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  title: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  siteName: string | null;
  lang: string | null;
  h1: string[];
  h2: string[];
  emails: string[];
  phones: string[];
  socialLinks: Record<string, string>;
  themeColor: string | null;
  colorCandidates: string[];
  logoCandidates: string[];
  structuredData: {
    types: string[];
    name: string | null;
    description: string | null;
    telephone: string | null;
    address: string | null;
    areaServed: string[];
    sameAs: string[];
  };
  textExcerpt: string;
  wordCount: number;
};

const SOCIAL: [string, RegExp][] = [
  ["instagram", /(^|\.)instagram\.com$/i],
  ["facebook", /(^|\.)(facebook|fb)\.com$/i],
  ["tiktok", /(^|\.)tiktok\.com$/i],
  ["linkedin", /(^|\.)linkedin\.com$/i],
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/i],
  ["x", /(^|\.)(twitter|x)\.com$/i],
  ["pinterest", /(^|\.)pinterest\.[a-z.]+$/i],
  ["google_business", /(^|\.)(g\.page|business\.google\.com)$/i],
  ["yelp", /(^|\.)yelp\.[a-z.]+$/i],
];

const clean = (s: string | null | undefined, max = 500) => {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

function meta(root: HTMLElement, sel: string) {
  return clean(root.querySelector(sel)?.getAttribute("content"));
}

function abs(href: string, base: string) {
  try {
    const u = new URL(href, base);
    return ["http:", "https:"].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

function flattenLd(node: unknown, out: Record<string, unknown>[]) {
  if (Array.isArray(node)) node.forEach((n) => flattenLd(n, out));
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (o["@graph"]) flattenLd(o["@graph"], out);
    if (o["@type"]) out.push(o);
  }
}

export function extractWebsiteFacts(html: string, url: string, finalUrl: string, fetchedAt: string): WebsiteFacts {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: false, pre: true } });

  // Structured data (read before stripping scripts)
  const ld: Record<string, unknown>[] = [];
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      flattenLd(JSON.parse(s.text), ld);
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  const typeOf = (o: Record<string, unknown>) => (Array.isArray(o["@type"]) ? (o["@type"] as string[]) : [String(o["@type"])]);
  const org = ld.find((o) => typeOf(o).some((t) => /Organization|LocalBusiness|Store|Restaurant|Service|Corporation|Dentist|Plumber|Electrician|LegalService|MedicalBusiness|HomeAndConstructionBusiness/i.test(t)));
  const addr = org?.address as Record<string, string> | string | undefined;
  const address = typeof addr === "string" ? addr : addr ? [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry].filter(Boolean).join(", ") : null;
  const areaServedRaw = org?.areaServed;
  const areaServed = (Array.isArray(areaServedRaw) ? areaServedRaw : areaServedRaw ? [areaServedRaw] : [])
    .map((a) => (typeof a === "string" ? a : (a as { name?: string })?.name))
    .filter((a): a is string => Boolean(a))
    .slice(0, 20);
  const sameAs = (Array.isArray(org?.sameAs) ? (org!.sameAs as string[]) : org?.sameAs ? [String(org.sameAs)] : []).slice(0, 20);

  // Colors: theme-color + hex colors in inline styles/CSS (frequency ranked)
  const themeColor = meta(root, 'meta[name="theme-color"]');
  const styleText = root.querySelectorAll("style").map((s) => s.text).join("\n") + " " + root.querySelectorAll("[style]").map((e) => e.getAttribute("style")).join(" ");
  const counts = new Map<string, number>();
  for (const m of styleText.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let hex = m[1]!.toLowerCase();
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (["ffffff", "000000"].includes(hex)) continue;
    counts.set(`#${hex}`, (counts.get(`#${hex}`) ?? 0) + 1);
  }
  const colorCandidates = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);

  // Links
  const emails = new Set<string>();
  const phones = new Set<string>();
  const socialLinks: Record<string, string> = {};
  for (const a of root.querySelectorAll("a[href]")) {
    const href = (a.getAttribute("href") || "").trim();
    if (href.startsWith("mailto:")) {
      const e = decodeURIComponent(href.slice(7).split("?")[0] || "").trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) emails.add(e);
      continue;
    }
    if (href.startsWith("tel:")) {
      const p = href.slice(4).replace(/[^\d+()\-\s.]/g, "").trim();
      if (p.replace(/\D/g, "").length >= 7) phones.add(p);
      continue;
    }
    const u = abs(href, finalUrl);
    if (!u) continue;
    const host = new URL(u).hostname;
    for (const [key, re] of SOCIAL) {
      if (re.test(host) && !socialLinks[key] && !/\/(sharer|share|intent|dialog)\b/i.test(u)) socialLinks[key] = u;
    }
  }
  for (const s of sameAs) {
    try {
      const host = new URL(s).hostname;
      for (const [key, re] of SOCIAL) if (re.test(host) && !socialLinks[key]) socialLinks[key] = s;
    } catch {}
  }

  // Logo candidates
  const logos = new Set<string>();
  const ldLogo = org?.logo;
  const ldLogoUrl = typeof ldLogo === "string" ? ldLogo : (ldLogo as { url?: string })?.url;
  if (ldLogoUrl) { const u = abs(ldLogoUrl, finalUrl); if (u) logos.add(u); }
  for (const img of root.querySelectorAll("img")) {
    const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
    const hint = `${src} ${img.getAttribute("alt") || ""} ${img.getAttribute("class") || ""} ${img.getAttribute("id") || ""}`;
    if (/logo/i.test(hint)) { const u = abs(src, finalUrl); if (u) logos.add(u); }
    if (logos.size >= 4) break;
  }
  for (const l of root.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')) {
    const u = abs(l.getAttribute("href") || "", finalUrl);
    if (u) logos.add(u);
  }

  // Visible text
  root.querySelectorAll("script, style, noscript, svg, template, iframe").forEach((n) => n.remove());
  const body = root.querySelector("body") ?? root;
  const text = body.textContent.replace(/\s+/g, " ").trim();

  return {
    url,
    finalUrl,
    fetchedAt,
    title: clean(root.querySelector("title")?.text, 300),
    metaDescription: meta(root, 'meta[name="description"]'),
    ogTitle: meta(root, 'meta[property="og:title"]'),
    ogDescription: meta(root, 'meta[property="og:description"]'),
    ogImage: (() => { const v = meta(root, 'meta[property="og:image"]'); return v ? abs(v, finalUrl) : null; })(),
    siteName: meta(root, 'meta[property="og:site_name"]'),
    lang: root.querySelector("html")?.getAttribute("lang") ?? null,
    h1: root.querySelectorAll("h1").map((h) => clean(h.text, 200)).filter((v): v is string => Boolean(v)).slice(0, 5),
    h2: root.querySelectorAll("h2").map((h) => clean(h.text, 200)).filter((v): v is string => Boolean(v)).slice(0, 15),
    emails: [...emails].slice(0, 5),
    phones: [...phones].slice(0, 5),
    socialLinks,
    themeColor: themeColor && /^#[0-9a-f]{3,8}$/i.test(themeColor) ? themeColor : null,
    colorCandidates,
    logoCandidates: [...logos].slice(0, 5),
    structuredData: {
      types: [...new Set(ld.flatMap(typeOf))].slice(0, 15),
      name: clean(org?.name as string | undefined, 160),
      description: clean(org?.description as string | undefined, 1000),
      telephone: clean(org?.telephone as string | undefined, 40),
      address: clean(address, 300),
      areaServed,
      sameAs,
    },
    textExcerpt: text.slice(0, 8000),
    wordCount: text ? text.split(" ").length : 0,
  };
}
