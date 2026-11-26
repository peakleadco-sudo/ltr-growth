"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Mail, Save, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Badge, Card, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { Assumptions, CopyButton, CreditCost, DeleteIconButton, EditableList, EditableText, GeneratingState, GenerationError, SectionCard } from "@/components/ai/result-kit";
import { useGenerator } from "@/components/ai/use-generator";
import { EMAIL_TYPES, type EmailType } from "@/lib/ai/tools/email";
import { TONES } from "@/lib/ai/tools/common";
import type { Reopened } from "@/lib/ai/tool-page";
import { downloadFile, slugify } from "@/lib/export";
import { cn, formatDate } from "@/lib/utils";
import { deleteEmailCampaign, saveEmailCampaign } from "./actions";

type Message = { order: number; send_timing: string; purpose: string; subject_lines: string[]; preview_text: string; body: string; cta: string };
type EmailOutput = { sequence_name: string; messages: Message[]; ab_variations: { element: string; variant_a: string; variant_b: string }[]; compliance_notes: string[]; assumptions: string[] };
export type SavedCampaign = { id: string; title: string; channel: "email" | "sms"; campaign_type: EmailType; content: EmailOutput & { _input?: Record<string, unknown> }; generation_id: string | null; updated_at: string };
type Form = { campaign_type: EmailType; channel: "email" | "sms"; message_count: number; audience: string; offer: string; goal: string; tone: (typeof TONES)[number]; notes: string };

function messageText(m: Message, channel: "email" | "sms") {
  return channel === "sms" ? m.body : [`Subject: ${m.subject_lines[0] ?? ""}`, m.preview_text ? `Preview: ${m.preview_text}` : "", "", m.body].filter((x, i) => x !== "" || i === 2).join("\n");
}

