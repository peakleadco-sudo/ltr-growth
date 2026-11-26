import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { FeatureKey } from "@/lib/features";
import type {
  BrandKit,
  BusinessProfile,
  Organization,
  Plan,
  Profile,
  Subscription,
  UsagePeriod,
} from "@/lib/types";

export type Workspace = {
  user: User;
  profile: Profile;
  organization: Organization;
  memberRole: "owner" | "admin" | "member";
  subscription: Subscription;
  plan: Plan;
  /** Plan whose allowances apply right now (falls back to Free when billing is not in good standing). */
  effectivePlan: Plan;
  entitlements: Set<FeatureKey>;
  usage: UsagePeriod | null;
  wallet: { text_balance: number; image_balance: number };
  businessProfiles: Pick<BusinessProfile, "id" | "name" | "website_url" | "industry" | "is_demo" | "onboarding_completed_at">[];
  activeBusiness: BusinessProfile | null;
  brandKit: BrandKit | null;
};

export const getSessionUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
});

const GOOD_STANDING = new Set(["active", "trialing"]);

/**
 * Loads everything the app shell needs for the signed-in user. All reads use
 * the user's own session, so RLS guarantees tenant isolation.
 */
export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  if (!profile) return null;

  // Resolve the active organization (fall back to the first membership).
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, is_demo, created_at)")
    .eq("user_id", user.id);
  if (!memberships || memberships.length === 0) return null;
  const membership =
    memberships.find((m) => m.organization_id === profile.active_organization_id) ?? memberships[0]!;
  const organization = membership.organizations as unknown as Organization;
  const orgId = membership.organization_id as string;

  const [{ data: subscription }, { data: bps }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("organization_id", orgId).maybeSingle<Subscription>(),
    supabase
      .from("business_profiles")
      .select("id, name, website_url, industry, is_demo, onboarding_completed_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
  ]);
  if (!subscription) return null;

  const goodStanding = GOOD_STANDING.has(subscription.status);
  const effectivePlanId = goodStanding ? subscription.plan_id : "free";

  const [{ data: plans }, { data: ents }] = await Promise.all([
    supabase.from("plans").select("*").in("id", Array.from(new Set([subscription.plan_id, "free"]))),
    supabase.from("subscription_entitlements").select("feature_key, enabled").eq("plan_id", effectivePlanId),
  ]);
  const plan = (plans ?? []).find((p) => p.id === subscription.plan_id) as Plan;
  const effectivePlan = ((plans ?? []).find((p) => p.id === effectivePlanId) as Plan) ?? plan;
  const entitlements = new Set<FeatureKey>(
    (ents ?? []).filter((e) => e.enabled).map((e) => e.feature_key as FeatureKey),
  );

  const usage = await getCurrentUsage(orgId);
  const { data: wallet } = await supabase
    .from("credit_wallets")
    .select("text_balance, image_balance")
    .eq("organization_id", orgId)
    .maybeSingle();

  const businessProfiles = bps ?? [];
  const activeId =
    businessProfiles.find((b) => b.id === profile.active_business_profile_id)?.id ?? businessProfiles[0]?.id;

  let activeBusiness: BusinessProfile | null = null;
  let brandKit: BrandKit | null = null;
  if (activeId) {
    const [{ data: bp }, { data: kit }] = await Promise.all([
      supabase.from("business_profiles").select("*").eq("id", activeId).maybeSingle<BusinessProfile>(),
      supabase.from("brand_kits").select("*").eq("business_profile_id", activeId).maybeSingle<BrandKit>(),
    ]);
    activeBusiness = bp ?? null;
    brandKit = kit ?? null;
  }

  return {
    user,
    profile,
    organization,
    memberRole: membership.role as Workspace["memberRole"],
    subscription,
    plan,
    effectivePlan,
    entitlements,
    usage,
    wallet: wallet ?? { text_balance: 0, image_balance: 0 },
    businessProfiles,
    activeBusiness,
    brandKit,
  };
});

/** Returns the current usage period, creating it (server-side) at a period rollover. */
async function getCurrentUsage(orgId: string): Promise<UsagePeriod | null> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("usage_credits")
    .select("*")
    .eq("organization_id", orgId)
    .lte("period_start", nowIso)
    .gt("period_end", nowIso)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle<UsagePeriod>();
  if (data) return data;
  if (!isServiceRoleConfigured()) return null;
  // Monthly reset: start the new period with the plan's allowance.
  const { data: created } = await createAdminClient().rpc("ensure_usage_period", { org: orgId });
  return (created as UsagePeriod) ?? null;
}

/** For pages/actions that require a signed-in user with a workspace. */
export async function requireWorkspace(opts: { allowWithoutBusiness?: boolean } = {}): Promise<Workspace> {
  const ws = await getWorkspace();
  if (!ws) redirect("/login");
  if (!opts.allowWithoutBusiness && ws.businessProfiles.length === 0) redirect("/onboarding");
  return ws;
}

export function hasFeature(ws: Workspace, feature: FeatureKey) {
  return ws.entitlements.has(feature);
}

export function creditSummary(ws: Workspace) {
  const u = ws.usage;
  const textTotal = (u?.text_credits_granted ?? 0) + (u?.bonus_text_credits ?? 0);
  const imageTotal = (u?.image_credits_granted ?? 0) + (u?.bonus_image_credits ?? 0);
  return {
    textUsed: u?.text_credits_used ?? 0,
    textTotal,
    textRemaining: Math.max(textTotal - (u?.text_credits_used ?? 0), 0) + ws.wallet.text_balance,
    imageUsed: u?.image_credits_used ?? 0,
    imageTotal,
    imageRemaining: Math.max(imageTotal - (u?.image_credits_used ?? 0), 0) + ws.wallet.image_balance,
    auditsUsed: u?.audits_used ?? 0,
    auditsTotal: u?.audits_granted ?? 0,
    purchasedText: ws.wallet.text_balance,
    purchasedImage: ws.wallet.image_balance,
    periodEnd: u?.period_end ?? null,
  };
}
