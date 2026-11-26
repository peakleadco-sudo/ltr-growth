import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { TOOL_LABELS, TOOL_PATHS } from "@/lib/ai/tools";
import { createClient } from "@/lib/supabase/server";
import { creditSummary, requireWorkspace } from "@/lib/workspace";
import { cn, formatDate } from "@/lib/utils";
import { SaveToggle } from "./save-toggle";

export const metadata: Metadata = { title: "AI History" };

const PAGE = 40;
type Row = { id: string; tool: string; section: string | null; input: Record<string, unknown>; status: "pending" | "succeeded" | "failed"; credits_charged: number; is_saved: boolean; error_message: string | null; created_at: string; user_id: string | null };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const tool = typeof sp.tool === "string" && TOOL_LABELS[sp.tool] ? sp.tool : null;
  const savedOnly = sp.saved === "1";
  const page = Math.max(0, Number(sp.page) || 0);

  let q = supabase
    .from("ai_generations")
    .select("id, tool, section, input, status, credits_charged, is_saved, error_message, created_at, user_id")
    .neq("tool", "onboarding_extraction")
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE);
  if (tool) q = q.eq("tool", tool);
  if (savedOnly) q = q.eq("is_saved", true);
  const { data } = await q;
  const rows = ((data ?? []) as Row[]).slice(0, PAGE);
  const hasMore = (data ?? []).length > PAGE;

  const credits = creditSummary(ws);
  const periodStart = ws.usage?.period_start;
  const { data: periodRows } = periodStart
    ? await supabase.from("ai_generations").select("tool, credits_charged").eq("status", "succeeded").gte("created_at", periodStart)
    : { data: [] as { tool: string; credits_charged: number }[] };
  const byTool = new Map<string, number>();
  for (const r of periodRows ?? []) byTool.set(r.tool, (byTool.get(r.tool) ?? 0) + r.credits_charged);
  const usageRows = Array.from(byTool.entries()).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const next = { tool, saved: savedOnly ? "1" : null, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return `/app/history${s ? `?${s}` : ""}`;
  };
  const openHref = (r: Row) => {
    if (r.tool === "assistant") return typeof r.input?.conversation_id === "string" ? `/app/assistant?c=${r.input.conversation_id}` : "/app/assistant";
    return TOOL_PATHS[r.tool] ? `${TOOL_PATHS[r.tool]}?g=${r.id}` : null;
  };

  return (
    <div>
      <PageHeader title="AI History" description="Every AI generation in this workspace, with the credits it used. Failed generations are never charged." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <FilterLink href={href({ tool: null })} active={!tool}>All tools</FilterLink>
            {Object.entries(TOOL_LABELS).filter(([k]) => k !== "onboarding_extraction").map(([k, label]) => (
              <FilterLink key={k} href={href({ tool: k, page: null })} active={tool === k}>{label}</FilterLink>
            ))}
            <span className="mx-1 w-px bg-border" />
            <FilterLink href={href({ saved: savedOnly ? null : "1", page: null })} active={savedOnly}>Saved only</FilterLink>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={History} title="Nothing here yet" description={tool || savedOnly ? "No generations match these filters." : "Generations from LTR AI, Ad Studio, Social Studio, Strategy, Copywriter and Email & SMS will be listed here."} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <ul className="divide-y divide-border bg-card">
                {rows.map((r) => {
                  const open = r.status === "succeeded" && !r.section ? openHref(r) : null;
                  const title = String(r.input?._title ?? TOOL_LABELS[r.tool] ?? r.tool);
                  return (
                    <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge>{TOOL_LABELS[r.tool] ?? r.tool}</Badge>
                          {r.section && <Badge tone="info">Section regenerated</Badge>}
                          {r.status === "failed" && <Badge tone="accent">Failed · not charged</Badge>}
                          {r.status === "pending" && <Badge tone="warning">In progress</Badge>}
                        </div>
                        <p className="mt-1 truncate text-[13px] font-medium">{title}</p>
                        <p className="text-[11px] text-subtle">
                          {formatDate(r.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {r.credits_charged} credit{r.credits_charged === 1 ? "" : "s"}
                          {r.status === "failed" && r.error_message ? ` · ${r.error_message.slice(0, 80)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {r.status === "succeeded" && <SaveToggle id={r.id} saved={r.is_saved} />}
                        {open && <Button asChild size="sm" variant="secondary"><Link href={open}>Open</Link></Button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {(page > 0 || hasMore) && (
            <div className="mt-3 flex justify-between">
              {page > 0 ? <Button asChild size="sm" variant="ghost"><Link href={href({ page: String(page - 1) })}>Newer</Link></Button> : <span />}
              {hasMore && <Button asChild size="sm" variant="ghost"><Link href={href({ page: String(page + 1) })}>Older</Link></Button>}
            </div>
          )}
        </div>
        <Card className="self-start">
          <CardHeader><CardTitle>This period</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-[13px]">
            <div className="flex justify-between"><span className="text-muted">Text credits used</span><span className="tabular-nums">{credits.textUsed} / {credits.textTotal}</span></div>
            {credits.purchasedText > 0 && <div className="flex justify-between"><span className="text-muted">Purchased credits left</span><span className="tabular-nums">{credits.purchasedText}</span></div>}
            <div className="flex justify-between"><span className="text-muted">Resets</span><span>{formatDate(credits.periodEnd)}</span></div>
            {usageRows.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">By tool</p>
                <ul className="space-y-1.5">{usageRows.map(([t, n]) => <li key={t} className="flex justify-between"><span className="text-muted">{TOOL_LABELS[t] ?? t}</span><span className="tabular-nums">{n}</span></li>)}</ul>
              </div>
            )}
            <Button asChild size="sm" variant="secondary" className="w-full"><Link href="/app/subscription">Plans and credits</Link></Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined} className={cn("rounded-md border px-2.5 py-1 text-xs transition-colors", active ? "border-accent/60 bg-accent-muted text-fg" : "border-border text-muted hover:text-fg")}>
      {children}
    </Link>
  );
}
