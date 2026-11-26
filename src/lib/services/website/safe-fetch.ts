import "server-only";
import dns from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { normalizeWebsiteUrl } from "@/lib/url";

/**
 * SSRF-hardened fetcher for user-supplied website URLs.
 *  - Only http/https on default ports, no credentials, public hostnames only.
 *  - Every DNS answer is checked at *connect time* (prevents DNS rebinding),
 *    and private, loopback, link-local, CGNAT, multicast and reserved ranges are refused.
 *  - Redirects are followed manually (max 5) and each hop is re-validated.
 *  - Response size and time are capped; only text-like content types are read.
 */

export class SafeFetchError extends Error {
  constructor(public code: "INVALID_URL" | "BLOCKED_ADDRESS" | "TIMEOUT" | "TOO_LARGE" | "BAD_STATUS" | "BAD_CONTENT_TYPE" | "NETWORK" | "TOO_MANY_REDIRECTS", message: string, public status?: number) {
    super(message);
  }
}

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]!);
    if (lower.startsWith("::ffff:")) return true; // hex-form mapped addresses
    const first = parseInt(lower.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (lower.startsWith("2001:db8")) return true; // documentation
    if (lower.startsWith("64:ff9b")) return true; // NAT64
    if (lower.startsWith("2002:")) return true; // 6to4 can embed private v4
    return false;
  }
  return true;
}

export const guardedLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = (addresses as unknown as dns.LookupAddress[]) ?? [];
    const safe = list.filter((a) => !isBlockedIp(a.address));
    if (!list.length || safe.length !== list.length) {
      const e = new Error("BLOCKED_ADDRESS") as NodeJS.ErrnoException;
      e.code = "EBLOCKED";
      return callback(e, "", 4);
    }
    if ((options as dns.LookupOptions).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, safe);
    callback(null, safe[0]!.address, safe[0]!.family);
  });
};

const agent = new Agent({
  connect: { lookup: guardedLookup, timeout: 8000 },
  headersTimeout: 10000,
  bodyTimeout: 10000,
});

export type SafeFetchResult = {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
  headers: Record<string, string>;
  fetchedAt: string;
  elapsedMs: number;
};

const USER_AGENT = "LTRGrowthBot/1.0 (+website analysis; respects robots.txt for crawling)";

export async function safeFetchText(
  inputUrl: string,
  opts: { maxBytes?: number; timeoutMs?: number; accept?: string; allowedTypes?: RegExp } = {},
): Promise<SafeFetchResult> {
  const maxBytes = opts.maxBytes ?? 2_000_000;
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const allowed = opts.allowedTypes ?? /^(text\/html|application\/xhtml\+xml|text\/plain|application\/xml|text\/xml)/i;
  const norm = normalizeWebsiteUrl(inputUrl);
  if (!norm.ok) throw new SafeFetchError("INVALID_URL", norm.error);

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let current = norm.url;
  try {
    for (let hop = 0; hop <= 5; hop++) {
      const check = normalizeWebsiteUrl(current);
      if (!check.ok) throw new SafeFetchError("INVALID_URL", "Redirected to an unsupported address.");
      let res;
      try {
        res = await undiciFetch(check.url, {
          dispatcher: agent,
          redirect: "manual",
          signal: controller.signal,
          headers: { "user-agent": USER_AGENT, accept: opts.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
        });
      } catch (e) {
        const err = e as { name?: string; cause?: { code?: string; message?: string } };
        if (err.name === "AbortError") throw new SafeFetchError("TIMEOUT", "The website took too long to respond.");
        if (err.cause?.code === "EBLOCKED" || err.cause?.message === "BLOCKED_ADDRESS") {
          throw new SafeFetchError("BLOCKED_ADDRESS", "That address points to a private or reserved network and can't be scanned.");
        }
        throw new SafeFetchError("NETWORK", "We couldn't reach that website. Check the address and try again.");
      }
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        await res.body?.cancel().catch(() => {});
        if (!loc) throw new SafeFetchError("BAD_STATUS", "The website returned an invalid redirect.", res.status);
        current = new URL(loc, check.url).toString();
        continue;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        throw new SafeFetchError("BAD_STATUS", `The website responded with status ${res.status}.`, res.status);
      }
      if (!allowed.test(contentType)) {
        await res.body?.cancel().catch(() => {});
        throw new SafeFetchError("BAD_CONTENT_TYPE", "That address didn't return a web page.");
      }
      const len = Number(res.headers.get("content-length") || 0);
      if (len > maxBytes) {
        await res.body?.cancel().catch(() => {});
        throw new SafeFetchError("TOO_LARGE", "That page is too large to analyze.");
      }
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
          break; // analyze what we have rather than failing
        }
        chunks.push(value);
      }
      const body = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      return { url: norm.url, finalUrl: check.url, status: res.status, contentType, body, headers, fetchedAt: new Date().toISOString(), elapsedMs: Date.now() - started };
    }
    throw new SafeFetchError("TOO_MANY_REDIRECTS", "The website redirected too many times.");
  } finally {
    clearTimeout(timer);
  }
}
