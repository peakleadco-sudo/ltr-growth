export type PlanId = "free" | "starter" | "growth" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  stripe_price_id: string | null;
  max_business_profiles: number;
  monthly_text_credits: number;
  monthly_image_credits: number;
  monthly_audits: number;
  marketing_bullets: string[];
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  platform_role: "user" | "admin";
  marketing_consent: boolean;
  active_organization_id: string | null;
  active_business_profile_id: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
};

export type Organization = { id: string; name: string; is_demo: boolean; created_at: string };

export type Subscription = {
  id: string;
  organization_id: string;
  plan_id: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "paused";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
};

export type UsagePeriod = {
  id: string;
  period_start: string;
  period_end: string;
  text_credits_granted: number;
  text_credits_used: number;
  image_credits_granted: number;
  image_credits_used: number;
  audits_granted: number;
  audits_used: number;
  bonus_text_credits: number;
  bonus_image_credits: number;
};

export type Competitor = { name: string; url?: string | null };

export type BusinessProfile = {
  id: string;
  organization_id: string;
  name: string;
  website_url: string | null;
  industry: string | null;
  description: string | null;
  location: string | null;
  service_areas: string[];
  products_services: string | null;
  target_audience: string | null;
  average_customer_value: number | null;
  monthly_marketing_budget: number | null;
  competitors: Competitor[];
  marketing_channels: string[];
  goals: string[];
  social_links: Record<string, string>;
  website_extraction: unknown;
  website_extraction_approved_at: string | null;
  onboarding_step: string | null;
  onboarding_completed_at: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type BrandColor = { name: string; hex: string };
export type BrandFont = { role: string; family: string };
export type CustomerProfile = { name: string; description: string };

export type BrandKit = {
  id: string;
  organization_id: string;
  business_profile_id: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  brand_voice: string | null;
  voice_traits: string[];
  mission: string | null;
  tagline: string | null;
  unique_selling_propositions: string[];
  approved_claims: string[];
  preferred_terms: string[];
  restricted_terms: string[];
  customer_profiles: CustomerProfile[];
  logo_asset_id: string | null;
  is_demo: boolean;
  updated_at: string;
};

export type BrandAsset = {
  id: string;
  organization_id: string;
  business_profile_id: string | null;
  kind: "logo" | "product_photo" | "brand_imagery" | "document" | "generated" | "other";
  title: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  tags: string[];
  is_demo: boolean;
  created_at: string;
};

export type MarketingTask = {
  id: string;
  organization_id: string;
  business_profile_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done" | "skipped";
  due_date: string | null;
  week_number?: number | null;
  strategy_id?: string | null;
  source: "manual" | "strategy" | "audit" | "onboarding" | "campaign";
  completed_at: string | null;
  is_demo: boolean;
  created_at: string;
};

export type Notification = {
  id: string;
  kind: "info" | "success" | "warning" | "error" | "billing";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};
