"use client";

import { Badge } from "@/components/ui/primitives";
import { Assumptions, EditableText, SectionCard } from "@/components/ai/result-kit";
import { toMarkdown } from "@/lib/export";

export type StrategyData = {
  title: string;
  positioning: { statement: string; differentiators: string[]; messaging_pillars: string[] };
  audience_analysis: string;
  personas: { name: string; description: string; pain_points: string[]; motivations: string[]; where_to_reach: string[] }[];
  channels: { channel: string; priority: "high" | "medium" | "low"; rationale: string }[];
  advertising_strategy: string;
  budget_allocation: { note: string; items: { channel: string; percent: number; rationale: string }[] };
  seo_strategy: string;
  social_strategy: string;
  email_strategy: string;
  lead_generation_strategy: string;
  retention_strategy: string;
  weekly_tasks: { week: number; title: string; description: string; category: string; priority: "high" | "medium" | "low" }[];
  kpis: { name: string; how_to_measure: string; why_it_matters: string }[];
  testing_roadmap: { week: number; test: string; hypothesis: string; success_metric: string }[];
  assumptions: string[];
};

const PRIORITY_TONE = { high: "accent", medium: "warning", low: "neutral" } as const;
const TEXT_SECTIONS = [
  ["advertising_strategy", "Advertising strategy"],
  ["seo_strategy", "SEO strategy"],
  ["social_strategy", "Social media strategy"],
  ["email_strategy", "Email marketing strategy"],
  ["lead_generation_strategy", "Lead generation strategy"],
  ["retention_strategy", "Customer retention strategy"],
] as const;

