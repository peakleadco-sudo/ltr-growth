"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FilePlus2, Megaphone, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Badge, Card, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { AgencyCta, Assumptions, CopyButton, CreditCost, DeleteIconButton, EditableList, EditableText, GeneratingState, GenerationError, SectionCard } from "@/components/ai/result-kit";
import { useGenerator } from "@/components/ai/use-generator";
import { AD_FORMATS, AD_OBJECTIVES, AD_PLATFORMS, type AdPlatform } from "@/lib/ai/tools/ad-studio";
import { TONES } from "@/lib/ai/tools/common";
import type { Reopened } from "@/lib/ai/tool-page";
import { downloadFile, slugify, toMarkdown } from "@/lib/export";
import { cn, formatDate } from "@/lib/utils";
import { deleteAd, saveAd } from "./actions";

type Scene = { timing: string; visual: string; voiceover: string; on_screen_text: string };
export type AdOutput = {
  primary_texts: string[];
  headlines: string[];
  descriptions: string[];
  hooks: string[];
  video_script: { duration_seconds: number; scenes: Scene[] };
  ugc_script: { creator_brief: string; script: { timing: string; line: string; direction: string }[] };
  voiceover_script: string;
  creative_concepts: { name: string; visual_description: string; copy_angle: string }[];
  audience_segments: { name: string; targeting: string; rationale: string }[];
  campaign_structure: { summary: string; ad_sets: { name: string; audience: string; ads: string[]; budget_share_percent: number }[] };
  ab_tests: { variable: string; variant_a: string; variant_b: string; success_metric: string }[];
  landing_page_recommendations: string[];
  budget_suggestion: { daily_budget_guidance: string; test_period: string; rationale: string };
  assumptions: string[];
};

export type SavedAd = { id: string; title: string; platform: AdPlatform; brief: Record<string, unknown>; content: AdOutput; generation_id: string | null; updated_at: string };

type Form = {
  platform: AdPlatform;
  product: string;
  objective: (typeof AD_OBJECTIVES)[number];
  audience: string;
  offer: string;
  budget: string;
  tone: (typeof TONES)[number];
  format: (typeof AD_FORMATS)[number];
  cta: string;
  notes: string;
};

const LIMITS: Record<AdPlatform, { headline?: number; description?: number }> = {
  google: { headline: 30, description: 90 },
  meta: { headline: 40, description: 30 },
  instagram: { headline: 40 },
  linkedin: { headline: 70 },
  tiktok: {},
  youtube: {},
};

const LABELS: Record<string, string> = {
  primary_texts: "Primary copy",
  hooks: "Hooks",
  video_script: "Video script",
  ugc_script: "UGC script",
  voiceover_script: "Voiceover script",
  creative_concepts: "Creative concepts",
  audience_segments: "Audience segments",
  campaign_structure: "Campaign structure",
  ab_tests: "A/B tests",
  landing_page_recommendations: "Landing page recommendations",
  budget_suggestion: "Budget suggestion",
};

function toInput(f: Form) {
  return { ...f, budget: f.budget.trim() ? Number(f.budget) : null };
}

function fromBrief(b: Record<string, unknown> | undefined, defaults: { product: string; audience: string }): Form {
  return {
    platform: (b?.platform as AdPlatform) ?? "meta",
    product: (b?.product as string) ?? defaults.product,
    objective: (b?.objective as Form["objective"]) ?? "Leads",
    audience: (b?.audience as string) ?? defaults.audience,
    offer: (b?.offer as string) ?? "",
    budget: b?.budget !== null && b?.budget !== undefined ? String(b.budget) : "",
    tone: (b?.tone as Form["tone"]) ?? "Brand voice",
    format: (b?.format as Form["format"]) ?? "Single image",
    cta: (b?.cta as string) ?? "",
    notes: (b?.notes as string) ?? "",
  };
}

