import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "./signup-form";
import { publicEnv } from "@/lib/env";
import { normalizeWebsiteUrl } from "@/lib/url";

export const metadata: Metadata = { title: "Create your free account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const website = sp.website ? normalizeWebsiteUrl(sp.website) : null;
  const plan = ["starter", "growth", "pro"].includes(sp.plan ?? "") ? sp.plan : undefined;
  const params = new URLSearchParams();
  if (website?.ok) params.set("website", website.url);
  if (plan) params.set("plan", plan);
  const next = `/onboarding${params.size ? `?${params.toString()}` : ""}`;
  return (
    <AuthCard
      title="Create your free account"
      description={website?.ok ? <>We&apos;ll analyze <span className="text-fg">{new URL(website.url).hostname}</span> during setup.</> : "Get your marketing readiness score and start growing."}
      footer={<>Already have an account? <Link href="/login" className="text-fg hover:underline">Log in</Link></>}
    >
      <SignupForm next={next} googleEnabled={publicEnv.googleAuthEnabled} />
    </AuthCard>
  );
}
