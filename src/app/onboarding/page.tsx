import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { Notice } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { signedUrl } from "@/lib/storage";
import { normalizeWebsiteUrl } from "@/lib/url";
import { getTextProvider } from "@/lib/ai/openai";
import type { BrandKit, BusinessProfile } from "@/lib/types";
import { OnboardingWizard } from "./wizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Set up your business", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ws = await requireWorkspace({ allowWithoutBusiness: true });
  const isNew = sp.new === "1";
  const supabase = await createClient();

  let existing: BusinessProfile | null = null;
  let kit: BrandKit | null = null;
  if (!isNew) {
    const incomplete = ws.businessProfiles.find((b) => !b.onboarding_completed_at);
    if (!incomplete && ws.businessProfiles.length > 0) redirect("/app");
    if (incomplete) {
      const { data } = await supabase.from("business_profiles").select("*").eq("id", incomplete.id).maybeSingle<BusinessProfile>();
      existing = data;
      const { data: k } = await supabase.from("brand_kits").select("*").eq("business_profile_id", incomplete.id).maybeSingle<BrandKit>();
      kit = k;
    }
  }

  const atLimit = isNew && ws.businessProfiles.length >= ws.effectivePlan.max_business_profiles;
  let logoUrl: string | null = null;
  if (kit?.logo_asset_id && isServiceRoleConfigured()) {
    const { data: asset } = await supabase.from("brand_assets").select("storage_path").eq("id", kit.logo_asset_id).maybeSingle();
    if (asset) logoUrl = await signedUrl(asset.storage_path);
  }
  const website = sp.website ? normalizeWebsiteUrl(sp.website) : null;
  const plan = ["starter", "growth", "pro"].includes(sp.plan ?? "") ? sp.plan : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo href={ws.businessProfiles.length ? "/app" : "/"} />
          {ws.businessProfiles.some((b) => b.onboarding_completed_at) && <Link href="/app" className="text-sm text-muted hover:text-fg">Back to dashboard</Link>}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {atLimit ? (
          <Notice tone="warning" title="You've reached your plan's business profile limit"
            action={<Button asChild size="sm"><Link href="/app/subscription">View plans</Link></Button>}>
            Your {ws.effectivePlan.name} plan includes {ws.effectivePlan.max_business_profiles} business profile{ws.effectivePlan.max_business_profiles === 1 ? "" : "s"}. Upgrade to add more.
          </Notice>
        ) : (
          <OnboardingWizard
            firstName={(ws.profile.full_name || "").split(" ")[0] || null}
            existing={existing}
            existingKit={kit}
            logoUrl={logoUrl}
            initialWebsite={existing?.website_url ?? (website?.ok ? website.url : "")}
            aiConfigured={getTextProvider().isConfigured()}
            uploadsConfigured={isServiceRoleConfigured()}
            redirectTo={plan ? `/app/subscription?plan=${plan}` : "/app"}
          />
        )}
      </main>
    </div>
  );
}
