import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/feedback";
import { Badge, Card, CardBody, CardHeader, CardTitle, Progress } from "@/components/ui/primitives";
import { TaskList } from "@/components/app/task-list";
import { HORIZONS, type Horizon } from "@/lib/ai/tools/strategy";
import { createClient } from "@/lib/supabase/server";
import { hasFeature, requireWorkspace } from "@/lib/workspace";
import type { MarketingTask } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import type { StrategyData } from "../strategy-view";
import { StrategyDetail } from "./detail";

export const metadata: Metadata = { title: "Strategy" };

export default async function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const { data: s } = await supabase.from("marketing_strategies").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const { data: tasks } = await supabase.from("marketing_tasks").select("*").eq("strategy_id", id).order("week_number").order("priority");
  const list = (tasks ?? []) as MarketingTask[];
  const done = list.filter((t) => t.status === "done").length;
  const weeks = Array.from(new Set(list.map((t) => t.week_number ?? 0))).sort((a, b) => a - b);

  return (
    <div>
      <Link href="/app/strategy" className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg print:hidden"><ArrowLeft className="size-3.5" /> All strategies</Link>
      <PageHeader
        title={s.title}
        eyebrow={<div className="flex gap-2"><Badge>{HORIZONS[s.horizon as Horizon]}</Badge>{s.status === "archived" && <Badge>Archived</Badge>}</div>}
        description={`Starts ${formatDate(s.starts_on)} · created ${formatDate(s.created_at)}`}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <StrategyDetail id={s.id} title={s.title} status={s.status} data={s.content as StrategyData} canEdit={hasFeature(ws, "strategy")} hasTasks={list.length > 0} />
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start print:hidden">
          <Card>
            <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
            <CardBody>
              {list.length === 0 ? (
                <p className="text-[13px] text-muted">No tasks were added from this strategy.</p>
              ) : (
                <>
                  <Progress value={(done / list.length) * 100} label={`${done} of ${list.length} tasks done`} />
                  <p className="mt-2 text-[13px] text-muted">{done} of {list.length} tasks done</p>
                  <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto">
                    {weeks.map((w) => (
                      <div key={w}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Week {w}</p>
                        <TaskList tasks={list.filter((t) => (t.week_number ?? 0) === w)} compact />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
