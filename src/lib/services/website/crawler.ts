import "server-only";
import dns from "node:dns/promises";
import { safeFetchText, SafeFetchError, isBlockedIp } from "./safe-fetch";
import { normalizeWebsiteUrl } from "@/lib/url";

export type CrawledPage = { url: string; finalUrl: string; html: string; fetchedAt: string; source: "direct" | "firecrawl"; status: number; headers: Record<string, string> };

/** Provider-agnostic page retrieval. Firecrawl is used when configured, with the built-in fetcher as fallback. */
export async function fetchPage(url: string): Promise<CrawledPage> {
  const norm = normalizeWebsiteUrl(url);
  if (!norm.ok) throw new SafeFetchError("INVALID_URL", norm.error);

  if (process.env.FIRECRAWL_API_KEY) {
    // Validate the target resolves publicly before asking a third party to fetch it.
    const addrs = await dns.lookup(new URL(norm.url).hostname, { all: true }).catch(() => []);
    if (!addrs.length || addrs.some((a) => isBlockedIp(a.address))) {
      throw new SafeFetchError("BLOCKED_ADDRESS", "That address can't be scanned.");
    }
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ url: norm.url, formats: ["rawHtml"], onlyMainContent: false, timeout: 20000 }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const json = (await res.json()) as { success?: boolean; data?: { rawHtml?: string; html?: string; metadata?: { sourceURL?: string; url?: string; statusCode?: number } } };
        const html = json.data?.rawHtml ?? json.data?.html;
        if (json.success && html) {
          return {
            url: norm.url,
            finalUrl: json.data?.metadata?.url ?? json.data?.metadata?.sourceURL ?? norm.url,
            html: html.slice(0, 3_000_000),
            fetchedAt: new Date().toISOString(),
            source: "firecrawl",
            status: json.data?.metadata?.statusCode ?? 200,
            headers: {},
          };
        }
      }
    } catch {
      // fall through to direct fetch
    }
  }

  const r = await safeFetchText(norm.url);
  return { url: r.url, finalUrl: r.finalUrl, html: r.body, fetchedAt: r.fetchedAt, source: "direct", status: r.status, headers: r.headers };
}
