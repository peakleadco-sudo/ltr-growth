import type { BrandKit, BusinessProfile } from "@/lib/types";

/**
 * Transparent, deterministic marketing readiness score. Each criterion is a
 * verifiable fact about the workspace; nothing is estimated. Audit-based
 * criteria are counted only once a completed audit exists.
 */
export type ReadinessCriterion = { id: string; label: string; weight: number; met: boolean; action: string; href: string; category: "Profile" | "Brand" | "Website" | "Planning" };

export type ReadinessInput = {
  business: BusinessProfile;
  brandKit: BrandKit | null;
  hasLogo: boolean;
  latestAudit: { scores: Record<string, number | null> } | null;
  openTaskCount: number;
  hasStrategy: boolean;
};

export function computeReadiness(i: ReadinessInput) {
  const b = i.business;
  const k = i.brandKit;
  const criteria: ReadinessCriterion[] = [
    { id: "website", label: "Website added to your profile", weight: 10, met: Boolean(b.website_url), action: "Add your website", href: "/app/settings/business", category: "Profile" },
    { id: "description", label: "Business description written", weight: 8, met: Boolean(b.description && b.description.length >= 40), action: "Describe your business", href: "/app/settings/business", category: "Profile" },
    { id: "offer", label: "Products or services listed", weight: 8, met: Boolean(b.products_services), action: "List your products or services", href: "/app/settings/business", category: "Profile" },
    { id: "audience", label: "Target audience defined", weight: 10, met: Boolean(b.target_audience && b.target_audience.length >= 20), action: "Define your target audience", href: "/app/settings/business", category: "Profile" },
    { id: "goals", label: "Business goals selected", weight: 6, met: b.goals.length > 0, action: "Choose your goals", href: "/app/settings/business", category: "Planning" },
    { id: "budget", label: "Monthly marketing budget set", weight: 5, met: b.monthly_marketing_budget !== null, action: "Set a marketing budget", href: "/app/settings/business", category: "Planning" },
    { id: "competitors", label: "Competitors identified", weight: 5, met: b.competitors.length > 0, action: "Add competitors", href: "/app/settings/business", category: "Planning" },
    { id: "location", label: "Location or service areas set", weight: 4, met: Boolean(b.location || b.service_areas.length), action: "Add your location", href: "/app/settings/business", category: "Profile" },
    { id: "logo", label: "Logo uploaded", weight: 6, met: i.hasLogo, action: "Upload your logo", href: "/app/brand-kit", category: "Brand" },
    { id: "colors", label: "Brand colors saved", weight: 4, met: (k?.colors.length ?? 0) > 0, action: "Add brand colors", href: "/app/brand-kit", category: "Brand" },
    { id: "voice", label: "Brand voice defined", weight: 6, met: Boolean(k?.brand_voice || (k?.voice_traits.length ?? 0) > 0), action: "Define your brand voice", href: "/app/brand-kit", category: "Brand" },
    { id: "usp", label: "Unique selling points recorded", weight: 6, met: (k?.unique_selling_propositions.length ?? 0) > 0, action: "Add what makes you different", href: "/app/brand-kit", category: "Brand" },
    { id: "social", label: "Social profiles linked", weight: 4, met: Object.keys(b.social_links ?? {}).length > 0, action: "Link your social profiles", href: "/app/settings/business", category: "Profile" },
    { id: "audit", label: "Website audit completed", weight: 10, met: Boolean(i.latestAudit), action: "Run a website audit", href: "/app/audit", category: "Website" },
    { id: "strategy", label: "Marketing strategy in place", weight: 8, met: i.hasStrategy, action: "Create a marketing strategy", href: "/app/strategy", category: "Planning" },
  ];
  const total = criteria.reduce((s, c) => s + c.weight, 0);
  const earned = criteria.filter((c) => c.met).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earned / total) * 100);
  const gaps = criteria.filter((c) => !c.met).sort((a, b) => b.weight - a.weight);
  return { score, criteria, gaps, earned, total };
}

export function readinessLabel(score: number) {
  if (score >= 80) return "Strong foundation";
  if (score >= 55) return "Good progress";
  if (score >= 30) return "Getting started";
  return "Just beginning";
}