export function AdStudio({ remaining, saved, openAd, reopened, defaults }: { remaining: number; saved: SavedAd[]; openAd: SavedAd | null; reopened: Reopened | null; defaults: { product: string; audience: string } }) {
  const router = useRouter();
  const initial = openAd ? { output: openAd.content as unknown as Record<string, unknown>, generationId: openAd.generation_id ?? "" } : reopened ? { output: reopened.output, generationId: reopened.generationId } : null;
  const gen = useGenerator<AdOutput & Record<string, unknown>>("ad_studio", initial as never);
  const [form, setForm] = useState<Form>(fromBrief((openAd?.brief ?? reopened?.input) as Record<string, unknown> | undefined, defaults));
  const [savedId, setSavedId] = useState<string | null>(openAd?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [title, setTitle] = useState(openAd?.title ?? "");
  const [saving, startSaving] = useTransition();
  const cost = 2;
  const out = gen.output as AdOutput | null;
  const limits = LIMITS[form.platform];

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const update = <K extends keyof AdOutput>(k: K, v: AdOutput[K]) => {
    gen.setOutput((o) => (o ? { ...o, [k]: v } : o));
    setDirty(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await gen.run(toInput(form));
    setSavedId(null);
    setDirty(false);
    setTitle("");
  };

  const save = () =>
    startSaving(async () => {
      if (!out) return;
      const t = title.trim() || `${AD_PLATFORMS[form.platform]} · ${form.product.slice(0, 60)}`;
      const res = await saveAd({ id: savedId, generationId: gen.generationId || null, platform: form.platform, title: t, brief: toInput(form), content: out as unknown as Record<string, unknown> });
      if (!res.ok) return void toast.error(res.error);
      setSavedId(res.data!.id);
      setTitle(t);
      setDirty(false);
      toast.success("Campaign saved");
      router.refresh();
    });

  const exportBrief = () => {
    if (!out) return;
    const md = [
      `# Creative brief: ${title || form.product}`,
      `Platform: ${AD_PLATFORMS[form.platform]} · Objective: ${form.objective} · Format: ${form.format} · Tone: ${form.tone}`,
      form.offer ? `Offer: ${form.offer}` : "",
      form.audience ? `Audience: ${form.audience}` : "",
      toMarkdown(out, LABELS),
      "\n---\nGenerated with LTR Growth. Review all claims before publishing.",
    ].filter(Boolean).join("\n\n");
    downloadFile(`${slugify(title || form.product)}-creative-brief.md`, md, "text/markdown");
  };

  const regen = (section: string) => gen.regenerate(section, toInput(form));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <form onSubmit={submit} className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-[13px] font-medium">Platform</p>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Ad platform">
                {(Object.keys(AD_PLATFORMS) as AdPlatform[]).map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={form.platform === p} onClick={() => set("platform", p)}
                    className={cn("rounded-md border px-2 py-1.5 text-xs transition-colors", form.platform === p ? "border-accent/60 bg-accent-muted text-fg" : "border-border text-muted hover:border-border-strong hover:text-fg")}>
                    {AD_PLATFORMS[p].replace(" Ads", "").replace(" (Facebook)", "")}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Product or service" htmlFor="ad-product">
              <Textarea id="ad-product" required minLength={2} maxLength={500} className="min-h-16" value={form.product} onChange={(e) => set("product", e.target.value)} placeholder="e.g. Emergency drain cleaning" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Objective" htmlFor="ad-objective">
                <NativeSelect id="ad-objective" value={form.objective} onChange={(e) => set("objective", e.target.value as Form["objective"])}>
                  {AD_OBJECTIVES.map((o) => <option key={o}>{o}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Format" htmlFor="ad-format">
                <NativeSelect id="ad-format" value={form.format} onChange={(e) => set("format", e.target.value as Form["format"])}>
                  {AD_FORMATS.map((o) => <option key={o}>{o}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Target audience" htmlFor="ad-audience" optional>
              <Input id="ad-audience" maxLength={500} value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Uses your business profile if empty" />
            </Field>
            <Field label="Offer" htmlFor="ad-offer" optional hint="Only offers you enter are used. Nothing is invented.">
              <Input id="ad-offer" maxLength={300} value={form.offer} onChange={(e) => set("offer", e.target.value)} placeholder="e.g. 15% off first service" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget (USD)" htmlFor="ad-budget" optional>
                <Input id="ad-budget" type="number" min={0} step="1" inputMode="numeric" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
              </Field>
              <Field label="Tone" htmlFor="ad-tone">
                <NativeSelect id="ad-tone" value={form.tone} onChange={(e) => set("tone", e.target.value as Form["tone"])}>
                  {TONES.map((o) => <option key={o}>{o}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Call to action" htmlFor="ad-cta" optional>
              <Input id="ad-cta" maxLength={60} value={form.cta} onChange={(e) => set("cta", e.target.value)} placeholder="e.g. Book now" />
            </Field>
            <Field label="Anything else?" htmlFor="ad-notes" optional>
              <Textarea id="ad-notes" maxLength={1000} className="min-h-16" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Seasonality, things to avoid, angles to try…" />
            </Field>
            <div className="space-y-2 pt-1">
              <Button type="submit" className="w-full" loading={gen.loading} disabled={gen.loading || remaining < cost}>
                {!gen.loading && <Sparkles />} {out ? "Generate new package" : "Generate ad package"}
              </Button>
              <p className="text-center"><CreditCost credits={cost} remaining={remaining} /></p>
            </div>
          </form>
        </Card>
        {saved.length > 0 && (
          <Card>
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">Saved campaigns</div>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {saved.map((a) => (
                <li key={a.id} className={cn("flex items-center gap-2 px-4 py-2", a.id === savedId && "bg-white/[0.03]")}>
                  <Link href={`/app/ads?ad=${a.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-fg hover:underline">{a.title}</p>
                    <p className="text-[11px] text-subtle">{AD_PLATFORMS[a.platform]} · {formatDate(a.updated_at)}</p>
                  </Link>
                  <DeleteIconButton label={`Delete ${a.title}`} onClick={async () => {
                    if (!confirm(`Delete "${a.title}"?`)) return;
                    const r = await deleteAd(a.id);
                    if (!r.ok) toast.error(r.error);
                    else { toast.success("Deleted"); if (a.id === savedId) router.push("/app/ads"); else router.refresh(); }
                  }} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        {gen.error && <GenerationError error={gen.error} />}
        {gen.loading ? (
          <GeneratingState label="Building your ad package" steps={["Reading your business profile and brand kit…", "Writing hooks and primary copy…", "Drafting scripts and creative concepts…", "Structuring the campaign and tests…"]} />
        ) : !out ? (
          <EmptyState icon={Megaphone} title="Your ad package will appear here" description="Pick a platform, describe what you're promoting and generate copy, scripts, creative concepts, audiences and a campaign structure. Everything is editable." />
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
              <Input aria-label="Campaign name" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} placeholder={`${AD_PLATFORMS[form.platform]} · ${form.product.slice(0, 40)}`} className="sm:flex-1" />
              <div className="flex flex-wrap items-center gap-2">
                {savedId && !dirty && <Badge tone="success">Saved</Badge>}
                {dirty && savedId && <Badge tone="warning">Unsaved edits</Badge>}
                <Button size="sm" variant="secondary" onClick={exportBrief}><Download /> Export brief</Button>
                <Button size="sm" onClick={save} loading={saving}>{!saving && <Save />} {savedId ? "Save changes" : "Save campaign"}</Button>
              </div>
            </div>
            <Assumptions items={out.assumptions} />

            <SectionCard title="Hooks" copyText={out.hooks.join("\n")} onRegenerate={() => regen("hooks")} regenerating={gen.sectionLoading === "hooks"}>
              <EditableList label="Hook" items={out.hooks} onChange={(v) => update("hooks", v)} numbered />
            </SectionCard>
            <SectionCard title="Primary copy" copyText={out.primary_texts.join("\n\n")} onRegenerate={() => regen("primary_texts")} regenerating={gen.sectionLoading === "primary_texts"}>
              <EditableList label="Primary text" items={out.primary_texts} onChange={(v) => update("primary_texts", v)} multiline numbered />
            </SectionCard>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Headlines" description={limits.headline ? `${limits.headline} character limit` : undefined} copyText={out.headlines.join("\n")} onRegenerate={() => regen("headlines")} regenerating={gen.sectionLoading === "headlines"}>
                <EditableList label="Headline" items={out.headlines} onChange={(v) => update("headlines", v)} maxChars={limits.headline} />
              </SectionCard>
              <SectionCard title="Descriptions" description={limits.description ? `${limits.description} character limit` : undefined} copyText={out.descriptions.join("\n")} onRegenerate={() => regen("descriptions")} regenerating={gen.sectionLoading === "descriptions"}>
                <EditableList label="Description" items={out.descriptions} onChange={(v) => update("descriptions", v)} maxChars={limits.description} multiline />
              </SectionCard>
            </div>

            <SectionCard title={`Video script · ${out.video_script.duration_seconds}s`} copyText={out.video_script.scenes.map((s) => `[${s.timing}] VISUAL: ${s.visual}\nVO: ${s.voiceover}\nTEXT: ${s.on_screen_text}`).join("\n\n")} onRegenerate={() => regen("video_script")} regenerating={gen.sectionLoading === "video_script"}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead className="text-xs text-subtle"><tr><th className="w-20 pb-2 font-medium">Time</th><th className="pb-2 font-medium">Visual</th><th className="pb-2 font-medium">Voiceover</th><th className="pb-2 font-medium">On-screen text</th></tr></thead>
                  <tbody className="divide-y divide-border align-top">
                    {out.video_script.scenes.map((s, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-2 font-mono text-xs text-subtle">{s.timing}</td>
                        {(["visual", "voiceover", "on_screen_text"] as const).map((k) => (
                          <td key={k} className="py-1 pr-1"><EditableText label={`Scene ${i + 1} ${k}`} multiline value={s[k]} onChange={(v) => update("video_script", { ...out.video_script, scenes: out.video_script.scenes.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="UGC script" copyText={`${out.ugc_script.creator_brief}\n\n${out.ugc_script.script.map((l) => `[${l.timing}] ${l.line} (${l.direction})`).join("\n")}`} onRegenerate={() => regen("ugc_script")} regenerating={gen.sectionLoading === "ugc_script"}>
                <p className="text-xs font-medium uppercase tracking-wider text-subtle">Creator brief</p>
                <EditableText label="Creator brief" multiline value={out.ugc_script.creator_brief} onChange={(v) => update("ugc_script", { ...out.ugc_script, creator_brief: v })} />
                <ol className="mt-3 space-y-2">
                  {out.ugc_script.script.map((l, i) => (
                    <li key={i} className="text-[13px]">
                      <span className="font-mono text-xs text-subtle">{l.timing}</span>
                      <EditableText label={`UGC line ${i + 1}`} multiline value={l.line} onChange={(v) => update("ugc_script", { ...out.ugc_script, script: out.ugc_script.script.map((x, j) => (j === i ? { ...x, line: v } : x)) })} />
                      <p className="px-2 text-xs italic text-subtle">{l.direction}</p>
                    </li>
                  ))}
                </ol>
              </SectionCard>
              <SectionCard title="Voiceover script" copyText={out.voiceover_script} onRegenerate={() => regen("voiceover_script")} regenerating={gen.sectionLoading === "voiceover_script"}>
                <EditableText label="Voiceover script" multiline value={out.voiceover_script} onChange={(v) => update("voiceover_script", v)} />
              </SectionCard>
            </div>

            <SectionCard title="Creative concepts" copyText={toMarkdown(out.creative_concepts)} onRegenerate={() => regen("creative_concepts")} regenerating={gen.sectionLoading === "creative_concepts"}>
              <div className="grid gap-3 md:grid-cols-2">
                {out.creative_concepts.map((c, i) => (
                  <div key={i} className="rounded-md border border-border bg-bg-2 p-3">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="mt-1 text-[13px] text-muted">{c.visual_description}</p>
                    <p className="mt-2 text-xs text-subtle">Angle: {c.copy_angle}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Audience segments" copyText={toMarkdown(out.audience_segments)} onRegenerate={() => regen("audience_segments")} regenerating={gen.sectionLoading === "audience_segments"}>
                <ul className="space-y-3">
                  {out.audience_segments.map((a, i) => (
                    <li key={i}><p className="text-sm font-medium">{a.name}</p><p className="text-[13px] text-muted">{a.targeting}</p><p className="mt-0.5 text-xs text-subtle">{a.rationale}</p></li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard title="Budget suggestion" description="A starting test budget, not a forecast" copyText={toMarkdown(out.budget_suggestion)} onRegenerate={() => regen("budget_suggestion")} regenerating={gen.sectionLoading === "budget_suggestion"}>
                <dl className="space-y-2 text-[13px]">
                  <div><dt className="text-xs text-subtle">Daily budget</dt><dd>{out.budget_suggestion.daily_budget_guidance}</dd></div>
                  <div><dt className="text-xs text-subtle">Test period</dt><dd>{out.budget_suggestion.test_period}</dd></div>
                  <div><dt className="text-xs text-subtle">Why</dt><dd className="text-muted">{out.budget_suggestion.rationale}</dd></div>
                </dl>
              </SectionCard>
            </div>

            <SectionCard title="Campaign structure" copyText={toMarkdown(out.campaign_structure)} onRegenerate={() => regen("campaign_structure")} regenerating={gen.sectionLoading === "campaign_structure"}>
              <p className="text-[13px] text-muted">{out.campaign_structure.summary}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {out.campaign_structure.ad_sets.map((s, i) => (
                  <div key={i} className="rounded-md border border-border bg-bg-2 p-3">
                    <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{s.name}</p><Badge>{s.budget_share_percent}% of budget</Badge></div>
                    <p className="mt-1 text-xs text-subtle">{s.audience}</p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[13px] text-muted">{s.ads.map((a, j) => <li key={j}>{a}</li>)}</ul>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="A/B testing plan" copyText={toMarkdown(out.ab_tests)} onRegenerate={() => regen("ab_tests")} regenerating={gen.sectionLoading === "ab_tests"}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead className="text-xs text-subtle"><tr><th className="pb-2 font-medium">Test</th><th className="pb-2 font-medium">A</th><th className="pb-2 font-medium">B</th><th className="pb-2 font-medium">Measure</th></tr></thead>
                  <tbody className="divide-y divide-border align-top">
                    {out.ab_tests.map((t, i) => <tr key={i}><td className="py-2 pr-3 font-medium">{t.variable}</td><td className="py-2 pr-3 text-muted">{t.variant_a}</td><td className="py-2 pr-3 text-muted">{t.variant_b}</td><td className="py-2 text-subtle">{t.success_metric}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Landing page recommendations" copyText={out.landing_page_recommendations.join("\n")} onRegenerate={() => regen("landing_page_recommendations")} regenerating={gen.sectionLoading === "landing_page_recommendations"}>
              <EditableList label="Recommendation" items={out.landing_page_recommendations} onChange={(v) => update("landing_page_recommendations", v)} multiline />
            </SectionCard>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-subtle">
              <span>AI-generated. Review claims and platform policies before publishing.</span>
              <span className="flex gap-1"><CopyButton text={toMarkdown(out, LABELS)} label="Copy everything" /><Button size="sm" variant="ghost" onClick={() => { gen.reset(); setSavedId(null); router.push("/app/ads"); }}><FilePlus2 /> New</Button></span>
            </div>
            <AgencyCta title="Want our team to launch and manage this campaign?" body="LTRMarketing's ad specialists can set up, launch and optimize it for you." service="managed_advertising" source="ad_studio" />
          </>
        )}
      </div>
    </div>
  );
}
