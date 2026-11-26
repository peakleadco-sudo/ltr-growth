"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { AgencyCta, CreditCost, GeneratingState, GenerationError } from "@/components/ai/result-kit";
import { useGenerator } from "@/components/ai/use-generator";
import { HORIZONS, type Horizon } from "@/lib/ai/tools/strategy";
import type { Reopened } from "@/lib/ai/tool-page";
import { saveStrategy } from "./actions";
import { StrategyView, type StrategyData } from "./strategy-view";

type Form = { horizon: Horizon; focus: string; budget: string; campaign_brief: string; constraints: string };

function toInput(f: Form) {
  return { ...f, budget: f.budget.trim() ? Number(f.budget) : null };
}

export function StrategyStudio({ remaining, reopened, hasBudget }: { remaining: number; reopened: Reopened | null; hasBudget: number | null }) {
  const router = useRouter();
  const gen = useGenerator<StrategyData & Record<string, unknown>>("strategy", reopened ? { output: reopened.output as StrategyData & Record<string, unknown>, generationId: reopened.generationId } : null);
  const ri = reopened?.input as Record<string, unknown> | undefined;
  const [form, setForm] = useState<Form>({
    horizon: (ri?.horizon as Horizon) ?? "30_day",
    focus: (ri?.focus as string) ?? "",
    budget: ri?.budget != null ? String(ri.budget) : hasBudget != null ? String(hasBudget) : "",
    campaign_brief: (ri?.campaign_brief as string) ?? "",
    constraints: (ri?.constraints as string) ?? "",
  });
  const [startsOn, setStartsOn] = useState(new Date().toISOString().slice(0, 10));
  const [addTasks, setAddTasks] = useState(true);
  const [saving, startSaving] = useTransition();
  const out = gen.output as StrategyData | null;
  const cost = form.horizon === "90_day" ? 4 : 3;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    startSaving(async () => {
      if (!out) return;
      const res = await saveStrategy({ generationId: gen.generationId || null, horizon: form.horizon, title: out.title || `${HORIZONS[form.horizon]} strategy`, startsOn, content: out as unknown as Record<string, unknown>, addTasks });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.data!.tasks ? `Strategy saved · ${res.data!.tasks} tasks added to your dashboard` : "Strategy saved");
      router.push(`/app/strategy/${res.data!.id}`);
    });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="xl:sticky xl:top-20 xl:self-start">
        <form className="space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); gen.run(toInput(form)); }}>
          <div>
            <p className="mb-2 text-[13px] font-medium">Strategy length</p>
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Strategy length">
              {(Object.keys(HORIZONS) as Horizon[]).map((h) => (
                <button key={h} type="button" role="radio" aria-checked={form.horizon === h} onClick={() => set("horizon", h)}
                  className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${form.horizon === h ? "border-accent/60 bg-accent-muted text-fg" : "border-border text-muted hover:text-fg"}`}>{HORIZONS[h]}</button>
              ))}
            </div>
          </div>
          {form.horizon === "custom" && (
            <Field label="Campaign brief" htmlFor="brief" hint="What is the campaign for, and when does it run?">
              <Textarea id="brief" required minLength={10} maxLength={1500} value={form.campaign_brief} onChange={(e) => set("campaign_brief", e.target.value)} />
            </Field>
          )}
          <Field label="Focus or priorities" htmlFor="focus" optional>
            <Textarea id="focus" className="min-h-16" maxLength={600} value={form.focus} onChange={(e) => set("focus", e.target.value)} placeholder="e.g. More booked jobs in the spring, launch a new service" />
          </Field>
          <Field label="Monthly budget (USD)" htmlFor="budget" optional hint="Without a budget, the split is shown as a hypothetical example.">
            <Input id="budget" type="number" min={0} inputMode="numeric" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
          </Field>
          <Field label="Constraints" htmlFor="constraints" optional>
            <Textarea id="constraints" className="min-h-14" maxLength={800} value={form.constraints} onChange={(e) => set("constraints", e.target.value)} placeholder="e.g. 3 hours a week, no video production" />
          </Field>
          <div className="space-y-2">
            <Button type="submit" className="w-full" loading={gen.loading} disabled={gen.loading || remaining < cost}>{!gen.loading && <Sparkles />} Generate strategy</Button>
            <p className="text-center"><CreditCost credits={cost} remaining={remaining} /></p>
          </div>
        </form>
      </Card>

      <div className="min-w-0 space-y-4">
        {gen.error && <GenerationError error={gen.error} />}
        {gen.loading ? (
          <GeneratingState label={`Building your ${HORIZONS[form.horizon].toLowerCase()} strategy`} steps={["Reading your business profile, goals and brand kit…", "Defining positioning and personas…", "Choosing channels and allocating budget…", "Planning weekly tasks and tests…", "Full strategies take about a minute…"]} />
        ) : !out ? (
          <EmptyState icon={Target} title="Your strategy will appear here" description="Get positioning, personas, channel and budget recommendations, KPIs, a testing roadmap and weekly tasks that you can add to your dashboard." />
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">{out.title}</h2>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="Start date" htmlFor="starts" className="sm:w-44"><Input id="starts" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></Field>
                <label className="flex items-center gap-2 pb-2 text-[13px] text-muted"><input type="checkbox" checked={addTasks} onChange={(e) => setAddTasks(e.target.checked)} className="accent-[#FF2929]" /> Add {out.weekly_tasks.length} weekly tasks to my dashboard</label>
                <Button className="sm:ml-auto" onClick={save} loading={saving}>{!saving && <ListChecks />} Save strategy</Button>
              </div>
            </div>
            <StrategyView data={out} onChange={(d) => gen.setOutput(d as StrategyData & Record<string, unknown>)} onRegenerate={(k) => gen.regenerate(k, toInput(form))} regenerating={gen.sectionLoading} />
            <AgencyCta title="Get a dedicated marketing team to execute this strategy" body="LTRMarketing can run the channels in this plan for you, from ads to SEO and content." service="marketing_strategy" source="strategy" />
          </>
        )}
      </div>
    </div>
  );
}
