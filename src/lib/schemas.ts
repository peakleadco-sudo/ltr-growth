import { z } from "zod";

const optText = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const strList = (maxItems: number, maxLen = 120) => z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);
const money = z.union([z.number(), z.string(), z.null()]).optional().transform((v, ctx) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 1e10) {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
    return z.NEVER;
  }
  return Math.round(n * 100) / 100;
});
const url = z.string().trim().max(2048).optional().nullable().transform((v, ctx) => {
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    return u.toString();
  } catch {
    ctx.addIssue({ code: "custom", message: "Enter a valid URL" });
    return z.NEVER;
  }
});

export const SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "linkedin", "youtube", "x", "pinterest", "google_business", "yelp"] as const;

export const businessProfileSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(160),
  website_url: url,
  industry: optText(120),
  description: optText(4000),
  location: optText(200),
  service_areas: strList(30),
  products_services: optText(3000),
  target_audience: optText(2000),
  average_customer_value: money,
  monthly_marketing_budget: money,
  competitors: z.array(z.object({ name: z.string().trim().min(1).max(160), url: url })).max(10).default([]),
  marketing_channels: strList(20, 60),
  goals: strList(15, 160),
  social_links: z.partialRecord(z.enum(SOCIAL_KEYS), url).default({}).transform((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => Boolean(v))) as Record<string, string>),
});
export type BusinessProfileInput = z.input<typeof businessProfileSchema>;

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #FF2929");

export const brandKitSchema = z.object({
  colors: z.array(z.object({ name: z.string().trim().max(40).default(""), hex })).max(12).default([]),
  fonts: z.array(z.object({ role: z.string().trim().max(40), family: z.string().trim().min(1).max(80) })).max(6).default([]),
  brand_voice: optText(1500),
  voice_traits: strList(10, 40),
  mission: optText(1500),
  tagline: optText(200),
  unique_selling_propositions: strList(12, 300),
  approved_claims: strList(30, 300),
  preferred_terms: strList(50, 80),
  restricted_terms: strList(50, 80),
  customer_profiles: z.array(z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(1000) })).max(8).default([]),
});
export type BrandKitInput = z.input<typeof brandKitSchema>;

export const MARKETING_CHANNELS = [
  "Website", "Google Search Ads", "Meta Ads", "Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "X",
  "Email", "SMS", "Google Business Profile", "SEO", "Referrals", "Events", "Print", "Radio/TV", "Marketplaces",
];

export const BUSINESS_GOALS = [
  "Get more leads", "Increase online sales", "Book more appointments", "Grow brand awareness", "Improve local visibility",
  "Launch a new product or service", "Increase repeat customers", "Improve website conversions", "Rank higher on Google", "Grow social following",
];

export const VOICE_TRAITS = ["Professional", "Friendly", "Bold", "Warm", "Playful", "Authoritative", "Luxury", "Straightforward", "Inspiring", "Technical", "Empathetic", "Witty"];

export const INDUSTRIES = [
  "Home services", "Health & wellness", "Medical / dental", "Beauty & salon", "Restaurant & hospitality", "Retail", "E-commerce",
  "Professional services", "Legal", "Real estate", "Construction & trades", "Automotive", "Fitness", "Education", "Technology / SaaS",
  "Finance & insurance", "Nonprofit", "Agency", "Other",
];
