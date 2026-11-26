import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/feedback";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { getIntegrationStatuses } from "@/lib/env";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { formatNumber } from "@/lib/utils";

export default async function AdminHome() {
  const statuses = getIntegrationStatuses();
  let counts: { label: string; value: number | null }[] = [];
  if (isServiceRoleConfigured()) {
    const admin = createAdminClient();
    const [users, bps, consults, support] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("business_profiles").select("id", { count: "exact", head: true }).eq("is_demo", false),
      admin.from("consultation_requests").select("id", { count: "exact", head: true }),
      admin.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    counts = [
      { label: "Registered users", value: users.count ?? null },
      { label: "Business profiles (real)", value: bps.count ?? null },
      { label: "Consultation requests", value: consults.count ?? null },
      { label: "Open support requests", value: support.count ?? null },
    ];
  }
  return (
    <div>
      <PageHeader title="Administrator portal" description="Platform configuration and health." />
      <Notice tone="info" className="mb-6" title="Full admin tools arrive in the agency and analytics releases">Lead CRM, revenue analytics, plan management, prompt templates and content management are scheduled for Phases 5 and 6. Figures below come directly from the database.</Notice>
      {counts.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {counts.map((x) => (
            <Card key={x.label}><CardBody><p className="text-[12px] text-subtle">{x.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(x.value)}</p></CardBody></Card>
          ))}
        </div>
      )}
      <Card>
        <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
        <CardBody className="p-0">
          <ul className="divide-y divide-border">
            {statuses.map((s) => (
              <li key={s.key} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex w-56 items-center gap-2 text-sm font-medium">
                  {s.configured ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-subtle" />}
                  {s.name}
                </span>
                <span className="flex-1 text-[13px] text-muted">{s.purpose}</span>
                <span className="flex flex-wrap gap-1">{s.envVars.map((v) => <Badge key={v} className="font-mono">{v}</Badge>)}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
