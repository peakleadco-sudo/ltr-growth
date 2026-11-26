"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Printer, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { AgencyCta } from "@/components/ai/result-kit";
import { deleteStrategy, setStrategyStatus, updateStrategyContent } from "../actions";
import { StrategyView, type StrategyData } from "../strategy-view";

export function StrategyDetail({ id, title: initialTitle, status, data: initial, canEdit, hasTasks }: { id: string; title: string; status: string; data: StrategyData; canEdit: boolean; hasTasks: boolean }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [title, setTitle] = useState(initialTitle);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Something went wrong.");
      toast.success(msg);
      after?.();
      router.refresh();
    });

  return (
    <div className="min-w-0 space-y-4">
      {canEdit && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center print:hidden">
          <Input aria-label="Strategy title" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} className="sm:flex-1" />
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer /> Print / PDF</Button>
            <Button size="sm" variant="secondary" onClick={() => router.push("/app/strategy")} title="Create a new strategy from your current profile"><RefreshCw /> New version</Button>
            <Button size="sm" variant="ghost" onClick={() => run(() => setStrategyStatus(id, status === "archived" ? "active" : "archived"), status === "archived" ? "Strategy restored" : "Strategy archived")}>
              {status === "archived" ? <ArchiveRestore /> : <Archive />} {status === "archived" ? "Restore" : "Archive"}
            </Button>
            <Button size="sm" variant="ghost" aria-label="Delete strategy" onClick={() => {
              if (!confirm("Delete this strategy?")) return;
              const withTasks = hasTasks && confirm("Also delete its unfinished tasks? Completed tasks are kept.");
              run(() => deleteStrategy(id, withTasks), "Strategy deleted", () => router.push("/app/strategy"));
            }}><Trash2 /></Button>
            <Button size="sm" disabled={!dirty} loading={pending && dirty} onClick={() => run(() => updateStrategyContent(id, data as unknown as Record<string, unknown>, title), "Changes saved", () => setDirty(false))}><Save /> Save</Button>
          </div>
        </div>
      )}
      <StrategyView data={data} onChange={canEdit ? (d) => { setData(d); setDirty(true); } : undefined} showTasks={!hasTasks} />
      <p className="hidden text-xs text-subtle print:block">Generated with LTR Growth by LTRMarketing. AI-assisted recommendations; results are not guaranteed.</p>
      <div className="print:hidden">
        <AgencyCta title="Get a dedicated marketing team to execute your growth strategy" body="LTRMarketing can take this plan and run it for you." service="marketing_strategy" source="strategy_detail" />
      </div>
    </div>
  );
}
