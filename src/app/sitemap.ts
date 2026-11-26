import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { SOLUTIONS } from "@/content/solutions";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.siteUrl;
  const now = new Date();
  const pages = ["", "/pricing", "/free-audit", "/agency", "/privacy", "/terms"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...SOLUTIONS.map((s) => ({ url: `${base}/solutions/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