export function EmailStudio({ remaining, reopened, saved, open }: { remaining: number; reopened: Reopened | null; saved: SavedCampaign[]; open: SavedCampaign | null }) {
  const router = useRouter();
  const initial = open ? { output: open.content as unknown as Record<string, unknown>, generationId: open.generation_id ?? "" } : reopened ? { output: reopened.output, generationId: reopened.generationId } : null;
  const gen = useGenerator<EmailOutput & Record<string, unknown>>("email_sms", initial as never);
  const ri = (open?.content._input ?? reopened?.input) as Partial<Form> | undefined;
  const [form, setForm] = useState<Form>({
    campaign_type: ri?.campaign_type ?? open?.campaign_type ?? "welcome",
    channel: ri?.channel ?? open?.channel ?? "email",
    message_count: ri?.message_count ?? 3,
    audience: ri?.audience ?? "",
    offer: ri?.offer ?? "",
    goal: ri?.goal ?? "",
    tone: ri?.tone ?? "Brand voice",
    notes: ri?.notes ?? "",
  });
  const [savedId, setSavedId] = useState<string | null>(open?.id ?? null);
  const [saving, startSaving] = useTransition();
  const out = gen.output as EmailOutput | null;
  const cost = form.message_count > 3 ? 2 : 1;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const updateMsg = (i: number, patch: Partial<Message>) => gen.setOutput((o) => (o ? { ...o, messages: (o.messages as Message[]).map((m, j) => (j === i ? { ...m, ...patch } : m)) } : o));

  const changeType = (t: EmailType) => setForm((f) => ({ ...f, campaign_type: t, channel: t === "sms_follow_up" ? "sms" : f.channel }));

  const save = () =>
    startSaving(async () => {
      if (!out) return;
      const res = await saveEmailCampaign({ id: savedId, generationId: gen.generationId || null, channel: form.channel, campaignType: form.campaign_type, title: out.sequence_name || EMAIL_TYPES[form.campaign_type], content: { ...out, _input: form } as unknown as Record<string, unknown> });
      if (!res.ok) return void toast.error(res.error);
      setSavedId(res.data!.id);
      toast.success("Saved");
      router.refresh();
    });

  const exportAll = () => {
    if (!out) return;
    const txt = [out.sequence_name, "", ...out.messages.flatMap((m) => [`--- ${form.channel === "sms" ? "SMS" : "Email"} ${m.order} · ${m.send_timing} · ${m.purpose}`, messageText(m, form.channel), m.cta ? `CTA: ${m.cta}` : "", ""]), "Compliance reminders:", ...out.compliance_notes.map((n) => `- ${n}`)].join("\n");
    downloadFile(`${slugify(out.sequence_name || EMAIL_TYPES[form.campaign_type])}.txt`, txt);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <form className="space-y-4 p-4" onSubmit={async (e) => { e.preventDefault(); await gen.run(form); setSavedId(null); }}>
            <Field label="Campaign type" htmlFor="type">
              <NativeSelect id="type" value={form.campaign_type} onChange={(e) => changeType(e.target.value as EmailType)}>
                {(Object.keys(EMAIL_TYPES) as EmailType[]).map((t) => <option key={t} value={t}>{EMAIL_TYPES[t]}</option>)}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Channel" htmlFor="channel">
                <NativeSelect id="channel" value={form.channel} onChange={(e) => set("channel", e.target.value as Form["channel"])}><option value="email">Email</option><option value="sms">SMS</option></NativeSelect>
              </Field>
              <Field label="Messages" htmlFor="count">
                <NativeSelect id="count" value={form.message_count} onChange={(e) => set("message_count", Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</NativeSelect>
              </Field>
            </div>
            <Field label="Audience" htmlFor="aud" optional><Input id="aud" maxLength={400} value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. New leads from the website" /></Field>
            <Field label="Offer" htmlFor="offer" optional hint="Only mentioned if you enter one."><Input id="offer" maxLength={300} value={form.offer} onChange={(e) => set("offer", e.target.value)} /></Field>
            <Field label="Goal" htmlFor="goal" optional><Input id="goal" maxLength={300} value={form.goal} onChange={(e) => set("goal", e.target.value)} placeholder="e.g. Book a first appointment" /></Field>
            <Field label="Tone" htmlFor="tone"><NativeSelect id="tone" value={form.tone} onChange={(e) => set("tone", e.target.value as Form["tone"])}>{TONES.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
            <Field label="Notes" htmlFor="notes" optional><Textarea id="notes" className="min-h-14" maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
            <div className="space-y-2">
              <Button type="submit" className="w-full" loading={gen.loading} disabled={gen.loading || remaining < cost}>{!gen.loading && <Sparkles />} Write {form.channel === "sms" ? "SMS" : "emails"}</Button>
              <p className="text-center"><CreditCost credits={cost} remaining={remaining} /></p>
            </div>
          </form>
        </Card>
        {saved.length > 0 && (
          <Card>
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">Saved campaigns</div>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {saved.map((c) => (
                <li key={c.id} className={cn("flex items-center gap-2 px-4 py-2", c.id === savedId && "bg-white/[0.03]")}>
                  <Link href={`/app/email?campaign=${c.id}`} className="min-w-0 flex-1"><p className="truncate text-[13px] hover:underline">{c.title}</p><p className="text-[11px] text-subtle">{c.channel === "sms" ? "SMS" : "Email"} · {EMAIL_TYPES[c.campaign_type] ?? c.campaign_type} · {formatDate(c.updated_at)}</p></Link>
                  <DeleteIconButton label={`Delete ${c.title}`} onClick={async () => { if (!confirm(`Delete "${c.title}"?`)) return; const r = await deleteEmailCampaign(c.id); if (!r.ok) toast.error(r.error); else router.refresh(); }} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <Notice tone="info" title="Send only to people who agreed to hear from you">
          Marketing emails need consent (where required), a working unsubscribe link and your business address. SMS needs prior express consent and opt-out instructions (e.g. &quot;Reply STOP&quot;). Rules vary by country (CAN-SPAM, TCPA, GDPR, CASL). LTR Growth does not send messages; copy them into your email or SMS provider.
        </Notice>
        {gen.error && <GenerationError error={gen.error} />}
        {gen.loading ? (
          <GeneratingState label="Writing your messages" steps={["Reading your business profile and brand voice…", "Planning the sequence…", "Writing subject lines and body copy…", "Adding A/B variations and compliance checks…"]} />
        ) : !out ? (
          <EmptyState icon={Mail} title="Your messages will appear here" description="Generate welcome sequences, promotions, follow-ups, reminders, review requests and SMS templates you can paste into your email or SMS tool." />
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold">{out.sequence_name}</p><p className="text-xs text-subtle">{out.messages.length} {form.channel === "sms" ? "SMS" : "email"}{out.messages.length === 1 ? "" : "s"} · {EMAIL_TYPES[form.campaign_type]}</p></div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={exportAll}><Download /> Export</Button>
                <Button size="sm" onClick={save} loading={saving}>{!saving && <Save />} {savedId ? "Save changes" : "Save"}</Button>
              </div>
            </div>
            <Assumptions items={out.assumptions} />
            <SectionCard title="Messages" onRegenerate={() => gen.regenerate("messages", form)} regenerating={gen.sectionLoading === "messages"}>
              <ol className="space-y-4">
                {out.messages.map((m, i) => (
                  <li key={i} className="rounded-lg border border-border bg-bg-2">
                    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                      <div className="flex items-center gap-2"><Badge tone="accent">{m.order}</Badge><span className="text-[13px] font-medium">{m.send_timing}</span><span className="text-xs text-subtle">· {m.purpose}</span></div>
                      <CopyButton text={messageText(m, form.channel)} />
                    </header>
                    <div className="space-y-2 p-2">
                      {form.channel === "email" && m.subject_lines.length > 0 && (
                        <div><p className="px-2 text-[11px] uppercase tracking-wider text-subtle">Subject lines</p><EditableList label="Subject line" items={m.subject_lines} onChange={(v) => updateMsg(i, { subject_lines: v })} maxChars={60} /></div>
                      )}
                      {form.channel === "email" && (
                        <div><p className="px-2 text-[11px] uppercase tracking-wider text-subtle">Preview text</p><EditableText label="Preview text" value={m.preview_text} maxChars={110} onChange={(v) => updateMsg(i, { preview_text: v })} className="text-[13px]" /></div>
                      )}
                      <div><p className="px-2 text-[11px] uppercase tracking-wider text-subtle">{form.channel === "sms" ? "Message" : "Body"}</p><EditableText label="Message body" multiline value={m.body} maxChars={form.channel === "sms" ? 320 : undefined} onChange={(v) => updateMsg(i, { body: v })} className="text-[13px]" /></div>
                      {m.cta && <p className="px-2 text-xs"><span className="text-subtle">CTA:</span> {m.cta}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </SectionCard>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="A/B variations" onRegenerate={() => gen.regenerate("ab_variations", form)} regenerating={gen.sectionLoading === "ab_variations"}>
                <ul className="space-y-3 text-[13px]">{out.ab_variations.map((v, i) => <li key={i}><p className="font-medium">{v.element}</p><p className="text-muted"><span className="text-subtle">A:</span> {v.variant_a}</p><p className="text-muted"><span className="text-subtle">B:</span> {v.variant_b}</p></li>)}</ul>
              </SectionCard>
              <SectionCard title="Compliance checklist">
                <ul className="space-y-2 text-[13px] text-muted">{out.compliance_notes.map((n, i) => <li key={i} className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />{n}</li>)}</ul>
                <p className="mt-3 text-xs text-subtle">General guidance, not legal advice.</p>
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
