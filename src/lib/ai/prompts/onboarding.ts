import { HONESTY_RULES, UNTRUSTED_DATA_RULES, wrapUntrusted } from "./shared";
import type { WebsiteFacts } from "@/lib/services/website/extract";

const field = { type: "object", additionalProperties: false, required: ["value", "basis"], properties: { value: { type: ["string", "null"] }, basis: { type: "string", enum: ["stated", "inferred"] } } };
const listField = { type: "object", additionalProperties: false, required: ["values", "basis"], properties: { values: { type: "array", items: { type: "string" } }, basis: { type: "string", enum: ["stated", "inferred"] } } };

export const ONBOARDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["business_name", "industry", "description", "location", "service_areas", "products_services", "target_audience", "brand_voice", "unique_selling_points", "goals"],
  properties: {
    business_name: field,
    industry: field,
    description: field,
    location: field,
    service_areas: listField,
    products_services: field,
    target_audience: field,
    brand_voice: field,
    unique_selling_points: listField,
    goals: listField,
  },
} as const;

export type SuggestedField = { value: string | null; basis: "stated" | "inferred" };
export type SuggestedList = { values: string[]; basis: "stated" | "inferred" };
export type OnboardingSuggestions = {
  business_name: SuggestedField;
  industry: SuggestedField;
  description: SuggestedField;
  location: SuggestedField;
  service_areas: SuggestedList;
  products_services: SuggestedField;
  target_audience: SuggestedField;
  brand_voice: SuggestedField;
  unique_selling_points: SuggestedList;
  goals: SuggestedList;
};

export const ONBOARDING_SYSTEM = `
You help a small business owner fill in their marketing profile from their public website.
Read the website data and suggest concise answers for each field.

- "stated": the website explicitly says it (e.g. the services list, the city in the address).
- "inferred": a reasonable interpretation that the owner must confirm (e.g. likely target audience, tone of voice).
- If you cannot tell, return value null (or an empty list).
- Descriptions: 1–3 plain sentences in the business's own framing, no hype.
- products_services: a comma-separated list of the main offerings actually listed.
- unique_selling_points: only points the site actually claims (basis "stated"); do not create new claims.
- goals: leave empty unless the site states business goals; this is normally the owner's input.
- industry: a short label such as "Residential plumbing" or "Skincare e-commerce".

${HONESTY_RULES}

${UNTRUSTED_DATA_RULES}
`.trim();

export function onboardingUserPrompt(f: WebsiteFacts) {
  const facts = {
    url: f.finalUrl,
    title: f.title,
    meta_description: f.metaDescription,
    og_site_name: f.siteName,
    headings_h1: f.h1,
    headings_h2: f.h2,
    structured_data: f.structuredData,
    phones: f.phones,
  };
  return [
    "Suggest profile answers for this business website.",
    wrapUntrusted("website_metadata", JSON.stringify(facts, null, 2)),
    wrapUntrusted("website_text", f.textExcerpt.slice(0, 6000)),
  ].join("\n\n");
}
