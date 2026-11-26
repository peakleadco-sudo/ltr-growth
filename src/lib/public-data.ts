import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";
import type { Plan } from "@/lib/types";

/**
 * Read-only access to public catalogue data (plans, published site content)
 * using the anon key. Results can be statically cached.
 */
function anon() {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Mirrors the default rows in supabase/migrations/..._security.sql. Used only
 * when the database is not configured yet (e.g. a fresh local checkout), so
 * the public site still renders. Once Supabase is connected, the database —
 * editable from the admin dashboard — is the source of truth.
 */
export const FALLBACK_PLANS: Plan[] = [
  { id: "free", name: "Free", description: "Explore LTR Growth and get a baseline for your marketing.", price_cents: 0, currency: "usd", interval: "month", stripe_price_id: null, max_business_profiles: 1, monthly_text_credits: 5, monthly_image_credits: 0, monthly_audits: 1, is_public: true, is_active: true, sort_order: 0,
    marketing_bullets: ["One business profile", "One limited website audit per month", "Basic marketing readiness report", "Five AI text generations per month", "Basic marketing calculators", "Limited access to LTR AI"] },
  { id: "starter", name: "Starter", description: "Core AI marketing tools for a single business.", price_cents: 2900, currency: "usd", interval: "month", stripe_price_id: null, max_business_profiles: 1, monthly_text_credits: 150, monthly_image_credits: 0, monthly_audits: 1, is_public: true, is_active: true, sort_order: 1,
    marketing_bullets: ["One business profile", "AI advertising copy generator", "Social media content generator", "Marketing strategy generator", "Email marketing generator", "Website copywriter", "Brand kit", "Monthly website audit", "150 AI text generation credits per month"] },
  { id: "growth", name: "Growth", description: "Advanced audits, competitor intelligence and campaign management.", price_cents: 5900, currency: "usd", interval: "month", stripe_price_id: null, max_business_profiles: 3, monthly_text_credits: 500, monthly_image_credits: 30, monthly_audits: 5, is_public: true, is_active: true, sort_order: 2,
    marketing_bullets: ["Everything in Starter", "Up to three business profiles", "Advanced website and SEO audits", "Competitor intelligence", "Local business marketing tools", "AI image generation", "Campaign management", "Marketing performance dashboard", "Branded PDF reports", "500 AI text generation credits per month", "30 standard image generation credits per month"] },
  { id: "pro", name: "Pro", description: "For multi-brand operators who need more capacity and reporting.", price_cents: 9900, currency: "usd", interval: "month", stripe_price_id: null, max_business_profiles: 5, monthly_text_credits: 1000, monthly_image_credits: 60, monthly_audits: 15, is_public: true, is_active: true, sort_order: 3,
    marketing_bullets: ["Everything in Growth", "Up to five business profiles", "Advanced competitor reports", "Additional reporting capabilities", "Priority support", "1,000 AI text generation credits per month", "60 standard image generation credits per month"] },
];

export async function getPublicPlans(): Promise<{ plans: Plan[]; fromDatabase: boolean }> {
  if (!isSupabaseConfigured) return { plans: FALLBACK_PLANS, fromDatabase: false };
  const { data, error } = await anon()
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .eq("is_public", true)
    .order("sort_order");
  if (error || !data?.length) return { plans: FALLBACK_PLANS, fromDatabase: false };
  return { plans: data as Plan[], fromDatabase: true };
}

export type SiteContent = {
  id: string;
  content_type: "faq" | "case_study" | "client_logo" | "testimonial" | "agency_cta" | "announcement";
  slug: string | null;
  title: string;
  body: Record<string, unknown>;
  is_verified: boolean;
  sort_order: number;
};

export const FALLBACK_FAQS: { q: string; a: string }[] = [
  { q: "What is LTR Growth?", a: "LTR Growth is an AI marketing platform built by LTRMarketing. It brings ad creation, content planning, website and SEO audits, competitor research, marketing strategy and campaign tracking into one dashboard that is personalized to your business." },
  { q: "Do I need marketing experience to use it?", a: "No. You describe your business once during onboarding and every tool uses that context. Each recommendation explains what to do and why, so you can act on it yourself or hand it to your team." },
  { q: "Does LTR Growth publish ads or posts for me?", a: "Not in the initial release. You generate, edit and export content, then publish it on your own accounts. LTR Growth never claims something was published or scheduled unless a connected, authorized integration confirms it." },
  { q: "Where do audit results come from?", a: "Audits are based on data retrieved from your website and verified sources such as Google PageSpeed Insights. Any check that could not be completed is marked as unverified rather than guessed." },
  { q: "Can you guarantee results?", a: "No. Nobody can honestly guarantee advertising or revenue outcomes. LTR Growth gives you better-informed recommendations and faster execution; results depend on your market, offer and budget." },
  { q: "What are credits?", a: "Each AI generation uses credits from your monthly allowance. Calculators never use credits. Allowances reset each billing period, and additional credits can be purchased on paid plans." },
  { q: "Can I cancel anytime?", a: "Yes. Paid plans are billed monthly through Stripe and can be cancelled from the billing portal. You keep access until the end of the period you paid for." },
  { q: "Can the LTRMarketing team do the work for me?", a: "Yes. If you would rather have experts handle advertising, SEO, web design or content, you can request a free consultation with LTRMarketing from inside the platform." },
];

export async function getSiteContent(type: SiteContent["content_type"]): Promise<SiteContent[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await anon()
    .from("site_content")
    .select("id, content_type, slug, title, body, is_verified, sort_order")
    .eq("content_type", type)
    .eq("is_published", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as SiteContent[];
}

export async function getFaqs(): Promise<{ q: string; a: string }[]> {
  const rows = await getSiteContent("faq");
  if (!rows.length) return FALLBACK_FAQS;
  return rows.map((r) => ({ q: r.title, a: String((r.body as { answer?: string }).answer ?? "") }));
}
