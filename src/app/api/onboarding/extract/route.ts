import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/workspace";
import { fetchPage } from "@/lib/services/website/crawler";
import { extractWebsiteFacts } from "@/lib/services/website/extract";
import { SafeFetchError } from "@/lib/services/website/safe-fetch";
import { getTextProvider } from "@/lib/ai/openai";
import { AIProviderError } from "@/lib/ai/provider";
import { ONBOARDING_SCHEMA, ONBOARDING_SYSTEM, onboardingUserPrompt, type OnboardingSuggestions } from "@/lib/ai/prompts/onboarding";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin, jsonError, zodMessage } from "@/lib/api";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

export type Suggestion = {
  key: string;
  label: string;
  value: string | string[] | Record<string, string>;
  basis: "stated" | "inferred";
  source: "website" | "ai";
};

const LABELS: Record<string, string> = {
  name: "Business name",
  industry: "Industry",
  description: "Business description",
  location: "Location",
  service_areas: "Service areas",
  products_services: "Products or services",
  target_audience: "Target audience",
  brand_voice: "Brand voice",
  usps: "Unique selling points (as stated on your site)",
  social_links: "Social media links",
  brand_colors: "Brand colors",
  phone: "Phone number",
  email: "Contact email",
};

const bodySchema = z.object({ url: z.string().min(3).max(2048) });

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request blocked.");
  const user = await getSessionUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in.");

  if (!(await rateLimit(`extract:h:${user.id}`, 6, 3600)) || !(await rateLimit(`extract:d:${user.id}`, 20, 86400))) {
    return jsonError(429, "RATE_LIMITED", "You've analyzed several websites recently. Please try again later or fill in the details manually.");
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "VALIDATION", zodMessage(parsed.error));

  let page;
  try {
    page = await fetchPage(parsed.data.url);
  } catch (e) {
    if (e instanceof SafeFetchError) return jsonError(422, e.code, e.message);
    return jsonError(502, "FETCH_FAILED", "We couldn't retrieve that website.");
  }

  const facts = extractWebsiteFacts(page.html, page.url, page.finalUrl, page.fetchedAt);
  const suggestions: Suggestion[] = [];
  const push = (key: string, value: Suggestion["value"] | null | undefined, basis: Suggestion["basis"], source: Suggestion["source"]) => {
    if (value === null || value === undefined) return;
    if (typeof value === "string" && !value.trim()) return;
    if (Array.isArray(value) && value.length === 0) return;
    if (!Array.isArray(value) && typeof value === "object" && Object.keys(value).length === 0) return;
    const existing = suggestions.findIndex((s) => s.key === key);
    const s = { key, label: LABELS[key] ?? key, value, basis, source };
    if (existing >= 0) suggestions[existing] = s;
    else suggestions.push(s);
  };

  // Deterministic facts read directly from the page.
  push("name", facts.structuredData.name ?? facts.siteName, "stated", "website");
  push("description", facts.structuredData.description ?? facts.metaDescription ?? facts.ogDescription, "stated", "website");
  push("location", facts.structuredData.address, "stated", "website");
  push("service_areas", facts.structuredData.areaServed, "stated", "website");
  push("social_links", facts.socialLinks, "stated", "website");
  push("brand_colors", [facts.themeColor, ...facts.colorCandidates].filter((c): c is string => Boolean(c)).filter((c, i, a) => a.indexOf(c) === i).slice(0, 5), "stated", "website");

  // AI-assisted suggestions (optional).
  const provider = getTextProvider();
  let ai: { configured: boolean; used: boolean; error?: string } = { configured: provider.isConfigured(), used: false };
  if (provider.isConfigured() && facts.wordCount > 20) {
    try {
      const result = await provider.generateJson<OnboardingSuggestions>({
        system: ONBOARDING_SYSTEM,
        user: onboardingUserPrompt(facts),
        schemaName: "onboarding_suggestions",
        schema: ONBOARDING_SCHEMA as unknown as Record<string, unknown>,
        maxOutputTokens: 1200,
        temperature: 0.2,
      });
      const d = result.data;
      const keep = (key: string, f?: { value: string | null; basis: "stated" | "inferred" }) => {
        // Never let an AI guess overwrite a fact read directly from the site.
        const prior = suggestions.find((s) => s.key === key);
        if (prior?.source === "website" && f?.basis === "inferred") return;
        if (f?.value) push(key, f.value.slice(0, 2000), f.basis, "ai");
      };
      keep("name", d.business_name);
      keep("industry", d.industry);
      keep("description", d.description);
      keep("location", d.location);
      if (d.service_areas?.values?.length && !suggestions.find((s) => s.key === "service_areas")) push("service_areas", d.service_areas.values.slice(0, 20), d.service_areas.basis, "ai");
      keep("products_services", d.products_services);
      keep("target_audience", d.target_audience);
      keep("brand_voice", d.brand_voice);
      if (d.unique_selling_points?.values?.length) push("usps", d.unique_selling_points.values.slice(0, 8), "stated", "ai");
      ai = { configured: true, used: true };

      if (isServiceRoleConfigured()) {
        const admin = createAdminClient();
        const { data: prof } = await admin.from("profiles").select("active_organization_id").eq("id", user.id).maybeSingle();
        if (prof?.active_organization_id) {
          await admin.from("ai_generations").insert({
            organization_id: prof.active_organization_id,
            user_id: user.id,
            tool: "onboarding_extraction",
            input: { url: facts.finalUrl },
            output: d,
            status: "succeeded",
            provider: result.provider,
            model: result.model,
            input_tokens: result.inputTokens,
            output_tokens: result.outputTokens,
            credits_charged: 0, // onboarding assistance is free and rate limited
            completed_at: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      ai = { configured: true, used: false, error: e instanceof AIProviderError ? e.message : "AI suggestions are unavailable right now." };
    }
  }

  return NextResponse.json({
    ok: true,
    source: { url: facts.finalUrl, retrievedAt: facts.fetchedAt, via: page.source },
    facts: {
      title: facts.title,
      metaDescription: facts.metaDescription,
      h1: facts.h1,
      logoCandidates: facts.logoCandidates,
      structuredDataTypes: facts.structuredData.types,
      wordCount: facts.wordCount,
      hasMetaDescription: Boolean(facts.metaDescription),
      hasStructuredData: facts.structuredData.types.length > 0,
      phones: facts.phones,
      emails: facts.emails,
    },
    suggestions,
    ai,
  });
}