export function StrategyView({
  data,
  onChange,
  onRegenerate,
  regenerating,
  showTasks = true,
}: {
  data: StrategyData;
  onChange?: (d: StrategyData) => void;
  onRegenerate?: (section: string) => void;
  regenerating?: string | null;
  showTasks?: boolean;
}) {
  const set = <K extends keyof StrategyData>(k: K, v: StrategyData[K]) => onChange?.({ ...data, [k]: v });
  const regen = (k: string) => (onRegenerate ? () => onRegenerate(k) : undefined);
  const text = (k: keyof StrategyData, label: string) =>
    onChange ? <EditableText label={label} multiline value={data[k] as string} onChange={(v) => set(k, v as never)} /> : <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted">{data[k] as string}</p>;
  const budgetTotal = data.budget_allocation.items.reduce((a, b) => a + b.percent, 0);
  const weeks = Array.from(new Set(data.weekly_tasks.map((t) => t.week))).sort((a, b) => a - b);

  return (
    <div className="space-y-4 print:space-y-3">
      <Assumptions items={data.assumptions} />
      <SectionCard title="Positioning" copyText={toMarkdown(data.positioning)} onRegenerate={regen("positioning")} regenerating={regenerating === "positioning"}>
        {onChange ? <EditableText label="Positioning statement" multiline className="text-[15px] font-medium" value={data.positioning.statement} onChange={(v) => set("positioning", { ...data.positioning, statement: v })} /> : <p className="text-[15px] font-medium">{data.positioning.statement}</p>}
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div><p className="text-xs font-medium uppercase tracking-wider text-subtle">Differentiators</p><ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-muted">{data.positioning.differentiators.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div><p className="text-xs font-medium uppercase tracking-wider text-subtle">Messaging pillars</p><ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-muted">{data.positioning.messaging_pillars.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>
      </SectionCard>

      <SectionCard title="Target audience analysis" copyText={data.audience_analysis} onRegenerate={regen("audience_analysis")} regenerating={regenerating === "audience_analysis"}>
        {text("audience_analysis", "Audience analysis")}
      </SectionCard>

      <SectionCard title="Customer personas" copyText={toMarkdown(data.personas)} onRegenerate={regen("personas")} regenerating={regenerating === "personas"}>
        <div className="grid gap-3 md:grid-cols-2">
          {data.personas.map((p, i) => (
            <div key={i} className="rounded-md border border-border bg-bg-2 p-3 text-[13px]">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="mt-1 text-muted">{p.description}</p>
              <p className="mt-2 text-xs text-subtle">Pain points</p><p className="text-muted">{p.pain_points.join(" · ")}</p>
              <p className="mt-2 text-xs text-subtle">Motivations</p><p className="text-muted">{p.motivations.join(" · ")}</p>
              <p className="mt-2 text-xs text-subtle">Where to reach them</p><p className="text-muted">{p.where_to_reach.join(" · ")}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Channel recommendations" copyText={toMarkdown(data.channels)} onRegenerate={regen("channels")} regenerating={regenerating === "channels"}>
          <ul className="space-y-2.5">
            {data.channels.map((c, i) => (
              <li key={i} className="text-[13px]"><div className="flex items-center gap-2"><span className="font-medium">{c.channel}</span><Badge tone={PRIORITY_TONE[c.priority]}>{c.priority}</Badge></div><p className="text-muted">{c.rationale}</p></li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Budget allocation" description={data.budget_allocation.note} copyText={toMarkdown(data.budget_allocation)} onRegenerate={regen("budget_allocation")} regenerating={regenerating === "budget_allocation"}>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/5" aria-hidden>
            {data.budget_allocation.items.map((b, i) => <div key={i} style={{ width: `${(b.percent / Math.max(budgetTotal, 100)) * 100}%`, opacity: 1 - i * 0.14 }} className="bg-accent first:rounded-l-full" />)}
          </div>
          <ul className="mt-3 space-y-2">
            {data.budget_allocation.items.map((b, i) => (
              <li key={i} className="flex gap-3 text-[13px]"><span className="w-10 shrink-0 font-semibold tabular-nums">{b.percent}%</span><span><span className="font-medium">{b.channel}</span><span className="block text-muted">{b.rationale}</span></span></li>
            ))}
          </ul>
          {budgetTotal !== 100 && <p className="mt-2 text-xs text-warning">Percentages add up to {budgetTotal}%. Adjust before using.</p>}
        </SectionCard>
      </div>

      {TEXT_SECTIONS.map(([k, label]) => (
        <SectionCard key={k} title={label} copyText={data[k]} onRegenerate={regen(k)} regenerating={regenerating === k}>
          {text(k, label)}
        </SectionCard>
      ))}

      {showTasks && (
        <SectionCard title="Weekly implementation tasks" copyText={toMarkdown(data.weekly_tasks)} onRegenerate={regen("weekly_tasks")} regenerating={regenerating === "weekly_tasks"}>
          <div className="space-y-4">
            {weeks.map((w) => (
              <div key={w}>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Week {w}</p>
                <ul className="mt-1.5 divide-y divide-border rounded-md border border-border">
                  {data.weekly_tasks.filter((t) => t.week === w).map((t, i) => (
                    <li key={i} className="px-3 py-2 text-[13px]"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{t.title}</span><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge><Badge>{t.category}</Badge></div><p className="mt-0.5 text-muted">{t.description}</p></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Performance indicators" description="What to measure, not predictions" copyText={toMarkdown(data.kpis)} onRegenerate={regen("kpis")} regenerating={regenerating === "kpis"}>
          <ul className="space-y-2.5 text-[13px]">{data.kpis.map((k, i) => <li key={i}><p className="font-medium">{k.name}</p><p className="text-muted">{k.how_to_measure}</p><p className="text-xs text-subtle">{k.why_it_matters}</p></li>)}</ul>
        </SectionCard>
        <SectionCard title="Testing roadmap" copyText={toMarkdown(data.testing_roadmap)} onRegenerate={regen("testing_roadmap")} regenerating={regenerating === "testing_roadmap"}>
          <ol className="space-y-2.5 text-[13px]">{data.testing_roadmap.map((t, i) => <li key={i}><p><span className="text-xs text-subtle">Week {t.week}</span> <span className="font-medium">{t.test}</span></p><p className="text-muted">{t.hypothesis}</p><p className="text-xs text-subtle">Success: {t.success_metric}</p></li>)}</ol>
        </SectionCard>
      </div>
    </div>
  );
}
