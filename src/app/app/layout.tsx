import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/server";
import { creditSummary, requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | LTR Growth" },
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("user_id", ws.user.id)
    .order("created_at", { ascending: false })
    .limit(15);
  const credits = creditSummary(ws);

  return (
    <AppShell
      entitlements={Array.from(ws.entitlements)}
      isAdmin={ws.profile.platform_role === "admin"}
      topbar={{
        user: { name: ws.profile.full_name, email: ws.profile.email },
        businesses: ws.businessProfiles.map((b) => ({ id: b.id, name: b.name, is_demo: b.is_demo })),
        activeBusinessId: ws.activeBusiness?.id ?? null,
        canAddBusiness: ws.businessProfiles.length < ws.effectivePlan.max_business_profiles,
        credits: { remaining: credits.textRemaining, total: credits.textTotal },
        planName: ws.plan.name,
        notifications: notifications ?? [],
      }}
    >
      {children}
    </AppShell>
  );
}
