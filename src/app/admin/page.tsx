import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/feedback";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { getIntegrationStatuses } from "@/lib/env";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { formatNumber } from "@/lib/utils";
import { TOOL_LABELS } from "@/lib/ai/tools";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export default async function AdminHome() {
  const statuses = getIntegrationStatuses();
  let counts: { label: string; value: number | null }[] = [];
  let ai: { tool: string; runs: number; failed: number; credits: number; tokensIn: number; tokensOut: number; cost: number }[] = [];
  let errors: { service: string; route: string | null; message: string | null; created_at: string }[] = [];
  if (isServiceRoleConfigured()) {
    const admin = createAdminClient();
    const [users, bps, consults, support] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("business_profiles").select("id", { count: "exact", head: true }).eq("is_demo", false),
      admin.from("consultation_requests").select("id", { count: "exact", head: true }),
      admin.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    const since = daysAgoIso(30);
    const [{ data: gens }, { data: errs }] = await Promise.all([
      admin.from("ai_generations").select("tool, status, credits_charged, input_tokens, output_tokens, estimated_cost_usd").gte("created_at", since).limit(20000),
      admin.from("api_error_logs").select("service, route, message, created_at").order("created_at", { ascending: false }).limit(10),
    ]);
    const map = new Map<string, (typeof ai)[number]>();
    for (const g of gens ?? []) {
      const row = map.get(g.tool) ?? { tool: g.tool, runs: 0, failed: 0, credits: 0, tokensIn: 0, tokensOut: 0, cost: 0 };
      row.runs++;
      if (g.status === "failed") row.failed++;
      row.credits += g.credits_charged ?? 0;
      row.tokensIn += g.input_tokens ?? 0;
      row.tokensOut += g.output_tokens ?? 0;
      row.cost += Number(g.estimated_cost_usd ?? 0);
      map.set(g.tool, row);
    }
    ai = Array.from(map.values()).sort((a, b) => b.runs - a.runs);
    errors = errs ?? [];
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
      {isServiceRoleConfigured() && (
        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>AI usage · last 30 days</CardTitle><span className="text-[12px] text-subtle">Cost uses ai_settings pricing</span></CardHeader>
            <CardBody className="overflow-x-auto p-0">
              {ai.length === 0 ? <p className="px-5 py-6 text-[13px] text-subtle">No AI generations yet.</p> : (
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead className="text-xs text-subtle"><tr className="border-b border-border">{["Tool", "Runs", "Failed", "Credits", "Tokens in/out", "Est. cost"].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">
                    {ai.map((r) => (
                      <tr key={r.tool}><td className="px-5 py-2">{TOOL_LABELS[r.tool] ?? r.tool}</td><td className="px-5 py-2 tabular-nums">{r.runs}</td><td className="px-5 py-2 tabular-nums">{r.failed}</td><td className="px-5 py-2 tabular-nums">{r.credits}</td><td className="px-5 py-2 tabular-nums">{formatNumber(r.tokensIn)} / {formatNumber(r.tokensOut)}</td><td className="px-5 py-2 tabular-nums">${r.cost.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent API errors</CardTitle></CardHeader>
            <CardBody className="p-0">
              {errors.length === 0 ? <p className="px-5 py-6 text-[13px] text-subtle">No errors logged.</p> : (
                <ul className="divide-y divide-border">{errors.map((e, i) => <li key={i} className="px-5 py-2 text-[13px]"><span className="font-medium">{e.service}</span> <span className="text-subtle">{e.route}</span><p className="text-muted">{e.message}</p><p className="text-[11px] text-subtle">{new Date(e.created_at).toLocaleString()}</p></li>)}</ul>
              )}
            </CardBody>
          </Card>
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
