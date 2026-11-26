import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ai/tool-shell";
import { Badge, Progress } from "@/components/ui/primitives";
import { loadToolPage } from "@/lib/ai/tool-page";
import { HORIZONS, type Horizon } from "@/lib/ai/tools/strategy";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { StrategyStudio } from "./studio";

export const metadata: Metadata = { title: "Marketing Strategy" };

type Row = { id: string; title: string; horizon: Horizon; status: string; starts_on: string | null; created_at: string };

export default async function StrategyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ws, included, aiConfigured, remaining, reopened } = await loadToolPage("strategy", "strategy", sp.g);

  let strategies: (Row & { done: number; total: number })[] = [];
  if (included) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("marketing_strategies")
      .select("id, title, horizon, status, starts_on, created_at")
      .eq("business_profile_id", ws.activeBusiness!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = (data ?? []) as Row[];
    const { data: tasks } = rows.length
      ? await supabase.from("marketing_tasks").select("strategy_id, status").in("strategy_id", rows.map((r) => r.id))
      : { data: [] as { strategy_id: string; status: string }[] };
    strategies = rows.map((r) => {
      const t = (tasks ?? []).filter((x) => x.strategy_id === r.id);
      return { ...r, total: t.length, done: t.filter((x) => x.status === "done").length };
    });
  }

  return (
    <ToolShell
      title="Marketing Strategy"
      description="30, 60 and 90-day marketing plans built from your business profile. Weekly tasks go straight to your dashboard."
      included={included}
      minPlan="starter"
      aiConfigured={aiConfigured}
      historyTool="strategy"
    >
      {strategies.length > 0 && !reopened && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">Your strategies</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {strategies.map((s) => (
              <Link key={s.id} href={`/app/strategy/${s.id}`} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong">
                <div className="flex items-center gap-2">
                  <Badge>{HORIZONS[s.horizon]}</Badge>
                  {s.status === "archived" && <Badge tone="neutral">Archived</Badge>}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-subtle">Starts {formatDate(s.starts_on)} · created {formatDate(s.created_at)}</p>
                {s.total > 0 && (
                  <div className="mt-3">
                    <Progress value={(s.done / s.total) * 100} label={`${s.done} of ${s.total} tasks done`} />
                    <p className="mt-1 text-[11px] text-subtle">{s.done} of {s.total} tasks done</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
      <StrategyStudio key={reopened?.generationId ?? "new"} remaining={remaining} reopened={reopened} hasBudget={ws.activeBusiness!.monthly_marketing_budget} />
    </ToolShell>
  );
}
