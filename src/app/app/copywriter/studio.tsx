"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, PenLine, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Badge, Card, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { AgencyCta, Assumptions, CopyButton, CreditCost, DeleteIconButton, EditableText, GeneratingState, GenerationError, SectionCard } from "@/components/ai/result-kit";
import { useGenerator } from "@/components/ai/use-generator";
import { CONVERSION_GOALS, PAGE_TYPES, type PageType } from "@/lib/ai/tools/copywriter";
import { TONES } from "@/lib/ai/tools/common";
import type { Reopened } from "@/lib/ai/tool-page";
import { downloadFile, slugify } from "@/lib/export";
import { cn, formatDate } from "@/lib/utils";
import { deleteCopy, saveCopy } from "./actions";

type Variant = {
  label: string;
  seo_title: string;
  meta_description: string;
  h1: string;
  sections: { purpose: string; heading: string; body: string; cta_label: string }[];
  faqs: { question: string; answer: string }[];
  ctas: string[];
  form_recommendations: string[];
};
type CopyOutput = { variants: Variant[]; implementation_notes: string[]; assumptions: string[] };
export type SavedCopy = { id: string; title: string; page_type: PageType; content: CopyOutput & { _input?: Record<string, unknown> }; generation_id: string | null; updated_at: string };

type Form = { page_type: PageType; subject: string; audience: string; goal: (typeof CONVERSION_GOALS)[number]; tone: (typeof TONES)[number]; location: string; keywords: string; variants: 1 | 2; notes: string };

function variantToMarkdown(v: Variant) {
  return [
    `SEO title: ${v.seo_title}`,
    `Meta description: ${v.meta_description}`,
    "",
    `# ${v.h1}`,
    ...v.sections.flatMap((s) => ["", `## ${s.heading}`, s.body, s.cta_label ? `[${s.cta_label}]` : ""]),
    ...(v.faqs.length ? ["", "## FAQ", ...v.faqs.flatMap((f) => [`**${f.question}**`, f.answer, ""])] : []),
    ...(v.ctas.length ? ["", "## Calls to action", ...v.ctas.map((c) => `- ${c}`)] : []),
    ...(v.form_recommendations.length ? ["", "## Lead capture form", ...v.form_recommendations.map((c) => `- ${c}`)] : []),
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function variantToHtml(v: Variant) {
  const para = (b: string) =>
    b.split(/\n{2,}/).map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => l.trim().startsWith("- "))) return `<ul>${lines.map((l) => `<li>${esc(l.trim().slice(2))}</li>`).join("")}</ul>`;
      return `<p>${lines.map(esc).join("<br>")}</p>`;
    }).join("\n");
  return [
    `<!-- SEO title: ${esc(v.seo_title)} -->`,
    `<!-- Meta description: ${esc(v.meta_description)} -->`,
    `<h1>${esc(v.h1)}</h1>`,
    ...v.sections.map((s) => `<section>\n<h2>${esc(s.heading)}</h2>\n${para(s.body)}${s.cta_label ? `\n<a class="button" href="#">${esc(s.cta_label)}</a>` : ""}\n</section>`),
    ...(v.faqs.length ? [`<section>\n<h2>Frequently asked questions</h2>\n${v.faqs.map((f) => `<h3>${esc(f.question)}</h3>\n<p>${esc(f.answer)}</p>`).join("\n")}\n</section>`] : []),
  ].join("\n");
}

