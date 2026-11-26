"use client";

import { useOptimistic, useTransition } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, updateTaskStatus } from "@/app/app/tasks/actions";
import type { MarketingTask } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

const PRIORITY_TONE = { high: "accent", medium: "warning", low: "neutral" } as const;
const SOURCE_LABEL: Record<string, string> = { onboarding: "Setup", strategy: "Strategy", audit: "Audit", campaign: "Campaign", manual: "Manual" };

export function TaskList({ tasks, compact, allowDelete }: { tasks: MarketingTask[]; compact?: boolean; allowDelete?: boolean }) {
  const [, start] = useTransition();
  const [optimistic, apply] = useOptimistic(tasks, (state, u: { id: string; status?: MarketingTask["status"]; removed?: boolean }) =>
    u.removed ? state.filter((t) => t.id !== u.id) : state.map((t) => (t.id === u.id ? { ...t, status: u.status ?? t.status } : t)),
  );

  function toggle(t: MarketingTask) {
    const status = t.status === "done" ? "todo" : "done";
    start(async () => {
      apply({ id: t.id, status });
      const res = await updateTaskStatus(t.id, status);
      if (!res.ok) toast.error(res.error);
    });
  }
  function remove(t: MarketingTask) {
    start(async () => {
      apply({ id: t.id, removed: true });
      const res = await deleteTask(t.id);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <ul className="divide-y divide-border">
      {optimistic.map((t) => {
        const done = t.status === "done";
        return (
          <li key={t.id} className={cn("group flex items-start gap-3", compact ? "py-2.5" : "px-4 py-3")}>
            <button onClick={() => toggle(t)} className="mt-0.5 shrink-0 text-subtle hover:text-fg" aria-label={done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}>
              {done ? <CheckCircle2 className="size-[18px] text-accent" /> : <Circle className="size-[18px]" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[13px] font-medium leading-snug", done && "text-subtle line-through")}>{t.title}</p>
              {!compact && t.description && <p className="mt-0.5 text-[12px] text-muted">{t.description}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                {t.category && <Badge>{t.category}</Badge>}
                <span className="text-[11px] text-subtle">{SOURCE_LABEL[t.source]}</span>
                {t.due_date && <span className="text-[11px] text-subtle">· Due {formatDate(t.due_date, { month: "short", day: "numeric" })}</span>}
                {t.is_demo && <Badge tone="warning">Demo</Badge>}
              </div>
            </div>
            {allowDelete && (
              <button onClick={() => remove(t)} className="shrink-0 rounded p-1 text-subtle opacity-0 transition-opacity hover:text-accent focus:opacity-100 group-hover:opacity-100" aria-label={`Delete "${t.title}"`}>
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
