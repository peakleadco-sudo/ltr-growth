import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/feedback";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/workspace";
import { AccountForm, DangerZone, PasswordForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ws = await requireWorkspace();
  const usesPassword = ws.user.app_metadata?.providers?.includes?.("email") ?? ws.user.app_metadata?.provider === "email";
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your account, privacy and business profiles." />
      <div className="space-y-4">
        <Card>
          <CardHeader><div><CardTitle>Account</CardTitle><CardDescription>{ws.profile.email}</CardDescription></div></CardHeader>
          <CardBody><AccountForm fullName={ws.profile.full_name ?? ""} marketingConsent={ws.profile.marketing_consent} /></CardBody>
        </Card>
        {usesPassword && (
          <Card>
            <CardHeader><CardTitle>Password</CardTitle></CardHeader>
            <CardBody><PasswordForm /></CardBody>
          </Card>
        )}
        <Card>
          <CardHeader>
            <div><CardTitle>Business profiles</CardTitle><CardDescription>{ws.businessProfiles.length} of {ws.effectivePlan.max_business_profiles} on your {ws.effectivePlan.name} plan</CardDescription></div>
            {ws.businessProfiles.length < ws.effectivePlan.max_business_profiles ? (
              <Button asChild size="sm" variant="secondary"><Link href="/onboarding?new=1">Add profile</Link></Button>
            ) : (
              <Button asChild size="sm" variant="ghost"><Link href="/app/subscription">Need more?</Link></Button>
            )}
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {ws.businessProfiles.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.name}{b.id === ws.activeBusiness?.id && <span className="ml-2 text-[11px] text-accent">Active</span>}</p>
                    <p className="truncate text-[12px] text-subtle">{b.website_url ?? "No website"} · {b.industry ?? "No industry"}</p>
                  </div>
                  {b.id === ws.activeBusiness?.id && <Button asChild size="sm" variant="ghost"><Link href="/app/settings/business">Edit</Link></Button>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Your data</CardTitle><CardDescription>Download everything in your workspace as JSON.</CardDescription></div></CardHeader>
          <CardBody><Button asChild variant="secondary" size="sm"><a href="/api/account/export">Export my data</a></Button></CardBody>
        </Card>
        <DangerZone />
      </div>
    </div>
  );
}