export function Copywriter({ remaining, reopened, saved, open, defaultLocation }: { remaining: number; reopened: Reopened | null; saved: SavedCopy[]; open: SavedCopy | null; defaultLocation: string }) {
  const router = useRouter();
  const initial = open ? { output: open.content as unknown as Record<string, unknown>, generationId: open.generation_id ?? "" } : reopened ? { output: reopened.output, generationId: reopened.generationId } : null;
  const gen = useGenerator<CopyOutput & Record<string, unknown>>("website_copy", initial as never);
  const ri = (open?.content._input ?? reopened?.input) as Partial<Form> | undefined;
  const [form, setForm] = useState<Form>({
    page_type: ri?.page_type ?? open?.page_type ?? "home",
    subject: ri?.subject ?? "",
    audience: ri?.audience ?? "",
    goal: ri?.goal ?? "Get leads / quote requests",
    tone: ri?.tone ?? "Brand voice",
    location: ri?.location ?? defaultLocation,
    keywords: ri?.keywords ?? "",
    variants: ri?.variants ?? 2,
    notes: ri?.notes ?? "",
  });
  const [savedId, setSavedId] = useState<string | null>(open?.id ?? null);
  const [title, setTitle] = useState(open?.title ?? "");
  const [saving, startSaving] = useTransition();
  const out = gen.output as CopyOutput | null;
  const cost = form.variants === 2 ? 2 : 1;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const updateVariant = (i: number, patch: Partial<Variant>) => gen.setOutput((o) => (o ? { ...o, variants: (o.variants as Variant[]).map((v, j) => (j === i ? { ...v, ...patch } : v)) } : o));
  const updateSection = (vi: number, si: number, patch: Partial<Variant["sections"][number]>) =>
    gen.setOutput((o) => (o ? { ...o, variants: (o.variants as Variant[]).map((v, j) => (j === vi ? { ...v, sections: v.sections.map((s, k) => (k === si ? { ...s, ...patch } : s)) } : v)) } : o));

  const save = () =>
    startSaving(async () => {
      if (!out) return;
      const t = title.trim() || `${PAGE_TYPES[form.page_type]}${form.subject ? ` · ${form.subject.slice(0, 60)}` : ""}`;
      const res = await saveCopy({ id: savedId, generationId: gen.generationId || null, pageType: form.page_type, title: t, content: { ...out, _input: form } as unknown as Record<string, unknown> });
      if (!res.ok) return void toast.error(res.error);
      setSavedId(res.data!.id);
      setTitle(t);
      toast.success("Copy saved");
      router.refresh();
    });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <form className="space-y-4 p-4" onSubmit={async (e) => { e.preventDefault(); await gen.run(form); setSavedId(null); setTitle(""); }}>
            <Field label="Page or content type" htmlFor="page-type">
              <NativeSelect id="page-type" value={form.page_type} onChange={(e) => set("page_type", e.target.value as PageType)}>
                {(Object.keys(PAGE_TYPES) as PageType[]).map((p) => <option key={p} value={p}>{PAGE_TYPES[p]}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Subject" htmlFor="subject" optional hint="Which service, product or offer this page is about.">
              <Input id="subject" maxLength={500} value={form.subject} onChange={(e) => set("subject", e.target.value)} />
            </Field>
            {form.page_type === "location" && (
              <Field label="Location" htmlFor="location"><Input id="location" required maxLength={120} value={form.location} onChange={(e) => set("location", e.target.value)} /></Field>
            )}
            <Field label="Conversion goal" htmlFor="goal">
              <NativeSelect id="goal" value={form.goal} onChange={(e) => set("goal", e.target.value as Form["goal"])}>{CONVERSION_GOALS.map((g) => <option key={g}>{g}</option>)}</NativeSelect>
            </Field>
            <Field label="Audience" htmlFor="audience" optional><Input id="audience" maxLength={400} value={form.audience} onChange={(e) => set("audience", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tone" htmlFor="tone"><NativeSelect id="tone" value={form.tone} onChange={(e) => set("tone", e.target.value as Form["tone"])}>{TONES.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
              <Field label="Versions" htmlFor="variants"><NativeSelect id="variants" value={form.variants} onChange={(e) => set("variants", Number(e.target.value) as 1 | 2)}><option value={1}>1</option><option value={2}>2 (compare)</option></NativeSelect></Field>
            </div>
            <Field label="Target keywords" htmlFor="keywords" optional><Input id="keywords" maxLength={300} value={form.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="Comma separated" /></Field>
            <Field label="Notes" htmlFor="notes" optional><Textarea id="notes" className="min-h-14" maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
            <div className="space-y-2">
              <Button type="submit" className="w-full" loading={gen.loading} disabled={gen.loading || remaining < cost}>{!gen.loading && <Sparkles />} Write copy</Button>
              <p className="text-center"><CreditCost credits={cost} remaining={remaining} /></p>
            </div>
          </form>
        </Card>
        {saved.length > 0 && (
          <Card>
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">Saved copy</div>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {saved.map((c) => (
                <li key={c.id} className={cn("flex items-center gap-2 px-4 py-2", c.id === savedId && "bg-white/[0.03]")}>
                  <Link href={`/app/copywriter?copy=${c.id}`} className="min-w-0 flex-1"><p className="truncate text-[13px] hover:underline">{c.title}</p><p className="text-[11px] text-subtle">{PAGE_TYPES[c.page_type]} · {formatDate(c.updated_at)}</p></Link>
                  <DeleteIconButton label={`Delete ${c.title}`} onClick={async () => { if (!confirm(`Delete "${c.title}"?`)) return; const r = await deleteCopy(c.id); if (!r.ok) toast.error(r.error); else router.refresh(); }} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        {gen.error && <GenerationError error={gen.error} />}
        {gen.loading ? (
          <GeneratingState label="Writing your copy" steps={["Reading your business profile and brand voice…", "Structuring the page for conversions…", "Writing headlines, sections and CTAs…", "Adding SEO title and meta description…"]} />
        ) : !out ? (
          <EmptyState icon={PenLine} title="Your copy will appear here" description="Generate home, service, landing and location pages, product descriptions, FAQs, CTAs and SEO metadata. Two versions let you compare angles side by side." />
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
              <Input aria-label="Name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${PAGE_TYPES[form.page_type]}${form.subject ? ` · ${form.subject.slice(0, 40)}` : ""}`} className="sm:flex-1" />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => gen.regenerate("variants", form)} loading={gen.sectionLoading === "variants"}>Regenerate versions</Button>
                <Button size="sm" onClick={save} loading={saving}>{!saving && <Save />} {savedId ? "Save changes" : "Save"}</Button>
              </div>
            </div>
            <Assumptions items={out.assumptions} />
            <div className={cn("grid gap-4", out.variants.length > 1 && "2xl:grid-cols-2")} aria-busy={gen.sectionLoading === "variants" || undefined}>
              {out.variants.map((v, vi) => (
                <SectionCard key={vi} title={out.variants.length > 1 ? `Version ${String.fromCharCode(65 + vi)} · ${v.label}` : v.label || "Copy"} copyText={variantToMarkdown(v)} regenerating={gen.sectionLoading === "variants"}
                  actions={<>
                    <CopyButton text={variantToHtml(v)} label="HTML" />
                    <Button size="sm" variant="ghost" onClick={() => downloadFile(`${slugify(title || form.subject || PAGE_TYPES[form.page_type])}-${String.fromCharCode(97 + vi)}.md`, variantToMarkdown(v), "text/markdown")}><Download /></Button>
                  </>}>
                  <div className="space-y-3">
                    <div className="rounded-md border border-border bg-bg-2 p-2">
                      <p className="px-2 text-[11px] uppercase tracking-wider text-subtle">Search result preview</p>
                      <EditableText label="SEO title" value={v.seo_title} maxChars={60} onChange={(x) => updateVariant(vi, { seo_title: x })} className="font-medium text-info" />
                      <EditableText label="Meta description" multiline value={v.meta_description} maxChars={155} onChange={(x) => updateVariant(vi, { meta_description: x })} className="text-[13px] text-muted" />
                    </div>
                    {v.h1 && <EditableText label="H1" value={v.h1} onChange={(x) => updateVariant(vi, { h1: x })} className="text-lg font-semibold" />}
                    {v.sections.map((s, si) => (
                      <div key={si} className="border-l-2 border-border pl-2">
                        <Badge className="ml-2">{s.purpose}</Badge>
                        <EditableText label={`Section ${si + 1} heading`} value={s.heading} onChange={(x) => updateSection(vi, si, { heading: x })} className="font-medium" />
                        <EditableText label={`Section ${si + 1} body`} multiline value={s.body} onChange={(x) => updateSection(vi, si, { body: x })} className="text-[13px] text-muted" />
                        {s.cta_label && <span className="ml-2 mt-1 inline-block rounded-md bg-accent px-3 py-1 text-xs font-medium text-white">{s.cta_label}</span>}
                      </div>
                    ))}
                    {v.faqs.length > 0 && (
                      <div><p className="text-xs font-semibold uppercase tracking-wider text-subtle">FAQ</p>
                        <dl className="mt-1 space-y-2 text-[13px]">{v.faqs.map((f, i) => <div key={i}><dt className="font-medium">{f.question}</dt><dd className="text-muted">{f.answer}</dd></div>)}</dl></div>
                    )}
                    {v.ctas.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-subtle">Calls to action</p><div className="mt-1 flex flex-wrap gap-1.5">{v.ctas.map((c, i) => <span key={i} className="rounded-md border border-border px-2 py-1 text-xs">{c}</span>)}</div></div>}
                    {v.form_recommendations.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-subtle">Lead capture form</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-muted">{v.form_recommendations.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
                  </div>
                </SectionCard>
              ))}
            </div>
            {out.implementation_notes.length > 0 && (
              <SectionCard title="Implementation notes" copyText={out.implementation_notes.join("\n")}>
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">{out.implementation_notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </SectionCard>
            )}
            <AgencyCta title="Let LTRMarketing build a website designed to convert" body="Our team can design and build pages around this copy, with SEO and tracking set up properly." service="website_design" source="copywriter" />
          </>
        )}
      </div>
    </div>
  );
}
