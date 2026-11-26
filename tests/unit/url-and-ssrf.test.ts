import { describe, expect, it } from "vitest";
import { normalizeWebsiteUrl } from "@/lib/url";
import { guardedLookup, isBlockedIp, safeFetchText } from "@/lib/services/website/safe-fetch";
import { safeNextPath } from "@/lib/utils";

describe("normalizeWebsiteUrl", () => {
  it("adds https and strips the hash", () => {
    expect(normalizeWebsiteUrl("example.com/#x")).toEqual({ ok: true, url: "https://example.com/" });
  });
  it.each(["", "localhost", "http://localhost:3000", "127.0.0.1", "http://10.0.0.1", "ftp://example.com", "https://user:pw@example.com", "printer.local", "https://example.com:8443", "http://[::1]/"])(
    "rejects %s",
    (u) => expect(normalizeWebsiteUrl(u).ok).toBe(false),
  );
});

describe("isBlockedIp", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "224.0.0.1"])(
    "blocks %s",
    (ip) => expect(isBlockedIp(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"])("allows %s", (ip) => expect(isBlockedIp(ip)).toBe(false));
});

describe("guardedLookup (connect-time DNS check, defeats DNS rebinding)", () => {
  it("refuses hostnames that resolve to private addresses", async () => {
    const err = await new Promise<NodeJS.ErrnoException | null>((resolve) =>
      guardedLookup("localhost", { all: true }, (e) => resolve(e)),
    );
    expect(err?.code).toBe("EBLOCKED");
  });
  it("rejects invalid URLs before any network access", async () => {
    await expect(safeFetchText("http://localhost/")).rejects.toMatchObject({ code: "INVALID_URL" });
    await expect(safeFetchText("http://169.254.169.254/latest/meta-data")).rejects.toMatchObject({ code: "INVALID_URL" });
  });
});

describe("safeNextPath", () => {
  it("prevents open redirects", () => {
    expect(safeNextPath("https://evil.com")).toBe("/app");
    expect(safeNextPath("//evil.com")).toBe("/app");
    expect(safeNextPath("/\\evil.com")).toBe("/app");
    expect(safeNextPath("/onboarding?x=1")).toBe("/onboarding?x=1");
  });
});
