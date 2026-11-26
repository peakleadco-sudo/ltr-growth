"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Download, MessageSquareText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Badge, Card, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { Assumptions, CopyButton, CreditCost, EditableText, GeneratingState, GenerationError, SectionCard } from "@/components/ai/result-kit";
import { useGenerator } from "@/components/ai/use-generator";
import { SOCIAL_CONTENT_TYPES, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/ai/tools/social";
import { TONES } from "@/lib/ai/tools/common";
import type { Reopened } from "@/lib/ai/tool-page";
import { downloadFile, toCsv } from "@/lib/export";
import { cn } from "@/lib/utils";
import { savePosts } from "./actions";

export type Post = {
  day: number;
  platform: SocialPlatform;
  content_type: (typeof SOCIAL_CONTENT_TYPES)[number];
  title: string;
  hook: string;
  caption: string;
  script: { timing: string; visual: string; voiceover: string }[];
  slides: string[];
  visual_idea: string;
  hashtags: string[];
  cta: string;
};
type SocialOutput = {
  strategy_summary: string;
  content_pillars: { name: string; purpose: string }[];
  posts: Post[];
  story_ideas: string[];
  engagement_prompts: string[];
  assumptions: string[];
};

type Form = {
  mode: "posts" | "plan";
  platforms: SocialPlatform[];
  content_types: (typeof SOCIAL_CONTENT_TYPES)[number][];
  plan_days: 7 | 14 | 30;
  post_count: number;
  topic: string;
  tone: (typeof TONES)[number];
  promotion: string;
  notes: string;
};

export function postToText(p: Post) {
  return [
    p.caption,
    p.hashtags.length ? `\n${p.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : "",
  ].join("");
}

function costFor(f: Form) {
  return f.mode === "plan" ? (f.plan_days === 30 ? 4 : f.plan_days === 14 ? 3 : 2) : 1;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SocialStudio({ remaining, reopened }: { remaining: number; reopened: Reopened | null }) {
  const router = useRouter();
  const gen = useGenerator<SocialOutput & Record<string, unknown>>("social_studio", reopened ? { output: reopened.output as SocialOutput & Record<string, unknown>, generationId: reopened.generationId } : null);
  const ri = reopened?.input as Partial<Form> | undefined;
  const [form, setForm] = useState<Form>({
    mode: ri?.mode ?? "posts",
    platforms: ri?.platforms ?? ["instagram"],
    content_types: ri?.content_types ?? [],
    plan_days: ri?.plan_days ?? 7,
    post_count: ri?.post_count ?? 3,
    topic: ri?.topic ?? "",
    tone: ri?.tone ?? "Brand voice",
    promotion: ri?.promotion ?? "",
    notes: ri?.notes ?? "",
  });
  const [startsOn, setStartsOn] = useState(today());
  const [saving, startSaving] = useTransition();
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const out = gen.output as SocialOutput | null;
  const cost = costFor(form);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const updatePost = (i: number, patch: Partial<Post>) => gen.setOutput((o) => (o ? { ...o, posts: (o.posts as Post[]).map((p, j) => (j === i ? { ...p, ...patch } : p)) } : o));

  const planMode = (reopened?.input?.mode ?? form.mode) === "plan" && out && out.posts.length > 1 && out.posts.some((p) => p.day > 1);

  const save = () =>
    startSaving(async () => {
      if (!out) return;
      const res = await savePosts({
        generationId: gen.generationId || null,
        startsOn,
        planDays: planMode ? form.plan_days : null,
        title: planMode ? `${form.plan_days}-day plan${form.topic ? ` · ${form.topic.slice(0, 60)}` : ""}` : form.topic.slice(0, 80) || "Social posts",
        posts: out.posts,
      });
      if (!res.ok) return void toast.error(res.error);
      setSavedFor(gen.generationId);
      toast.success(`${res.data!.count} post${res.data!.count === 1 ? "" : "s"} saved as drafts`, { action: { label: "View", onClick: () => router.push("/app/social?view=library") } });
      router.refresh();
    });

  const exportCsv = () => {
    if (!out) return;
    const start = new Date(`${startsOn}T00:00:00Z`);
    const rows = out.posts.map((p) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + p.day - 1);
      return { date: d.toISOString().slice(0, 10), platform: SOCIAL_PLATFORMS[p.platform], type: p.content_type, title: p.title, hook: p.hook, caption: p.caption, hashtags: p.hashtags.join(" "), cta: p.cta, visual: p.visual_idea, slides: p.slides.join(" | "), script: p.script.map((s) => `[${s.timing}] ${s.visual} / ${s.voiceover}`).join(" | ") };
    });
    downloadFile(`social-content-${startsOn}.csv`, toCsv(rows), "text/csv");
  };

  const byDay = useMemo(() => {
    if (!out) return [];
    return out.posts.map((p, i) => ({ p, i })).sort((a, b) => a.p.day - b.p.day);
  }, [out]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="xl:sticky xl:top-20 xl:self-start">
        <form className="space-y-4 p-4" onSubmit={async (e) => { e.preventDefault(); await gen.run(form); setSavedFor(null); }}>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border p-1" role="radiogroup" aria-label="What to create">
            {([["posts", "Posts"], ["plan", "Content plan"]] as const).map(([m, label]) => (
              <button key={m} type="button" role="radio" aria-checked={form.mode === m} onClick={() => set("mode", m)} className={cn("rounded px-2 py-1.5 text-[13px] transition-colors", form.mode === m ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg")}>{label}</button>
            ))}
          </div>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Platforms</legend>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]).map((p) => (
                <button key={p} type="button" aria-pressed={form.platforms.includes(p)} onClick={() => set("platforms", toggle(form.platforms, p))}
                  className={cn("rounded-md border px-2.5 py-1 text-xs transition-colors", form.platforms.includes(p) ? "border-accent/60 bg-accent-muted text-fg" : "border-border text-muted hover:text-fg")}>{SOCIAL_PLATFORMS[p]}</button>
              ))}
            </div>
          </fieldset>
          {form.mode === "plan" ? (
            <Field label="Plan length" htmlFor="plan-days">
              <NativeSelect id="plan-days" value={form.plan_days} onChange={(e) => set("plan_days", Number(e.target.value) as Form["plan_days"])}>
                <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
              </NativeSelect>
            </Field>
          ) : (
            <Field label="Number of posts" htmlFor="post-count">
              <NativeSelect id="post-count" value={form.post_count} onChange={(e) => set("post_count", Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </NativeSelect>
            </Field>
          )}
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Content types <span className="font-normal text-subtle">Optional</span></legend>
            <div className="flex flex-wrap gap-1.5">
              {SOCIAL_CONTENT_TYPES.map((t) => (
                <button key={t} type="button" aria-pressed={form.content_types.includes(t)} onClick={() => set("content_types", toggle(form.content_types, t))}
                  className={cn("rounded-md border px-2 py-1 text-[11px] transition-colors", form.content_types.includes(t) ? "border-accent/60 bg-accent-muted text-fg" : "border-border text-muted hover:text-fg")}>{t}</button>
              ))}
            </div>
          </fieldset>
          <Field label="Topic or focus" htmlFor="topic" optional>
            <Textarea id="topic" className="min-h-16" maxLength={500} value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. Spring maintenance tips, new menu launch" />
          </Field>
          <Field label="Current promotion" htmlFor="promo" optional hint="Leave empty and no promotion will be mentioned.">
            <Input id="promo" maxLength={300} value={form.promotion} onChange={(e) => set("promotion", e.target.value)} />
          </Field>
          <Field label="Tone" htmlFor="tone">
            <NativeSelect id="tone" value={form.tone} onChange={(e) => set("tone", e.target.value as Form["tone"])}>{TONES.map((t) => <option key={t}>{t}</option>)}</NativeSelect>
          </Field>
          <Field label="Notes" htmlFor="notes" optional>
            <Textarea id="notes" className="min-h-14" maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <div className="space-y-2">
            <Button type="submit" className="w-full" loading={gen.loading} disabled={gen.loading || form.platforms.length === 0 || remaining < cost}>
              {!gen.loading && <Sparkles />} {form.mode === "plan" ? `Generate ${form.plan_days}-day plan` : "Generate posts"}
            </Button>
            <p className="text-center"><CreditCost credits={cost} remaining={remaining} /></p>
          </div>
        </form>
      </Card>

      <div className="min-w-0 space-y-4">
        {gen.error && <GenerationError error={gen.error} />}
        {gen.loading ? (
          <GeneratingState label={form.mode === "plan" ? `Planning ${form.plan_days} days of content` : "Writing your posts"} steps={["Reading your business profile and brand voice…", "Choosing content pillars…", "Writing hooks and captions…", "Adding scripts, slides and hashtags…", "Longer plans can take a minute…"]} />
        ) : !out ? (
          <EmptyState icon={MessageSquareText} title="Your content will appear here" description="Generate ready-to-post captions, carousels, reel scripts and hooks, or a full 7, 14 or 30-day plan. You publish manually; nothing is posted for you." />
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-end sm:justify-between">
              <Field label="Start date" htmlFor="starts" className="sm:w-44">
                <Input id="starts" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={exportCsv}><Download /> Export CSV</Button>
                <Button size="sm" onClick={save} loading={saving} disabled={savedFor !== null && savedFor === gen.generationId}>
                  {!saving && <CalendarPlus />} {savedFor && savedFor === gen.generationId ? "Saved" : "Save as drafts"}
                </Button>
              </div>
            </div>
            <Assumptions items={out.assumptions} />
            {(out.strategy_summary || out.content_pillars.length > 0) && (
              <SectionCard title="Approach" copyText={`${out.strategy_summary}\n\n${out.content_pillars.map((c) => `${c.name}: ${c.purpose}`).join("\n")}`}>
                <p className="text-[13px] text-muted">{out.strategy_summary}</p>
                {out.content_pillars.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {out.content_pillars.map((c, i) => <span key={i} title={c.purpose} className="rounded-md border border-border bg-bg-2 px-2 py-1 text-xs">{c.name}</span>)}
                  </div>
                )}
              </SectionCard>
            )}

            <SectionCard title={`Posts (${out.posts.length})`} onRegenerate={() => gen.regenerate("posts", form)} regenerating={gen.sectionLoading === "posts"}>
              <div className="grid gap-4 lg:grid-cols-2">
                {byDay.map(({ p, i }) => (
                  <article key={i} className="flex flex-col rounded-lg border border-border bg-bg-2">
                    <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {out.posts.some((x) => x.day > 1) && <Badge>Day {p.day}</Badge>}
                        <Badge tone="accent">{SOCIAL_PLATFORMS[p.platform]}</Badge>
                        <span className="truncate text-xs text-subtle">{p.content_type}</span>
                      </div>
                      <CopyButton text={postToText(p)} size="icon-sm" label={`Copy post ${i + 1}`} />
                    </header>
                    <div className="flex-1 space-y-2 p-2">
                      <p className="px-2 pt-1 text-sm font-medium">{p.title}</p>
                      <div>
                        <p className="px-2 text-[11px] uppercase tracking-wider text-subtle">Hook</p>
                        <EditableText label={`Post ${i + 1} hook`} value={p.hook} multiline onChange={(v) => updatePost(i, { hook: v })} />
                      </div>
                      <div>
                        <p className="px-2 text-[11px] uppercase tracking-wider text-subtle">Caption</p>
                        <EditableText label={`Post ${i + 1} caption`} value={p.caption} multiline onChange={(v) => updatePost(i, { caption: v })} />
                      </div>
                      {p.slides.length > 0 && (
                        <div className="px-2">
                          <p className="text-[11px] uppercase tracking-wider text-subtle">Slides</p>
                          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[13px] text-muted">{p.slides.map((s, k) => <li key={k}>{s}</li>)}</ol>
                        </div>
                      )}
                      {p.script.length > 0 && (
                        <div className="px-2">
                          <p className="text-[11px] uppercase tracking-wider text-subtle">Script</p>
                          <ul className="mt-1 space-y-1 text-[13px]">{p.script.map((s, k) => <li key={k}><span className="font-mono text-xs text-subtle">{s.timing}</span> <span className="text-muted">{s.visual}</span>{s.voiceover && <> · <span>{s.voiceover}</span></>}</li>)}</ul>
                        </div>
                      )}
                      <p className="px-2 text-xs text-subtle"><span className="text-muted">Visual:</span> {p.visual_idea}</p>
                      {p.hashtags.length > 0 && <p className="px-2 text-xs text-info">{p.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>}
                      {p.cta && <p className="px-2 pb-1 text-xs"><span className="text-subtle">CTA:</span> {p.cta}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-2">
              {out.story_ideas.length > 0 && (
                <SectionCard title="Story ideas" copyText={out.story_ideas.join("\n")} onRegenerate={() => gen.regenerate("story_ideas", form)} regenerating={gen.sectionLoading === "story_ideas"}>
                  <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">{out.story_ideas.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </SectionCard>
              )}
              {out.engagement_prompts.length > 0 && (
                <SectionCard title="Engagement prompts" copyText={out.engagement_prompts.join("\n")} onRegenerate={() => gen.regenerate("engagement_prompts", form)} regenerating={gen.sectionLoading === "engagement_prompts"}>
                  <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">{out.engagement_prompts.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </SectionCard>
              )}
            </div>
            <p className="text-xs text-subtle">Publishing is manual for now: copy or export posts and publish them on each platform. LTR Growth never claims a post was published unless you mark it.</p>
          </>
        )}
      </div>
    </div>
  );
}
