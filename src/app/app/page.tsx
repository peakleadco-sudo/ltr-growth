import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  CreditCard,
  Flag,
  Gauge,
  Handshake,
  ListChecks,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, CardDescription, CardHeader, CardTitle, Progress } from "@/components/ui/primitives";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { TaskList } from "@/components/app/task-list";
import { creditSummary, requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness, readinessLabel } from "@/lib/readiness";
import { ALL_NAV_ITEMS } from "@/lib/features";
import { formatDate } from "@/lib/utils";
import type { MarketingTask } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const h = new Date().getUTCHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ws = await requireWorkspace();
  const bp = ws.activeBusiness!;
  const supabase = await createClient();
  const today = new Date();
  const weekAhead = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const [tasksRes, auditRes, adsRes, campaignsRes, contentRes, strategyRes] = await Promise.all([
    supabase.from("marketing_tasks").select("*").eq("business_profile_id", bp.id).in("status", ["todo", "in_progress"]).order("priority").order("due_date", { nullsFirst: false }).limit(6),
    supabase.from("website_audits").select("id, url, scores, completed_at, status").eq("business_profile_id", bp.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("generated_ads").select("id, title, platform, created_at, is_demo").eq("business_profile_id", bp.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("marketing_campaigns").select("id, name, status, starts_on, ends_on, planned_budget, is_demo").eq("business_profile_id", bp.id).in("status", ["planned", "active"]).order("starts_on", { nullsFirst: false }).limit(3),
    supabase.from("social_content").select("id, title, platform, planned_for, status, is_demo").eq("business_profile_id", bp.id).gte("planned_for", today.toISOString().slice(0, 10)).lte("planned_for", weekAhead).order("planned_for").limit(5),
    supabase.from("marketing_strategies").select("id", { count: "exact", head: true }).eq("business_profile_id", bp.id).eq("status", "active"),
  ]);

  const tasks = (tasksRes.data ?? []) as MarketingTask[];
  const audit = auditRes.data as { id: string; url: string; scores: Record<string, number | null>; completed_at: string } | null;
  const readiness = computeReadiness({
    business: bp,
    brandKit: ws.brandKit,
    hasLogo: Boolean(ws.brandKit?.logo_asset_id),
    latestAudit: audit,
    openTaskCount: tasks.length,
    hasStrategy: (strategyRes.count ?? 0) > 0,
  });
  const credits = creditSummary(ws);
  const firstName = (ws.profile.full_name || "").split(" ")[0];
  const tools = ALL_NAV_ITEMS.filter((i) => ["/app/assistant", "/app/ads", "/app/social", "/app/audit", "/app/strategy", "/app/email", "/app/copywriter", "/app/calculators"].includes(i.href));
  const subNotice = ws.subscription.status === "past_due" || ws.subscription.status === "unpaid";

  return (
    <div className="space-y-6">
      {sp.password === "updated" && <Notice tone="success" title="Your password has been updated." />}
      {subNotice && (
        <Notice tone="error" title="There's a problem with your payment" action={<Button asChild size="sm"><Link href="/app/subscription">Update billing</Link></Button>}>
          Your {ws.plan.name} features are paused until billing is updated. You&apos;re on Free plan allowances in the meantime.
        </Notice>
      )}
      {bp.is_demo && <Notice tone="warning" title="You're viewing demonstration data">This business profile was created from seed data for development. It is not a real customer.</Notice>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()}{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{bp.name} marketing command center</h1>
        </div>
        <Button asChild variant="secondary"><Link href="/app/assistant"><Sparkles className="text-accent" /> Ask LTR AI</Link></Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Readiness */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Marketing readiness</CardTitle>
              <CardDescription>Based on {readiness.criteria.length} verifiable setup checks</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-5">
              <ScoreRing score={readiness.score} />
              <div>
                <p className="text-sm font-medium">{readinessLabel(readiness.score)}</p>
                <p className="mt-1 text-[12px] text-muted">{readiness.criteria.filter((c) => c.met).length} of {readiness.criteria.length} complete</p>
              </div>
            </div>
            <details className="mt-4 text-[12px]">
              <summary className="cursor-pointer text-subtle hover:text-fg">How this score is calculated</summary>
              <ul className="mt-2 space-y-1">
                {readiness.criteria.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-muted">
                    {c.met ? <CheckCircle2 className="size-3.5 text-accent" /> : <Circle className="size-3.5 text-subtle" />}
                    <span className="flex-1">{c.label}</span>
                    <span className="tabular-nums text-subtle">{c.weight}</span>
                  </li>
                ))}
              </ul>
            </details>
          </CardBody>
        </Card>

        {/* Website & SEO */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Website & SEO</CardTitle>
              <CardDescription>{audit ? `Last audit ${formatDate(audit.completed_at)}` : "From your latest website audit"}</CardDescription>
            </div>
            <Gauge className="size-4 text-subtle" />
          </CardHeader>
          <CardBody>
            {audit ? (
              <div className="grid grid-cols-2 gap-3">
                {[["Performance", audit.scores.performance], ["Technical SEO", audit.scores.technical_seo], ["Conversion", audit.scores.conversion], ["Marketing", audit.scores.marketing]].map(([k, v]) => (
                  <div key={k as string} className="rounded-md border border-border bg-bg-2 p-3">
                    <p className="text-[11px] text-subtle">{k}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{v ?? <span className="text-sm text-subtle">Unverified</span>}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Gauge} title="No audit yet" description={bp.website_url ? "Website audits are coming in the next release. Your site is saved and ready to scan." : "Add your website to your business profile to enable audits."}
                action={!bp.website_url ? <Button asChild size="sm" variant="secondary"><Link href="/app/settings/business">Add website</Link></Button> : undefined} className="py-6" />
            )}
          </CardBody>
        </Card>

        {/* Credits & subscription */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>AI usage</CardTitle>
              <CardDescription>{credits.periodEnd ? `Resets ${formatDate(credits.periodEnd)}` : "Current billing period"}</CardDescription>
            </div>
            <Badge tone={ws.plan.id === "free" ? "neutral" : "accent"}>{ws.plan.name}</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <UsageRow label="Text generations" used={credits.textUsed} total={credits.textTotal} extra={credits.purchasedText} />
            {credits.imageTotal > 0 && <UsageRow label="Image generations" used={credits.imageUsed} total={credits.imageTotal} extra={credits.purchasedImage} />}
            <UsageRow label="Website audits" used={credits.auditsUsed} total={credits.auditsTotal} />
            <div className="flex items-center justify-between border-t border-border pt-3 text-[12px]">
              <span className="text-muted">Subscription: <span className="capitalize text-fg">{ws.subscription.status.replace("_", " ")}</span></span>
              <Link href="/app/subscription" className="inline-flex items-center gap-1 text-fg hover:underline"><CreditCard className="size-3.5" /> Manage</Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Tasks */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>This week&apos;s marketing tasks</CardTitle>
              <CardDescription>Your open tasks, highest priority first</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost"><Link href="/app/tasks">All tasks <ArrowRight /></Link></Button>
          </CardHeader>
          <CardBody className="py-1">
            {tasks.length ? <TaskList tasks={tasks} compact /> : <EmptyState icon={ListChecks} title="No open tasks" description="Tasks from your strategy, audits and setup will appear here." className="my-4" action={<Button asChild size="sm" variant="secondary"><Link href="/app/tasks">Add a task</Link></Button>} />}
          </CardBody>
        </Card>

        {/* Opportunities */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Marketing opportunities</CardTitle>
              <CardDescription>Recommended next steps from your setup</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {readiness.gaps.length === 0 ? (
              <p className="text-sm text-muted">Your foundations are complete. Keep working through your strategy tasks.</p>
            ) : (
              <ul className="space-y-2">
                {readiness.gaps.slice(0, 5).map((g) => (
                  <li key={g.id}>
                    <Link href={g.href} className="group flex items-center gap-3 rounded-md border border-border bg-bg-2 px-3 py-2.5 transition-colors hover:border-border-strong">
                      <span className="flex-1 text-[13px]">{g.action}</span>
                      <Badge>{g.category}</Badge>
                      <ArrowRight className="size-3.5 text-subtle transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Content calendar · next 7 days</CardTitle><CalendarDays className="size-4 text-subtle" /></CardHeader>
          <CardBody>
            {contentRes.data?.length ? (
              <ul className="space-y-2">
                {contentRes.data.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-[13px]">
                    <span className="w-14 shrink-0 text-subtle">{formatDate(c.planned_for, { weekday: "short", day: "numeric" })}</span>
                    <span className="flex-1 truncate">{c.title || "Untitled post"}</span>
                    <Badge>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Nothing planned yet" description="Plan content in the Social Media Studio." className="py-6" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent advertisements</CardTitle><Megaphone className="size-4 text-subtle" /></CardHeader>
          <CardBody>
            {adsRes.data?.length ? (
              <ul className="space-y-2">
                {adsRes.data.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-[13px]"><span className="flex-1 truncate">{a.title}</span><Badge>{a.platform}</Badge></li>
                ))}
              </ul>
            ) : <EmptyState title="No ads generated yet" description="Create your first campaign in the Ad Studio." className="py-6" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upcoming campaigns</CardTitle><Flag className="size-4 text-subtle" /></CardHeader>
          <CardBody>
            {campaignsRes.data?.length ? (
              <ul className="space-y-2">
                {campaignsRes.data.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-[13px]"><span className="flex-1 truncate">{c.name}</span><span className="text-subtle">{formatDate(c.starts_on, { month: "short", day: "numeric" })}</span></li>
                ))}
              </ul>
            ) : <EmptyState title="No campaigns planned" description="Plan and track campaigns in Campaigns." className="py-6" />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><div><CardTitle>Marketing tools</CardTitle><CardDescription>Quick access</CardDescription></div></CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => (
            <Link key={t.href} href={t.href} className="flex items-center justify-between rounded-md border border-border bg-bg-2 px-3 py-2.5 text-[13px] transition-colors hover:border-border-strong">
              {t.label}
              {t.status === "upcoming" ? <Badge>Soon</Badge> : <ArrowRight className="size-3.5 text-subtle" />}
            </Link>
          ))}
        </CardBody>
      </Card>

      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Handshake className="size-5 text-accent" />
          <p className="text-sm text-muted"><span className="text-fg">Want a team to execute this for you?</span> LTRMarketing offers fully managed marketing.</p>
        </div>
        <Button asChild size="sm" variant="secondary"><Link href="/app/agency">Explore services</Link></Button>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const c = 2 * Math.PI * 30;
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r="30" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
        <circle cx="36" cy="36" r="30" stroke="#FF2929" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums" aria-label={`Readiness score ${score} out of 100`}>{score}</span>
    </div>
  );
}

function UsageRow({ label, used, total, extra }: { label: string; used: number; total: number; extra?: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">{used} / {total}{extra ? <span className="text-subtle"> + {extra} purchased</span> : null}</span>
      </div>
      <Progress value={total ? (used / total) * 100 : 0} label={label} />
    </div>
  );
}
