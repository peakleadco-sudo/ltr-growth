import type { PlanId } from "@/lib/types";

/**
 * Feature registry. Plan access is read from `subscription_entitlements` in the
 * database (admin-configurable); `minPlan` is only used for upgrade messaging.
 * `release` marks which build phase delivers the tool, so unreleased tools are
 * clearly labelled instead of showing non-functional controls.
 */
export type FeatureKey =
  | "assistant"
  | "calculators"
  | "website_audit"
  | "readiness_report"
  | "brand_kit_basic"
  | "brand_kit"
  | "ad_studio"
  | "social_studio"
  | "strategy"
  | "email_sms"
  | "website_copy"
  | "content_calendar"
  | "advanced_audit"
  | "competitor_intel"
  | "local_marketing"
  | "image_generation"
  | "campaigns"
  | "performance"
  | "pdf_reports"
  | "advanced_competitor"
  | "advanced_reporting"
  | "priority_support";

export const PLAN_ORDER: PlanId[] = ["free", "starter", "growth", "pro"];

export type ToolStatus = "available" | "upcoming";

export type NavItem = {
  label: string;
  href: string;
  icon: string; // lucide icon name, resolved in the sidebar
  feature?: FeatureKey;
  minPlan?: PlanId;
  status: ToolStatus;
  release?: string;
  description?: string;
};

export type NavSection = { id: string; label: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/app", icon: "LayoutDashboard", status: "available" },
      { label: "LTR AI", href: "/app/assistant", icon: "Sparkles", feature: "assistant", status: "available", description: "A marketing assistant that knows your business profile, brand kit and history." },
      { label: "Marketing Tasks", href: "/app/tasks", icon: "ListChecks", status: "available" },
    ],
  },
  {
    id: "create",
    label: "Create",
    items: [
      { label: "Ad Studio", href: "/app/ads", icon: "Megaphone", feature: "ad_studio", minPlan: "starter", status: "available", description: "Ad copy, hooks, scripts, audiences and campaign structures for Meta, Google, TikTok, Instagram, YouTube and LinkedIn." },
      { label: "Creative Studio", href: "/app/creative", icon: "Image", feature: "image_generation", minPlan: "growth", status: "upcoming", release: "Phase 6", description: "Branded static ads and social graphics with accurate text overlays in 1:1, 4:5, 9:16 and 16:9." },
      { label: "Social Media Studio", href: "/app/social", icon: "MessageSquareText", feature: "social_studio", minPlan: "starter", status: "available", description: "Captions, carousels, reel scripts and 7, 14 or 30-day content strategies." },
      { label: "Email & SMS", href: "/app/email", icon: "Mail", feature: "email_sms", minPlan: "starter", status: "available", description: "Sequences, promotions, follow-ups and SMS templates with subject line and A/B variations." },
      { label: "Website Copywriter", href: "/app/copywriter", icon: "PenLine", feature: "website_copy", minPlan: "starter", status: "available", description: "Conversion-focused home, service, landing and location pages ready to paste into your site builder." },
    ],
  },
  {
    id: "analyze",
    label: "Analyze",
    items: [
      { label: "Website Audit", href: "/app/audit", icon: "Gauge", feature: "website_audit", status: "upcoming", release: "Phase 3", description: "Performance, technical SEO and conversion checks based on real retrieved website data." },
      { label: "SEO Tools", href: "/app/seo", icon: "Search", feature: "advanced_audit", minPlan: "growth", status: "upcoming", release: "Phase 3", description: "Technical SEO checks, metadata, structured data, sitemap and robots.txt analysis." },
      { label: "Competitor Intelligence", href: "/app/competitors", icon: "Swords", feature: "competitor_intel", minPlan: "growth", status: "upcoming", release: "Phase 3", description: "Side-by-side comparisons of public competitor positioning, offers and messaging with cited sources." },
      { label: "Local Marketing", href: "/app/local", icon: "MapPin", feature: "local_marketing", minPlan: "growth", status: "upcoming", release: "Phase 3", description: "Google Business Profile recommendations, local content and review responses." },
      { label: "Marketing Calculators", href: "/app/calculators", icon: "Calculator", feature: "calculators", status: "upcoming", release: "Phase 3", description: "ROAS, ROI, CPL, CPA, LTV, break-even and budget calculators with scenario comparison." },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    items: [
      { label: "Marketing Strategy", href: "/app/strategy", icon: "Target", feature: "strategy", minPlan: "starter", status: "available", description: "30, 60 and 90-day plans that turn into tasks on your dashboard." },
      { label: "Campaigns", href: "/app/campaigns", icon: "Flag", feature: "campaigns", minPlan: "growth", status: "upcoming", release: "Phase 6", description: "Plan campaigns, attach creative, track budgets and record results." },
      { label: "Content Calendar", href: "/app/calendar", icon: "CalendarDays", feature: "content_calendar", minPlan: "starter", status: "upcoming", release: "Phase 6", description: "Drag-and-drop planning with draft, approved, scheduled and published status." },
      { label: "Performance", href: "/app/performance", icon: "LineChart", feature: "performance", minPlan: "growth", status: "upcoming", release: "Phase 6", description: "Import or enter your real marketing results and get summaries and charts." },
      { label: "Brand Kit", href: "/app/brand-kit", icon: "Palette", feature: "brand_kit_basic", status: "available" },
      { label: "Saved Assets", href: "/app/assets", icon: "FolderOpen", status: "available" },
      { label: "AI History", href: "/app/history", icon: "History", status: "available" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { label: "Subscription", href: "/app/subscription", icon: "CreditCard", status: "available" },
      { label: "Settings", href: "/app/settings", icon: "Settings", status: "available" },
      { label: "Help & Support", href: "/app/help", icon: "LifeBuoy", status: "available" },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((s) => s.items);

export function findNavItem(href: string) {
  return ALL_NAV_ITEMS.find((i) => i.href === href);
}

export function planRank(plan: PlanId) {
  return PLAN_ORDER.indexOf(plan);
}
