import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/feedback";
import { Badge, Card, CardBody, CardDescription, CardHeader, CardTitle, Progress } from "@/components/ui/primitives";
import { creditSummary, requireWorkspace } from "@/lib/workspace";
import { getPublicPlans } from "@/lib/public-data";
import { isIntegrationConfigured } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PlanButton } from "./plan-button";

export const metadata: Metadata = { title: "Subscription" };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const { data: txs } = await supabase
    .from("credit_transactions")
    .select("id, credit_type, amount, reason, created_at")
    .eq("organization_id", ws.organization.id)
    .order("created_at", { ascending: false })
    .limit(15);
  const { plans } = await getPublicPlans();
  const c = creditSummary(ws);
  const stripeReady = isIntegrationConfigured("stripe") && isIntegrationConfigured("stripe_webhook");
  const wanted = plans.find((p) => p.id === sp.plan);

  return (
    <div>
      <PageHeader title="Subscription" description="Your plan, usage and billing." />
      {wanted && wanted.id !== ws.plan.id && (
        <Notice tone="info" className="mb-4" title={`You selected the ${wanted.name} plan`}>Choose it below to upgrade.</Notice>
      )}
      {!stripeReady && (
        <Notice tone="integration" className="mb-4" title="Online billing isn't configured yet">
          Paid plans are processed with Stripe. Upgrades become available once STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are configured on the server and plan price IDs are set.
        </Notice>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <div><CardTitle>Current plan</CardTitle><CardDescription>{ws.plan.description}</CardDescription></div>
            <Badge tone="accent">{ws.plan.name}</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-[12px] text-subtle">Status</dt><dd className="capitalize">{ws.subscription.status.replace("_", " ")}</dd></div>
              <div><dt className="text-[12px] text-subtle">Price</dt><dd>${(ws.plan.price_cents / 100).toFixed(0)}/{ws.plan.interval}</dd></div>
              <div><dt className="text-[12px] text-subtle">Period</dt><dd>{formatDate(c.periodEnd ? ws.usage?.period_start : null)} – {formatDate(c.periodEnd)}</dd></div>
              <div><dt className="text-[12px] text-subtle">Business profiles</dt><dd>{ws.businessProfiles.length} / {ws.effectivePlan.max_business_profiles}</dd></div>
            </dl>
            <div className="space-y-3 border-t border-border pt-4">
              <Usage label="AI text credits" used={c.textUsed} total={c.textTotal} />
              <Usage label="Image credits" used={c.imageUsed} total={c.imageTotal} />
              <Usage label="Website audits" used={c.auditsUsed} total={c.auditsTotal} />
              {(c.purchasedText > 0 || c.purchasedImage > 0) && <p className="text-[12px] text-muted">Purchased credits available: {c.purchasedText} text · {c.purchasedImage} image</p>}
            </div>
          </CardBody>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.id} className={p.id === ws.plan.id ? "border-accent/60" : wanted?.id === p.id ? "border-info/50" : undefined}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm"><span className="text-lg font-semibold">${(p.price_cents / 100).toFixed(0)}</span><span className="text-subtle">/mo</span></p>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {p.marketing_bullets.slice(0, 5).map((b) => <li key={b} className="flex gap-2 text-[12px] text-muted"><Check className="mt-0.5 size-3 shrink-0 text-accent" />{b}</li>)}
                </ul>
                <div className="mt-4">
                  <PlanButton planId={p.id} current={p.id === ws.plan.id} free={p.price_cents === 0} stripeReady={stripeReady && Boolean(p.stripe_price_id)} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <div><CardTitle>Recent credit activity</CardTitle><CardDescription>Charges for AI generations and refunds for failed ones</CardDescription></div>
          <Link href="/app/history" className="text-[13px] text-muted hover:text-fg hover:underline">AI history</Link>
        </CardHeader>
        <CardBody className="py-1">
          {(txs ?? []).length === 0 ? (
            <p className="py-6 text-center text-[13px] text-subtle">No credit activity this period.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(txs ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-[13px]">
                  <span className="text-muted">{t.reason === "refund" ? "Refund (failed generation)" : t.reason === "generation" ? "AI generation" : t.reason === "purchase" ? "Credits purchased" : t.reason} · {t.credit_type}</span>
                  <span className="flex items-center gap-4"><span className="text-[12px] text-subtle">{formatDate(t.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span><span className={t.amount < 0 ? "tabular-nums" : "tabular-nums text-success"}>{t.amount > 0 ? `+${t.amount}` : t.amount}</span></span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Usage({ label, used, total }: { label: string; used: number; total: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12px]"><span className="text-muted">{label}</span><span className="tabular-nums">{used} / {total}</span></div>
      <Progress value={total ? (used / total) * 100 : 0} label={label} />
    </div>
  );
}
